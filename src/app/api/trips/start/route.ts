// src/app/api/trips/start/route.ts
// POST: Create a trip_log row with status='active', set profiles.active_trip_id,
// and notify trusted circle members.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const MODE_EMOJI: Record<string, string> = {
  walk: '🚶', bike: '🚲', drive: '🚗', transit: '🚇',
};

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    user_id: string;
    from_label: string;
    to_label: string;
    mode: string;
    origin_lat: number;
    origin_lng: number;
    dest_lat: number;
    dest_lng: number;
    planned_duration_s: number;
    danger_score: number;
    distance_m: number;
  };

  if (!body.user_id || !body.to_label) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from('trip_log').insert({
    user_id: body.user_id,
    from_label: body.from_label,
    to_label: body.to_label,
    mode: body.mode,
    travel_mode: body.mode,
    origin_lat: body.origin_lat,
    origin_lng: body.origin_lng,
    dest_lat: body.dest_lat,
    dest_lng: body.dest_lng,
    planned_duration_s: body.planned_duration_s,
    danger_score: body.danger_score,
    distance_m: body.distance_m,
    started_at: new Date().toISOString(),
    status: 'active',
  }).select('id').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Set active_trip_id on profile
  await admin.from('profiles').update({ active_trip_id: data.id }).eq('id', body.user_id);

  // ── Notify trusted circle (fire-and-forget) ────────────────────────────────
  notifyCircle(admin, body, data.id).catch(() => {});

  return NextResponse.json({ trip_id: data.id });
}

async function notifyCircle(
  admin: ReturnType<typeof createAdminClient>,
  body: { user_id: string; to_label: string; mode: string },
  tripId: string,
) {
  // Get user display name
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', body.user_id)
    .single();
  const name = profile?.display_name ?? 'Someone';

  // Get accepted trusted contacts (both directions)
  const { data: contacts } = await admin
    .from('trusted_contacts')
    .select('user_id, contact_id')
    .or(`user_id.eq.${body.user_id},contact_id.eq.${body.user_id}`)
    .eq('status', 'accepted');

  if (!contacts?.length) return;

  const contactUserIds = contacts.map((c) =>
    c.user_id === body.user_id ? c.contact_id : c.user_id,
  );

  const emoji = MODE_EMOJI[body.mode] ?? '📍';
  const title = `${emoji} ${name} est en route`;
  const notifBody = `${name} → ${body.to_label}`;

  // Insert in-app notifications for each contact
  const now = new Date().toISOString();
  const notifRows = contactUserIds.map((uid) => ({
    id: crypto.randomUUID(),
    user_id: uid,
    type: 'trip_share',
    title,
    body: notifBody,
    read: false,
    created_at: now,
    data: { trip_id: tripId, traveler_id: body.user_id },
  }));

  await admin.from('notifications').insert(notifRows);

  // Send push notifications to circle members
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', contactUserIds);

  if (!subs?.length) return;

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return;

  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  await Promise.allSettled(
    subs.map((row) =>
      webpush.sendNotification(
        row.subscription,
        JSON.stringify({ title, body: notifBody, url: '/map', data: { type: 'trip_started', trip_id: tripId } }),
      ),
    ),
  );
}
