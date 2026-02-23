# KOVA — Technical Architecture Guide

## 1. Project Structure

```
src/
├── app/                    # Next.js 16 App Router pages
│   ├── layout.tsx          # Root layout (ThemeProvider, NextIntlClientProvider)
│   ├── page.tsx            # Redirect to /login or /map
│   ├── login/page.tsx      # Landing page + auth
│   ├── map/page.tsx        # Main map application
│   ├── admin/page.tsx      # Tower Control admin dashboard
│   ├── privacy/page.tsx    # Privacy Policy
│   ├── terms/page.tsx      # Terms of Service
│   ├── cookies/page.tsx    # Cookie Policy
│   └── api/                # API routes
│       ├── livekit-token/  # LiveKit JWT token generation
│       ├── notify-nearby/  # Geo-filtered push notifications
│       ├── push-notify/    # Direct push notification sending
│       ├── stripe/         # Billing (checkout, webhook, portal)
│       └── verify/         # Identity verification (start, webhook)
├── components/             # 49 React components
│   ├── MapView.tsx         # Mapbox GL JS map
│   ├── EmergencyButton.tsx # SOS system
│   ├── ReportSheet.tsx     # Incident reporting
│   ├── DetailSheet.tsx     # Pin detail + voting
│   ├── TripView.tsx        # Route planner
│   ├── CommunityView.tsx   # Communities + neighborhoods
│   ├── MyKovaView.tsx      # Profile + stats hub
│   ├── SettingsSheet.tsx   # Settings + billing + legal
│   ├── ... (46 more)
├── lib/                    # Shared utilities & services
│   ├── utils.ts            # timeAgo, haversine variants, springTransition
│   ├── geocode.ts          # geocodeForward, geocodeReverse (Mapbox)
│   ├── supabase.ts         # Browser Supabase client
│   ├── supabase-admin.ts   # Server-only admin client (service role)
│   ├── levels.ts           # Trust level definitions
│   ├── expertise.ts        # Auto-computed expertise tags
│   ├── milestones.ts       # Achievement definitions
│   ├── stripe.ts           # Stripe client config
│   ├── offlineQueue.ts     # IndexedDB offline queue
│   ├── useIsPro.ts         # Pro subscription hook
│   └── useFocusTrap.ts     # Accessibility focus trap
├── stores/                 # State management
│   ├── useStore.ts         # Zustand v5 global store
│   └── useTheme.ts         # Theme state (dark/light)
├── i18n/                   # Internationalization
│   ├── routing.ts          # 30 locale definitions + Locale type
│   └── request.ts          # getRequestConfig with deepMerge fallback
├── messages/               # Translation files (30 locales)
│   ├── en.json             # English (complete — 274 lines, 16 namespaces)
│   ├── fr.json             # French (complete)
│   ├── es.json, zh.json... # 28 other locales (common + nav + emergency translated)
└── proxy.ts                # Next.js 16 proxy: rate limiting + locale cookie
```

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16 | App Router, SSR, API routes |
| UI Library | React | 19 | Component framework |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Animations | Framer Motion | — | Spring animations, sheet transitions |
| Backend | Supabase | — | PostgreSQL, Auth, Realtime, Storage, Edge Functions |
| Maps | Mapbox GL JS | v3 | Interactive maps (direct, no wrapper library) |
| Routing Engine | OSRM | — | Walking/biking/driving route calculation |
| Transit Data | Overpass API | — | OpenStreetMap metro/bus/tram data |
| Live Video | LiveKit | — | WebRTC broadcasting |
| Payments | Stripe | — | Checkout, Webhooks, Billing Portal |
| Push | Web Push API | — | VAPID-based notifications |
| i18n | next-intl | v4 | 30 languages, cookie-based locale |
| Verification | Veriff | — | Identity verification |
| State | Zustand | v5 | Client-side state |
| Icons | Lucide React | — | SVG icon library |
| Hosting | Vercel | — | Edge deployment, serverless functions |

## 3. Shared Utilities

### `src/lib/utils.ts`
Extracted from 30+ component copies to eliminate duplication:

| Export | Signature | Purpose |
|---|---|---|
| `timeAgo(dateStr)` | `string → string` | Compact relative time: "now", "5m", "3h", "2d" |
| `timeAgoLong(dateStr)` | `string → string` | Verbose: "just now", "5min ago", "3h ago" |
| `haversineMeters(a, b)` | `{lat,lng} × {lat,lng} → number` | Distance in meters |
| `haversineKm(a, b)` | `{lat,lng} × {lat,lng} → number` | Distance in km |
| `haversineMetersLngLat(a, b)` | `[lng,lat] × [lng,lat] → number` | GeoJSON coordinate order |
| `haversineMetersRaw(lat1,lng1,lat2,lng2)` | `4 numbers → number` | Raw params (for API routes) |
| `springTransition` | `object` | Shared Framer Motion spring config (damping:32, stiffness:320, mass:0.8) |

### `src/lib/geocode.ts`
Shared Mapbox geocoding:
- `geocodeForward(query, proximity?)` — address to [lng, lat]
- `geocodeReverse(lng, lat)` — coordinates to address string

### `src/lib/supabase.ts`
Browser client using `createBrowserClient` from `@supabase/ssr`. Validates env vars on import.

### `src/lib/supabase-admin.ts`
Server-only admin client using `SUPABASE_SERVICE_ROLE_KEY`. Used by all API routes that need elevated permissions.
```ts
import { createClient } from '@supabase/supabase-js';
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

## 4. Authentication

4 methods supported:

| Method | Implementation |
|---|---|
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Apple Sign-In | `supabase.auth.signInWithOAuth({ provider: 'apple' })` |
| Magic Link | `supabase.auth.signInWithOtp({ email })` |
| Email + Password | `supabase.auth.signUp` / `supabase.auth.signInWithPassword` |

Auth state managed by Supabase Auth. Session cookies set automatically. Protected routes check `supabase.auth.getUser()`.

## 5. Internationalization Architecture

### 30 Supported Locales
en, fr, es, zh, ar, hi, pt, bn, ru, ja, de, ko, it, tr, vi, pl, nl, th, sv, ro, cs, el, hu, da, fi, no, he, id, ms, uk

### Flow
```
User request
    |
proxy.ts: detect locale from NEXT_LOCALE cookie or Accept-Language header
    |
Set NEXT_LOCALE cookie if missing
    |
request.ts: getRequestConfig reads cookie, dynamic-imports locale JSON
    |
deepMerge(en, localeMessages) — English as fallback for missing keys
    |
Messages provided to NextIntlClientProvider
```

### Message Files
- `en.json`: Complete (274 lines, 16 namespaces: common, nav, emergency, report, detail, filters, layers, trip, settings, notifications, mykova, community, offline, moderation, safeSpaces, install)
- 28 other locales: Core keys translated (common: 13, nav: 4, emergency: 13). Rest falls back to English via deepMerge.

### Locale Detection (proxy.ts)
1. Check NEXT_LOCALE cookie
2. Parse Accept-Language header
3. Default to 'en'
- Rate limiting on API routes (sliding window per user)
- Redirects /\<locale\>/\* paths to / with cookie set

## 6. Billing Architecture

### Flow
```
Settings -> "Upgrade to Pro"
    |
/api/stripe/checkout -> Stripe Checkout Session (monthly EUR 4.99 or annual EUR 39.99)
    |
User completes payment on Stripe
    |
/api/stripe/webhook receives events -> updates subscriptions table
    |
useIsPro hook reads subscriptions table, caches in localStorage
```

### API Routes
| Route | Purpose |
|---|---|
| POST /api/stripe/checkout | Create Checkout Session |
| POST /api/stripe/webhook | Process Stripe events |
| POST /api/stripe/portal | Open Billing Portal |

### Webhook Events
checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted

### Pro Gating
`ProGate` component wraps Pro features. Shows blurred overlay with upgrade CTA for free users.

## 7. Identity Verification

### Flow
```
Settings -> Verify Identity
    |
POST /api/verify/start -> creates Veriff session
    |
User redirected to Veriff UI -> completes ID verification
    |
POST /api/verify/webhook receives result
    |
Updates profiles: verification_status, verification_id, verified
```

### Status States
unverified -> pending -> approved / declined / resubmission_requested

Webhook uses fail-closed signature verification (missing secret = reject).

## 8. Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| profiles | User profiles (display_name, avatar_url, trust score, verification, is_admin, referral_code) |
| pins | Safety incident reports (category, severity, lat/lng, votes, is_emergency, is_simulated) |
| pin_comments | Real-time comments on pins |
| subscriptions | Stripe subscription records |
| notifications | In-app notification queue |
| friendships | Friend requests and connections |
| dm_conversations | Direct message threads |
| direct_messages | Individual DM messages |
| communities | Community groups + neighborhoods |
| community_members | Community membership |
| walk_sessions | Walk With Me companion sessions |
| live_sessions | LiveKit broadcast sessions |
| saved_routes | User's saved trip routes |
| route_upvotes | Upvotes on shared routes |
| place_notes | Personal location bookmarks |
| trusted_circle | Trusted contact relationships |
| sos_responders | Emergency response tracking |
| audio_checkins | Voice memo recordings |
| location_history | GPS trail data (Pro feature) |
| trip_log | Completed trip records |
| safety_buddies | Route-based buddy matching schedules |
| admin_params | Platform configuration parameters |
| flag_reports | User-submitted content flags |

## 9. API Routes

| Route | Method | Purpose |
|---|---|---|
| /api/livekit-token | POST | Generate LiveKit JWT for broadcasting |
| /api/notify-nearby | POST | Send geo-filtered push notifications |
| /api/push-notify | POST | Direct push notification to user |
| /api/stripe/checkout | POST | Create Stripe Checkout Session |
| /api/stripe/webhook | POST | Handle Stripe webhook events |
| /api/stripe/portal | POST | Open Stripe Billing Portal |
| /api/verify/start | POST | Create Veriff verification session |
| /api/verify/webhook | POST | Handle Veriff webhook callbacks |

All API routes use `createAdminClient()` from `src/lib/supabase-admin.ts` for elevated DB access.

## 10. Edge Functions (Supabase)

| Function | Purpose |
|---|---|
| seed-paris | Generate fake users + pins for simulation |
| simulate-activity | Create one tick of live simulation activity |
| emergency-dispatch | Notify trusted contacts during SOS |

Deployed on Supabase infrastructure, invoked via REST with JWT auth.

## 11. Real-time Architecture

Supabase Realtime powers:
- **postgres_changes**: Pin creation/updates appear instantly on all connected maps
- **Presence channels**: Walk With Me location sharing
- **Broadcast channels**: Community chat, pin comments, DMs
- **LiveKit data channels**: Live stream chat overlay

## 12. PWA & Offline

- **manifest.json**: App metadata, icons, theme color
- **Service worker** (/sw.js): Push notifications, caching
- **InstallPrompt**: Detects beforeinstallprompt event
- **Offline queue**: IndexedDB stores pending reports
- **OfflineBanner**: Shows connectivity status
- **Background sync**: Auto-submits queued reports on reconnect

## 13. Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Client + Server | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client + Server | Supabase anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | Server only | Admin DB access |
| NEXT_PUBLIC_MAPBOX_TOKEN | Client | Mapbox GL JS + Geocoding |
| STRIPE_SECRET_KEY | Server only | Stripe API |
| STRIPE_WEBHOOK_SECRET | Server only | Stripe webhook verification |
| STRIPE_PRICE_MONTHLY | Server only | Stripe monthly price ID |
| STRIPE_PRICE_ANNUAL | Server only | Stripe annual price ID |
| NEXT_PUBLIC_LIVEKIT_URL | Client | LiveKit server URL |
| LIVEKIT_API_KEY | Server only | LiveKit auth |
| LIVEKIT_API_SECRET | Server only | LiveKit auth |
| VERIFF_API_KEY | Server only | Veriff verification |
| VERIFF_SHARED_SECRET | Server only | Veriff webhook signature |
| NEXT_PUBLIC_VAPID_KEY | Client | Web Push VAPID public key |
| VAPID_PRIVATE_KEY | Server only | Web Push VAPID private key |

## 14. Security

- **Rate limiting**: Sliding window per-user in proxy.ts (5/hr for notify, 10/hr for push, 30/hr default)
- **RLS**: Supabase Row Level Security on all tables
- **Webhook verification**: Stripe (stripe-signature header), Veriff (fail-closed HMAC)
- **Admin gating**: is_admin check on /admin and admin API operations
- **Content moderation**: Flag system with shadow banning (hidden_at, flag_count, is_shadow_banned)
- **GDPR**: EU data residency, right to erasure, privacy toggles
- **Auth**: Supabase Auth with JWT, 4 sign-in methods
- **ProGate**: Server-validated subscription status
