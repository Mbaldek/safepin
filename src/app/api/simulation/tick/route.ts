// src/app/api/simulation/tick/route.ts
// POST: Simulate one tick of activity from simulated users using their personal places.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  SIM_CATEGORIES, SIM_SEVERITIES, SIM_ENVIRONMENTS, SIM_URBAN_CONTEXTS, SIM_COMMENTS,
  pick, pickActivityLocation, SimPlace,
} from '@/lib/simulation-data';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    // ── Fetch simulated users with their places + active pins ──
    const { data: simUsers } = await admin
      .from('profiles')
      .select('id, name, sim_places')
      .eq('is_simulated', true)
      .limit(100);

    if (!simUsers?.length) {
      return NextResponse.json({ actions: ['No simulated users found. Seed first.'] });
    }

    const { data: simPins } = await admin
      .from('pins')
      .select('id')
      .eq('is_simulated', true)
      .is('resolved_at', null)
      .limit(100);

    // ── Pick 1-3 random actions ──
    const actionCount = 1 + Math.floor(Math.random() * 3);
    const actions: string[] = [];

    for (let i = 0; i < actionCount; i++) {
      const user = pick(simUsers);
      const places: SimPlace[] = (user.sim_places as SimPlace[]) ?? [];
      const roll = Math.random();

      if (roll < 0.60 || !simPins?.length) {
        // Create new pin near one of the user's places
        const loc = pickActivityLocation(places);
        const isEmergency = Math.random() < 0.1;
        const { error } = await admin.from('pins').insert({
          user_id: user.id,
          lat: loc.lat,
          lng: loc.lng,
          category: pick(SIM_CATEGORIES),
          severity: pick(SIM_SEVERITIES),
          description: '',
          environment: pick(SIM_ENVIRONMENTS),
          urban_context: pick(SIM_URBAN_CONTEXTS),
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
          content: pick(SIM_COMMENTS),
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
