// POST /api/circle/add — Add a user to trusted contacts circle
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

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
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { targetUserId } = await req.json() as { targetUserId: string };
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if already exists (either direction)
  const { data: existing } = await admin
    .from('trusted_contacts')
    .select('id')
    .or(
      `and(user_id.eq.${user.id},contact_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},contact_id.eq.${user.id})`,
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'already_in_circle' }, { status: 409 });
  }

  // Get target profile for contact_name
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', targetUserId)
    .single();

  const { error } = await admin.from('trusted_contacts').insert({
    user_id: user.id,
    contact_id: targetUserId,
    contact_name: profile?.display_name ?? 'Contact',
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send invitation email (fire-and-forget)
  fetch(new URL('/api/circle/invite', req.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ contactId: targetUserId }),
  }).catch(() => {});

  return NextResponse.json({ success: true, name: profile?.display_name ?? 'Contact' });
}
