// POST /api/circle/search — Find a Breveil user by email or phone
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

  const { type, value } = await req.json() as { type: 'email' | 'phone'; value: string };
  if (!type || !value) {
    return NextResponse.json({ error: 'Missing type or value' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Search in Supabase Auth users
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 50 });

  const match = users.find((u) => {
    if (u.id === user.id) return false;
    if (type === 'email') return u.email?.toLowerCase() === value.toLowerCase();
    if (type === 'phone') return u.phone === value;
    return false;
  });

  if (!match) {
    return NextResponse.json({ found: false });
  }

  // Get profile info
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', match.id)
    .single();

  return NextResponse.json({
    found: true,
    profile: {
      id: match.id,
      display_name: profile?.display_name ?? match.email?.split('@')[0] ?? 'Utilisateur',
      avatar_url: profile?.avatar_url ?? null,
    },
  });
}
