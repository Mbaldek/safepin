// src/middleware.ts — Auth + onboarding routing guard
//
// On every authenticated request to a non-public path:
//   - If ob_done=1 cookie is set → pass through (fast path, no DB call)
//   - Otherwise → query profiles.onboarding_completed
//     - true  → set ob_done cookie and pass through
//     - false → redirect to /onboarding/profile

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/terms', '/privacy'];
const SKIP_PREFIXES = ['/auth/', '/onboarding/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public pages and onboarding routes (avoid redirect loops)
  if (
    PUBLIC_PATHS.includes(pathname) ||
    SKIP_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Fast path: user already completed onboarding (cookie cached)
  if (request.cookies.get('ob_done')?.value === '1') {
    return NextResponse.next();
  }

  // Build the Supabase SSR client (cookie-based, no DB call for session)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Get session from cookie — no network call
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated → pass through (login page handles redirect)
  if (!user) return response;

  // Check onboarding status in DB
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    // Cache result in cookie so future requests skip this DB query
    response.cookies.set('ob_done', '1', { path: '/', maxAge: 31536000 });
    return response;
  }

  // Not completed → redirect to first onboarding step
  return NextResponse.redirect(new URL('/onboarding/profile', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
};
