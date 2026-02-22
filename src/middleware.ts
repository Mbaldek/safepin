// src/middleware.ts — Rate limiting + next-intl locale routing

import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ─── next-intl locale middleware ──────────────────────────────────────────────
const intlMiddleware = createMiddleware(routing);

// ─── Rate limiting (sliding window per-instance) ─────────────────────────────
const counters = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'POST:/api/notify-nearby': { max: 5, windowMs: 3_600_000 },
  'POST:/api/push-notify':  { max: 10, windowMs: 3_600_000 },
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

// ─── Composed middleware ──────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  // Rate-limit API routes first
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // Skip intl for API routes and static assets
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Apply locale detection for page routes
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|manifest|sw).*)'],
};
