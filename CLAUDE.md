# Breveil (Safepin) — CLAUDE.md

## What is this project?
Breveil (codename Safepin) is a **urban safety PWA** — a collaborative safety map where users report incidents (pins), walk with escorts, call cercle members, and navigate safe routes. Admin dashboard ("Tower") for moderation.

## Tech stack
- **Framework**: Next.js 15 App Router, React 19, TypeScript strict
- **Backend**: Supabase (project `tzdemtgxogagjqqfmvbx`) — Auth, Postgres + PostGIS, Storage, Edge Functions, Realtime
- **Map**: Mapbox GL JS — custom style `mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0`
- **State**: Zustand (`src/stores/useStore.ts` main, `useAudioCall.ts`, `uiStore.ts`, `notificationStore.ts`, `useTheme.ts`)
- **i18n**: next-intl (30 locales, only en+fr at 100%)
- **Styling**: Tailwind CSS v4, Framer Motion
- **Audio/Video**: LiveKit (token via `/api/livekit-token`)
- **Payments**: Stripe (`src/lib/stripe.ts`)
- **Toasts**: Sonner

## Project structure
```
src/
  app/
    map/page.tsx          — main map (all sheets, tour, pins, escorte, calls)
    login/page.tsx        — auth
    onboarding/page.tsx   — onboarding funnel
    admin/                — Tower admin dashboard (overview, pins, users, analytics, simulation…)
    track/[sessionId]/    — public escort tracking
    api/                  — API routes (notify-nearby, livekit-token, push-notify, simulation/*)
  components/
    MapView.tsx           — Mapbox map, layers, style switching, clusters
    EmergencyButton.tsx   — SOS FAB + hold progress ring
    ReportSheet.tsx       — incident report form
    EscorteSheet.tsx      — safety escort flow
    CercleSheet.tsx       — cercle (trusted contacts) management
    FloatingCallPill.tsx  — ambient call pill
    WalkHistorySheet.tsx  — walk/escort history
    BottomNav.tsx         — tab navigation
    admin/TowerSidebar.tsx — admin sidebar nav
  stores/
    useStore.ts           — main Zustand store (localStorage prefix: `brume_`)
    useAudioCall.ts       — LiveKit call state
    useTheme.ts           — theme (localStorage: `brume-theme`)
  hooks/                  — useEscorte, useCercle, useFavoris, useHashtags, useMapboxSearch…
  lib/                    — supabase clients, geocode, directions, transit, pin-utils, utils…
  types/index.ts          — all TypeScript types
  messages/en.json, fr.json — i18n strings
supabase/
  migrations/             — SQL migration files
  functions/              — Edge Functions (on-new-pin, etc.)
```

## Key domain concepts
- **Pin**: incident report on the map (categories: aggression, vol, harcelement, accident, incivilite, alerte, safe_space)
- **Cercle**: trusted contacts circle for calls/SOS
- **Escorte / Walk With Me**: safety escort feature (live GPS sharing)
- **Trip**: transit route planning with safety scoring
- **Tour**: 5-step onboarding coach marks on map
- **Tower**: admin dashboard codename

## Database (PostGIS)
- Spatial columns: `pins.location`, `profiles.location`, `profiles.home_location` — `GEOGRAPHY(POINT,4326)` + GIST indexes
- Key RPCs: `pins_nearby()`, `pins_clustered()`, `user_ids_near_point()`, `search_pins()`, `search_users()`
- `pins.expires_at` + trigger for automatic pin decay by category
- 122 RLS policies use `(select auth.uid())` pattern (init-plan optimization)
- GIN + pg_trgm indexes for French fuzzy search

## Conventions & patterns

### Code style
- Tailwind v4 syntax: use `z-600` not `z-[600]`, `max-w-75` not `max-w-[300px]`
- next-intl: **never** call `t(variable)` — use eager lookup maps (`Record<string, string>`) built at render time
- localStorage keys use `brume_` prefix (legacy brand name)
- Mapbox style switch: `prevMapStyleRef` guards against redundant `setStyle` on first load
- AutocompleteInput onChange: `(text: string, coords?: [lng, lat])` — not onSelect
- Geocoding: `types=poi,address,place` always

### Architecture
- `map/page.tsx` is the main hub — all sheets/modals rendered there
- Viewport-based pin loading: zoom >= 10 uses `pins_nearby`, zoom < 10 uses `pins_clustered`
- DB clusters rendered as Mapbox GL layers (`DB_CLUSTER_SRC`), React `<MapPin>` hidden at zoom < 10
- `mapViewport` in Zustand — MapView emits on `moveend`+`load` (debounced 400ms)

### Admin / simulation
- Simulation system: seed → tick → cleanup cycle via API routes (`/api/simulation/*`)
- Admin pages under `/admin/*` with TowerSidebar + TowerTopbar layout

## Supabase project
- Project ID: `tzdemtgxogagjqqfmvbx`
- Extensions: `postgis`, `unaccent`, `moddatetime`, `pg_trgm`
- Edge functions in `supabase/functions/`

## Current status (2026-03-12)
### Recently completed
- Trip history wired to `trip_log` table + GPS zoom on launch
- Multi-modal transit route detail with expandable RouteCard
- Call pill, SOS z-index, walk tab fixes
- Major refactor: deduplication across 75 files
- Pin lifecycle consolidation, call UI, trip route UX
- Walk panel UX overhaul, call confirmation redesign
- Admin panel redesign, perf optimizations, cercle RPC, verification gates
- PostGIS optimization: spatial indexes, RLS fixes, fuzzy search indexes
- Viewport-based pin loading + DB-side clustering

### Deferred / backlog
- Communities UI redesign (Telegram-style list rows) — needs design session
- Safety escort HUD (full-screen) — needs design session
- SOS button relocation on form open — decision pending
- 58 unindexed FK columns — next DB optimization batch
- 22 functions need `SET search_path = ''`
- Wire search RPCs to UI (search_pins, search_users, search_hashtags, search_communities)

## Commands
```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
npx supabase db push # push migrations
```
