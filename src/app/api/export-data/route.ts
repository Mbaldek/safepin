import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const uid = user.id;

  const [
    { data: profile },
    { data: pins },
    { data: comments },
    { data: votes },
    { data: contacts },
    { data: notifSettings },
    { data: messages },
    { data: routes },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('pins').select('*').eq('user_id', uid),
    supabase.from('pin_comments').select('*').eq('user_id', uid),
    supabase.from('pin_votes').select('*').eq('user_id', uid),
    supabase.from('trusted_contacts').select('*').or(`user_id.eq.${uid},contact_id.eq.${uid}`),
    supabase.from('notification_settings').select('*').eq('user_id', uid).single(),
    supabase.from('direct_messages').select('*').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).order('created_at', { ascending: false }).limit(500),
    supabase.from('saved_routes').select('*').eq('user_id', uid),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: uid,
    email: user.email,
    profile,
    pins: pins ?? [],
    comments: comments ?? [],
    votes: votes ?? [],
    trusted_contacts: contacts ?? [],
    notification_settings: notifSettings,
    direct_messages: messages ?? [],
    saved_routes: routes ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="breveil-data-${uid.slice(0, 8)}.json"`,
    },
  });
}
