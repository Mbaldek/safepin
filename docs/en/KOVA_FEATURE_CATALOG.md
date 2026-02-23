# Brume -- Feature Catalog

Complete reference for every feature in the Brume safety platform.

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
12. [My Brume Hub](#12-my-kova-hub)
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
30. [Identity Verification](#30-identity-verification)
31. [Legal Pages](#31-legal-pages)
32. [Landing Page](#32-landing-page)

---

## 1. Safety Map

**Component:** `MapView.tsx`
**Location:** Main map page -- always visible behind all bottom sheets

The full-screen interactive Mapbox GL JS map is the heart of Brume. It renders multiple data layers simultaneously and serves as the primary interface for spatial safety awareness.

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

### Map Styles

| Style | Description |
|---|---|
| Streets | Default Mapbox Streets style |
| Light | Light-toned base map |
| Dark | Dark-toned base map (syncs with app theme) |

### Map Controls

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
- Pin has a lifecycle: active -> confirmed/cleared -> expired/resolved

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
- Media gallery (photos, videos) -- zoomable
- Vote counts (confirm / deny)
- Comment count

### Interactive Actions

| Action | Description |
|---|---|
| **Confirm** | Vote that the incident is real -- increments `votes_confirm`, extends pin lifetime |
| **Deny** | Vote that the incident is cleared -- increments `votes_deny`. At 3 denies, pin auto-resolves |
| **Thank** | Send gratitude to the reporter -- pink heart button, increments reporter's `thanks_received` |
| **Follow** | Bookmark this pin for updates -- saved to localStorage, appears in My Brume Feed |
| **Share** | Share via native Web Share API |
| **Comment** | Add a text comment -- real-time chat on the pin via Supabase Realtime |
| **Go Live** | Start a LiveKit video/audio broadcast from this location |
| **Watch Live** | Join an active live stream on this pin |
| **Flag** | Report as spam, false, offensive, or duplicate |

### Emergency Pin Extras

For pins marked `is_emergency: true`:

- **SOS Broadcast Panel** -- shows nearby responders, "I'm on my way" button
- **Audio Check-in Button** -- record a voice update for the emergency

---

## 4. SOS Emergency System

**Component:** `EmergencyButton.tsx`
**Location:** Persistent red shield FAB, bottom-right of map

### Activation Flow

```
1. TAP SOS button
   |
2. Full-screen overlay with 5-second countdown (prevents accidental triggers)
   - Emergency quick-dial buttons visible: 15 (SAMU), 17 (Police), 18 (Pompiers), 112 (EU)
   |
3. Countdown completes or user confirms early
   |
4. SOS ACTIVATES:
   - Emergency pin created at GPS location (is_emergency: true)
   - emergency-dispatch Edge Function notifies all trusted contacts
   - GPS tracking starts (new trail pin every 30m or 45s)
   - Safe Spaces layer auto-enabled on map
   - "SOS ACTIVE" banner shown at top of screen
   |
5. ESCALATION: After 15 minutes if unresolved, re-dispatches to trusted contacts
   |
6. RESOLUTION: "I'm Safe" button resolves all session pins, notifies contacts
```

### GPS Breadcrumb Trail

During active SOS, the app uses `watchPosition` to create a trail of pins:

- New pin every **30 meters** of movement or **45 seconds** (whichever comes first)
- Each trail pin has `is_emergency: true` and links back to the session
- Trail is visible to trusted contacts on their map

### Emergency Numbers (France)

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
| 15-min Check-ins | "Are you okay?" dialog every 15 minutes -- if not dismissed, can trigger alert |
| End Session | "End Walk -- I'm Safe" button completes the session cleanly |

### Session States

```
waiting -> active -> completed / cancelled
```

---

## 6. Audio Check-in

**Component:** `AudioCheckinButton.tsx`
**Purpose:** Voice memo recording for safety sessions

### Recording Flow

1. Tap and hold the microphone button
2. **Real-time waveform visualization** using Web Audio API `AnalyserNode` (64-bin FFT)
3. Release to stop recording
4. **Preview playback** before sending
5. Confirm -> uploads to Supabase Storage (`pin-photos` bucket, `audio/` prefix)
6. Metadata saved to `audio_checkins` table with duration

### Technical Details

| Property | Value |
|---|---|
| Format | `audio/webm;codecs=opus` |
| Storage path | `audio/{userId}/{timestamp}.webm` |
| Storage bucket | `pin-photos` |
| Visualization | Web Audio API, `AnalyserNode`, 64-bin FFT |
| Available in | Walk With Me sessions, emergency SOS sessions, pin detail sheets |

---

## 7. Safe Route Planner

**Component:** `TripView.tsx`
**Access:** Trip tab in bottom navigation

### Route Planning

| Input | Description |
|---|---|
| Departure | Optional -- defaults to current GPS location |
| Destination | Required -- Mapbox geocoded autocomplete |
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
- Saved routes appear in My Brume Favorites tab
- Saved routes monitored for new incidents along the path

---

## 8. Live Broadcasting

**Components:** `LiveBroadcaster.tsx`, `LiveViewer.tsx`
**Technology:** LiveKit (WebRTC)

### Go Live (Broadcaster)

1. Open a pin's detail sheet -> tap "Go Live"
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
| Emergency Only | Toggle -- show only SOS pins |
| Live Only | Toggle -- show only pins with active streams |
| Severity | All, Low, Medium, High |

### Display

- Grouped by category with collapsible sections
- Emergency alerts shown in special red card with pulsing dot
- Regular pins show: severity color bar, category emoji, distance, environment, media count
- Live streaming badge on pins with active sessions
- Sort order: live first -> emergencies -> by recency

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
- "Create Neighborhood" button -- generates one at current location with 1km radius

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

## 12. My Brume Hub

**Component:** `MyKovaView.tsx`
**Access:** My Brume tab in bottom navigation

### Four Sub-tabs

#### Feed

- Recent in-app notifications (from `notifications` table)
- Followed pins feed (bookmarked pins from localStorage)

#### Favorites

- Starred place notes with emoji
- Saved routes -- tap to load in Trip planner
- Star/unstar/delete management

#### Stats

**Trust Score Display:**
- Visual level progress bar (current -> next level)
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
- Weekly Challenges (see [Weekly Challenges](#16-weekly-challenges))
- Referral System (see [Referral System](#17-referral-system))

#### Profile

- Avatar upload (stored in Supabase Storage)
- Display name editing
- Verification badge (see [Identity Verification](#30-identity-verification))
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

```typescript
score = (pins * 10) + (alerts * 15) + (confirmedVotes * 5) + (commentsMade * 2)
```

### Levels

| Level | Emoji | Color | Hex | Points Required | Meaning |
|---|---|---|---|---|---|
| Watcher | 👁 | Gray | `#6b7280` | 0--49 | New user, learning the ropes |
| Reporter | 📡 | Indigo | `#6366f1` | 50--199 | Active contributor |
| Guardian | ⚔️ | Amber | `#f59e0b` | 200--499 | Trusted community member |
| Sentinel | 🛡️ | Rose | `#f43f5e` | 500+ | Elite safety champion |

### Source Code

```typescript
export const LEVELS: Level[] = [
  { label: 'Watcher',  emoji: '👁',  color: '#6b7280', min: 0,   next: 50  },
  { label: 'Reporter', emoji: '📡',  color: '#6366f1', min: 50,  next: 200 },
  { label: 'Guardian', emoji: '⚔️',  color: '#f59e0b', min: 200, next: 500 },
  { label: 'Sentinel', emoji: '🛡️', color: '#f43f5e', min: 500, next: Infinity },
];

export function computeScore(
  pinsCount: number,
  alertsCount: number,
  confirmedVotes: number,
  commentsMade: number,
): number {
  return pinsCount * 10 + alertsCount * 15 + confirmedVotes * 5 + commentsMade * 2;
}
```

Trust level is displayed on the user's profile and visible to other users as a badge.

---

## 14. Expertise Tags

**File:** `src/lib/expertise.ts`

Five auto-computed profile badges based on contribution patterns:

| Tag | Emoji | Color | Hex | Criteria |
|---|---|---|---|---|
| Night Owl | 🦉 | Indigo | `#6366f1` | 40%+ of reports filed between 22:00--05:00 (min 5 pins) |
| Transit Guardian | 🚇 | Sky | `#0ea5e9` | 40%+ of reports in metro/bus environment (min 5 pins) |
| First Responder | 🚨 | Red | `#ef4444` | Filed 2+ emergency alerts |
| Neighborhood Expert | 🏘️ | Amber | `#f59e0b` | Cluster of 3+ pins within 500m of each other |
| Verified Guardian | ✅ | Green | `#10b981` | Is verified AND at Guardian or Sentinel level |

Tags auto-update as user activity changes. Displayed on profile and visible to other users.

### Computation Logic

```typescript
// Night Owl: >= 40% of reports posted after 22:00 or before 05:00 (min 5 pins)
// Transit Guardian: >= 40% of reports in metro/bus environment (min 5 pins)
// First Responder: filed >= 2 emergency alerts
// Neighborhood Expert: any single pin has >= 2 other pins within 500m
// Verified Guardian: verified identity + Guardian or Sentinel level
```

---

## 15. Milestones

**File:** `src/lib/milestones.ts`

11 lifetime achievements with animated toast notifications on unlock:

| Key | Label | Emoji | Description | Trigger |
|---|---|---|---|---|
| `first_pin` | First Report | 📍 | Created your first safety report | `pins >= 1` |
| `10_pins` | Watchful Eye | 👁 | Created 10 safety reports | `pins >= 10` |
| `first_sos` | First Alert | 🆘 | Triggered your first emergency alert | `alerts >= 1` |
| `first_vote` | Community Voice | 👍 | Confirmed your first report | `votes >= 1` |
| `10_votes` | Trusted Verifier | ✅ | Confirmed 10 reports | `votes >= 10` |
| `first_comment` | First Comment | 💬 | Left your first comment on a report | `comments >= 1` |
| `first_route` | Path Finder | 🗺️ | Saved your first safe route | `routes >= 1` |
| `first_place_note` | Place Marker | 📌 | Created your first place note | `placeNotes >= 1` |
| `first_community` | Community Builder | 👥 | Joined or created your first community | `communities >= 1` |
| `guardian_level` | Guardian | ⚔️ | Reached Guardian trust level | `score >= 200` |
| `sentinel_level` | Sentinel | 🛡️ | Reached Sentinel trust level | `score >= 500` |

### Persistence

- Achieved milestones persisted to `localStorage`
- Animated `MilestoneToast` notification shown on unlock
- Checked via `checkMilestones(stats, achieved)` which returns newly unlocked milestones

---

## 16. Weekly Challenges

**Component:** `ChallengesSection.tsx`
**Location:** My Brume -> Stats tab

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
- **"Claim" button** appears when complete -- adds points to `profiles.challenge_points`
- Days remaining counter shown in header
- Total accumulated points displayed with flame icon

---

## 17. Referral System

**Component:** `ReferralSection.tsx`
**Location:** My Brume -> Stats tab

### How It Works

1. On first view, a unique code is auto-generated: `Brume-XXXXX` (5 random alphanumeric chars)
2. Code stored in `profiles.referral_code`
3. User can **copy code** to clipboard or **share** via native Web Share API
4. Share URL format: `safepin-pearl.vercel.app/login?ref=Brume-XXXXX`
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

### Database Table

```
sos_responders
  - id (uuid)
  - pin_id (references pins)
  - user_id (references auth.users)
  - status ('on_way' | 'arrived')
  - lat, lng (responder location)
  - created_at
```

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
2. Choose recurring days (Monday--Sunday toggle, Mon--Fri default)
3. Set time window (from / to time pickers)
4. Save schedule -> stored in `safety_buddies` table

### Matching

- Shows other users with the **same route** and **overlapping schedule**
- Displays overlapping day names (e.g., "Mon, Tue, Wed")
- Chat button to open DM with potential buddy

---

## 21. Trusted Circle

**Component:** `TrustedCircleSection.tsx`
**Location:** My Brume -> Stats tab

### Features

- Search users to add as trusted contacts
- Send/receive trusted circle invitations
- Accept/decline incoming invitations
- List of accepted trusted contacts with:
  - Live location sharing status indicator
  - Toggle to enable/disable location sharing
- During SOS, all trusted contacts are automatically notified via `emergency-dispatch` Edge Function

### Map Integration

- Trusted circle members visible as blue dots on the map (toggleable layer)
- Real-time location updates via Supabase Presence

---

## 22. Place Notes

**Components:** `PlaceNoteSheet.tsx`, `PlaceNotePopup.tsx`
**Location:** Map layer + My Brume Favorites

### Creating a Place Note

- Long-press on map to drop a personal note
- Fields:
  - **Name:** Label for the place
  - **Address / Note:** Description or additional context
  - **Emoji:** Choose from 10 options

### Available Emojis

| Emoji | Meaning |
|---|---|
| 📌 | Generic pin |
| 🏠 | Home |
| 💼 | Work |
| 🍽️ | Restaurant |
| ❤️ | Favorite |
| 🌳 | Park / Nature |
| 🔒 | Safe space |
| 🚶 | Walking point |
| ⭐ | Starred |
| ⚠️ | Warning |

### Features

- Star/favorite toggle -- starred notes appear in Favorites tab
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

### Notification Settings

| Setting | Options |
|---|---|
| Alert radius | 500m, 1km, 2km, 5km, 10km |
| Nearby Pins | Toggle on/off |
| SOS Alerts | Always on (cannot disable) |
| Followed Pins | Toggle on/off |
| Milestones | Toggle on/off |
| Quiet hours | Start time / End time pickers |

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
| **Legal** | Privacy Policy, Terms of Service, Cookie Policy -- opens via `window.open()` to `/privacy`, `/terms`, `/cookies` |
| **Security** | 2FA (coming soon), active sessions (coming soon), sign out all devices |
| **Admin** | Link to Tower Control (`/admin`) -- admin users only |
| **Language** | Searchable 2-column grid with 30 locales, native language names + flag emojis, sets `NEXT_LOCALE` cookie |

### Language Picker

The language selector displays a searchable grid of all 30 supported locales. Each entry shows:
- Flag emoji
- Native language name (e.g., "Francais", "Deutsch", "Espanol")

Selecting a language sets the `NEXT_LOCALE` cookie and reloads the app in the chosen locale.

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
- Update status: pending -> reviewed -> resolved
- Delete reports

#### Parameters

Inline-editable key-value configuration:

| Parameter | Default | Description |
|---|---|---|
| `pin_expiry_hours` | 24 | Hours before a pin auto-expires |
| `sos_expiry_hours` | 2 | Hours before an SOS pin auto-expires |
| `auto_resolve_denies` | 3 | Number of deny votes to auto-resolve a pin |
| `max_pins_per_user_day` | 10 | Maximum pins a single user can create per day |
| `notify_radius_default` | 1000 | Default notification radius in meters |

#### Live

- Active live sessions table (auto-refreshes every 15 seconds)
- Terminate any live session

#### Simulation

- See [Simulation Engine](#29-simulation-engine) below

---

## 26. Billing & Subscriptions

### Payment Flow

```
Settings -> "Upgrade to Pro" -> Stripe Checkout Session -> Payment -> Webhook -> Subscription Active
```

### API Routes

| Route | Purpose |
|---|---|
| `/api/stripe/checkout` | Creates Stripe Checkout Session (monthly or annual) |
| `/api/stripe/webhook` | Processes Stripe webhook events |
| `/api/stripe/portal` | Opens Stripe Customer Portal |

### Webhook Events Handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Activates subscription in DB |
| `invoice.paid` | Updates subscription, saves invoice record |
| `invoice.payment_failed` | Marks subscription status accordingly |
| `customer.subscription.updated` | Syncs plan changes |
| `customer.subscription.deleted` | Marks subscription as cancelled |

### Pricing

| Plan | Price | Savings |
|---|---|---|
| Monthly | 4.99 EUR/month | -- |
| Annual | 39.99 EUR/year | Save 33% |

### Billing Portal

"Manage Subscription" button in Settings opens Stripe Customer Portal for:

- Plan changes (monthly <-> annual)
- Cancellation
- Payment method updates
- Invoice history

### Pro Status Detection

```typescript
// useIsPro hook checks subscriptions table
// Result cached in localStorage (key: kova_is_pro)
// ProGate component wraps Pro features -- shows blurred upgrade overlay for free users
```

### Pro-Only Features

| Feature | Section |
|---|---|
| Location History layer | Safety Map |
| Neighborhood Scores layer | Safety Map |
| Safety Buddy Matching | Safety Buddy |
| Location History viewer | My Brume Profile |

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

### Supported Languages (30)

| Code | Language | Native Name |
|---|---|---|
| `en` | English | English |
| `fr` | French | Francais |
| `es` | Spanish | Espanol |
| `zh` | Chinese | 中文 |
| `ar` | Arabic | العربية |
| `hi` | Hindi | हिन्दी |
| `pt` | Portuguese | Portugues |
| `bn` | Bengali | বাংলা |
| `ru` | Russian | Русский |
| `ja` | Japanese | 日本語 |
| `de` | German | Deutsch |
| `ko` | Korean | 한국어 |
| `it` | Italian | Italiano |
| `tr` | Turkish | Turkce |
| `vi` | Vietnamese | Tieng Viet |
| `pl` | Polish | Polski |
| `nl` | Dutch | Nederlands |
| `th` | Thai | ไทย |
| `sv` | Swedish | Svenska |
| `ro` | Romanian | Romana |
| `cs` | Czech | Cestina |
| `el` | Greek | Ελληνικα |
| `hu` | Hungarian | Magyar |
| `da` | Danish | Dansk |
| `fi` | Finnish | Suomi |
| `no` | Norwegian | Norsk |
| `he` | Hebrew | עברית |
| `id` | Indonesian | Bahasa Indonesia |
| `ms` | Malay | Bahasa Melayu |
| `uk` | Ukrainian | Українська |

### Implementation

- Message files: `src/messages/{locale}.json` (one per language)
- Core translated namespaces: `common` (13 keys), `nav` (4 keys), `emergency` (13 keys)
- All other namespaces fall back to English via `deepMerge` in `src/i18n/request.ts`
- Cookie-based locale detection (`NEXT_LOCALE` cookie)
- Proxy in `src/proxy.ts` handles locale detection from `Accept-Language` header and redirects `/{locale}/*` paths
- Language picker: searchable 2-column grid with native names and flag emojis

### Namespaces

| Namespace | Description |
|---|---|
| `common` | Shared UI labels (buttons, actions, status) |
| `nav` | Bottom navigation tabs |
| `emergency` | SOS system strings |
| `report` | Incident reporting flow |
| `detail` | Pin detail sheet |
| `filters` | Filter bar and filter options |
| `layers` | Map layer names |
| `trip` | Route planner and active trip |
| `settings` | Settings page |
| `notifications` | Notification types and messages |
| `mykova` | My Brume hub |
| `community` | Community, groups, neighborhoods |
| `offline` | Offline mode messages |
| `moderation` | Flagging and moderation |
| `safeSpaces` | Safe spaces feature |
| `install` | PWA install prompts |

---

## 29. Simulation Engine

**Admin Tab:** Simulation (in Tower Control)
**Edge Functions:** `seed-paris`, `simulate-activity`
**Admin Client:** `src/lib/supabase-admin.ts` (`createAdminClient()`)

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

### Live Simulation Distribution

| Action | Probability |
|---|---|
| New pin | 60% |
| Vote on existing pin | 25% |
| Comment on existing pin | 15% |

### Data Isolation

- All simulated data flagged with `is_simulated = true`
- Map query filters out simulated data by default
- Admin can toggle visibility in LayerPanel
- Cleanup deletes only `is_simulated = true` records

### Configuration

- Tick interval: Configurable (how often the simulation creates a new action)
- Paris hotspots: Pre-defined coordinates for realistic geographic distribution

For detailed usage instructions, see the [Simulation Engine Guide](../SIMULATION_ENGINE_GUIDE.md).

---

## 30. Identity Verification

**Component:** `VerificationView.tsx`
**Provider:** Veriff

### Verification Flow

```
Settings -> Verify Identity -> API call to /api/verify/start
   -> Veriff session created -> User redirected to Veriff UI
   -> User completes verification -> Webhook at /api/verify/webhook
   -> profiles table updated (verification_status, verification_id, verified)
```

### API Routes

| Route | Purpose |
|---|---|
| `/api/verify/start` | Creates a new Veriff verification session |
| `/api/verify/webhook` | Receives Veriff decision callbacks |

### Verification States

| Status | Description |
|---|---|
| `unverified` | Default state, no verification attempted |
| `pending` | Verification session started, awaiting result |
| `approved` | Identity verified successfully |
| `declined` | Verification failed |
| `resubmission_requested` | Additional information needed, user can retry |

### Database Fields

| Column | Table | Type | Description |
|---|---|---|---|
| `verification_status` | `profiles` | text | Current verification status |
| `verification_id` | `profiles` | text | Veriff session ID |
| `verified` | `profiles` | boolean | Quick-check flag for verified users |

### Security

- Webhook signature verification (fail-closed: unsigned or invalid signatures are rejected)
- Verified badge shown on user profile throughout the app
- Feeds into Expertise Tags system ("Verified Guardian" requires `verified = true`)

---

## 31. Legal Pages

Three full legal pages served as standalone routes:

### Routes

| Route | Page | Description |
|---|---|---|
| `/privacy` | Privacy Policy | GDPR-compliant privacy policy |
| `/terms` | Terms of Service | Platform terms and conditions |
| `/cookies` | Cookie Policy | Cookie and local storage disclosure |

### Privacy Policy (`/privacy`)

11 sections covering:

1. Information We Collect
2. How We Use Your Information
3. Information Sharing and Disclosure
4. Data Retention
5. Your Rights (GDPR)
6. Data Security
7. Children's Privacy
8. International Data Transfers
9. Changes to This Policy
10. Third-Party Services
11. Contact Information

### Terms of Service (`/terms`)

14 sections covering:

1. Acceptance of Terms
2. Description of Service
3. User Accounts
4. Acceptable Use
5. Content and Conduct
6. Subscriptions and Payments
7. Emergency Services Disclaimer
8. Intellectual Property
9. Limitation of Liability
10. Indemnification
11. Termination
12. Governing Law
13. Changes to Terms
14. Contact Information

### Cookie Policy (`/cookies`)

7 sections covering:

1. What Are Cookies
2. Cookies We Use (table of all cookies with name, purpose, duration)
3. Local Storage Usage
4. Third-Party Cookies
5. Managing Cookies
6. Changes to This Policy
7. Contact Information

### Access

- Wired from Settings -> Legal section via `window.open()`
- Also linked from Landing Page footer
- Company: DBEK, Paris, France
- Contact: kovaapp@pm.me

---

## 32. Landing Page

**File:** `src/app/login/page.tsx`

Redesigned full landing page that serves as both the marketing homepage and the authentication entry point.

### Page Structure

#### Navbar

- Brume logo and brand name
- Navigation links

#### Hero Section

- Large gradient text headline
- Descriptive subtitle about the platform's mission
- Primary call-to-action button

#### Stats Bar

| Stat | Value |
|---|---|
| Reports | 10K+ |
| Languages | 30 |
| Monitoring | 24/7 |
| Price | 100% free |

#### Authentication Card

4 authentication methods:

| Method | Description |
|---|---|
| Google OAuth | Sign in with Google account |
| Apple Sign-In | Sign in with Apple ID |
| Magic Link | Passwordless email link |
| Email + Password | Traditional credentials |

Tabbed interface with 3 tabs:

| Tab | Purpose |
|---|---|
| Magic Link | Enter email, receive sign-in link |
| Sign Up | Create new account with email + password |
| Sign In | Log in with existing email + password |

#### Features Grid

6 feature cards with icons highlighting core capabilities:

1. Real-time safety map
2. Incident reporting
3. SOS emergency system
4. Safe route planning
5. Community engagement
6. Walk With Me companion

#### Social Proof

- Quote section with user testimonial or mission statement

#### Footer

- Legal links: Privacy Policy, Terms of Service, Cookie Policy
- Links open the legal pages at `/privacy`, `/terms`, `/cookies`
- Company information

---

## Architecture Summary

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS |
| Maps | Mapbox GL JS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (Google, Apple, Magic Link, Email) |
| Real-time | Supabase Realtime (Postgres Changes, Presence, Broadcast) |
| Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions (Deno) |
| Video/Audio | LiveKit (WebRTC) |
| Payments | Stripe (Checkout, Webhooks, Customer Portal) |
| Identity | Veriff |
| Routing Engine | OSRM |
| Geocoding | Mapbox Geocoding API |
| POI Data | Overpass API (OpenStreetMap) |
| Internationalization | next-intl v4 |
| PWA | Service Worker, Web Push API, IndexedDB |
| Hosting | Vercel |

### Database Tables (Key)

| Table | Purpose |
|---|---|
| `pins` | Safety incident reports |
| `votes` | Confirm/deny votes on pins |
| `comments` | Comments on pins |
| `profiles` | User profiles, trust scores, referral codes |
| `friendships` | Friend connections |
| `dm_conversations` | Direct message threads |
| `direct_messages` | Individual DM messages |
| `communities` | Community groups and neighborhoods |
| `community_members` | Community membership |
| `community_messages` | Community chat messages |
| `walk_sessions` | Walk With Me sessions |
| `live_sessions` | LiveKit broadcast sessions |
| `saved_routes` | Saved safe routes |
| `route_upvotes` | Upvotes on shared routes |
| `safety_buddies` | Safety buddy matching schedules |
| `trusted_contacts` | Trusted circle relationships |
| `place_notes` | Personal place bookmarks |
| `notifications` | In-app notifications |
| `push_subscriptions` | Web Push subscription endpoints |
| `sos_responders` | SOS broadcast responders |
| `audio_checkins` | Voice memo recordings |
| `trip_log` | Completed trip history |
| `location_history` | GPS trail data |
| `subscriptions` | Stripe subscription records |
| `invoices` | Stripe invoice records |
| `weekly_challenges` | Weekly challenge definitions and progress |
| `reports` | User-submitted flag reports |
| `admin_parameters` | Admin-configurable platform parameters |

### Edge Functions

| Function | Purpose |
|---|---|
| `emergency-dispatch` | Notifies trusted contacts during SOS |
| `notify-nearby` | Geo-filtered push notifications for new pins |
| `seed-paris` | Generates simulated Paris data |
| `simulate-activity` | Live simulation tick (creates pins/votes/comments) |

---

*Brume -- Community-powered urban safety.*
*Company: DBEK, Paris, France*
*Contact: kovaapp@pm.me*
