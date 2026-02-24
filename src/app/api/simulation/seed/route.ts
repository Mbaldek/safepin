// src/app/api/simulation/seed/route.ts
// POST: Seed Paris with simulated users (per-user places), pins, and optionally partner safe spaces.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  FIRST_NAMES, LAST_NAMES,
  SIM_CATEGORIES, SIM_SEVERITIES, SIM_ENVIRONMENTS, SIM_URBAN_CONTEXTS,
  pick, randomDateWithinHours,
  generateUserPlaces, pickActivityLocation, generatePartnerSafeSpaces,
  SimPlace,
} from '@/lib/simulation-data';

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    const body = await req.json();
    const userCount = Math.min(Math.max(body.userCount ?? 200, 1), 1000);
    const pinCount = Math.min(Math.max(body.pinCount ?? 500, 1), 5000);
    const seedSafeSpaces = body.seedSafeSpaces === true;
    const safeSpaceCount = Math.min(Math.max(body.safeSpaceCount ?? 100, 1), 500);

    // ── Step 1: Create auth users + profiles with sim_places ──
    const createdUsers: { id: string; name: string; places: SimPlace[] }[] = [];
    const BATCH = 50;

    for (let i = 0; i < userCount; i += BATCH) {
      const batchSize = Math.min(BATCH, userCount - i);
      const results = await Promise.all(
        Array.from({ length: batchSize }, async (_, j) => {
          const idx = i + j;
          const firstName = pick(FIRST_NAMES);
          const lastName = pick(LAST_NAMES);
          const email = `sim_${idx}_${Date.now()}@sim.brume.app`;

          const { data, error } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { is_simulated: true },
          });
          if (error || !data.user) return null;

          const places = generateUserPlaces();
          return { id: data.user.id, name: `${firstName} ${lastName}`, places };
        }),
      );

      const valid = results.filter(Boolean) as typeof createdUsers;
      if (valid.length > 0) {
        await admin.from('profiles').upsert(
          valid.map((u) => ({
            id: u.id,
            name: u.name,
            display_name: u.name,
            is_simulated: true,
            sim_places: u.places,
            created_at: randomDateWithinHours(720),
          })),
          { onConflict: 'id' },
        );
        createdUsers.push(...valid);
      }
    }

    if (createdUsers.length === 0) {
      return NextResponse.json({ error: 'Failed to create any users' }, { status: 500 });
    }

    // ── Step 2: Create pins using per-user places ──
    const PIN_BATCH = 200;
    let pinsCreated = 0;

    for (let i = 0; i < pinCount; i += PIN_BATCH) {
      const batchSize = Math.min(PIN_BATCH, pinCount - i);
      const pinRows = Array.from({ length: batchSize }, () => {
        const user = pick(createdUsers);
        const loc = pickActivityLocation(user.places);

        return {
          user_id: user.id,
          lat: loc.lat,
          lng: loc.lng,
          category: pick(SIM_CATEGORIES),
          severity: pick(SIM_SEVERITIES),
          description: '',
          environment: pick(SIM_ENVIRONMENTS),
          urban_context: pick(SIM_URBAN_CONTEXTS),
          is_emergency: Math.random() < 0.1,
          is_simulated: true,
          created_at: randomDateWithinHours(24),
        };
      });

      const { error: pinErr } = await admin.from('pins').insert(pinRows);
      if (!pinErr) pinsCreated += batchSize;
    }

    // ── Step 3: Optionally seed partner safe spaces ──
    let safeSpacesCreated = 0;
    if (seedSafeSpaces) {
      const rows = generatePartnerSafeSpaces(safeSpaceCount);
      const SS_BATCH = 50;
      for (let i = 0; i < rows.length; i += SS_BATCH) {
        const batch = rows.slice(i, i + SS_BATCH);
        const { error } = await admin.from('safe_spaces').insert(batch);
        if (!error) safeSpacesCreated += batch.length;
      }
    }

    return NextResponse.json({
      users_created: createdUsers.length,
      pins_created: pinsCreated,
      safe_spaces_created: safeSpacesCreated,
    });
  } catch (err) {
    console.error('[seed-paris]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
