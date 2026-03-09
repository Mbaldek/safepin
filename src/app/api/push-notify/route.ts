// src/app/api/push-notify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

// Only import web-push if the env vars are configured
async function sendPushNotifications(payload: { title: string; body: string }) {
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!vapidPublic || !vapidPrivate || !vapidSubject || !serviceKey) {
    return { sent: 0, reason: 'push not configured' };
  }

  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (!rows?.length) return { sent: 0 };

  const results = await Promise.allSettled(
    rows.map((row) =>
      webpush.sendNotification(
        row.subscription,
        JSON.stringify({ ...payload, url: '/map' })
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410) expiredEndpoints.push(rows[i].subscription.endpoint);
    }
  });
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('subscription->>endpoint', expiredEndpoints);
  }

  return { sent: results.filter((r) => r.status === 'fulfilled').length };
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

  // Admin-only: only admins can broadcast push notifications
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await sendPushNotifications({
      title: body.title ?? '🆘 Breveil — Emergency nearby',
      body:  body.body  ?? 'Someone needs help in your area',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('push-notify error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
