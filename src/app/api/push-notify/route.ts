// src/app/api/push-notify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

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
  try {
    const body = await req.json();
    const result = await sendPushNotifications({
      title: body.title ?? '🆘 KOVA — Emergency nearby',
      body:  body.body  ?? 'Someone needs help in your area',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('push-notify error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
