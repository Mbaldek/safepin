// src/app/api/notify-nearby/route.ts
// Called when a new pin is created — notifies users within their configured radius.
// Triggered by the client immediately after pin insert.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import { haversineMetersRaw } from '@/lib/utils';
import { Resend } from 'resend';
import { sosCircleAlertEmail } from '@/lib/email-templates';

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

  const { pin } = await req.json() as {
    pin: { id: string; lat: number; lng: number; is_emergency: boolean; category: string; severity: string; user_id: string };
  };

  if (!pin) return NextResponse.json({ sent: 0 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'service role key not configured' }, { status: 500 });

  const admin = createAdminClient();

  // Load all push subscriptions (except the pin creator)
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')
    .neq('user_id', pin.user_id);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  // Load notif settings for those users (default 1000m if not set)
  const userIds = subs.map((s) => s.user_id);
  const { data: settingsRows } = await admin
    .from('notification_settings')
    .select('user_id, proximity_radius_m, notify_sos_nearby, notify_nearby_pins, quiet_hours_enabled, quiet_start, quiet_end')
    .in('user_id', userIds);

  const settingsMap = Object.fromEntries((settingsRows ?? []).map((r) => [r.user_id, r]));

  // Load last known locations for geo-filtering
  const { data: locationRows } = await admin
    .from('profiles')
    .select('id, last_known_lat, last_known_lng')
    .in('id', userIds);
  const locationMap = Object.fromEntries(
    (locationRows ?? []).map((r) => [r.id, { lat: r.last_known_lat, lng: r.last_known_lng }])
  );

  const title = pin.is_emergency ? '🆘 SOS nearby' : `⚠️ New ${pin.category.replace('_', ' ')} nearby`;
  const body  = pin.is_emergency ? 'Someone nearby triggered a safety alert' : `A new ${pin.severity} severity report was added near you`;

  const vapidDetails = {
    subject: 'mailto:brumeapp@pm.me',
    publicKey:  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  };

  let sent = 0;

  for (const sub of subs) {
    const s = settingsMap[sub.user_id];
    const radiusM = s?.proximity_radius_m ?? 1000;
    const notifyPins = s?.notify_nearby_pins ?? true;
    const notifySOS  = s?.notify_sos_nearby  ?? true;

    if (pin.is_emergency && !notifySOS)  continue;
    if (!pin.is_emergency && !notifyPins) continue;

    // Quiet hours check (simple string compare, good enough for HH:MM)
    if (s?.quiet_hours_enabled) {
      const now  = new Date().toTimeString().slice(0, 5);
      const start = s.quiet_start ?? '22:00';
      const end   = s.quiet_end   ?? '07:00';
      const inQuiet = start > end
        ? now >= start || now < end
        : now >= start && now < end;
      if (inQuiet && !pin.is_emergency) continue;
    }

    // Geo-filter: only send if subscriber is within their configured radius
    const loc = locationMap[sub.user_id];
    if (loc?.lat != null && loc?.lng != null) {
      const dist = haversineMetersRaw(loc.lat, loc.lng, pin.lat, pin.lng);
      if (dist > radiusM) continue;
    }
    // If no location data, send to them anyway (better to over-notify than miss SOS)

    // Send push via web-push
    try {
      const { default: webpush } = await import('web-push');
      webpush.setVapidDetails(vapidDetails.subject, vapidDetails.publicKey, vapidDetails.privateKey);
      await webpush.sendNotification(
        sub.subscription as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify({ title, body, pinId: pin.id }),
      );
      sent++;
    } catch {
      // Subscription expired — clean up
      await admin.from('push_subscriptions').delete().eq('user_id', sub.user_id);
    }
  }

  // ── SOS: email trusted circle members (fire-and-forget) ──────────────────
  if (pin.is_emergency && process.env.RESEND_API_KEY) {
    sendSosEmails(admin, pin).catch((err) => {
      console.error('[Email] SOS circle alert failed:', err instanceof Error ? err.message : err);
    });
  }

  return NextResponse.json({ sent });
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
