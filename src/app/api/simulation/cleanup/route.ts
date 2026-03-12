// src/app/api/simulation/cleanup/route.ts
// POST: Delete all simulated data in strict dependency order.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    // ── Fetch all simulated user IDs ──
    const { data: simProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('is_simulated', true);
    const simUserIds = (simProfiles ?? []).map((p) => p.id);

    const counts: Record<string, number> = {};

    if (simUserIds.length > 0) {
      // ── 1. Community messages by sim users ──
      const { count: cm } = await admin
        .from('community_messages')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      counts.community_messages = cm ?? 0;

      // ── 2. Community members by sim users ──
      const { count: cmem } = await admin
        .from('community_members')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      counts.community_members = cmem ?? 0;

      // ── 3. Communities owned by sim users ──
      const { count: com } = await admin
        .from('communities')
        .delete({ count: 'exact' })
        .in('owner_id', simUserIds);
      counts.communities = com ?? 0;

      // ── 4. Walk sessions by sim users ──
      const { count: ws } = await admin
        .from('walk_sessions')
        .delete({ count: 'exact' })
        .or(`creator_id.in.(${simUserIds.join(',')}),companion_id.in.(${simUserIds.join(',')})`);
      counts.walk_sessions = ws ?? 0;

      // ── 5. Trip log (simulated) ──
      const { count: tl } = await admin
        .from('trip_log')
        .delete({ count: 'exact' })
        .eq('is_simulated', true);
      counts.trips = tl ?? 0;

      // ── 6. Trusted contacts by sim users ──
      const { count: tcont } = await admin
        .from('trusted_contacts')
        .delete({ count: 'exact' })
        .or(`user_id.in.(${simUserIds.join(',')}),contact_id.in.(${simUserIds.join(',')})`);
      counts.contacts = tcont ?? 0;

      // ── 7. Circle messages by sim users ──
      const { count: circM } = await admin
        .from('circle_messages')
        .delete({ count: 'exact' })
        .in('sender_id', simUserIds);
      counts.circle_messages = circM ?? 0;

      // ── 8. Pin votes by sim users ──
      const { count: vc } = await admin
        .from('pin_votes')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      counts.votes = vc ?? 0;

      // ── 9. Pin comments by sim users ──
      const { count: cc } = await admin
        .from('pin_comments')
        .delete({ count: 'exact' })
        .in('user_id', simUserIds);
      counts.comments = cc ?? 0;
    }

    // ── 10. Simulated pins ──
    const { count: deletedPins } = await admin
      .from('pins')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);
    counts.pins = deletedPins ?? 0;

    // ── 11. Simulated safe spaces ──
    const { count: deletedSS } = await admin
      .from('safe_spaces')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);
    counts.safe_spaces = deletedSS ?? 0;

    // ── 12. Simulated profiles ──
    const { count: deletedProfiles } = await admin
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('is_simulated', true);
    counts.profiles = deletedProfiles ?? 0;

    // ── 13. Auth users (batch of 20) ──
    let deletedAuthUsers = 0;
    if (simUserIds.length > 0) {
      const BATCH = 20;
      for (let i = 0; i < simUserIds.length; i += BATCH) {
        const batch = simUserIds.slice(i, i + BATCH);
        await Promise.all(
          batch.map((uid) => admin.auth.admin.deleteUser(uid)),
        );
        deletedAuthUsers += batch.length;
      }
    }
    counts.auth_users = deletedAuthUsers;

    return NextResponse.json(counts);
  } catch (err) {
    console.error('[simulation-cleanup]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
