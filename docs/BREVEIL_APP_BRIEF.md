# Breveil — App Brief (Agent Context)

> Paste this file at the start of any Claude/AI agent chat to provide full project context.
> Last updated: 2026-03-02

---

## 1. Product

**Breveil** (codename `safepin`) is a **community safety mobile-first PWA** for urban women and vulnerable users. Users report incidents in real time on a live map, trigger SOS alerts, plan safe routes, and share location with trusted contacts. Free tier + Pro subscription.

- **Target**: Women, solo travelers, people at risk in urban environments
- **Language**: French-first; 30 locales (fr, en, ar, de, es, ja, zh, ru…)
- **Platforms**: Mobile-first PWA (installable), Android/iOS via Capacitor
- **Tone**: Calm, reassuring, premium dark UI — brand name *Breveil*, symbol: 6-arc veil

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| i18n | next-intl 4 — 30 locales in `src/messages/*.json` |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Maps | Mapbox GL JS 3 |
| Real-time video | LiveKit |
| Payments | Stripe (Free / Pro / Pro Annual) |
| Push notifications | Web Push API (`web-push`) |
| ID verification | Veriff |
| Transit routing | Transitous (GTFS/RATP Paris) |
| Testing | Vitest + Testing Library |
| Deploy | Vercel (Next.js edge runtime) |

---

## 3. Repository Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── page.tsx            # Root — auth guard → /map or /login
│   ├── login/              # Landing + auth page
│   ├── map/                # Main app shell (tabs: Map / Community / Trip / Me)
│   ├── track/[sessionId]/  # Public SOS tracking page (shareable link)
│   ├── onboarding/         # Legacy route-based pages (unused — see OnboardingFunnelV2)
│   │   ├── welcome/
│   │   ├── profile/
│   │   ├── goals/
│   │   ├── permissions/
│   │   └── circle/
│   ├── admin/              # Internal admin panel
│   ├── api/
│   │   ├── invite/         # validate + redeem invite codes
│   │   ├── livekit-token/  # LiveKit JWT
│   │   ├── notify-nearby/  # Notify users near new incident
│   │   ├── push-notify/    # Web push dispatch
│   │   ├── stripe/         # checkout + portal + webhook
│   │   ├── trips/          # start + checkpoint + end
│   │   ├── verify/         # Veriff start + webhook
│   │   └── simulation/     # seed + tick + cleanup (dev/demo)
│   ├── cookies/ privacy/ terms/
│   ├── globals.css         # CSS variables + animations
│   └── layout.tsx          # Root layout (ThemeProvider, i18n)
├── components/             # ~60 components (see §6)
│   ├── OnboardingFunnelV2.tsx   # ← ACTIVE onboarding (5-step, replaced old 7-step)
│   ├── OnboardingFunnel.tsx.old # ← archived (7-step modal, no longer used)
│   └── onboarding/              # ← archived Step*.tsx.old files (7 files)
├── stores/
│   ├── useStore.ts         # Main Zustand store (all app state)
│   └── useTheme.ts         # dark/light theme
├── lib/                    # Utilities + integrations
├── messages/               # 30 i18n JSON files
├── types/
│   └── index.ts            # All TypeScript types + constants
└── middleware.ts / proxy.ts # Auth guard + locale redirect
```

---

## 4. Database (Supabase / PostgreSQL)

**Key tables:**

| Table | Description |
|---|---|
| `profiles` | User profile — name, avatar, verification, onboarding, lang, streaks, shadow_ban |
| `pins` | Incident reports — lat/lng, category, severity, media, flag_count, hidden, expires_at |
| `pin_evidence` | Media/text evidence on confirmations/rejections |
| `comments` | Comments on pins |
| `notifications` | In-app notification inbox |
| `safe_spaces` | Pharmacy/hospital/police/cafe/shelter POIs with partner info |
| `place_notes` | User's personal private notes on map locations |
| `trusted_contacts` | Circle (pending/accepted/declined) |
| `pending_invites` | Invite emails/phones before user has account (inviter_id, contact_info) |
| `communities` + `community_messages` | Group chat |
| `dm_conversations` + `direct_messages` | Direct messaging |
| `saved_routes` | Saved routes with danger score |
| `live_sessions` | LiveKit broadcast sessions |
| `trip_logs` | Trip history |
| `subscriptions` + `invoices` | Stripe billing |
| `user_reports` | Moderation queue |
| `emergency_dispatches` + `emergency_sessions` | SOS records + public tracking |
| `invite_codes` + `invite_code_uses` | B2B2C invite flow |
| `engagement_events` | Analytics / streak tracking |
| `user_milestones` | Achievement records |
| `push_subscriptions` | Web push endpoints |

**Migrations:** `supabase/migrations/` — sequential SQL files from 2026-02-22 to 2026-03-02.

---

## 5. State Management (`src/stores/useStore.ts`)

Single Zustand store with slices:

- **Auth**: `userId`
- **Pins**: `pins`, `addPin`, `updatePin`
- **Map**: `mapFilters`, `userLocation`, `mapFlyTo`, `newPinCoords`
- **UI**: `activeSheet` (`detail`|`report`|`settings`|`notifications`|`trip`|`layer`|…), `activeTab`, `selectedPin`, `showIncidentsList`
- **Routing**: `activeRoute`, `pendingRoutes`, `transitSegments`
- **Notifications**: `notifications`, `addNotification`
- **Walk With Me**: `isSharingLocation`, `watchedLocations`
- **Place Notes**: `placeNotes`, `newPlaceNoteCoords`, `selectedPlaceNote`, `favPlaceIds`
- **Live Sessions**: `liveSessions`
- **Trip**: `activeTrip`, `tripPrefill`, `tripNudge`
- **Safe Spaces**: `safeSpaces`, `showSafeSpaces`
- **Profile**: `userProfile`
- **Streaks / Milestones**: `currentStreak`, `longestStreak`, `achievedMilestones`
- **Offline**: `offlineQueueCount`
- **Admin**: `showSimulated`

---

## 6. Components Reference

### Map & Location
| Component | Role |
|---|---|
| `MapView.tsx` | Mapbox GL map — pins (symbol layers, 3 severity variants), safe spaces (emoji pins), clusters, heatmap, route line, transit/POI layers, drop animation |
| `LayerPanel.tsx` | Layer toggles (heatmap, safe spaces, stations, bus, metro, POI) |
| `FilterBar.tsx` | Pin filters (severity, age, location type, time of day, confirmed) |
| `AddressSearch.tsx` | Nominatim geocoding search |
| `AutocompleteInput.tsx` | Mapbox geocoding autocomplete (POI + address + place, limit=7) |
| `NeighborhoodScoreLayer.tsx` | Incident density heatmap |
| `IncidentsView.tsx` | Nearby incidents panel — flat sorted list, severity filter chips, empty state (VeilSymbol) |

### Emergency
| Component | Role |
|---|---|
| `EmergencyButton.tsx` | SOS FAB — hold → 5s countdown → dispatch to contacts + start tracking session |
| `SosBanner.tsx` | Active SOS top banner |
| `SosBroadcastPanel.tsx` | Community broadcast panel |

### Reporting
| Component | Role |
|---|---|
| `ReportSheet.tsx` | 3-step report wizard: category → severity → submit (w/ draggable pin, reverse geocode) |
| `DetailSheet.tsx` | Pin detail: confirmations, votes, comments, evidence, live badge |
| `FlagReportModal.tsx` | Flag spam/false/offensive content |

### Trip & Navigation
| Component | Role |
|---|---|
| `TripView.tsx` | Safety escort hub — plan/active/complete states |
| `RoutePlannerForm.tsx` | Route form (walk/bike/drive/transit + departure/destination) |
| `TripHUD.tsx` | Active trip HUD overlay (ETA, nearby alerts) |
| `TripSummary.tsx` | Trip summary on completion |
| `SavedPanel.tsx` | Saved routes manager |
| `WalkWithMePanel.tsx` | Share live location with one contact |

### Community & Social
| Component | Role |
|---|---|
| `CommunityView.tsx` | Groups hub — list, create, join, messages |
| `NeighborhoodFeed.tsx` | Neighbourhood news feed |
| `TrustedCircleSection.tsx` | Circle management (add/remove contacts) |
| `PinChat.tsx` | Comments thread on a pin |
| `StoriesRow.tsx` | Stories carousel (community) |
| `LiveBroadcaster.tsx` / `LiveViewer.tsx` | LiveKit live video from incident |

### Profile & Gamification
| Component | Role |
|---|---|
| `MyKovaView.tsx` | "My Breveil" tab — activity feed, stats, level, streaks, challenges |
| `ProfileSection.tsx` | Profile info display |
| `ReferralSection.tsx` | Referral code + share |
| `ChallengesSection.tsx` | Weekly guardian challenges |

### Onboarding
| Component | Role |
|---|---|
| `OnboardingFunnelV2.tsx` | **ACTIVE** — 5-step full-screen onboarding (see §11) |
| `OnboardingFunnel.tsx.old` | Archived 7-step modal (no longer rendered) |
| `onboarding/Step*.tsx.old` | Archived individual step components (7 files) |

### Utility
| Component | Role |
|---|---|
| `BottomNav.tsx` | Tab bar (Map / Community / Trip / Me) |
| `ThemeToggle.tsx` | Dark/light switch |
| `InstallPrompt.tsx` | PWA install banner |
| `ProGate.tsx` | Pro-only feature gate with upsell |
| `OfflineBanner.tsx` | Offline + pending queue count |
| `PushOptInModal.tsx` | Push permission request |
| `MilestoneToast.tsx` | Achievement toast |

---

## 7. Core Features

### 7.1 Live Safety Map
- Mapbox GL — dark/light/streets/custom style switch
- **Custom style**: `mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0` (default)
- Incident pins: 3 severity variants via `map.addImage()` + `symbol` layer
  - `low` → 12px amber static (#F4A940)
  - `med` → 14px gold pulse (#E8A838, no glow ring)
  - `high` → 24px red pulse + glow ring (#E63946)
- Clusters at zoom < 14 (circle + count label)
- Safe spaces: emoji in teal circle (#6BA68E, 0.2 opacity)
- User dot: Mapbox default + aurora glow ring (#8B7EC8)
- Real-time updates via Supabase channel subscription
- Realtime drop animation (pin-drop keyframe) on new pins
- Heatmap (location history density) as optional layer
- Neighborhood safety score hexagons (optional layer)
- **Location sharing chip**: shown when `isSharingLocation === true` — tap to reopen WalkWithMe sheet, × to stop

### 7.2 Incident Reporting
- Hold-to-place draggable pin on map
- 3-step wizard: category (12 types) → severity (low/med/high) → submit
- Reverse geocoding via Nominatim
- Offline queue: reports saved locally if offline, submitted on reconnect
- Users can confirm/reject existing reports (with evidence media)
- Auto-expiry: pins expire after 24h (or flagged for moderation)

### 7.3 SOS Emergency
- FAB button with 5s countdown (hold to cancel)
- Hold-progress shown as **centered overlay bar** (not ring on FAB) — background tints red as pressure builds
- Dispatches alert to all trusted contacts via push + Supabase notification
- Creates public tracking session with shareable `/track/[sessionId]` URL
- Live location trail broadcasted every 10s
- "I'm Safe" button cancels session
- Nearby users notified via `api/notify-nearby`

### 7.4 Safety Escort (Trips)
- Route planning: walk / bike / drive / transit
- Transit routing: Transitous API (RATP/IDFM Paris)
- Danger score per route segment (based on nearby pins)
- Background `TripMonitor`: checks proximity to incidents, stationary anomaly detection, auto-arrival
- Trusted contact receives trip summary on start + arrival

### 7.5 Walk With Me
- Share real-time location with one trusted contact during a session
- Watched contact's dot shown on map in purple
- Session auto-ends after 4 hours or on manual stop
- Active sessions show persistent chip on map (`isSharingLocation` in store)

### 7.6 Communities
- Public/private groups with emoji avatar
- Chat threads + reactions + stories
- DMs (1:1 with media support)
- Neighborhood feed (open to all nearby users)

### 7.7 Gamification / Trust
- **Levels**: Watcher (0–50pts) → Reporter (50–200) → Guardian (200–500) → Sentinel (500+)
- **Streaks**: Daily engagement streak with emoji milestones
- **Milestones**: 11 achievements (First Report → Sentinel status)
- **Weekly challenges**: Guardian challenges with XP rewards
- **Trust score**: Derived from reports, confirmations, comments, thanks received

### 7.8 Pro Subscription
- Stripe checkout + customer portal
- Features gated by `ProGate`: advanced filters, priority alerts, history export, verified badge
- Tiers: Free / Pro (monthly) / Pro Annual

### 7.9 Moderation
- Users can flag pins (spam, false, offensive, duplicate)
- Shadow ban on profiles (pins hidden globally)
- Admin panel with simulation tools (seed/tick/cleanup)
- Invite code system for B2B2C orgs

---

## 8. Design System

### Colors (CSS variables on `[data-theme]`)
```
--bg-primary:    #1B2541  (dark)  / #F5F2EE (light)
--bg-secondary:  #0F1729  (dark)  / #FFFFFF (light)
--bg-card:       #2A3A5C  (dark)  / #E8E4DE (light)
--accent:        #E8A838  (dark)  / #C48A1E (light)   ← gold
--accent-glow:   rgba(232,168,56,0.25)
--safe:          #4CAF79
--warn:          #F4A940
--blue:          #8B7EC8                               ← aurora purple
--text-primary:  #F5F2EE (dark)  / #1B2541 (light)
--text-muted:    #7A756D
```

Severity colors (non-variable, used directly in code):
- `low` → `#F4A940`  (amber)
- `med` → `#E8A838`  (gold)
- `high` → `#E63946` (red)

Safe space teal: `#6BA68E`

### Typography
- Headings: `Cormorant Garamond` (Google Fonts — serif, editorial)
- Body: `Plus Jakarta Sans` (Google Fonts — modern sans, 17px base)

### Motion
- Sheet open/close: `cubic-bezier(0.32, 0.72, 0, 1)` — 350ms
- Pin drop: `cubic-bezier(0.34, 1.56, 0.64, 1)` — 700ms bounce
- Breathe animation (VeilSymbol): 3.5s ease-in-out
- Pulse animations: `animation: 2s ease-in-out infinite`
- Framer Motion used for sheet/modal transitions
- **Onboarding slide**: CSS `translateX(-${step * 100}%)` — `transition-transform duration-500 ease-out` (no Framer)

### UI Patterns
- Glass cards: `rgba(255,255,255,0.04)` bg + `var(--border)` border, `backdrop-filter: blur`
- Bottom sheets: slide-up with drag handle
- Filter chips: glass default, severity-color active state
- No scrollbars (`.no-scrollbar`)
- `will-change: transform, opacity` on animated sheets (`.sheet-motion`)
- Reduced motion respected via `@media (prefers-reduced-motion: reduce)`

---

## 9. i18n Namespaces (`src/messages/en.json`)

| Namespace | Key content |
|---|---|
| `common` | close, cancel, submit, save, delete, loading, back, done, search |
| `nav` | map, community, trip, me |
| `emergency` | button, alerting, locationShared, imSafe, resolving, description |
| `report` | title, category, severity, description, environment, urbanContext, submit, success |
| `detail` | emergencyAlert, stillThere, follow, goLive, watchLive, comments, evidence, votes |
| `filters` | severity, age, locationType, confirmedOnly, timeOfDay |
| `layers` | mapStyle, safetyPOI, heatmap, safetyScores, safeSpaces, stations |
| `trip` | safetyEscort, planRoute, dangerScore, startTrip, endTrip, savedRoutes, walkWithMe, signalements, dangerZone, activeZone, shareLink, dangerTip |
| `settings` | account, notifications, privacy, billing, legal, verification, language |
| `notifications` | title, empty, markAllRead |
| `mykova` | activity, saved, stats, trustScore, level, streaks, challenges |
| `community` | create, join, leave, members |
| `offline` | banner, pendingReports |
| `moderation` | spam, falseReport, offensive, duplicate, submitReport |
| `safeSpaces` | nearby, explore, partners, pharmacy, hospital, police, cafe, shelter |
| `login` | features, stats, invite, errors |
| `onboarding` | passer, start, v2Tagline, v2Prop1-3, nameTitle, nameSub, addPhoto, namePlaceholder2, changeCity, v2GoalsTitle, v2GoalsSub, v2Goal1-5, permissionsTitle, permissionsSub, locationCard, notifCard, allow, privacyNote, circleTitle2, circleSub2, invitePlaceholder, send, orShareLink, copy, shareBtn, addLater, finish |
| `incidents` | nearbyIncidents, allClear, allClearSub, noResults, broadenFilters, mild, moderate, danger, urgent, emergencyAlert |
| `install` | addToHome, quickAccess, install |

**Coverage:**
- EN + FR: **682 keys each** — 100% complete
- All other 28 locales: ~144 keys each (~21%) — only 6 namespaces: `common, nav, emergency, login, trip, incidents`

30 locales: ar, bn, cs, da, de, el, en, es, fi, fr, he, hi, hu, id, it, ja, ko, ms, nl, no, pl, pt, ro, ru, sv, th, tr, uk, vi, zh

---

## 10. Onboarding Flow (`OnboardingFunnelV2.tsx`)

**Activation:** Shown when `!useOnboardingDone()` — hook checks `localStorage('brume_onboarding_done') === '1'` OR `profile.onboarding_completed === true`.

**Guard:** `src/proxy.ts` — middleware checks `ob_done` cookie (must be `'1'`). If absent, redirects unauthenticated users to `/login`. Authenticated users without `onboarding_completed` see the funnel overlaid on `/map`.

**Admin reset:** SettingsSheet (when `isAdmin=true`) has "🔧 Reset Onboarding (Admin)" button — clears DB + `ob_done` cookie + all localStorage keys → reload → funnel reappears.

**5 screens** (CSS slide: `translateX(-${step * 100}%)`):

| # | Screen | Data collected |
|---|---|---|
| 1 | **Welcome** | None — BreveilSymbol + 3 value prop pills |
| 2 | **Profile** | `display_name` (text input), avatar photo (Supabase Storage `avatars` bucket), city = "Paris" hardcoded |
| 3 | **Goals** | `onboarding_goals: number[]` — 5 toggle cards (index 0–4) |
| 4 | **Permissions** | `navigator.geolocation.getCurrentPosition()`, `Notification.requestPermission()` — real browser APIs, can be skipped |
| 5 | **Circle** | Invite email/phone → `pending_invites` insert `{ inviter_id, contact_info }` |

**`handleComplete()`** (called by "Passer" skip or "Terminer" finish):
```ts
await supabase.from('profiles').update({
  display_name, city: 'Paris', onboarding_goals, onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}).eq('id', userId);
document.cookie = 'ob_done=1;path=/;max-age=31536000';
localStorage.setItem('brume_onboarding_done', '1');
onComplete?.();  // → map/page.tsx forces re-render
```

**Invite link format:** `${window.location.origin}/login?ref=${userId}`

---

## 11. Key Files Quick Reference

| File | What it does |
|---|---|
| `src/app/map/page.tsx` | Main app shell — mounts all tabs, sheets, FAB, bottom nav |
| `src/components/MapView.tsx` | Mapbox map, all layers, pin images, realtime subscription |
| `src/components/OnboardingFunnelV2.tsx` | 5-step onboarding funnel (ACTIVE) |
| `src/components/IncidentsView.tsx` | Nearby incidents panel (new v0 design) |
| `src/components/EmergencyButton.tsx` | SOS button logic |
| `src/components/ReportSheet.tsx` | Report wizard |
| `src/components/TripView.tsx` | Trip planner + escort |
| `src/stores/useStore.ts` | All global state |
| `src/types/index.ts` | All TS types + CATEGORIES / SEVERITY constants |
| `src/lib/utils.ts` | `timeAgo`, `haversineMeters`, `springTransition` |
| `src/lib/levels.ts` | Level thresholds + labels |
| `src/lib/milestones.ts` | 11 achievement definitions |
| `src/lib/TripMonitor.ts` | Background safety engine during trips |
| `src/lib/geocode.ts` | `geocodeForward` / `geocodeReverse` — Mapbox geocoding utils |
| `src/components/AutocompleteInput.tsx` | Address autocomplete with Mapbox (limit=7, POI+address+place) |
| `src/proxy.ts` | Auth + locale middleware (Next.js) |
| `src/app/globals.css` | All CSS variables, animations, utility classes |
| `supabase/migrations/` | All DB schema migrations |

---

## 12. Active Conventions

- **No default exports** except for Next.js pages and layouts
- **Tailwind classes** for layout/spacing; **CSS variables** (`var(--accent)`) for brand colors
- **Inline styles** for dynamic colors (severity, animated elements)
- **`useTranslations('namespace')`** from `next-intl` for all user-visible strings
- **Supabase client**: `src/lib/supabase.ts` (browser), `src/lib/supabase-admin.ts` (server)
- **Sheet pattern**: open via `setActiveSheet('name')` + `setSelectedPin(pin)` in store
- **Map zoom**: `setMapFlyTo({ lat, lng, zoom: 16 })` to fly to a pin
- **Severity values**: always `'low'` | `'med'` | `'high'` (not `'mild'`/`'moderate'`/`'danger'` — those are i18n display labels only)
- **Pin opacity**: fresh pins = 1.0, fading (>12h) = 0.6, old (>20h) = 0.35
- **All money in cents** (Stripe convention)

---

## 13. What Was Completed — 2026-03-02

### Sprint items verified as already done (no changes needed)
- **Onboarding rewire** (`proxy.ts`): already passes through to `/map`, no redirect on `onboarding_completed=false`
- **SOS progress overlay**: centered hold-progress bar already at `EmergencyButton.tsx:425–446`
- **Mapbox custom style**: `mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0` already in `STYLE_URLS` as default
- **Geocoding fix**: `AutocompleteInput.tsx` already has `limit=7&autocomplete=true&types=poi,address,place`

### Implemented this session
1. **Location sharing chip** (`map/page.tsx`): chip above map when `isSharingLocation === true` — tap to reopen WalkWithMe, × to stop sharing
2. **OnboardingFunnelV2** (`src/components/OnboardingFunnelV2.tsx`): replaced 7-step modal with new 5-step full-screen funnel (see §10)
3. **Old onboarding archived**: `OnboardingFunnel.tsx` → `.old`, all 7 `Step*.tsx` → `.old`
4. **i18n updated**: 36 new keys in `onboarding` namespace added to both `en.json` and `fr.json`
5. **`map/page.tsx` wired**: imports `OnboardingFunnelV2`, passes `onComplete` callback

---

## 14. Known Bugs / Incomplete Items

### DB migrations missing (code writes to columns that don't exist yet)
| Column / Table | Used by | Migration needed |
|---|---|---|
| `profiles.city` | `OnboardingFunnelV2` `handleComplete` | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;` |
| `profiles.onboarding_goals` | `OnboardingFunnelV2` `handleComplete` | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_goals jsonb;` |
| `profiles.onboarding_step` | Referenced in some components | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;` |
| `pending_invites` table | `OnboardingFunnelV2` Screen 5, `StepTrustedContact.tsx.old` | Create table: `CREATE TABLE IF NOT EXISTS pending_invites (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, inviter_id uuid REFERENCES auth.users NOT NULL, contact_info text NOT NULL, created_at timestamptz DEFAULT now());` |

**To apply:** Run directly in Supabase SQL editor or via `supabase/migrations/` file.

### Onboarding incomplete wiring
- **"Changer" city button** (Screen 2): visible but not wired — tapping it does nothing. Should open city search/input.
- **Avatar upload error handling**: no user-visible error if Supabase Storage upload fails.

### Pending env vars (must set in Vercel)
- `NEXT_PUBLIC_BETA_EMAIL` / `NEXT_PUBLIC_BETA_PASSWORD` — beta login gate credentials
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` matches the token that has access to `mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0`

### i18n gap
- 28 non-EN/FR locales are at ~21% — only 6 namespaces covered. All UI added since Feb 22 is untranslated in those locales.

### Design sessions needed
- **Communities UI**: current card design is heavy — plan is Telegram-style compact rows (avatar + name + last msg + badge)
- **Safety escort active HUD**: full-screen HUD with large arrow + street name + ETA (Citymapper "Now" mode reference)

---

*End of brief. For deeper context on any feature, ask for the relevant source file.*
