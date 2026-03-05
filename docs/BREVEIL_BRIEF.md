# Breveil — Product & Technical Brief

> **A safer world, mapped by women — for women.**

---

## 1. Concept & Vision

**Breveil** is a real-time collaborative urban safety platform. It empowers pedestrians, cyclists, and transit users — primarily women — to **report incidents, plan safe routes, trigger emergency SOS alerts, and build trusted local communities**. Think of it as Waze for personal safety: crowdsourced, real-time, and community-driven.

The app turns every user into both a **sensor** (reporting what they see) and a **beneficiary** (receiving alerts, safe routes, and community support). Safety becomes a shared, living layer on the map.

### Core Promise
- **See** — Real-time incident map with 18 categories, severity levels, and time-decay
- **Move** — Trip planning with route safety scoring, circle tracking, and SOS fallback
- **Connect** — Trusted circle, local communities, stories, and group messaging
- **React** — 3-second SOS with automatic dispatch to contacts and nearest safe spaces

### Target Audience
- Primary: Women aged 18–35 in major French cities (Paris launch)
- Secondary: Anyone who walks, cycles, or uses public transit at night
- Tertiary: B2B partners (pharmacies, hospitals, municipalities)

---

## 2. Brand Identity

### Name Evolution
| Name | Context |
|------|---------|
| **Kova** | Original internal codename (npm package name) |
| **Brume** | Legacy brand (localStorage keys still prefixed `brume_`) |
| **Safepin** | Project folder / working title |
| **Breveil** | Current public brand name |

### Logo System

**G1 Together Mark** — Multi-layered protective arcs:
- Outer arc (gold `#F5C341`) — community awareness
- Inner arc (60% opacity) — trusted circle
- Destination dot — personal protection
- Symbolizes layers of protection converging on the individual

**Veil Symbol** — Three-layer arc system:
- Outer arcs: cyan `#3BB4C1` (community)
- Middle arcs: purple `#8B7EC8` (circle)
- Inner arcs: cyan (self)
- Central point of light

**Monogram** — Serif "B" in Cormorant Garamond with veil arc accents

**Wordmark** — "BREVEIL" in Cormorant Garamond, light weight (300), 12px letter-spacing

### Tagline
> Real-time safety reporting and community protection

---

## 3. Design Book

### Color Palette

**Primary Gradient (locked March 2026):**
```
#3BB4C1 → #1E3A5F → #4A2C5A → #5C3D5E
  Cyan      Navy      Purple    Dark Purple
```

**Core Palette:**

| Token | Hex | Role |
|-------|-----|------|
| `midnight` | `#0F172A` | Base surface (dark) |
| `midnightDeep` | `#1E293B` | Card background |
| `midnightLight` | `#334155` | Elevated surface |
| `veil` (gold) | `#F5C341` | Accent, warnings, brand |
| `aurora` (purple) | `#8B7EC8` | Secondary accent |
| `rose` | `#D4687A` | Emotional accent |
| `sage` | `#6BA68E` | Trust, growth |
| `cyan` (accent) | `#3BB4C1` | Primary interactive |

**Semantic Colors:**

| Token | Hex | Role |
|-------|-----|------|
| `danger` | `#E63946` | Emergency, SOS |
| `success` | `#4CAF79` | Safe, positive |
| `warning` | `#F4A940` | Caution |

**Light Theme Override:**
- Gradient: `#67E8F9 → #3B82F6 → #6366F1` (cyan → blue → indigo)
- Surfaces: `#F8FAFC`, `#FFFFFF`

### Typography

| Level | Size | Weight | Font |
|-------|------|--------|------|
| Hero | 40px | 300 | Cormorant Garamond |
| H1 | 32px | 300 | Inter |
| H2 | 24px | 400 | Inter |
| H3 | 20px | 500 | Inter |
| Body | 16px | 400 | Inter |
| Body SM | 14px | 400 | Inter |
| Caption | 12px | 500 | Inter |
| Overline | 11px | 600 (uppercase) | Inter |

**Fonts:**
- **Display/Brand:** Cormorant Garamond (serif) — logo, wordmark, hero text
- **UI/Body:** Inter (sans-serif) — all interface text
- **Code:** JetBrains Mono (monospace)

### Spacing & Grid

8px base grid:
```
4  8  12  16  20  24  32  40  48  64  80  96
```

### Border Radius

```
xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | 2xl: 32px | full: 9999px
```

### Shadows

```
sm:  0 1px 2px    rgba(0,0,0,0.20)
md:  0 4px 12px   rgba(0,0,0,0.25)
lg:  0 8px 24px   rgba(0,0,0,0.30)
xl:  0 16px 48px  rgba(0,0,0,0.40)
glow: 0 0 20px    rgba(59,180,193,0.30)  — cyan
```

### Glass Morphism

```css
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.08);
```

### Motion (Framer Motion)

| Preset | Stiffness | Damping |
|--------|-----------|---------|
| Default | 300 | 30 |
| Gentle | 200 | 25 |
| Snappy | 400 | 35 |
| Bouncy | 500 | 20 |

Durations: fast 150ms, normal 250ms, slow 400ms

Micro-interactions:
- Buttons: hover `translateY(-1px)` + press `scale(0.98)`
- Pins: radar pulse (2.1s cycle, 0.7s stagger)
- Sheets: slide-up from bottom with spring physics

### Theme System

- Dark (default) / Light toggle
- Zustand store → `data-theme` attribute on `<html>`
- localStorage key: `brume-theme`
- CSS custom properties switch palette

---

## 4. Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript strict |
| Styling | Tailwind v4, Framer Motion |
| State | Zustand (persisted to localStorage) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (OAuth, email, magic link) |
| Storage | Supabase Storage (S3) |
| Realtime | Supabase Realtime |
| Map | Mapbox GL JS v3 |
| Voice | LiveKit (WebRTC) |
| Payments | Stripe |
| Email | Resend |
| Push | Web Push API (VAPID) |
| i18n | next-intl (30 locales) |
| Testing | Vitest |
| Toasts | Sonner |
| Icons | Lucide React |

### Project Structure

```
src/
├── app/                    Next.js App Router
│   ├── page.tsx            Landing / marketing page
│   ├── login/              Auth pages
│   ├── onboarding/         Onboarding funnel
│   ├── map/page.tsx        **Main app** — all sheets & features
│   ├── admin/              Admin dashboard (analytics, moderation)
│   └── api/                Server routes (trips, push, stripe, etc.)
├── components/
│   ├── MapView.tsx         Mapbox map, layers, style switching
│   ├── EmergencyButton.tsx SOS FAB + hold ring
│   ├── ReportSheet.tsx     Multi-step incident form
│   ├── TripSheet.tsx       Trip planning + active HUD
│   ├── EscorteSheet.tsx    Safety escort companion
│   ├── BottomNav.tsx       4-tab navigation
│   ├── OnboardingFunnelV2  11-step onboarding
│   ├── map/                Pin detail, confirm modal
│   ├── trip/               Favoris, trip tracking
│   ├── community/          Hub, stories, groups, DMs
│   └── ui/                 Button, Card, Badge, etc.
├── stores/
│   ├── useStore.ts         Global Zustand store
│   └── useTheme.ts         Dark/light theme
├── hooks/                  useEscorte, useFavoris, useTour, etc.
├── lib/                    Supabase clients, geocoding, tokens, utils
├── types/index.ts          All TypeScript types (~80 models)
├── messages/               30 locale JSON files
└── i18n/                   next-intl config & routing
```

### Database Schema (Supabase)

**Core Tables:**
- `profiles` — user data, verification, streaks, onboarding
- `pins` — incident reports (category, severity, lat/lng, media, confirmations, decay)
- `pin_evidence` — media + text for confirmations/rejections
- `comments` / `votes` — engagement on pins
- `trips` — active journeys (dest, status, ETA, watchers, walk_with_me)
- `trip_logs` — historical trip records
- `trusted_contacts` — circle of trust (acceptance workflow)
- `saved_places` — favorite destinations
- `safe_spaces` — POIs (pharmacies, hospitals, shelters)
- `safe_space_media` / `safe_space_votes` — UGC on safe spaces
- `communities` / `community_members` / `community_messages`
- `community_stories` / `pin_stories` — ephemeral media
- `direct_messages` — 1-on-1 DMs
- `escortes` — safety escort sessions
- `escorte_circle_members` — circle status during escort
- `emergency_dispatches` / `emergency_sessions` — SOS dispatch
- `subscriptions` / `invoices` — Stripe billing
- `notifications` — persistent in-app alerts
- `user_milestones` / `challenges` / `user_challenges` — gamification
- `walk_sessions` / `audio_checkins` — walk-with-me
- `live_sessions` — LiveKit vocal rooms
- `user_reports` — moderation reports
- `invite_codes` / `invite_code_uses` — B2B invite system
- `admin_params` — dynamic feature flags

**Security:** Row Level Security (RLS) on all tables. Users see own data; public data (pins, stories) visible to authenticated users; trusted contacts can read active trips; emergency sessions publicly readable via shareable link.

---

## 5. Features

### 5.1 Real-Time Incident Map

The core of Breveil. A Mapbox-powered map displaying crowdsourced safety incidents with clustering, category coloring, and time decay.

**18 Incident Categories (4 groups):**

| Group | Categories | Decay | Color |
|-------|-----------|-------|-------|
| **Urgent** | Assault, Harassment, Theft, Following | 24h | Red `#EF4444` |
| **Warning** | Suspect behavior, Group, Unsafe area | 6–12h | Amber `#F59E0B` |
| **Infrastructure** | Lighting, Blocked, Closed | 168h (7d) | Slate `#64748B` |
| **Positive** | Safe area, Help available, Presence | 720h (30d) | Emerald `#34D399` |

**Pin Properties:** category, severity (low/med/high), location, description, media (photo/video), address, environment/urban context, transport info, confirmation count, time decay, flag count.

**Decay System:** Pins fade in opacity over their decay window. Urgent incidents disappear after 24h; infrastructure issues persist for a week.

**Filters:** Severity, age, urban context, confirmed-only, time-of-day, transport mode.

### 5.2 Report Flow

4-step bottom sheet:
1. **Category** — Pick from 4 groups (urgent/warning/infra/positive)
2. **Transport** — Optional: metro/RER/bus/tram + line number
3. **Description** — Free text
4. **Media** — Photo/video upload

Pin is created at user's current location with address reverse-geocoding.

### 5.3 Pin Detail & Confirmation

- Full detail sheet with category badge, time-ago, reliability score
- Media carousel
- **Confirm/Deny system:** community votes via `pin_evidence` table
- Evidence timeline: reports, confirmations, rejections — each with optional media
- Actions: confirm, flag as false, share, navigate to, contact reporter

### 5.4 Emergency SOS

**Trigger:** 3-second hold on red FAB → 5-second countdown with emergency numbers (15, 17, 18, 112)

**When activated:**
- Creates `is_emergency: true` pin at current location
- Dispatches SMS/push to all trusted contacts via Edge Function
- GPS tracking: trail pins every 45 seconds or 30 meters
- Highlights nearest safe space with walking ETA
- Public tracking link (shareable)
- 15-minute escalation timer if unresolved
- **Resolution:** 1-second hold "I'm Safe" button → resolves pins, notifies contacts

### 5.5 Trip Planning & Tracking

**Idle View:**
- Search destination (Mapbox geocoding: POI, address, place)
- Quick-select pinned favorites (home, work, cafe, etc.)
- Recent trips history

**Active Trip:**
- Real-time progress bar + countdown ETA
- Circle contacts with status dots (watching/notified/inactive)
- Walk With Me toggle → live location sharing
- Incident alerts along route
- SOS quick-trigger
- Auto-arrival detection (geofence)

### 5.6 Safety Escort (Escorte)

Two modes:
- **Immediate:** "I need help now" — notifies circle, starts GPS tracking
- **Trip:** Navigate to destination with circle watching

States: hub → intro → notifying circle → live tracking → arrived

Features:
- 2-minute Julia AI countdown (auto-escalation if no circle response)
- Route modes: safe / balanced / fast
- Audio/Julia toggle for voice communication
- SOS trigger escalation
- Saves to recent trips on completion

### 5.7 Safe Spaces (Refuges)

POI database of verified safety points:
- Types: Pharmacy, Hospital, Police, Cafe, Shelter
- Sources: Overpass API (OSM), user submissions, partner integrations
- Features: opening hours, contact, website, partner tier (basic/premium)
- UGC: community photos, videos, reviews with upvote system

### 5.8 Community

**4 tabs:**
1. **Messages** — 1-on-1 DMs with real-time sync
2. **Cercle** — User groups + nearby group discovery
3. **Fil** — Story feed (ephemeral photo/video content)
4. **Communities** — Browse & join larger communities

Features: group creation, story composition, media upload, member management, unread badges.

### 5.9 Walk With Me

Quick-activation feature to notify circle and share live location:
- 1-tap activation from trip or standalone
- Real-time position broadcast to watchers
- LiveKit vocal session (group call with all contacts)
- Julia AI fallback if no contacts respond within 2 minutes
- Checkpoint tracking + auto-arrival

### 5.10 Gamification

- **Streaks:** Consecutive days of activity
- **Milestones:** First report, first trip, 10 votes, etc.
- **Challenges:** Weekly goals (reports, votes, routes, comments)
- **Badges:** Earned on challenge completion
- **User levels:** Reputation scoring based on contributions

### 5.11 Subscription (Pro)

| Feature | Free | Pro (6.99/mo) |
|---------|------|---------------|
| Map & SOS | Yes | Yes |
| Trips | 5/month | Unlimited |
| Walk With Me | — | Yes |
| Julia AI | — | Yes |
| Priority alerts | — | Yes |
| Circle size | 3 contacts | Unlimited |
| Trial | — | 7 days free |

Stripe integration: checkout, webhooks, customer portal.

### 5.12 Admin Dashboard

Available at `/admin/`:
- Analytics overview
- User management
- Pin moderation (flag system, shadow banning)
- Safe space management
- Report review
- Email logs
- Simulation controls (test data generation)
- Live monitoring
- Invite code management
- Dynamic parameters (feature flags)

---

## 6. User Flows

### 6.1 New User Onboarding

```
Landing Page → Login (OAuth / Email / Magic Link)
    → Onboarding Funnel:
        1. Welcome + City selector
        2. Goals (multi-select: walk safely, know area, connect, etc.)
        3. Location permission
        4. Profile (name + avatar)
        5. Trusted contacts invitation
        → Map View (with 5-step CoachMark tour)
```

### 6.2 Report an Incident

```
Map → Tap Report button
    → ReportSheet:
        1. Select category (from 4 groups)
        2. Transport? (optional: metro/RER/bus/tram + line)
        3. Description
        4. Media (photo/video)
    → Pin appears on map in real-time
```

### 6.3 Emergency SOS

```
Map → Hold SOS FAB (3 sec)
    → 5-sec countdown (shows emergency numbers)
    → SOS Active:
        • Emergency pin created
        • Circle notified (SMS + push)
        • GPS trail starts
        • Nearest safe space highlighted
    → Hold "I'm Safe" (1 sec) → Resolved
```

### 6.4 Plan a Safe Trip

```
Map → Trip tab → Search destination (or pick favorite)
    → Trip starts:
        • Circle notified
        • Progress bar + ETA
        • Walk With Me toggle
        • Incident alerts on route
    → Arrive near destination → Auto-confirmed
```

### 6.5 Safety Escort

```
Map → Escorte button:
    Option A (Immediate):
        → Circle notified → Live GPS → Julia fallback → End
    Option B (Trip):
        → Enter destination → Pick route mode
        → Circle notified → Live GPS tracking
        → Arrive → Trip saved to recents
```

### 6.6 Confirm an Incident

```
Map → Tap pin cluster → Tap specific pin
    → PinDetailSheet:
        • View category, severity, description, media
        • Tap "Confirm" → ConfirmIncidentModal
        • Optional: add photo/text evidence
        → Confirmation count increments
```

---

## 7. Map Layers

| Layer | Source | Color | Toggle |
|-------|--------|-------|--------|
| Incident pins | Supabase `pins` | Category-based (red/amber/slate/green) | Always on |
| Pin clusters | Mapbox clustering | Count labels | Always on |
| Safe spaces | Overpass + Supabase | Emerald `#34D399` | Yes |
| Transit stations | Custom data | Cyan `#3BB4C1` | Yes |
| POI | Mapbox built-in | — | Yes |
| Route line | OSRM / Mapbox Directions | Cyan | During trips |
| Heatmap | Location history | Purple gradient | Yes |
| Watched contacts | Supabase realtime | Cyan dots | Yes |
| Place notes | Supabase `place_notes` | User emoji | Yes |
| Emergency sessions | Supabase | Red `#EF4444` | Auto |

**Map Style:** Custom Mapbox style (`mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0`) with fallbacks to streets-v12, light-v11, dark-v11.

---

## 8. Internationalization

- **Framework:** next-intl v4
- **30 locales:** en, fr, es, zh, ar, hi, pt, bn, ru, ja, de, ko, it, tr, vi, pl, nl, th, sv, ro, cs, el, hu, da, fi, no, he, id, ms, uk
- **100% translated:** English, French
- **Default locale:** French (locale prefix `as-needed`)
- **Pattern:** Eager lookup maps (`Record<string, string>`) — never `t(variable)`

---

## 9. PWA Configuration

```json
{
  "name": "Breveil",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0F1729",
  "theme_color": "#1B2541",
  "categories": ["safety", "navigation", "social"],
  "start_url": "/map"
}
```

Icons: SVG (any), 192px PNG (maskable), 512px PNG (maskable)

Features: offline queue for mutations, Web Push notifications, install prompt.

---

## 10. Navigation

**Bottom Tab Bar (4 tabs):**

| Tab | Icon | Content |
|-----|------|---------|
| Map | MapPin | Incident map, report, filters, SOS |
| Community | MessageCircle | Feed, stories, groups, DMs |
| Trip | Navigation | Route planning, escorte, favorites |
| Me | Sparkles | Profile, settings, stats |

- Height: 64px + safe-area inset
- Glass background: `rgba(30,41,59,0.85)`
- Active indicator: cyan dot
- Badge: red (emergencies), cyan (unread DMs)

---

## 11. Real-Time Architecture

All major features use **Supabase Realtime** subscriptions:

| Channel | Purpose |
|---------|---------|
| `pins` | New incidents appear on map instantly |
| `trips` | Trip status changes (active → arrived → SOS) |
| `escortes` | Circle member status updates |
| `emergency_dispatches` | External SOS resolution |
| `community_messages` | Live group chat |
| `direct_messages` | Live DMs |
| `safe_space_media/votes` | UGC updates |
| `notifications` | In-app notification feed |

**Push:** Web Push API via VAPID keys, Service Worker registration.

---

## 12. Security & Moderation

- **RLS:** Row Level Security on all Supabase tables
- **Auth:** JWT-based session management via `@supabase/ssr`
- **Moderation:** `user_reports` table, auto-hide at 3 flags (trigger), shadow banning
- **Verification:** Optional ID verification flow with deadline
- **Invite codes:** B2B organization-level access control
- **Admin:** Dedicated dashboard for monitoring and moderation

---

## 13. Key Technical Patterns

| Pattern | Implementation |
|---------|---------------|
| Server/client split | `'use client'` for interactive components |
| Lazy loading | `dynamic(() => import(...), { ssr: false })` |
| Zustand selectors | `useShallow()` to prevent re-renders |
| Offline resilience | Fire-and-forget queue with retry |
| Mapbox optimization | Layer visibility toggle (not add/remove) |
| i18n safety | Eager lookup maps, never `t(variable)` |
| Tailwind v4 | `z-600` not `z-[600]`, `max-w-75` not `max-w-[300px]` |
| Design tokens | TypeScript `tokens.ts` with `tok(isDark)` helper |
| localStorage | All keys prefixed `brume_` (legacy brand) |

---

*Last updated: March 2026*
