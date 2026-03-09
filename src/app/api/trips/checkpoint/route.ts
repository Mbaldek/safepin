// src/app/api/trips/checkpoint/route.ts
// POST: Insert a checkpoint for an active trip.

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

  // Verify the trip belongs to the authenticated user
  const { data: trip } = await admin.from('trip_log').select('user_id').eq('id', body.trip_id).single();
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
