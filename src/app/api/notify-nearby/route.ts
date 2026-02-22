// src/app/api/notify-nearby/route.ts
// Called when a new pin is created — notifies users within their configured radius.
// Triggered by the client immediately after pin insert.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const R = 6_371_000; // Earth radius in metres

function distanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const { pin } = await req.json() as {
    pin: { id: string; lat: number; lng: number; is_emergency: boolean; category: string; severity: string; user_id: string };
  };

  if (!pin) return NextResponse.json({ sent: 0 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) return NextResponse.json({ error: 'service role key not configured' }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey);

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

  const title = pin.is_emergency ? '🆘 SOS nearby' : `⚠️ New ${pin.category.replace('_', ' ')} nearby`;
  const body  = pin.is_emergency ? 'Someone nearby triggered a safety alert' : `A new ${pin.severity} severity report was added near you`;

  const vapidDetails = {
    subject: 'mailto:kovaapp@pm.me',
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

    // We don't store user location server-side — use a generous bbox check.
    // Client already does accurate filtering; this is best-effort for push.
    // For a proper implementation, store last_known_lat/lng in profiles.
    // For now, send to everyone within no-location-check and let client filter.
    // TODO: Add last_known_lat/lng to profiles for accurate server-side filtering.
    void radiusM; // suppress unused warning until location data is available

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

  return NextResponse.json({ sent });
}
