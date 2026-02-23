// src/app/api/trips/end/route.ts
// POST: End an active trip — update trip_log, clear profiles.active_trip_id.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    trip_id: string;
    user_id: string;
    actual_duration_s: number;
    incidents_encountered?: number;
    nudges_sent?: number;
    escalated?: boolean;
    status: 'completed' | 'cancelled' | 'expired';
  };

  if (!body.trip_id || !body.user_id || !body.status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

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
  await admin.from('profiles').update({ active_trip_id: null }).eq('id', body.user_id);

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
