// src/app/api/notify-nearby/route.ts
// Called when a pin is created, confirmed, or resolved — notifies users within their configured radius.
// event_type: 'new' (default) | 'confirmed' | 'resolved'

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import { haversineMetersRaw } from '@/lib/utils';
import { Resend } from 'resend';
import { sosCircleAlertEmail } from '@/lib/email-templates';
import { CATEGORY_DETAILS } from '@/types';

type EventType = 'new' | 'confirmed' | 'resolved';

// Map category → group for filtering
function categoryGroup(category: string): 'urgent' | 'warning' | 'infra' | 'positive' | null {
  const detail = CATEGORY_DETAILS[category];
  return detail?.group ?? null;
}

// Notification message templates
function notifMessage(eventType: EventType, category: string, isEmergency: boolean) {
  if (isEmergency) {
    return { title: 'SOS a proximite', body: "Quelqu'un a proximite a declenche une alerte de securite" };
  }
  const label = CATEGORY_DETAILS[category]?.label ?? category;
  const group = categoryGroup(category);
  switch (eventType) {
    case 'confirmed':
      return { title: 'Incident confirme', body: `${label} confirme par la communaute` };
    case 'resolved':
      return { title: 'Incident resolu', body: `${label} pres de vous a ete resolu` };
    default: {
      const prefix = group === 'urgent' ? 'Signalement urgent' : group === 'infra' ? 'Signalement infrastructure' : 'Nouveau signalement';
      return { title: prefix, body: `${label} signale pres de vous` };
    }
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    pin: { id: string; lat: number; lng: number; is_emergency: boolean; category: string; severity: string; user_id: string };
    event_type?: EventType;
  };

  const { pin } = body;
  const eventType: EventType = body.event_type ?? 'new';

  if (!pin) return NextResponse.json({ sent: 0 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'service role key not configured' }, { status: 500 });

  const admin = createAdminClient();

  // Spatial pre-filter: only users whose last_known location is within 10km of pin
  // Uses PostGIS GIST index — avoids full table scan on push_subscriptions + profiles
  const MAX_NOTIFY_RADIUS_M = 10_000;
  const { data: nearbyUsers } = await admin
    .rpc('user_ids_near_point', { p_lat: pin.lat, p_lng: pin.lng, p_max_radius_m: MAX_NOTIFY_RADIUS_M });
  const nearbyUserIds = new Set((nearbyUsers ?? []).map((r: { user_id: string }) => r.user_id));

  // Load push subscriptions only for spatially-nearby users (excluding pin creator)
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')
    .neq('user_id', pin.user_id)
    .in('user_id', nearbyUserIds.size > 0 ? [...nearbyUserIds] : ['00000000-0000-0000-0000-000000000000']);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  // Load notif settings for those users
  const userIds = subs.map((s) => s.user_id);
  const { data: settingsRows } = await admin
    .from('notification_settings')
    .select('user_id, proximity_radius_m, notify_sos_nearby, notify_nearby_pins, notify_new_pins, notify_confirmed_pins, notify_resolved_pins, notify_cat_urgent, notify_cat_warning, notify_cat_infra, pin_notif_channel, sos_notif_channel, quiet_hours_enabled, quiet_start, quiet_end')
    .in('user_id', userIds);

  const settingsMap = Object.fromEntries((settingsRows ?? []).map((r) => [r.user_id, r]));

  // Load last known locations for per-user radius check (fine-grained, post spatial pre-filter)
  const { data: locationRows } = await admin
    .from('profiles')
    .select('id, last_known_lat, last_known_lng')
    .in('id', userIds);
  const locationMap = Object.fromEntries(
    (locationRows ?? []).map((r) => [r.id, { lat: r.last_known_lat, lng: r.last_known_lng }])
  );

  const { title, body: notifBody } = notifMessage(eventType, pin.category, pin.is_emergency);
  const group = categoryGroup(pin.category);

  const vapidDetails = {
    subject: 'mailto:brumeapp@pm.me',
    publicKey:  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  };

  let sent = 0;
  const inAppInserts: { user_id: string; type: string; title: string; body: string; pin_id: string }[] = [];
  const notifiedUserIds = new Set<string>();

  for (const sub of subs) {
    const s = settingsMap[sub.user_id];
    const radiusM = s?.proximity_radius_m ?? 1000;

    // ── SOS filtering ──
    if (pin.is_emergency) {
      const notifySOS = s?.notify_sos_nearby ?? true;
      if (!notifySOS) continue;
    } else {
      // ── Lifecycle filtering ──
      if (eventType === 'new' && !(s?.notify_new_pins ?? true)) continue;
      if (eventType === 'confirmed' && !(s?.notify_confirmed_pins ?? true)) continue;
      if (eventType === 'resolved' && !(s?.notify_resolved_pins ?? false)) continue;

      // ── Category filtering ──
      if (group === 'urgent' && !(s?.notify_cat_urgent ?? true)) continue;
      if (group === 'warning' && !(s?.notify_cat_warning ?? true)) continue;
      if (group === 'infra' && !(s?.notify_cat_infra ?? false)) continue;
      if (group === 'positive') continue; // no notifications for positive pins
    }

    // ── Geo-filter ──
    const loc = locationMap[sub.user_id];
    if (loc?.lat != null && loc?.lng != null) {
      const dist = haversineMetersRaw(loc.lat, loc.lng, pin.lat, pin.lng);
      if (dist > radiusM) continue;
    }

    // ── Quiet hours check ──
    let inQuiet = false;
    if (s?.quiet_hours_enabled) {
      const now = new Date().toTimeString().slice(0, 5);
      const start = s.quiet_start ?? '22:00';
      const end = s.quiet_end ?? '07:00';
      inQuiet = start > end
        ? now >= start || now < end
        : now >= start && now < end;
    }

    // ── Channel routing ──
    const channel: string = pin.is_emergency
      ? (s?.sos_notif_channel ?? 'both')
      : (s?.pin_notif_channel ?? 'both');

    const shouldPush = channel === 'push' || channel === 'both';
    const shouldInApp = channel === 'in_app' || channel === 'both';

    // In-app: always insert (even during quiet hours — user sees it later)
    if (shouldInApp) {
      const notifType = pin.is_emergency ? 'emergency' : `pin_${eventType}`;
      inAppInserts.push({
        user_id: sub.user_id,
        type: notifType,
        title,
        body: notifBody,
        pin_id: pin.id,
      });
    }

    // Push: skip during quiet hours (except SOS)
    if (shouldPush && (pin.is_emergency || !inQuiet)) {
      try {
        const { default: webpush } = await import('web-push');
        webpush.setVapidDetails(vapidDetails.subject, vapidDetails.publicKey, vapidDetails.privateKey);
        await webpush.sendNotification(
          sub.subscription as Parameters<typeof webpush.sendNotification>[0],
          JSON.stringify({ title, body: notifBody, pinId: pin.id }),
        );
        sent++;
      } catch {
        // Subscription expired — clean up
        await admin.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
    }

    notifiedUserIds.add(sub.user_id);
  }

  // ── SOS: notify followers within enlarged radius ──
  if (pin.is_emergency) {
    // Get trusted contact IDs for deduplication (already notified by edge function)
    const { data: trustedRows } = await admin
      .from('trusted_contacts')
      .select('user_id, contact_id')
      .or(`user_id.eq.${pin.user_id},contact_id.eq.${pin.user_id}`)
      .eq('status', 'accepted');
    const trustedIds = new Set(
      (trustedRows ?? []).map((c) => (c.user_id === pin.user_id ? c.contact_id : c.user_id))
    );

    // Get followers of the SOS trigger user
    const { data: followerRows } = await admin
      .from('follows')
      .select('follower_id')
      .eq('following_id', pin.user_id);
    const followerIds = (followerRows ?? [])
      .map((r) => r.follower_id)
      .filter((id) => id !== pin.user_id && !notifiedUserIds.has(id) && !trustedIds.has(id));

    if (followerIds.length > 0) {
      // Fetch push subs, notification settings, and locations in parallel
      const [{ data: followerSubs }, { data: fSettingsRows }, { data: fLocRows }] = await Promise.all([
        admin.from('push_subscriptions').select('user_id, subscription').in('user_id', followerIds),
        admin.from('notification_settings')
          .select('user_id, notify_sos_followers, follower_sos_radius_m, sos_notif_channel')
          .in('user_id', followerIds),
        admin.from('profiles').select('id, last_known_lat, last_known_lng').in('id', followerIds),
      ]);

      const fSettingsMap = Object.fromEntries(
        (fSettingsRows ?? []).map((r) => [r.user_id, r])
      );
      const fLocMap = Object.fromEntries(
        (fLocRows ?? []).map((r) => [r.id, { lat: r.last_known_lat, lng: r.last_known_lng }])
      );

      const fTitle = 'SOS a proximite';
      const fBody = 'Un utilisateur que vous suivez a declenche un SOS a proximite';

      for (const sub of followerSubs ?? []) {
        const fs = fSettingsMap[sub.user_id];

        // Opt-out check
        if (fs?.notify_sos_followers === false) continue;

        // Geo-filter with follower radius (default 5000m)
        const radiusM = fs?.follower_sos_radius_m ?? 5000;
        const loc = fLocMap[sub.user_id];
        if (loc?.lat != null && loc?.lng != null) {
          const dist = haversineMetersRaw(loc.lat, loc.lng, pin.lat, pin.lng);
          if (dist > radiusM) continue;
        }

        // Channel routing
        const channel = fs?.sos_notif_channel ?? 'both';
        const shouldPush = channel === 'push' || channel === 'both';
        const shouldInApp = channel === 'in_app' || channel === 'both';

        if (shouldInApp) {
          inAppInserts.push({
            user_id: sub.user_id,
            type: 'emergency',
            title: fTitle,
            body: fBody,
            pin_id: pin.id,
          });
        }

        // Push (bypass quiet hours for SOS)
        if (shouldPush) {
          try {
            const { default: webpush } = await import('web-push');
            webpush.setVapidDetails(vapidDetails.subject, vapidDetails.publicKey, vapidDetails.privateKey);
            await webpush.sendNotification(
              sub.subscription as Parameters<typeof webpush.sendNotification>[0],
              JSON.stringify({ title: fTitle, body: fBody, pinId: pin.id }),
            );
            sent++;
          } catch {
            await admin.from('push_subscriptions').delete().eq('user_id', sub.user_id);
          }
        }
      }
    }
  }

  // ── Batch insert in-app notifications ──
  if (inAppInserts.length > 0) {
    await admin.from('notifications').insert(inAppInserts);
  }

  // ── SOS: email trusted circle members (fire-and-forget) ──
  if (pin.is_emergency && process.env.RESEND_API_KEY) {
    sendSosEmails(admin, pin).catch((err) => {
      console.error('[Email] SOS circle alert failed:', err instanceof Error ? err.message : err);
    });
  }

  return NextResponse.json({ sent, in_app: inAppInserts.length });
}

async function sendSosEmails(
  admin: ReturnType<typeof createAdminClient>,
  pin: { user_id: string; lat: number; lng: number },
) {
  // Get trigger user's name
  const { data: triggerProfile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', pin.user_id)
    .single();
  const triggerName = triggerProfile?.display_name ?? 'Un membre';

  // Get trusted circle members
  const { data: contacts } = await admin
    .from('trusted_contacts')
    .select('user_id, contact_id')
    .or(`user_id.eq.${pin.user_id},contact_id.eq.${pin.user_id}`)
    .eq('status', 'accepted');

  if (!contacts?.length) return;

  const contactIds = contacts.map((c) =>
    c.user_id === pin.user_id ? c.contact_id : c.user_id,
  );

  // Get contact profiles + emails
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .in('id', contactIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? 'there']));

  const triggeredAt = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  const locationLabel = `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = 'Breveil <onboarding@resend.dev>';

  await Promise.allSettled(
    contactIds.map(async (contactId) => {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(contactId);
      if (!authUser?.email) return;
      const template = sosCircleAlertEmail({
        recipientName: profileMap.get(contactId) ?? 'there',
        triggerName,
        triggeredAt,
        locationLabel,
      });
      await resend.emails.send({ from, to: authUser.email, subject: template.subject, html: template.html });
    }),
  );
}
