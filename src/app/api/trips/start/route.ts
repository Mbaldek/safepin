// src/app/api/trips/start/route.ts
// POST: Create a trip_log row with status='active' and set profiles.active_trip_id.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

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

  return NextResponse.json({ trip_id: data.id });
}
