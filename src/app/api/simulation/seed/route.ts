// src/app/api/simulation/seed/route.ts
// POST: Seed Paris with simulated users, pins, communities, trusted contacts, and optionally safe spaces.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  FIRST_NAMES, LAST_NAMES,
  SIM_CATEGORIES, SIM_SEVERITIES, SIM_ENVIRONMENTS, SIM_URBAN_CONTEXTS,
  SIM_COMMUNITY_NAMES, SIM_COMMUNITY_EMOJIS,
  pick, randomDateWithinHours,
  generateUserPlaces, pickActivityLocation, generatePartnerSafeSpaces,
  SimPlace,
} from '@/lib/simulation-data';

// ── G3: Hard caps ──
const CAPS = {
  users:       { max: 200,  default: 50  },
  pins:        { max: 1000, default: 100 },
  communities: { max: 5,    default: 3   },
  contacts:    { max: 4,    default: 2   },
  safeSpaces:  { max: 100,  default: 30  },
};

function clamp(val: number | undefined, cap: { max: number; default: number }): number {
  return Math.min(Math.max(val ?? cap.default, 1), cap.max);
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const body = await req.json();

    const userCount      = clamp(body.userCount, CAPS.users);
    const pinCount       = clamp(body.pinCount, CAPS.pins);
    const communityCount = clamp(body.communityCount, CAPS.communities);
    const contactsPerUser = clamp(body.contactsPerUser, CAPS.contacts);
    const seedSafeSpaces = body.seedSafeSpaces === true;
    const safeSpaceCount = clamp(body.safeSpaceCount, CAPS.safeSpaces);

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
          const email = `sim_${idx}_${Date.now()}@sim.breveil.app`;

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

    // ── Step 3: Create simulated communities + members ──
    let communitiesCreated = 0;
    const actualCommunityCount = Math.min(communityCount, SIM_COMMUNITY_NAMES.length);

    for (let c = 0; c < actualCommunityCount; c++) {
      const owner = pick(createdUsers);
      const { data: community, error: comErr } = await admin.from('communities').insert({
        name: SIM_COMMUNITY_NAMES[c],
        description: `Groupe de veille sécurité — ${SIM_COMMUNITY_NAMES[c]}`,
        is_private: false,
        owner_id: owner.id,
        avatar_emoji: SIM_COMMUNITY_EMOJIS[c % SIM_COMMUNITY_EMOJIS.length],
        community_type: 'group',
      }).select('id').single();

      if (comErr || !community) continue;

      // Add 10-40 random members (including owner)
      const memberCount = Math.min(10 + Math.floor(Math.random() * 30), createdUsers.length);
      const shuffled = [...createdUsers].sort(() => Math.random() - 0.5);
      const members = shuffled.slice(0, memberCount);
      // Ensure owner is included
      if (!members.find(m => m.id === owner.id)) {
        members[0] = owner;
      }

      await admin.from('community_members').insert(
        members.map(m => ({ community_id: community.id, user_id: m.id })),
      );
      communitiesCreated++;
    }

    // ── Step 4: Create trusted_contact pairs ──
    let contactsCreated = 0;
    const contactPairs = new Set<string>();

    for (const user of createdUsers) {
      const numContacts = Math.min(contactsPerUser, createdUsers.length - 1);
      const candidates = createdUsers.filter(u => u.id !== user.id);
      const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, numContacts);

      const rows = [];
      for (const contact of shuffled) {
        const pairKey = [user.id, contact.id].sort().join(':');
        if (contactPairs.has(pairKey)) continue;
        contactPairs.add(pairKey);
        rows.push({
          user_id: user.id,
          contact_id: contact.id,
          contact_name: contact.name,
          status: 'accepted',
        });
      }

      if (rows.length > 0) {
        const { error } = await admin.from('trusted_contacts').insert(rows);
        if (!error) contactsCreated += rows.length;
      }
    }

    // ── Step 5: Optionally seed partner safe spaces ──
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
      communities_created: communitiesCreated,
      contacts_created: contactsCreated,
      safe_spaces_created: safeSpacesCreated,
    });
  } catch (err) {
    console.error('[seed-paris]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
