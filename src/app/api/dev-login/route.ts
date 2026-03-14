// src/app/api/dev-login/route.ts — Dev-only instant login (no OAuth, no email)
//
// GET /api/dev-login?email=you@example.com
// Creates a session directly via admin API, sets cookies, redirects to /map.

import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return NextResponse.json(
      { error: 'Usage: /api/dev-login?email=you@example.com' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Generate a magic link — we won't email it, just extract the token
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkErr || !linkData) {
    return NextResponse.json(
      { error: linkErr?.message ?? 'Failed to generate link' },
      { status: 500 },
    );
  }

  // The hashed_token lets us verify the OTP server-side
  const hashedToken = linkData.properties?.hashed_token;
  if (!hashedToken) {
    return NextResponse.json({ error: 'No hashed_token returned' }, { status: 500 });
  }

  // Exchange the token for a session using the server Supabase client
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  });

  if (verifyErr) {
    return NextResponse.json({ error: verifyErr.message }, { status: 500 });
  }

  // Mark onboarding as done so the proxy doesn't redirect back
  cookieStore.set('ob_done', '1', { path: '/', maxAge: 31536000 });

  return NextResponse.redirect(new URL('/map', url.origin));
}
