// src/app/api/trips/checkpoint/route.ts
// POST: Insert a checkpoint for an active trip.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    trip_id: string;
    checkpoint_type: string;
    label?: string;
    lat: number;
    lng: number;
    expected_at?: string;
    notes?: string;
  };

  if (!body.trip_id || !body.checkpoint_type || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from('trip_checkpoints').insert({
    trip_id: body.trip_id,
    checkpoint_type: body.checkpoint_type,
    label: body.label ?? null,
    lat: body.lat,
    lng: body.lng,
    expected_at: body.expected_at ?? null,
    notes: body.notes ?? null,
  }).select('id').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkpoint_id: data.id });
}
