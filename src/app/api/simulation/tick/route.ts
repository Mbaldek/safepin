// src/app/api/simulation/tick/route.ts
// POST: Simulate one tick of full lifecycle activity from simulated users.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  SIM_CATEGORIES, SIM_SEVERITIES, SIM_ENVIRONMENTS, SIM_URBAN_CONTEXTS,
  SIM_COMMENTS, SIM_GROUP_MESSAGES, SIM_TRIP_MODES,
  pick, pickActivityLocation, randomDateWithinHours, SimPlace,
} from '@/lib/simulation-data';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SimUser = { id: string; name: string; sim_places: SimPlace[] | null };

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    // ── Fetch simulated users with their places ──
    const { data: simUsers } = await admin
      .from('profiles')
      .select('id, name, sim_places')
      .eq('is_simulated', true)
      .limit(100);

    if (!simUsers?.length) {
      return NextResponse.json({ actions: ['No simulated users found. Seed first.'] });
    }

    // ── Fetch active sim data for context ──
    const [
      { data: simPins },
      { data: simCommunities },
      { data: activeTrips },
    ] = await Promise.all([
      admin.from('pins').select('id').eq('is_simulated', true).is('resolved_at', null).limit(100),
      admin.from('community_members')
        .select('community_id, user_id')
        .in('user_id', simUsers.map(u => u.id))
        .limit(200),
      admin.from('trip_log').select('id, user_id').eq('is_simulated', true).eq('status', 'active').limit(50),
    ]);

    // ── Pick 1-3 random actions ──
    const actionCount = 1 + Math.floor(Math.random() * 3);
    const actions: string[] = [];

    for (let i = 0; i < actionCount; i++) {
      const user = pick(simUsers) as SimUser;
      const places: SimPlace[] = (user.sim_places as SimPlace[]) ?? [];
      const roll = Math.random();

      // 0.00–0.30: New pin
      if (roll < 0.30 || !simPins?.length) {
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
        if (!error) actions.push(`📍 ${user.name} a signalé un${isEmergency ? ' 🆘 urgence' : ''} pin`);
      }

      // 0.30–0.40: Vote on pin
      else if (roll < 0.40 && simPins?.length) {
        const pin = pick(simPins);
        const { error } = await admin.from('pin_votes').insert({
          pin_id: pin.id,
          user_id: user.id,
          vote_type: 'confirm',
        });
        if (!error) actions.push(`👍 ${user.name} a confirmé un pin`);
      }

      // 0.40–0.50: Comment on pin
      else if (roll < 0.50 && simPins?.length) {
        const pin = pick(simPins);
        const { error } = await admin.from('pin_comments').insert({
          pin_id: pin.id,
          user_id: user.id,
          display_name: user.name,
          content: pick(SIM_COMMENTS),
        });
        if (!error) actions.push(`💬 ${user.name} a commenté un pin`);
      }

      // 0.50–0.65: Group message
      else if (roll < 0.65 && simCommunities?.length) {
        const userCommunities = simCommunities.filter(m => m.user_id === user.id);
        if (userCommunities.length > 0) {
          const membership = pick(userCommunities);
          const { error } = await admin.from('community_messages').insert({
            community_id: membership.community_id,
            user_id: user.id,
            display_name: user.name,
            content: pick(SIM_GROUP_MESSAGES),
            visibility: 'public',
          });
          if (!error) actions.push(`🗣️ ${user.name} a envoyé un message de groupe`);
        }
      }

      // 0.65–0.75: Start trip
      else if (roll < 0.75 && places.length >= 2) {
        const origin = places.find(p => p.role === 'home') ?? places[0];
        const dest = places.find(p => p.role === 'work') ?? places[1];
        const mode = pick(SIM_TRIP_MODES);
        const distM = haversineMeters(origin.lat, origin.lng, dest.lat, dest.lng);
        const speedMs = mode === 'walk' ? 1.4 : mode === 'bike' ? 4.5 : 8.0;
        const durationS = Math.round(distM / speedMs);

        const { error } = await admin.from('trip_log').insert({
          user_id: user.id,
          from_label: origin.label,
          to_label: dest.label,
          mode,
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          dest_lat: dest.lat,
          dest_lng: dest.lng,
          distance_m: Math.round(distM),
          planned_duration_s: durationS,
          started_at: new Date().toISOString(),
          status: 'active',
          is_simulated: true,
        });
        if (!error) actions.push(`🚶 ${user.name} a lancé un trajet ${mode} → ${dest.label}`);
      }

      // 0.75–0.80: Complete trip
      else if (roll < 0.80 && activeTrips?.length) {
        const trip = pick(activeTrips);
        const durationS = 300 + Math.floor(Math.random() * 2400); // 5-45 min
        const { error } = await admin.from('trip_log').update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          actual_duration_s: durationS,
        }).eq('id', trip.id);
        if (!error) actions.push(`✅ Trajet terminé (${Math.round(durationS / 60)} min)`);
      }

      // 0.80–0.90: Add follower
      else if (roll < 0.90 && simUsers.length >= 2) {
        const other = pick(simUsers.filter(u => u.id !== user.id)) as SimUser;
        if (other) {
          // Check if already connected
          const { data: existing } = await admin.from('trusted_contacts')
            .select('id')
            .or(`and(user_id.eq.${user.id},contact_id.eq.${other.id}),and(user_id.eq.${other.id},contact_id.eq.${user.id})`)
            .limit(1);

          if (!existing?.length) {
            const { error } = await admin.from('trusted_contacts').insert({
              user_id: user.id,
              contact_id: other.id,
              contact_name: other.name,
              status: 'accepted',
            });
            if (!error) actions.push(`🤝 ${user.name} a ajouté ${other.name} en contact`);
          }
        }
      }

      // 0.90–1.00: Walk session (completed)
      else if (simUsers.length >= 2) {
        const companion = pick(simUsers.filter(u => u.id !== user.id)) as SimUser;
        if (companion) {
          const destPlace = places.length > 0 ? pick(places) : null;
          const startedAt = randomDateWithinHours(2);
          const { error } = await admin.from('walk_sessions').insert({
            creator_id: user.id,
            companion_id: companion.id,
            status: 'completed',
            destination: destPlace?.label ?? 'Destination',
            started_at: startedAt,
            ended_at: new Date().toISOString(),
          });
          if (!error) actions.push(`🚶‍♀️ ${user.name} + ${companion.name} marche accompagnée terminée`);
        }
      }
    }

    return NextResponse.json({ actions });
  } catch (err) {
    console.error('[simulate-activity]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
