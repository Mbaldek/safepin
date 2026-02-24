// src/app/api/simulation/seed/route.ts
// POST: Seed Paris with simulated auth users, profiles, and pins.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// ─── French name pools ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Camille','Lea','Manon','Chloe','Emma','Ines','Jade','Louise','Alice','Lina',
  'Lucas','Hugo','Louis','Nathan','Gabriel','Arthur','Jules','Raphael','Adam','Leo',
  'Clara','Sarah','Eva','Margot','Zoe','Nora','Lucie','Romane','Juliette','Elsa',
  'Tom','Theo','Ethan','Noah','Maxime','Romain','Antoine','Paul','Alexandre','Victor',
];

const LAST_NAMES = [
  'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau',
  'Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier',
  'Morel','Girard','Andre','Lefevre','Mercier','Dupont','Lambert','Bonnet','Francois','Martinez',
];

// ─── Paris hotspots ──────────────────────────────────────────────────────────

const HOTSPOTS = [
  { lat: 48.8584, lng: 2.3474 }, // Chatelet
  { lat: 48.8809, lng: 2.3553 }, // Gare du Nord
  { lat: 48.8847, lng: 2.3493 }, // Barbes
  { lat: 48.8675, lng: 2.3636 }, // Republique
  { lat: 48.8822, lng: 2.3374 }, // Pigalle
  { lat: 48.8533, lng: 2.3694 }, // Bastille
  { lat: 48.8486, lng: 2.3960 }, // Nation
  { lat: 48.8714, lng: 2.3767 }, // Belleville
];

const CATEGORIES = ['harassment', 'stalking', 'dark_area', 'aggression', 'drunk', 'other'] as const;
const SEVERITIES = ['low', 'med', 'high'] as const;
const ENVIRONMENTS = ['foot', 'metro', 'bus', 'cycling', 'car', 'indoor'] as const;
const URBAN_CONTEXTS = ['street', 'parking', 'store', 'metro', 'bus', 'park', 'restaurant', 'building'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomOffset(range = 0.005): number {
  return (Math.random() - 0.5) * 2 * range;
}

function randomDateWithinHours(hours: number): string {
  return new Date(Date.now() - Math.floor(Math.random() * hours * 3600000)).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // ── Parse body ──
    const body = await req.json();
    const userCount = Math.min(Math.max(body.userCount ?? 200, 1), 1000);
    const pinCount = Math.min(Math.max(body.pinCount ?? 500, 1), 5000);

    // ── Step 1: Create auth users + profiles ──
    const createdUserIds: string[] = [];
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
          return { id: data.user.id, name: `${firstName} ${lastName}` };
        }),
      );

      const valid = results.filter(Boolean) as { id: string; name: string }[];
      if (valid.length > 0) {
        await admin.from('profiles').upsert(
          valid.map((u) => ({
            id: u.id,
            name: u.name,
            display_name: u.name,
            is_simulated: true,
            created_at: randomDateWithinHours(720),
          })),
          { onConflict: 'id' },
        );
        createdUserIds.push(...valid.map((u) => u.id));
      }
    }

    if (createdUserIds.length === 0) {
      return NextResponse.json({ error: 'Failed to create any users' }, { status: 500 });
    }

    // ── Step 2: Create pins ──
    const PIN_BATCH = 200;
    let pinsCreated = 0;

    for (let i = 0; i < pinCount; i += PIN_BATCH) {
      const batchSize = Math.min(PIN_BATCH, pinCount - i);
      const pinRows = Array.from({ length: batchSize }, () => {
        const hotspot = pick(HOTSPOTS);
        return {
          user_id: pick(createdUserIds),
          lat: hotspot.lat + randomOffset(),
          lng: hotspot.lng + randomOffset(),
          category: pick(CATEGORIES),
          severity: pick(SEVERITIES),
          description: '',
          environment: pick(ENVIRONMENTS),
          urban_context: pick(URBAN_CONTEXTS),
          is_emergency: Math.random() < 0.1,
          is_simulated: true,
          created_at: randomDateWithinHours(48),
        };
      });

      const { error: pinErr } = await admin.from('pins').insert(pinRows);
      if (!pinErr) pinsCreated += batchSize;
    }

    return NextResponse.json({ users_created: createdUserIds.length, pins_created: pinsCreated });
  } catch (err) {
    console.error('[seed-paris]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
