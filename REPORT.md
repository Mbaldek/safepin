# KOVA — Product & Technical Report

## What is KOVA?

KOVA is a **women's safety mapping platform** — a progressive web app where users collectively map, report, and navigate around real-world safety incidents. Think of it as a community-powered safety radar: users drop geo-located pins for incidents they witness (harassment, stalking, aggression, poorly lit areas), the community confirms or clears them, and everyone benefits from a living, real-time danger map.

The name stands for a shield — the app's core promise is to help women move through cities with more awareness, faster emergency response, and a trusted network at their fingertips.

---

## Key Features

### 1. Real-Time Safety Map
- Interactive Mapbox GL map with clustered incident pins
- 6 incident categories: harassment, stalking, dark area, aggression, drunk behavior, other
- 3 severity levels (low / moderate / high) with color-coded markers
- Emergency pins (SOS) with pulsing red markers and dedicated alert flow
- Filtering by severity, age, location type, time of day, and confirmed-only
- Neighborhood safety score heatmap overlay

### 2. Community Validation System
- **"Still there" / "Cleared?"** voting on pins — 3 clearing votes auto-remove a pin
- Confirmation votes reset the pin's expiry timer
- Pin expiry countdown (auto-removal after inactivity)
- Follow pins for update notifications
- Comment threads on each pin for real-time discussion

### 3. Emergency SOS
- One-tap SOS button with 5-second countdown (cancel window)
- Auto-dispatches alerts to trusted contacts via push notification + SMS (Twilio)
- Creates a **public tracking link** (`/track/:sessionId`) showing real-time location trail on a map
- 15-minute escalation: if not resolved, contacts are re-notified
- Quick-dial buttons for emergency numbers (SAMU 15, Police 17, Pompiers 18, EU 112)
- Auto-enables safe spaces layer during active emergency

### 4. Safe Trip Planner
- Enter departure/destination, choose transport mode (walk, bike, drive, transit)
- OSRM routing engine returns up to 3 alternatives
- Each route scored for danger based on proximity to active pins
- **Automatic rerouting**: if the safest route passes a danger pin, KOVA computes a bypass waypoint 380m away and re-queries a detour (accepted only if danger improves and duration penalty ≤ 50%)
- Route labels: Safest (green), Balanced (amber), Fastest (blue)
- Active trip mode with countdown timer and "I'm Safe" confirmation
- "Plan for tonight" toggle weights scoring by night-time pins only
- "Nearest safe space" button during active trips
- Save and favourite routes for daily commutes

### 5. Trusted Circle & Walk With Me
- Add trusted contacts (mutual acceptance required)
- Real-time location sharing via Supabase Presence channels
- Contacts appear as blue dots on your map while sharing
- Emergency dispatch notifies your entire trusted circle

### 6. Safe Spaces Directory
- Database of pharmacies, hospitals, police stations, cafes, and shelters
- User-submitted suggestions with upvote system
- Green shield markers on the map (toggleable layer)
- Auto-shown during SOS emergencies
- "Navigate to nearest" during active trips

### 7. Live Broadcasting
- Go live from any incident pin using LiveKit WebRTC
- Public or contacts-only visibility
- Viewers can watch in real-time and report inappropriate content
- "LIVE" badge on active pins

### 8. Communities & Messaging
- Create/join communities (public or private)
- Hierarchical groups (sub-communities)
- Real-time chat with Supabase Realtime
- Community stories (photo/video media)
- Direct messaging between users

### 9. Gamification & Trust
- **Trust score** computed as: `pins × 10 + alerts × 15 + votes × 5 + comments × 2`
- 4 trust levels: Watcher (0+) → Reporter (50+) → Guardian (200+) → Sentinel (500+)
- 11 milestone achievements (First Report, Watchful Eye, Trusted Verifier, Path Finder, etc.)
- Expertise tags: Night Owl, Transit Guardian, First Responder, Neighborhood Expert
- Weekly activity sparkline on profile

### 10. Content Moderation
- Flag system: spam, false report, offensive, duplicate
- Auto-hide pins at 3 flags
- Shadow banning for repeat offenders
- Rate limiting: 5 pins/hour, 20 comments/hour per user

### 11. Pro Subscription
- Stripe-powered billing (€4.99/mo or €39.99/yr)
- Checkout sessions, customer portal, webhook-driven status sync
- Invoice history
- Feature gating via `useIsPro` hook

### 12. Identity Verification
- Veriff KYC integration
- HMAC-SHA256 session signing
- Webhook callback updates verification status
- Verified badge on profile

---

## Logic & Strategy

### Why Community Validation Matters
Traditional safety apps rely on official data (police reports, city statistics) — which is delayed, incomplete, and often underreports the kinds of incidents women face. KOVA inverts this: the community **is** the sensor network. Every user is a potential reporter, and every confirmation or clearing vote improves data quality in real-time.

The **3-vote clearing system** prevents stale data from lingering. The **confirmation timer reset** keeps genuinely active incidents visible. This creates a self-correcting map that reflects ground truth within minutes, not days.

### Danger-Aware Routing
Rather than just showing the fastest path, KOVA scores every route segment against nearby active pins. The rerouting algorithm:

1. Score all OSRM alternatives by proximity to danger pins
2. If the best route still has danger, find the closest danger pin to the route
3. Compute a perpendicular bypass waypoint 380m away
4. Re-query OSRM through the bypass
5. Accept only if danger score improves AND duration penalty ≤ 50%

This means KOVA can suggest "walk 3 extra minutes to avoid the dark underpass" — a trade-off most users would gladly make.

### Time-Aware Safety
Safety is not static — a park that's safe at noon can be dangerous at 10pm. KOVA's time-of-day filtering (morning/afternoon/evening/night) and the "Plan for tonight" toggle let users see the map as it would be at night, not as it is now. The neighborhood score layer also accepts a time bracket, so safety scores shift with the clock.

### Emergency Dispatch Chain
The SOS flow is designed for panic situations where every second counts:
- **5-second countdown** prevents accidental triggers while being fast enough for real emergencies
- **Automatic dispatch** to trusted contacts (no manual steps)
- **SMS fallback** via Twilio if contacts don't have push enabled
- **Public tracking link** so anyone with the URL can see your real-time location
- **15-minute escalation** re-notifies contacts if you haven't confirmed safety
- **Safe spaces auto-show** gives you an immediate "where can I go" answer

### Offline Resilience
In the moments when safety matters most (underground metro, poor signal areas), KOVA continues working:
- Reports are queued in IndexedDB when offline
- Background Sync API flushes the queue when connectivity returns
- Service worker caches the app shell for instant load
- Offline banner shows pending report count

### Internationalization Strategy
KOVA launched with French (Paris-first) and English. The `next-intl` setup with middleware-based locale detection means:
- URL structure stays clean (no `/en/` prefix for default locale)
- Emergency numbers are locale-aware (French: 15/17/18/112)
- All 500+ UI strings are externalized in structured JSON
- Adding a new language requires only a new `messages/{locale}.json` file

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Server components, API routes, middleware |
| **UI** | React 19 + TypeScript 5 | Component architecture, type safety |
| **Styling** | Tailwind CSS v4 | Utility-first styling with CSS variables for theming |
| **Animation** | Framer Motion | Sheet transitions, spring physics, AnimatePresence |
| **State** | Zustand | Lightweight store with localStorage persistence |
| **Maps** | Mapbox GL JS + react-map-gl | Vector tiles, clustering, custom layers, GeoJSON |
| **Routing** | OSRM (public API) | Multi-modal route calculation with alternatives |
| **Database** | Supabase (PostgreSQL) | Row-level security, real-time subscriptions, storage |
| **Auth** | Supabase Auth | Email/password, Google OAuth, JWT tokens |
| **Realtime** | Supabase Realtime | Pin updates, comments, votes, presence channels |
| **Push** | Web Push API + VAPID | Background notifications via service worker |
| **SMS** | Twilio | Emergency SMS fallback for SOS dispatch |
| **Video** | LiveKit (WebRTC) | Live broadcasting from incident pins |
| **Payments** | Stripe | Checkout, customer portal, webhook-driven subscriptions |
| **Identity** | Veriff | KYC verification with HMAC-signed sessions |
| **i18n** | next-intl | Locale routing, message bundles, server/client translation |
| **Offline** | Service Worker + IndexedDB | Cache-first assets, offline pin queue, background sync |
| **PWA** | Web App Manifest | Installable, standalone display, maskable icons |
| **Testing** | Vitest + Testing Library | Unit tests (39 tests), jsdom environment |
| **CI** | GitHub Actions | Lint, typecheck, and test on push/PR |
| **Icons** | Lucide React | Consistent icon set across the app |
| **Toasts** | Sonner | Non-blocking notification toasts |
| **Edge Functions** | Supabase Edge (Deno) | Push dispatch, emergency SMS, weekly digest cron |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  /map     │  │  /login   │  │  /admin   │  │ /track  │ │
│  │ (main UI)│  │ (auth)   │  │(dashboard)│  │ (SOS)  │ │
│  └────┬─────┘  └──────────┘  └──────────┘  └─────────┘ │
│       │                                                   │
│  ┌────▼────────────────────────────────────────────────┐ │
│  │              Zustand Store (35+ slices)               │ │
│  │  pins · filters · route · notifications · profile    │ │
│  └────┬────────────────────────────────────────────────┘ │
│       │                                                   │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Mapbox  │  │ Framer   │  │ LiveKit  │  │ Stripe   │ │
│  │ GL JS   │  │ Motion   │  │ WebRTC   │  │ Checkout │ │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Middleware Layer                       │
│         Rate Limiting · Locale Routing (en/fr)           │
├─────────────────────────────────────────────────────────┤
│                  Service Worker (sw.js)                   │
│     Cache-first · Offline Queue · Background Sync        │
│                  Push Notifications                       │
├─────────────────────────────────────────────────────────┤
│                    Supabase Platform                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Postgres │  │ Realtime │  │ Storage  │  │  Auth   │ │
│  │ + RLS    │  │ channels │  │ (media)  │  │ (JWT)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Edge Functions (Deno)                    │ │
│  │  on-new-pin · emergency-dispatch · weekly-digest     │ │
│  └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                   External Services                      │
│         Twilio (SMS) · Veriff (KYC) · OSRM (Routes)     │
└─────────────────────────────────────────────────────────┘
```

---

## Database: 25+ Tables

**Core:** pins, profiles, comments, notifications
**Social:** trusted_contacts, communities, community_messages, community_stories, dm_conversations, direct_messages
**Routes:** saved_routes, trip_logs, safety_buddies
**Safety:** safe_spaces, safe_space_votes, place_notes, emergency_dispatches, emergency_sessions, live_sessions
**Engagement:** pin_votes, user_reports, user_milestones
**Billing:** subscriptions, invoices, pro_waitlist
**System:** push_subscriptions, admin_params

All tables use Row-Level Security (RLS) policies enforced at the database level.

---

## Accessibility (WCAG 2.1 AA)

- Focus trap in all 9 sheet/modal components
- `role="dialog"` + `aria-modal="true"` on all overlays
- Skip links ("Skip to map", "Skip to navigation")
- Semantic `<nav>` with `aria-current` on active tab
- `aria-label` on all icon-only buttons
- `:focus-visible` ring for keyboard navigation
- `prefers-reduced-motion` disables all animations
- Color contrast ≥ 4.5:1 on all text (light theme `--text-muted` adjusted to 5.87:1)

---

## Testing

- **39 unit tests** across 6 test suites (Vitest + Testing Library)
- Mocked Supabase, Mapbox, next-intl, and Framer Motion
- Tests cover: trust levels, score computation, milestone detection, trend calculation, emergency button, filter bar, notifications
- CI pipeline: lint → typecheck → test on every push/PR

---

## Sprint History (42 sprints)

| Sprint | Feature |
|--------|---------|
| S1–S6 | Core map, pins, auth, reporting, detail view |
| S7–S12 | Voting, comments, filters, routing, emergency SOS |
| S13–S18 | Communities, messaging, live video, place notes |
| S19–S24 | Trusted circle, trip planner, onboarding, PWA |
| S25–S30 | Milestones, Stripe billing, Pro gate, notifications, safety buddies |
| S31–S34 | Neighborhood scores, weekly digest, session briefing, install prompt |
| S35 | Content moderation + anti-spam |
| S36 | Emergency auto-dispatch to trusted contacts |
| S37 | Internationalization (French + English) |
| S38 | Offline incident creation + background sync |
| S39 | Time-based safety + historical trends |
| S40 | Safe spaces directory |
| S41 | Accessibility (WCAG 2.1 AA) |
| S42 | Testing foundation |
