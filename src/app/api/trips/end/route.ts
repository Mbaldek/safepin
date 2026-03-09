// src/app/api/trips/end/route.ts
// POST: End an active trip — update trip_log, clear profiles.active_trip_id.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    trip_id: string;
    user_id: string;
    actual_duration_s: number;
    incidents_encountered?: number;
    nudges_sent?: number;
    escalated?: boolean;
    status: 'completed' | 'cancelled' | 'expired';
  };

  if (!body.trip_id || !body.status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify trip ownership
  const { data: trip } = await admin
    .from('trip_log')
    .select('user_id')
    .eq('id', body.trip_id)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('trip_log').update({
    actual_duration_s: body.actual_duration_s,
    incidents_encountered: body.incidents_encountered ?? 0,
    nudges_sent: body.nudges_sent ?? 0,
    escalated: body.escalated ?? false,
    status: body.status,
    ended_at: new Date().toISOString(),
  }).eq('id', body.trip_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clear active_trip_id on profile
  await admin.from('profiles').update({ active_trip_id: null }).eq('id', user.id);

  // Return trip summary data
  const { data: tripData } = await admin.from('trip_log').select('*').eq('id', body.trip_id).single();
  const { count: checkpointCount } = await admin.from('trip_checkpoints')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', body.trip_id);

  return NextResponse.json({
    trip: tripData,
    checkpoints_reached: checkpointCount ?? 0,
  });
}
