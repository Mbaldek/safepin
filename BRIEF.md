# Breveil (Safepin) — Project Brief

> Real-time cooperative safety map — "A safer world, mapped by women, for women"
> v0.1.0-beta | March 2026

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript strict |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) — project `tzdemtgxogagjqqfmvbx` |
| Map | Mapbox GL JS v3.18 — custom style `mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0` |
| State | Zustand v5, localStorage (`brume_*` prefix) |
| Styling | Tailwind CSS v4, CSS custom variables for theming (`--bg-secondary`, `--accent`, etc.) |
| i18n | next-intl (30 locales, EN + FR complete) |
| Animation | Framer Motion (`springTransition` util for all sheets) |
| Payments | Stripe (Pro monthly €4.99, annual €39.99) |
| Streaming | LiveKit (video/audio live sessions) |
| Identity | Veriff KYC (HMAC-SHA256 signed) |
| Push | Web Push API + VAPID keys |
| Transit | Transitous API (GTFS-based, free, no key) |
| Icons | Lucide React (no emojis as UI icons) |
| Toast | Sonner |
| PWA | Service worker (cache-first static, network-first navigation, offline queue) |

---

## Directory Structure

```
src/
├── app/
│   ├── map/page.tsx          # Main map — all overlays, sheets, FABs, tour
│   ├── login/page.tsx        # Auth (email/pw, magic link, dev bypass)
│   ├── track/[sessionId]/    # Shared trip tracking (public link)
│   ├── onboarding/           # 5-step funnel (welcome/permissions/profile/circle/goals)
│   ├── admin/                # Admin dashboard
│   ├── privacy|terms|cookies # Legal pages
│   └── api/                  # 18 API routes (see below)
├── components/               # ~65 components
├── stores/
│   ├── useStore.ts           # Main Zustand store (pins, sheets, trips, filters, etc.)
│   └── useTheme.ts           # Light/dark theme (localStorage: brume-theme)
├── hooks/
│   ├── useTour.ts            # 5-step spotlight tour
│   └── useMapPadding.ts      # Bottom sheet map padding
├── lib/                      # 19 utils (supabase, geocode, transit, levels, streaks, etc.)
├── types/index.ts            # All domain types + constants (CATEGORIES, SEVERITY, etc.)
└── messages/en.json|fr.json  # i18n (30 namespaces)
```

---

## Core Features

### 1. Incident Reporting (Pins)
- 2-step modal: type selector (3 category tabs: Comportement/Environnement/Urgence, 17 types) → details (severity pills, description, inline media upload, collapsible env/urban fields)
- 20 category types → `pins` table (text column, no DB constraint)
- Severity: low / med / high
- Media: up to 5 files → `pin-photos` Supabase bucket
- Offline queue: IndexedDB + service worker background sync
- Reverse geocode location via Mapbox
- **Components**: `IncidentReportModal`, `IncidentTypeSelector`, `IncidentDetailsForm`

### 2. Emergency SOS
- 3-second hold on red FAB → dispatches to trusted circle + nearest safe space ETA (OSRM)
- Location trail every 30m/45s
- Emergency numbers (15/17/18/112)
- Realtime responder tracking
- **Component**: `EmergencyButton` (693 lines)

### 3. Map & Layers
- Custom Mapbox style, clusters + unclustered pins with severity-based icons
- Pin shapes by transport: circle (default), square (metro), diamond (bus), triangle (tram)
- Pulse animation for med/high severity
- Layers: transit stations (Overpass API), POI (pharmacy/hospital/police), heatmap, safety scores, safe spaces
- Filters: severity, age, urban context, time of day, confirmed-only, live-only
- **Component**: `MapView` (1490 lines)

### 4. Trip Planning & Safety Escort
- State machine: IDLE → PLANNING → ACTIVE → COMPLETED
- Route planner: 4 modes (walk/bike/drive/transit), 3 options (safest/balanced/fastest) with danger scores
- Transit routing via Transitous API (Paris RATP/IDFM)
- Active trip: HUD with street name + ETA, circle sharing, stationary anomaly detection, nearby incident alerts, auto-arrival
- **Components**: `TripView` (841 lines), `RoutePlannerForm` (710 lines), `TripHUD`, `TripMonitor`

### 5. Trusted Circle (Walk With Me)
- Add contacts → pending/accepted/declined
- Real-time location sharing during trips
- Check-in one-tap messages
- Presence heartbeat
- **Components**: `FriendsView`, `TrustedCircleCard`, `WalkWithMePanel`

### 6. Community & Groups
- Communities (public/private), groups (sub-communities), DMs
- Real-time chat, stories, neighborhood feed
- **Component**: `CommunityView` (1267 lines)

### 7. Pin Detail & Interaction
- Confirm/deny votes with evidence
- Comments (real-time)
- Follow pin, thank reporter, flag/report
- Live streaming (broadcaster + viewer via LiveKit)
- Pin stories, audio check-in
- Resolve pin (owner only)
- **Component**: `DetailSheet` (866 lines)

### 8. Gamification
- Trust levels: Watcher (0) → Reporter (50) → Guardian (200) → Sentinel (500 pts)
- Score: `(pins×10) + (alerts×15) + (votes×5) + (comments×2)`
- Daily streaks with milestones at 3/7/14/30/60/100 days
- 11 achievement milestones
- Weekly challenges
- **Libs**: `levels.ts`, `streaks.ts`, `milestones.ts`

### 9. Safe Spaces
- POI layer: pharmacy, hospital, police, cafe, shelter
- Partner locations with premium/basic tiers
- Detail sheet with hours, contact, website
- Upvote system
- **Component**: `SafeSpaceDetailSheet`

### 10. Settings & Profile
- Account, notifications (proximity radius, quiet hours), privacy, billing (Stripe), legal
- Identity verification (Veriff)
- Language preference (30 locales)
- **Components**: `SettingsSheet` (1075 lines), `MyKovaView` (1096 lines)

---

## API Routes (18)

| Route | Purpose |
|---|---|
| `POST /api/trips/start` | Create trip_log, notify circle |
| `POST /api/trips/end` | End active trip |
| `POST /api/trips/checkpoint` | Record transit checkpoint |
| `POST /api/notify-nearby` | Geo-triggered push to nearby users |
| `POST /api/push-notify` | Generic push sender |
| `POST /api/livekit-token` | Generate LiveKit token |
| `POST /api/stripe/checkout` | Create Stripe checkout session |
| `POST /api/stripe/portal` | Billing portal link |
| `POST /api/stripe/webhook` | Stripe lifecycle events |
| `POST /api/verify/start` | Create Veriff KYC session |
| `POST /api/verify/webhook` | Veriff decision callback |
| `POST /api/invite/validate` | Check invite code (public) |
| `POST /api/invite/redeem` | Redeem invite code (auth) |
| `POST /api/simulation/seed` | Seed Paris demo data |
| `POST /api/simulation/tick` | Tick simulated activity |
| `POST /api/simulation/cleanup` | Delete simulated data |
| `GET /api/auth/callback` | OAuth callback |

---

## Key Types (`src/types/index.ts`)

- **Pin** — `{ id, user_id, lat, lng, category, severity, description, photo_url, media_urls, environment, urban_context, is_emergency, resolved_at, flag_count, created_at }`
- **PinEvidence** — `{ pin_id, user_id, activity: report|confirmation|rejection, content, media_urls }`
- **Profile** — `{ name, display_name, avatar_url, city, persona, verified, verification_status, onboarding_completed, current_streak }`
- **TrustedContact** — `{ user_id, contact_id, status: pending|accepted|declined }`
- **Community** — `{ name, description, is_private, owner_id, avatar_emoji, community_type, member_count }`
- **SavedRoute** — `{ name, from_label, to_label, mode, coords, danger_score, is_public, share_token }`
- **SafeSpace** — `{ name, type, lat, lng, is_partner, partner_tier, opening_hours, phone, website }`

---

## Zustand Store (`src/stores/useStore.ts`)

Key state slices:
- `pins[]`, `addPin()`, `setPins()`, `selectedPin`
- `activeSheet: 'none' | 'report' | 'detail'`
- `activeTab: 'map' | 'community' | 'trip' | 'me'`
- `activeTrip: TripSession | null` (4-state machine)
- `activeRoute`, `pendingRoutes`, `transitSegments`
- `mapFilters: { severity, age, urban, confirmedOnly, liveOnly, timeOfDay }`
- `userLocation`, `newPinCoords`, `mapFlyTo`
- `watchedLocations` (Walk With Me contacts)
- `notifications[]`, `safeSpaces[]`, `placeNotes[]`

---

## Database (Supabase)

**Core tables**: `pins`, `pin_evidence`, `comments`, `profiles`, `trusted_contacts`, `communities`, `community_members`, `community_messages`, `saved_routes`, `trip_log`, `safe_spaces`, `place_notes`, `location_history`, `push_subscriptions`, `live_sessions`, `notifications`, `subscriptions`, `invoices`, `user_reports`, `emergency_dispatch`, `invite_codes`, `admin_params`, `engagement_events`, `milestones`, `challenges`, `walk_sessions`

**10 migrations** in `supabase/migrations/` (subscriptions, notifications, safety buddies, digest cron, moderation, emergency dispatch, invite codes, admin params, pin evidence, profile language)

---

## Patterns & Conventions

- **Bottom sheet**: `motion.div` with `springTransition`, `z-201`, `useFocusTrap`, `useMapPadding`
- **Theming**: CSS variables (`var(--bg-secondary)`, `var(--accent)`, etc.) — NOT Tailwind semantic tokens
- **i18n**: `next-intl`, never `t(variable)` — use eager lookup maps (`Record<string, string>`)
- **Tailwind v4**: use `z-600` not `z-[600]`, `max-w-75` not `max-w-[300px]`
- **localStorage**: all keys prefixed `brume_` (legacy from old brand name)
- **Offline**: `enqueue()` → IndexedDB → service worker `brume-sync-pins` background sync
- **FABs**: SOS (red, bottom-6 right-4), Report (blue #3b82f6, bottom-22 right-4)
- **Lazy loading**: heavy components use `next/dynamic` (TripView, MyKovaView, SettingsSheet, etc.)

---

## Deferred

- Communities UI redesign (Telegram-style list rows)
- Safety escort full-screen HUD redesign
