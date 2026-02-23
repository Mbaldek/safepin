# KOVA — Feature Catalog

Complete reference for every feature in the KOVA safety platform.

---

## Table of Contents

1. [Safety Map](#1-safety-map)
2. [Incident Reporting](#2-incident-reporting)
3. [Pin Detail & Voting](#3-pin-detail--voting)
4. [SOS Emergency System](#4-sos-emergency-system)
5. [Walk With Me](#5-walk-with-me)
6. [Audio Check-in](#6-audio-check-in)
7. [Safe Route Planner](#7-safe-route-planner)
8. [Live Broadcasting](#8-live-broadcasting)
9. [Incidents List](#9-incidents-list)
10. [Community System](#10-community-system)
11. [Friends & Direct Messages](#11-friends--direct-messages)
12. [My KOVA Hub](#12-my-kova-hub)
13. [Trust Level System](#13-trust-level-system)
14. [Expertise Tags](#14-expertise-tags)
15. [Milestones](#15-milestones)
16. [Weekly Challenges](#16-weekly-challenges)
17. [Referral System](#17-referral-system)
18. [SOS Community Broadcast](#18-sos-community-broadcast)
19. [Shared Safe Routes](#19-shared-safe-routes)
20. [Safety Buddy Matching](#20-safety-buddy-matching)
21. [Trusted Circle](#21-trusted-circle)
22. [Place Notes](#22-place-notes)
23. [Notifications](#23-notifications)
24. [Settings](#24-settings)
25. [Admin Dashboard (Tower Control)](#25-admin-dashboard-tower-control)
26. [Billing & Subscriptions](#26-billing--subscriptions)
27. [PWA & Offline Support](#27-pwa--offline-support)
28. [Internationalization](#28-internationalization)
29. [Simulation Engine](#29-simulation-engine)

---

## 1. Safety Map

**Component:** `MapView.tsx`
**Location:** Main map page — always visible behind all bottom sheets

The full-screen interactive Mapbox GL JS map is the heart of KOVA. It renders multiple data layers simultaneously and serves as the primary interface for spatial safety awareness.

### Map Layers (toggleable via LayerPanel)

| Layer | Description | Default |
|---|---|---|
| Safety Pins | Incident report markers with category emoji + severity color | On |
| Active Route | Current trip route polyline | On (during trip) |
| Route Alternatives | Up to 3 candidate routes during planning | On (during planning) |
| Trusted Circle | Blue dots showing live locations of trusted contacts | Off |
| Place Notes | Personal bookmarked locations | Off |
| Metro Lines | Paris metro network (fetched from Overpass API) | Off |
| RER Lines | Paris RER commuter rail lines | Off |
| Tram Lines | Paris tram lines | Off |
| Bus Lines | Major Paris bus routes | Off |
| Pharmacies | Nearby pharmacies (POI from Overpass) | Off |
| Hospitals | Nearby hospitals | Off |
| Police Stations | Nearby police stations | Off |
| Location History | Personal GPS trail heatmap | Off (Pro only) |
| Safe Spaces | Verified safe locations | Off |
| Neighborhood Scores | Safety score overlay by area | Off (Pro only) |
| Simulated Data | Fake data from simulation engine | Off (Admin only) |

### Map Controls

- **Map Style:** Streets / Light / Dark (dark syncs with app theme)
- **Filter Bar:** Filter visible pins by category, severity, time range, environment
- **Address Search:** Mapbox Geocoding API with autocomplete
- **City Context Panel:** Contextual information about the current viewport area
- **Nearby Incidents Pill:** Top-left badge showing count of active incidents within view

### Map Button Layout

```
[Nearby pill] [Filter]                     [top bar]

[Layers]                                   [left side]

                                  [Report +] [right side]
                                  [  SOS   ] [right side]
```

---

## 2. Incident Reporting

**Component:** `ReportSheet.tsx`
**Trigger:** Tap the "+" FAB button on the map

A streamlined 30-second reporting flow for safety incidents.

### Report Fields

| Field | Options | Required |
|---|---|---|
| Category | Harassment, Stalking, Dark Area, Aggression, Drunk Person, Other | Yes |
| Severity | Low (yellow), Medium (orange), High (red) | Yes |
| Environment | Street, Metro, Bus, Park, Bar/Club, Workplace, School, Other | Yes |
| Urban Context | Residential, Commercial, Industrial, Transit Hub, Park/Green Space | No |
| Custom Context | Free text (e.g., "near the fountain") | No |
| "I'm moving" | Toggle for incidents while in transit | No |
| Description | Free text | No |
| Media | Up to 5 files (photo, video, audio) | No |

### Location

- Pin drops at user's current GPS coordinates
- Auto-geocoded via Mapbox API for human-readable address
- Address included in pin description

### Offline Support

When no network connectivity is detected:
1. Pin is serialized and saved to **IndexedDB** offline queue
2. `OfflineBanner` component shows connectivity status
3. Service worker performs **background sync** when connectivity returns
4. Queued pins are submitted automatically

### Post-Creation

- Pin appears on map **instantly** via Supabase Realtime `postgres_changes`
- Nearby users receive **Web Push notification** (filtered by alert radius)
- Pin has a lifecycle: active → confirmed/cleared → expired/resolved

---

## 3. Pin Detail & Voting

**Component:** `DetailSheet.tsx`
**Trigger:** Tap any pin on the map or in the incidents list

### Information Displayed

- Category emoji + label + severity color bar
- Description text
- Address (geocoded)
- Time since creation (e.g., "23m ago")
- Environment badge
- Media gallery (photos, videos) — zoomable
- Vote counts (confirm / deny)
- Comment count

### Interactive Actions

| Action | Description |
|---|---|
| **Confirm** | Vote that the incident is real — increments `votes_confirm`, extends pin lifetime |
| **Deny** | Vote that the incident is cleared — increments `votes_deny`. At 3 denies, pin auto-resolves |
| **Thank** | Send gratitude to the reporter — pink heart button, increments reporter's `thanks_received` |
| **Follow** | Bookmark this pin for updates — saved to localStorage, appears in My KOVA Feed |
| **Share** | Share via native Web Share API |
| **Comment** | Add a text comment — real-time chat on the pin via Supabase Realtime |
| **Go Live** | Start a LiveKit video/audio broadcast from this location |
| **Watch Live** | Join an active live stream on this pin |
| **Flag** | Report as spam, false, offensive, or duplicate |

### Emergency Pin Extras

For pins marked `is_emergency: true`:
- **SOS Broadcast Panel** — shows nearby responders, "I'm on my way" button
- **Audio Check-in Button** — record a voice update for the emergency

---

## 4. SOS Emergency System

**Component:** `EmergencyButton.tsx`
**Location:** Persistent red shield FAB, bottom-right of map

### Activation Flow

```
1. TAP SOS button
   ↓
2. Full-screen overlay with 5-second countdown (prevents accidental triggers)
   • Emergency quick-dial buttons visible: 15 (SAMU), 17 (Police), 18 (Pompiers), 112 (EU)
   ↓
3. Countdown completes or user confirms early
   ↓
4. SOS ACTIVATES:
   • Emergency pin created at GPS location (is_emergency: true)
   • emergency-dispatch Edge Function notifies all trusted contacts
   • GPS tracking starts (new trail pin every 30m or 45s)
   • Safe Spaces layer auto-enabled on map
   • "SOS ACTIVE" banner shown at top of screen
   ↓
5. ESCALATION: After 15 minutes if unresolved, re-dispatches to trusted contacts
   ↓
6. RESOLUTION: "I'm Safe" button resolves all session pins, notifies contacts
```

### GPS Breadcrumb Trail

During active SOS, the app uses `watchPosition` to create a trail of pins:
- New pin every **30 meters** of movement or **45 seconds** (whichever comes first)
- Each trail pin has `is_emergency: true` and links back to the session
- Trail is visible to trusted contacts on their map

### Emergency Numbers (Paris)

| Number | Service |
|---|---|
| 15 | SAMU (Medical) |
| 17 | Police |
| 18 | Pompiers (Fire) |
| 112 | EU Universal Emergency |

---

## 5. Walk With Me

**Component:** `WalkWithMePanel.tsx`
**Purpose:** Virtual companion for solo walking sessions

### Create a Session

1. Tap "Walk With Me" in the map interface
2. Optionally enter a destination
3. A unique **6-character alphanumeric invite code** is generated (e.g., `A3K9MX`)
4. Session created in `walk_sessions` table with status `waiting`
5. Share the code with a friend

### Join a Session

1. Enter the invite code
2. Automatically linked as companion
3. Session transitions to `active`

### Active Session Features

| Feature | Description |
|---|---|
| Timer | Elapsed time counter |
| Destination | Optional destination display |
| Location Sharing | Both users share real-time location via Supabase Presence channels |
| Companion on Map | The companion's location shown as a dot on the map |
| 15-min Check-ins | "Are you okay?" dialog every 15 minutes — if not dismissed, can trigger alert |
| End Session | "End Walk — I'm Safe" button completes the session cleanly |

### Session States

`waiting` → `active` → `completed` / `cancelled`

---

## 6. Audio Check-in

**Component:** `AudioCheckinButton.tsx`
**Purpose:** Voice memo recording for safety sessions

### Recording Flow

1. Tap and hold the microphone button
2. **Real-time waveform visualization** using Web Audio API `AnalyserNode` (64-bin FFT)
3. Release to stop recording
4. **Preview playback** before sending
5. Confirm → uploads to Supabase Storage (`pin-photos` bucket, `audio/` prefix)
6. Metadata saved to `audio_checkins` table with duration

### Technical Details

- Format: `audio/webm;codecs=opus`
- Storage path: `audio/{userId}/{timestamp}.webm`
- Available within: Walk With Me sessions, emergency SOS sessions, pin detail sheets

---

## 7. Safe Route Planner

**Component:** `TripView.tsx`
**Access:** Trip tab in bottom navigation

### Route Planning

| Input | Description |
|---|---|
| Departure | Optional — defaults to current GPS location |
| Destination | Required — Mapbox geocoded autocomplete |
| Mode | Walk, Bike, Drive, Transit |
| Night filter | Toggle for night-safe-only routes |
| Duration | 15min, 30min, 1hr, 2hr, 4hr |

### Route Calculation Engine

1. Calls **OSRM** routing API for up to **3 alternative routes**
2. **Danger scoring:** Each route scored by counting unresolved pins within **200 meters** of the path
3. **Bypass algorithm:** For dangerous segments, generates perpendicular waypoints **380 meters off-route** to reroute around high-risk areas
4. Routes labeled: **Safest** (green), **Balanced** (amber), **Fastest** (blue)
5. Rerouted segments tagged with a "Rerouted" badge

### Active Trip Mode

| Feature | Description |
|---|---|
| Countdown Timer | Progress bar toward estimated arrival |
| Live GPS Tracking | Records to `location_history` every 30 seconds |
| "I'm Safe" | End trip, save to `trip_log` |
| "Cancel Trip" | Abort without saving |
| Nearest Safe Space | Quick-action to find closest safe location |
| Location Sharing | Toggle to broadcast live location to Trusted Circle |
| Smart Alerts | Notifications when new incidents appear along your saved routes |

### Saved Routes

- Star/save any route to `saved_routes` table
- Saved routes appear in My KOVA Favorites tab
- Saved routes monitored for new incidents along the path

---

## 8. Live Broadcasting

**Components:** `LiveBroadcaster.tsx`, `LiveViewer.tsx`
**Technology:** LiveKit (WebRTC)

### Go Live (Broadcaster)

1. Open a pin's detail sheet → tap "Go Live"
2. Setup options:
   - Visibility: Public / Contacts Only
   - Stream type: Audio Only / Video
   - Video mode shows battery drain warning
3. LiveKit JWT token fetched from `/api/livekit-token` before going live (instant start)
4. Record created in `live_sessions` table
5. Full-screen broadcast UI with:
   - Animated "LIVE" indicator + duration counter
   - Viewer count
   - Floating chat overlay (messages via LiveKit data channel)
   - "STOP LIVE" button

### Watch Live (Viewer)

- Joins the LiveKit room as subscriber
- Video/audio playback
- Can send chat messages in real-time overlay
- Pin shows pulsing "LIVE" badge on map and in incidents list

---

## 9. Incidents List

**Component:** `IncidentsView.tsx`
**Access:** Incidents tab in bottom navigation

### Filters

| Filter | Options |
|---|---|
| Time | All, < 1 hour, < 6 hours, Today |
| Radius | Any, 500m, 1km, 2km, 5km (requires GPS) |
| Emergency Only | Toggle — show only SOS pins |
| Live Only | Toggle — show only pins with active streams |
| Severity | All, Low, Medium, High |

### Display

- Grouped by category with collapsible sections
- Emergency alerts shown in special red card with pulsing dot
- Regular pins show: severity color bar, category emoji, distance, environment, media count
- Live streaming badge on pins with active sessions
- Sort order: live first → emergencies → by recency

---

## 10. Community System

**Component:** `CommunityView.tsx`
**Access:** Community tab in bottom navigation

### Three Sub-tabs

#### Groups Tab

- Browse all communities and groups
- Join / leave with optimistic UI
- Create new community or group
  - Emoji picker (15 options)
  - Name, description, public/private toggle
- Community detail view: description, member count, sub-groups
- **Real-time chat** within any community/group (Supabase Realtime)
- Stories row at top of chat
- Join-gate: must be a member to post in private communities

#### Neighborhoods Tab

**Component:** `NeighborhoodFeed.tsx`

- Loads communities with `community_subtype = 'neighborhood'`
- **Sorted by distance** from user's GPS location
- **Auto-selects** the nearest neighborhood
- **Auto-joins** the closest neighborhood on view
- Horizontal scrollable selector chips (name + member count)
- Full real-time chat for selected neighborhood
- "Create Neighborhood" button — generates one at current location with 1km radius

#### Friends Tab

See [Friends & Direct Messages](#11-friends--direct-messages) below.

---

## 11. Friends & Direct Messages

**Component:** `FriendsView.tsx`

### Friend Management

| Feature | Description |
|---|---|
| Search | Find users by display name (debounced 300ms) |
| Send Request | Creates `friendships` record (status: pending) |
| Accept/Decline | Respond to incoming requests |
| Requests Tab | Shows pending requests with unread count badge |

### Direct Messaging

- Tap any friend to open DM conversation
- Auto-creates `dm_conversations` record if none exists
- **Real-time sync** via Supabase Realtime on `direct_messages`
- Supports: text, image uploads, video uploads (to `media` bucket)
- Timestamp grouping (messages within 5 minutes grouped)
- Read receipts via `user1_last_read_at` / `user2_last_read_at`

---

## 12. My KOVA Hub

**Component:** `MyKovaView.tsx`
**Access:** My KOVA tab in bottom navigation

### Four Sub-tabs

#### Feed

- Recent in-app notifications (from `notifications` table)
- Followed pins feed (bookmarked pins from localStorage)

#### Favorites

- Starred place notes with emoji
- Saved routes — tap to load in Trip planner
- Star/unstar/delete management

#### Stats

**Trust Score Display:**
- Visual level progress bar (current → next level)
- Current level badge with emoji and color
- Points breakdown

**7-Day Activity Sparkline:**
- Bar chart of daily contribution over past week

**Impact Grid:**
| Stat | Description |
|---|---|
| Reports | Total pins submitted |
| Confirmations | Total confirm votes |
| Active Pins | Currently live pins |
| Comments | Total comments made |
| Place Notes | Personal bookmarks created |

**Additional Sections:**
- Trusted Circle management
- Weekly Challenges (see [#16](#16-weekly-challenges))
- Referral System (see [#17](#17-referral-system))

#### Profile

- Avatar upload (stored in Supabase Storage)
- Display name editing
- Verification badge
- Expertise tags (auto-computed, up to 5)
- Location history viewer (Pro, collapsible)
- My Pins list (editable, deletable, collapsible)
- Trip History (collapsible)
- SOS History (collapsible)
- Sign Out button

---

## 13. Trust Level System

**File:** `src/lib/levels.ts`

### Score Formula

```
score = (pins × 10) + (alerts × 15) + (confirmedVotes × 5) + (commentsMade × 2)
```

### Levels

| Level | Emoji | Color | Points Required | Meaning |
|---|---|---|---|---|
| Watcher | 👁 | Gray | 0–49 | New user, learning the ropes |
| Reporter | 📡 | Indigo | 50–199 | Active contributor |
| Guardian | ⚔️ | Amber | 200–499 | Trusted community member |
| Sentinel | 🛡️ | Rose | 500+ | Elite safety champion |

Trust level is displayed on the user's profile and visible to other users as a badge.

---

## 14. Expertise Tags

**File:** `src/lib/expertise.ts`

Five auto-computed profile badges based on contribution patterns:

| Tag | Emoji | Color | Criteria |
|---|---|---|---|
| Night Owl | 🦉 | Indigo | 40%+ of reports filed between 22:00–05:00 (min 5 pins) |
| Transit Guardian | 🚇 | Sky | 40%+ of reports in metro/bus environment (min 5 pins) |
| First Responder | 🚨 | Red | Filed 2+ emergency alerts |
| Neighborhood Expert | 🏘️ | Amber | Cluster of 3+ pins within 500m of each other |
| Verified Guardian | ✅ | Green | Is verified AND at Guardian or Sentinel level |

Tags auto-update as user activity changes. Displayed on profile and visible to other users.

---

## 15. Milestones

**File:** `src/lib/milestones.ts`

11 lifetime achievements with animated toast notifications on unlock:

| Milestone | Trigger |
|---|---|
| `first_pin` | Submit first safety report |
| `10_pins` | Submit 10 reports |
| `first_sos` | Activate SOS for the first time |
| `first_vote` | Cast first vote on a pin |
| `10_votes` | Cast 10 votes |
| `first_comment` | Post first comment |
| `first_route` | Plan first safe route |
| `first_place_note` | Create first place note |
| `first_community` | Join first community |
| `guardian_level` | Reach Guardian trust level |
| `sentinel_level` | Reach Sentinel trust level |

Achieved milestones persisted to localStorage. Animated `MilestoneToast` notification shown on unlock.

---

## 16. Weekly Challenges

**Component:** `ChallengesSection.tsx`
**Location:** My KOVA → Stats tab

### Default Weekly Challenges

| Challenge | Emoji | Target | Reward |
|---|---|---|---|
| Confirm 5 reports | 👍 | 5 vote confirmations | 50 pts |
| Report 3 incidents | 📍 | 3 new pin submissions | 75 pts |
| Comment on 3 pins | 💬 | 3 pin comments | 40 pts |
| Save a safe route | 🗺️ | 1 saved route | 30 pts |

### Mechanics

- New challenges **auto-seeded every Monday** if none exist for the current week
- Progress **auto-calculated** from actual database activity since Monday 00:00 (not self-reported)
- Progress bars show visual completion percentage
- **"Claim" button** appears when complete — adds points to `profiles.challenge_points`
- Days remaining counter shown in header
- Total accumulated points displayed with flame icon

---

## 17. Referral System

**Component:** `ReferralSection.tsx`
**Location:** My KOVA → Stats tab

### How It Works

1. On first view, a unique code is auto-generated: `KOVA-XXXXX` (5 random alphanumeric chars)
2. Code stored in `profiles.referral_code`
3. User can **copy code** to clipboard or **share** via native Web Share API
4. Share URL format: `safepin-pearl.vercel.app/login?ref=KOVA-XXXXX`
5. Referral count tracked in `profiles.referral_count` and displayed

### UI

- Copy button with confirmation toast
- Share button (uses Web Share API, falls back to clipboard)
- Referral count display with user icon

---

## 18. SOS Community Broadcast

**Component:** `SosBroadcastPanel.tsx`
**Location:** DetailSheet (for emergency pins only)

### For Nearby Users

When an emergency pin exists nearby:
- Panel shows count of people responding
- List of responders with:
  - Display name
  - Status: "On my way" or "Arrived"
  - Distance from the incident
- Real-time updates via Supabase Realtime channel

### Response Actions

| Button | Action |
|---|---|
| "I'm on my way" | Creates `sos_responders` record with status `on_way`, user's GPS location |
| "I'm here" | Updates status to `arrived` |

---

## 19. Shared Safe Routes

**Component:** `SavedPanel.tsx` (routes tab)

### Route Sharing

Each saved route has a share toggle:
- **Private (default):** Only visible to the creator
- **Public:** Visible to all users, generates a unique `share_token`

### Upvotes

Public routes display an upvote count badge:
- Other users can upvote public routes they find useful
- Upvote count shown with thumbs-up icon
- Stored in `route_upvotes` table

### UI

- Share toggle button (green when public, gray when private)
- Upvote count badge (purple, only shown when route is public)
- Delete button

---

## 20. Safety Buddy Matching

**Component:** `SafetyBuddySheet.tsx`
**Access:** Pro feature (wrapped in `ProGate`)

### Setup

1. Select a saved route
2. Choose recurring days (Monday–Sunday toggle, Mon–Fri default)
3. Set time window (from / to time pickers)
4. Save schedule → stored in `safety_buddies` table

### Matching

- Shows other users with the **same route** and **overlapping schedule**
- Displays overlapping day names (e.g., "Mon, Tue, Wed")
- Chat button to open DM with potential buddy

---

## 21. Trusted Circle

**Component:** `TrustedCircleSection.tsx`
**Location:** My KOVA → Stats tab

### Features

- Search users to add as trusted contacts
- Send/receive trusted circle invitations
- Accept/decline incoming invitations
- List of accepted trusted contacts with:
  - Live location sharing status indicator
  - Toggle to enable/disable location sharing
- During SOS, all trusted contacts are automatically notified via `emergency-dispatch` Edge Function

---

## 22. Place Notes

**Components:** `PlaceNoteSheet.tsx`, `PlaceNotePopup.tsx`
**Location:** Map layer + My KOVA Favorites

### Features

- Long-press on map to drop a personal note
- Fields: name, address/note, emoji (10 options: 📌🏠💼🍽️❤️🌳🔒🚶⭐⚠️)
- Star/favorite toggle — starred notes appear in Favorites tab
- Shown on map as custom marker layer (personal only)
- Use as departure/destination in Trip planner ("Depart" / "Go here" buttons)

---

## 23. Notifications

**Component:** `NotificationsSheet.tsx`

### In-App Notifications

Displayed via bell icon in top bar with unread count badge.

| Type | Trigger |
|---|---|
| Nearby pin | New pin within user's alert radius |
| SOS alert | Emergency pin nearby (always delivered) |
| Followed pin update | Update on a bookmarked pin |
| Milestone unlocked | Achievement earned |
| Challenge completed | Weekly challenge finished |
| Location share request | Trusted contact requesting location |

### Push Notifications

- **Web Push API** with VAPID keys
- Service worker (`/sw.js`) handles background push reception
- **Geo-filtered:** `notify-nearby` Edge Function sends only to users within configurable radius (default 1000m)

### Settings

- Alert radius: 500m / 1km / 2km / 5km / 10km
- Toggle per category: Nearby Pins, SOS Alerts (always on), Followed Pins, Milestones
- Quiet hours: start / end time pickers

---

## 24. Settings

**Component:** `SettingsSheet.tsx`

### Sections

| Section | Contents |
|---|---|
| **Account** | Display name, avatar upload |
| **Notifications** | Alert radius, category toggles, quiet hours |
| **Privacy & Data** | Analytics toggle, crash reports toggle, GDPR rights, delete account |
| **Subscription** | Current plan, manage via Stripe Portal, upgrade card, invoice history |
| **Legal** | Privacy Policy, Terms of Service, Cookie Policy, GDPR disclosure, company info |
| **Security** | 2FA (coming soon), active sessions (coming soon), sign out all devices |
| **Admin** | Link to Tower Control (`/admin`) — admin users only |
| **Language** | English / Francais — sets `NEXT_LOCALE` cookie |

---

## 25. Admin Dashboard (Tower Control)

**File:** `src/app/admin/page.tsx`
**URL:** `/admin`

Eight-tab admin interface for platform management.

### Tabs

#### Overview
- Stat cards: Total Pins, Active Pins, Active SOS, Total Users, Pending Reports, Live Sessions
- Recent pins table with category/severity/status indicators

#### Analytics
- KPI grid: DAU, WAU, MAU, New Users, Pins, Resolution Rate, Engagement Rate, Retention
- Hourly breakdown charts (custom SVG bar charts)
- 30-day trend charts for pin activity and user growth

#### Pins
- Paginated table (20 per page)
- Filter: All / Active / Resolved / Emergency
- Per-row actions: Resolve, Delete
- Bulk delete selected pins
- User detail drill-down panel (full profile, pin history, vote history, comment stats)

#### Users
- Full user list with contribution stats
- Toggle admin status
- Delete user
- User detail drill-down panel

#### Reports
- User-submitted flag reports (spam, false, offensive, duplicate)
- Update status: pending → reviewed → resolved
- Delete reports

#### Parameters
- Inline-editable key-value configuration:
  - `pin_expiry_hours` (default: 24)
  - `sos_expiry_hours` (default: 2)
  - `auto_resolve_denies` (default: 3)
  - `max_pins_per_user_day` (default: 10)
  - `notify_radius_default` (default: 1000)

#### Live
- Active live sessions table (auto-refreshes every 15 seconds)
- Terminate any live session

#### Simulation
- See [Simulation Engine](#29-simulation-engine) below

---

## 26. Billing & Subscriptions

### Payment Flow

```
Settings → "Upgrade to Pro" → Stripe Checkout Session → Payment → Webhook → Subscription Active
```

### API Routes

| Route | Purpose |
|---|---|
| `/api/stripe/checkout` | Creates Stripe Checkout Session (monthly or annual) |
| `/api/stripe/webhook` | Processes Stripe webhook events |

### Webhook Events Handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Activates subscription in DB |
| `invoice.paid` | Updates subscription, saves invoice record |
| `invoice.payment_failed` | Marks subscription status accordingly |
| `customer.subscription.updated` | Syncs plan changes |
| `customer.subscription.deleted` | Marks subscription as cancelled |

### Billing Portal

"Manage Subscription" button in Settings opens Stripe Customer Portal for:
- Plan changes (monthly ↔ annual)
- Cancellation
- Payment method updates

### Pro Status

- `useIsPro` hook checks `subscriptions` table
- Result cached in `localStorage` (key: `kova_is_pro`)
- `ProGate` component wraps Pro features — shows blurred upgrade overlay for free users

---

## 27. PWA & Offline Support

### Progressive Web App

- Fully installable via "Add to Home Screen"
- `InstallPrompt` component detects the install event and shows banner
- `manifest.json` for PWA metadata (name, icons, theme color)
- Service worker (`/sw.js`) for push notifications and caching

### Offline Queue

- When network is unavailable, new pins are saved to **IndexedDB**
- `OfflineBanner` component shows connectivity status
- Service worker performs **background sync** on reconnection
- Queued pins submitted automatically when back online

### Push Notifications

- **Web Push API** with VAPID keys
- `PushOptInModal` prompts users to enable notifications
- Notifications delivered even when app is closed

---

## 28. Internationalization

**Framework:** next-intl v4

### Supported Languages

| Code | Language |
|---|---|
| `en` | English |
| `fr` | Francais |

### Implementation

- String files: `src/messages/en.json`, `src/messages/fr.json`
- Language selection in Settings sets `NEXT_LOCALE` cookie
- Cookie-based locale detection (no URL prefix routing)
- Namespaces: `common`, `nav`, `emergency`, `report`, `detail`, `filters`, `layers`, `trip`, `settings`, `notifications`, `mykova`, `community`, `offline`, `moderation`, `safeSpaces`, `install`

---

## 29. Simulation Engine

**Admin Tab:** Simulation (in Tower Control)
**Edge Functions:** `seed-paris`, `simulate-activity`

### Purpose

Generate realistic fake data for:
- Product demos and investor presentations
- Load testing
- UI/UX testing with populated maps
- Onboarding screenshots

### Capabilities

| Feature | Description |
|---|---|
| Seed Paris | Generate 200+ fake users and 500+ pins concentrated around Paris hotspots |
| Live Simulation | Auto-create new pins, votes, and comments at configurable intervals |
| Map Toggle | Admin-only toggle to show/hide simulated data on the map |
| Cleanup | One-click deletion of all simulated data |

### Data Isolation

- All simulated data flagged with `is_simulated = true`
- Map query filters out simulated data by default
- Admin can toggle visibility in LayerPanel
- Cleanup deletes only `is_simulated = true` records

For detailed usage instructions, see the [Simulation Engine Guide](./SIMULATION_ENGINE_GUIDE.md).
