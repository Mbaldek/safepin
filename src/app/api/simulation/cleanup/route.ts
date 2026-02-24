// src/app/api/simulation/cleanup/route.ts
// POST: Delete all simulated data (users, pins, safe spaces, votes, comments) using admin client.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // ── 1. Delete pin_votes by simulated users ──
    const { data: simProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('is_simulated', true);
    const simUserIds = (simProfiles ?? []).map((p) => p.id);

    let deletedVotes = 0;
    let deletedComments = 0;

    if (simUserIds.length > 0) {
      const { count: vc } = await admin
        .from('pin_votes')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      deletedVotes = vc ?? 0;

      const { count: cc } = await admin
        .from('pin_comments')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      deletedComments = cc ?? 0;
    }

    // ── 2. Delete simulated pins ──
    const { count: deletedPins } = await admin
      .from('pins')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);

    // ── 3. Delete simulated safe spaces ──
    const { count: deletedSafeSpaces } = await admin
      .from('safe_spaces')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);

    // ── 4. Delete simulated profiles ──
    const { count: deletedProfiles } = await admin
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);

    // ── 5. Delete auth users (must use admin API, batch) ──
    let deletedAuthUsers = 0;
    if (simUserIds.length > 0) {
      // Delete in batches of 20 to avoid overwhelming the API
      const BATCH = 20;
      for (let i = 0; i < simUserIds.length; i += BATCH) {
        const batch = simUserIds.slice(i, i + BATCH);
        await Promise.all(
          batch.map((uid) => admin.auth.admin.deleteUser(uid)),
        );
        deletedAuthUsers += batch.length;
      }
    }

    return NextResponse.json({
      deleted_users: deletedAuthUsers,
      deleted_profiles: deletedProfiles ?? 0,
      deleted_pins: deletedPins ?? 0,
      deleted_safe_spaces: deletedSafeSpaces ?? 0,
      deleted_votes: deletedVotes,
      deleted_comments: deletedComments,
    });
  } catch (err) {
    console.error('[simulation-cleanup]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
