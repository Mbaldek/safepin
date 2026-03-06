// src/app/api/push-notify-dm/route.ts
// Targeted push notification to a single user (for DM notifications)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

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

  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json({ sent: 0, reason: 'push not configured' });
  }

  try {
    const { recipientId, title, body } = await req.json();
    if (!recipientId || !title) {
      return NextResponse.json({ error: 'Missing recipientId or title' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check recipient's notification settings
    const { data: settings } = await admin
      .from('notification_settings')
      .select('notify_dm, quiet_hours_enabled, quiet_start, quiet_end')
      .eq('user_id', recipientId)
      .single();

    // Default to notify_dm = true if no settings row
    if (settings?.notify_dm === false) {
      return NextResponse.json({ sent: 0, reason: 'dm notifications disabled' });
    }

    // Respect quiet hours
    if (settings?.quiet_hours_enabled) {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const start = settings.quiet_start ?? '22:00';
      const end = settings.quiet_end ?? '07:00';
      const inQuiet = start < end
        ? hhmm >= start && hhmm < end
        : hhmm >= start || hhmm < end;
      if (inQuiet) {
        return NextResponse.json({ sent: 0, reason: 'quiet hours' });
      }
    }

    // Fetch push subscriptions for this specific user
    const { data: rows } = await admin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', recipientId);

    if (!rows?.length) {
      return NextResponse.json({ sent: 0, reason: 'no subscription' });
    }

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const payload = JSON.stringify({ title, body: body ?? '', url: '/map' });

    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription, payload))
    );

    // Cleanup expired subscriptions
    const expired: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number };
        if (err?.statusCode === 410) expired.push(rows[i].subscription.endpoint);
      }
    });
    if (expired.length > 0) {
      await admin
        .from('push_subscriptions')
        .delete()
        .in('subscription->>endpoint', expired);
    }

    return NextResponse.json({ sent: results.filter((r) => r.status === 'fulfilled').length });
  } catch (err) {
    console.error('push-notify-dm error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
