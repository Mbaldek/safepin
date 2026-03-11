// src/app/api/trips/start/route.ts
// POST: Create a trip_log row with status='active', set profiles.active_trip_id,
// and notify trusted circle members.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const MODE_EMOJI: Record<string, string> = {
  walk: '🚶', bike: '🚲', drive: '🚗', transit: '🚇',
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  if (!body.to_label) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from('trip_log').insert({
    user_id: user.id,
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
  await admin.from('profiles').update({ active_trip_id: data.id }).eq('id', user.id);

  // ── Notify trusted circle (fire-and-forget) ────────────────────────────────
  notifyCircle(admin, { user_id: user.id, to_label: body.to_label, mode: body.mode }, data.id).catch(() => {});

  return NextResponse.json({ trip_id: data.id });
}

async function notifyCircle(
  admin: ReturnType<typeof createAdminClient>,
  body: { user_id: string; to_label: string; mode: string },
  tripId: string,
) {
  // Fetch profile + contacts in parallel
  const [{ data: profile }, { data: contacts }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', body.user_id).single(),
    admin.from('trusted_contacts').select('user_id, contact_id')
      .or(`user_id.eq.${body.user_id},contact_id.eq.${body.user_id}`)
      .eq('status', 'accepted'),
  ]);
  const name = profile?.display_name ?? 'Someone';

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
