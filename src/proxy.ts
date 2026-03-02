// src/proxy.ts — Rate limiting + locale cookie (Next.js 16 proxy convention)
//
// NOTE: next-intl's createMiddleware rewrites "/" → "/en" internally, which
// causes 404s because the app uses src/app/page.tsx (no [locale] segment).
// Instead we detect locale from Accept-Language / cookie and set a cookie
// so that next-intl's server-side getLocale() picks it up.

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { LOCALES } from '@/i18n/routing';

const DEFAULT_LOCALE = 'en';
const COOKIE_NAME = 'NEXT_LOCALE';

const PUBLIC_PATHS = ['/login', '/terms', '/privacy'];
const ONBOARDING_PREFIX = '/onboarding/';

// ─── Rate limiting (sliding window per-instance) ─────────────────────────────
const counters = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'POST:/api/notify-nearby':    { max: 5,  windowMs: 3_600_000 },
  'POST:/api/push-notify':      { max: 10, windowMs: 3_600_000 },
  'POST:/api/invite/validate':  { max: 20, windowMs: 3_600_000 },
};

const DEFAULT_LIMIT = { max: 30, windowMs: 3_600_000 };

const SKIP_PATHS = [
  '/api/stripe/webhook',
  '/api/verify/webhook',
];

function extractUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const token = auth.slice(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function rateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/') || req.method === 'GET') return null;
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return null;

  const userId = extractUserId(req);
  if (!userId) return null;

  const key = `${req.method}:${pathname}`;
  const limit = RATE_LIMITS[key] ?? DEFAULT_LIMIT;
  const counterKey = `${userId}:${key}`;
  const now = Date.now();

  const entry = counters.get(counterKey);
  if (!entry || now >= entry.resetAt) {
    counters.set(counterKey, { count: 1, resetAt: now + limit.windowMs });
    return null;
  }

  if (entry.count >= limit.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  entry.count++;
  return null;
}

// ─── Locale detection ───────────────────────────────────────────────────────
function detectLocale(req: NextRequest): string {
  // 1. Explicit cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;

  // 2. Accept-Language header
  const accept = req.headers.get('accept-language') ?? '';
  for (const locale of LOCALES) {
    if (accept.includes(locale)) return locale;
  }

  return DEFAULT_LOCALE;
}

// ─── Composed proxy (Next.js 16) ────────────────────────────────────────────
export async function proxy(req: NextRequest) {
  // Rate-limit API routes first
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const { pathname } = req.nextUrl;

  // Skip locale handling for API routes, static assets, and internal paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle /<locale>/* routes — redirect to / and set locale cookie
  const pathLocale = pathname.split('/')[1];
  if (pathLocale && pathLocale !== 'en' && (LOCALES as readonly string[]).includes(pathLocale)) {
    const newPath = pathname.replace(new RegExp(`^/${pathLocale}`), '') || '/';
    const url = req.nextUrl.clone();
    url.pathname = newPath;
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, pathLocale, { path: '/', maxAge: 365 * 24 * 60 * 60 });
    return response;
  }

  // 4. Auth + onboarding guard (skip for public pages and onboarding itself)
  const isGuarded = !PUBLIC_PATHS.includes(pathname) && !pathname.startsWith(ONBOARDING_PREFIX);

  if (isGuarded && req.cookies.get('ob_done')?.value !== '1') {
    let supabaseRes = NextResponse.next({ request: req });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            supabaseRes = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseRes.cookies.set(name, value, options));
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        // Cache completion + set locale cookie on same response
        supabaseRes.cookies.set('ob_done', '1', { path: '/', maxAge: 31536000 });
        if (!req.cookies.get(COOKIE_NAME)) {
          supabaseRes.cookies.set(COOKIE_NAME, detectLocale(req), { path: '/', maxAge: 365 * 24 * 60 * 60 });
        }
        return supabaseRes;
      }
      // Onboarding not completed → let through to /map
      // OnboardingFunnel overlay handles the experience
    }
    // Unauthenticated — fall through to locale cookie step
  }

  // 5. Set locale cookie if not present (so server-side getLocale() works)
  const locale = detectLocale(req);
  const response = NextResponse.next();
  if (!req.cookies.get(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, locale, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|manifest|sw).*)'],
};
