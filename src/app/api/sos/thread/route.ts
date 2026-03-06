import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

// ─── POST: create circle + public SOS posts ────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sosId, location, circleMembers } = await req.json() as {
    sosId: string;
    location: { lat: number; lng: number; label: string | null };
    circleMembers: string[];
  };

  if (!sosId) return NextResponse.json({ error: 'sosId required' }, { status: 400 });

  try {
    const [circleResult, publicResult] = await Promise.allSettled([
      // POST A — Circle (private)
      supabase.from('community_posts').insert({
        author_id: user.id,
        content: '\uD83D\uDEA8 Alerte SOS d\u00E9clench\u00E9e',
        type: 'sos_alert',
        sos_id: sosId,
        status: 'active',
        visibility: 'circle',
        is_anonymous: false,
        metadata: {
          lat: location.lat,
          lng: location.lng,
          label: location.label,
          triggeredAt: new Date().toISOString(),
          circleMembers,
        },
      }).select('id').single(),

      // POST B — Public (anonymous)
      supabase.from('community_posts').insert({
        author_id: user.id,
        content: '\uD83D\uDEA8 Alerte SOS dans le secteur',
        type: 'sos_alert',
        sos_id: sosId,
        status: 'active',
        visibility: 'community',
        is_anonymous: true,
        metadata: {
          label: location.label
            ? location.label.split(',').slice(1).join(',').trim() || 'Paris'
            : 'Secteur Paris',
          triggeredAt: new Date().toISOString(),
        },
      }).select('id').single(),
    ]);

    const circlePostId = circleResult.status === 'fulfilled' && !circleResult.value.error
      ? circleResult.value.data?.id ?? null : null;
    const publicPostId = publicResult.status === 'fulfilled' && !publicResult.value.error
      ? publicResult.value.data?.id ?? null : null;

    // If both failed, likely missing columns/table
    if (!circlePostId && !publicPostId) {
      const err = circleResult.status === 'fulfilled' ? circleResult.value.error : null;
      console.error('[SOSThread] Migration requise', err?.message ?? '');
      return NextResponse.json({}, { status: 202 });
    }

    return NextResponse.json({ circlePostId, publicPostId });
  } catch (err) {
    console.error('[SOSThread] Migration requise', err instanceof Error ? err.message : err);
    return NextResponse.json({}, { status: 202 });
  }
}

// ─── PATCH: resolve SOS posts ──────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sosId } = await req.json() as { sosId: string };
  if (!sosId) return NextResponse.json({ error: 'sosId required' }, { status: 400 });

  try {
    const { data: updated } = await supabase
      .from('community_posts')
      .update({ status: 'resolved' })
      .eq('sos_id', sosId)
      .eq('author_id', user.id)
      .select('id');

    return NextResponse.json({ updated: updated?.length ?? 0 });
  } catch (err) {
    console.error('[SOSThread resolve]', err instanceof Error ? err.message : err);
    return NextResponse.json({ updated: 0 }, { status: 202 });
  }
}
