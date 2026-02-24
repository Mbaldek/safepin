// src/app/api/simulation/tick/route.ts
// POST: Simulate one tick of activity from simulated users.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const HOTSPOTS = [
  { lat: 48.8584, lng: 2.3474 },
  { lat: 48.8809, lng: 2.3553 },
  { lat: 48.8847, lng: 2.3493 },
  { lat: 48.8675, lng: 2.3636 },
  { lat: 48.8822, lng: 2.3374 },
  { lat: 48.8533, lng: 2.3694 },
  { lat: 48.8486, lng: 2.3960 },
  { lat: 48.8714, lng: 2.3767 },
];

const CATEGORIES = ['harassment', 'stalking', 'dark_area', 'aggression', 'drunk', 'other'] as const;
const SEVERITIES = ['low', 'med', 'high'] as const;
const ENVIRONMENTS = ['foot', 'metro', 'bus', 'cycling', 'car', 'indoor'] as const;
const URBAN_CONTEXTS = ['street', 'parking', 'store', 'metro', 'bus', 'park', 'restaurant', 'building'] as const;

const COMMENTS = [
  'Be careful around here, I saw the same thing yesterday.',
  'This area is usually fine during the day.',
  'I can confirm this, happened to me too.',
  'Thanks for reporting, will avoid this spot tonight.',
  'The lighting here is really bad after 9pm.',
  'I walk here every day, first time seeing this.',
  'Stay safe everyone.',
  'Reported to local authorities as well.',
];

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomOffset(range = 0.005): number {
  return (Math.random() - 0.5) * 2 * range;
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // ── Auth check ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(authHeader.slice(7));
    if (authErr || !caller) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const { data: callerProfile } = await admin.from('profiles').select('is_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // ── Fetch simulated users + active pins ──
    const { data: simUsers } = await admin.from('profiles').select('id, name').eq('is_simulated', true).limit(100);
    if (!simUsers?.length) {
      return NextResponse.json({ actions: ['No simulated users found. Seed first.'] });
    }

    const { data: simPins } = await admin.from('pins').select('id').eq('is_simulated', true).is('resolved_at', null).limit(100);

    // ── Pick 1-3 random actions ──
    const actionCount = 1 + Math.floor(Math.random() * 3);
    const actions: string[] = [];

    for (let i = 0; i < actionCount; i++) {
      const user = pick(simUsers);
      const roll = Math.random();

      if (roll < 0.60 || !simPins?.length) {
        // Create new pin
        const hotspot = pick(HOTSPOTS);
        const isEmergency = Math.random() < 0.1;
        const { error } = await admin.from('pins').insert({
          user_id: user.id,
          lat: hotspot.lat + randomOffset(),
          lng: hotspot.lng + randomOffset(),
          category: pick(CATEGORIES),
          severity: pick(SEVERITIES),
          description: '',
          environment: pick(ENVIRONMENTS),
          urban_context: pick(URBAN_CONTEXTS),
          is_emergency: isEmergency,
          is_simulated: true,
        });
        if (!error) actions.push(`${user.name} reported a new ${isEmergency ? 'emergency ' : ''}pin`);
      } else if (roll < 0.85) {
        // Vote on existing pin
        const pin = pick(simPins);
        const { error } = await admin.from('pin_votes').insert({
          pin_id: pin.id,
          user_id: user.id,
          vote_type: 'confirm',
        });
        if (!error) actions.push(`${user.name} confirmed a pin`);
      } else {
        // Comment on existing pin
        const pin = pick(simPins);
        const { error } = await admin.from('pin_comments').insert({
          pin_id: pin.id,
          user_id: user.id,
          display_name: user.name,
          content: pick(COMMENTS),
        });
        if (!error) actions.push(`${user.name} commented on a pin`);
      }
    }

    return NextResponse.json({ actions });
  } catch (err) {
    console.error('[simulate-activity]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
