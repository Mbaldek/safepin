# Brume — Product Guide

> **Brume** is a community-powered safety app for urban environments. Report incidents, plan safer routes, connect with trusted contacts, and look out for each other — all in real time.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Main Navigation](#main-navigation)
3. [The Map](#the-map)
4. [Reporting an Incident (Pins)](#reporting-an-incident-pins)
5. [Pin Details & Interactions](#pin-details--interactions)
6. [Trip Planner — Live Safety Escort](#trip-planner--live-safety-escort)
7. [Walk With Me](#walk-with-me)
8. [SOS Emergency Mode](#sos-emergency-mode)
9. [Community](#community)
10. [Friends & Trusted Circle](#friends--trusted-circle)
11. [Safe Spaces](#safe-spaces)
12. [Place Notes](#place-notes)
13. [Notifications](#notifications)
14. [My Brume — Profile & Settings](#my-brume--profile--settings)
15. [Challenges & Gamification](#challenges--gamification)
16. [Offline Support](#offline-support)
17. [Languages](#languages)
18. [Admin Panel](#admin-panel)

---

## Getting Started

### Onboarding

First-time users see a 4-step animated walkthrough:

1. **Welcome to Brume** — what the app is about
2. **How to drop a pin** — reporting incidents on the map
3. **Emergency mode** — how the SOS system works
4. **Communities & messaging** — connecting with others

Tap **Next** through each step or **Start exploring** on the last one. The walkthrough only appears once.

### PWA Install

Brume is a Progressive Web App. You'll be prompted to add it to your home screen for a native-like experience with offline support.

---

## Main Navigation

A bottom navigation bar with **4 tabs**:

| Tab | Icon | Description |
|-----|------|-------------|
| **Map** | Map icon | Live incident map, filters, layers, pin creation |
| **Trip** | Route icon | Route planner, active trip tracking, saved routes |
| **Community** | Users icon | Groups, neighborhoods, community chat |
| **My Brume** | User icon | Profile, stats, favorites, trusted circle, settings |

**Badges on tabs:**
- Red badge on Map = active SOS alerts within the last 2 hours
- Orange badge = pending offline reports waiting to sync

---

## The Map

### Map View

The main screen. A full-screen Mapbox map centered on your location showing incidents, safe spaces, and points of interest.

### Map Layers (toggle via Layer Panel)

| Layer | Description |
|-------|-------------|
| **Incident pins** | Reported safety incidents, color-coded by severity |
| **Safe spaces** | Pharmacies, hospitals, police stations, cafes, shelters |
| **Transit stations** | Metro, RER, tram, bus stops (from OpenStreetMap) |
| **Place notes** | Your personal bookmarked locations |
| **Heatmap** | Location history visualization |
| **Neighborhood scores** | Area danger scores overlaid on map |
| **Watched contacts** | Real-time location of trusted friends sharing position |

### Map Interactions

- **Tap a pin** — opens the pin detail sheet
- **Tap a safe space** — opens safe space details (hours, phone, directions)
- **Tap a transit station** — shows station name and type
- **Long-press anywhere** — create a Place Note at that location
- **Tap + button** — start reporting a new incident

### Filters

A collapsible filter bar lets you narrow what's displayed:

- **Severity** — low / medium / high
- **Age** — how recent the reports are
- **Urban context** — street, parking, metro, park, etc.
- **Confirmed only** — show only pins validated by the community
- **Time of day** — filter by when incidents occurred

### Session Briefing

When you open the map, a floating card appears briefly:

- **SOS nearby** (red) — someone may need help in your area, with a Navigate button
- **X new reports near you** — recent incidents since your last visit, with a View Reports button
- **Your area is calm** (green) — no recent reports nearby

Auto-dismisses after 15 seconds.

### Map Context Card

A bar at the bottom shows contextual area information (e.g. "Low activity area") based on nearby incident density.

---

## Reporting an Incident (Pins)

### How to Report

1. Tap the **+** button on the map
2. Select a **category**:
   - 😰 Harassment
   - 👁 Stalking
   - 🌑 Dark / Poorly Lit Area
   - ⚡ Aggression
   - 🍺 Drunk / Intoxicated Person
   - ⚠️ Other
3. Select a **severity**:
   - 🟢 Low / Mild
   - 🟡 Medium
   - 🔴 High / Danger
4. Optionally add:
   - **Environment** — on foot, transit, bus, cycling, car, indoor
   - **Urban context** — street, parking, store, metro, bus stop, park, restaurant, building
   - **"In motion" toggle** — if you're currently moving
   - **Description** — free text
   - **Media** — up to 5 files (photo, video, or audio)
5. Tap **Submit**

The pin appears on the map with a drop animation. The address is automatically reverse-geocoded from coordinates.

### Pin Expiry

- **Regular pins** expire after **24 hours** — each confirm vote resets the timer
- **Emergency pins** expire after **2 hours** — timer cannot be extended
- Resolved or hidden pins are removed from the map

### Offline Reporting

If you're offline, your report is saved locally and automatically synced when connectivity returns. An orange badge shows queued reports.

---

## Pin Details & Interactions

Tap any pin to open its detail sheet:

### What You See

- Category emoji + severity badge
- Description and context tags (environment, urban setting)
- Media gallery (swipeable images/videos)
- "Still there?" countdown — time remaining before expiry
- Vote counts (confirms vs. denies)
- Chat/comments section

### What You Can Do

| Action | Description |
|--------|-------------|
| **Confirm** (👍) | Validates the report — resets the 24h expiry timer |
| **Deny** (👎) | Disputes the report — 3 consecutive denies auto-resolve the pin |
| **Comment** | Real-time chat on the pin |
| **Follow** | Get notified of updates on this pin |
| **Go Live** | Start a live video/audio broadcast from the pin location |
| **Watch Live** | View someone else's live stream at this pin |
| **Thank Reporter** | Send appreciation to the person who reported |
| **Flag/Report** | Report inappropriate content |
| **Resolve** | Pin owner can manually mark as resolved |

---

## Trip Planner — Live Safety Escort

### Planning a Trip

1. Go to the **Trip** tab
2. Enter a **departure** point (or use current location)
3. Enter a **destination** (address autocomplete)
4. Brume calculates routes across **all 4 transport modes** simultaneously:
   - 🚶 Walk
   - 🚲 Bike
   - 🚗 Drive
   - 🚇 Transit
5. For each mode, up to **3 route options** are shown:
   - **Safest** (blue) — avoids incident hotspots
   - **Balanced** (orange) — compromise of speed and safety
   - **Fastest** (red) — shortest time regardless of incidents
6. Each route shows: duration, distance, and danger score (0–10)
7. Expand/collapse each transport mode to compare
8. Select a route and tap **Start Trip**

### Active Trip

Once started, the trip enters **active mode**:

- A persistent **Trip HUD** overlay appears on the map
- Real-time **ETA countdown**
- Your location is optionally shared with your **Trusted Circle**
- **Smart alerts** during the trip:
  - *Stationary nudge* — "You've been still for a while, everything ok?"
  - *Danger nudge* — "An incident was reported nearby"
  - *Auto-arrival* — trip completes when you reach the destination

### Completing a Trip

Tap **"I'm Safe"** or arrive at the destination to finish. A **Trip Summary** shows:

- Total duration and distance
- Danger score encountered
- Incidents nearby during the trip
- Safety score
- Option to **save the route** for future use

### Saved Routes

Access from the Trip tab:

- View recent routes with stats
- Mark routes as favorites
- See when last used
- Share routes with others

---

## Walk With Me

A companion mode for when you want someone watching over your journey.

1. Start from the Trip tab or active trip
2. **Invite a companion** via invite code
3. Both users' locations are tracked in real-time
4. **Regular check-ins** every 15 minutes
5. Active timer shows elapsed time
6. Either party can end the session

Your trusted contacts see your live location on their map during an active Walk With Me session.

---

## SOS Emergency Mode

### How to Trigger

1. Tap the red **🆘 SOS button** on the map
2. A **5-second countdown** starts (tap to cancel)
3. Quick-dial buttons appear: **15** (SAMU), **17** (Police), **18** (Fire), **112** (EU Emergency)
4. After countdown: emergency pin is created at your location

### What Happens

- A **high-severity emergency pin** is placed on the map (visible to all users)
- **Live location tracking** begins — your position is updated every 15–45 seconds
- **Location trail** — pins mark your path as you move (30m distance or 45s time threshold)
- Your **Trusted Circle** is notified via push notification
- **Safe spaces layer** auto-enables so you can find nearby help
- **15-minute escalation** — if not resolved, contacts are re-notified

### Ending the Emergency

Tap **"I'm Safe"** to resolve the SOS. All trail pins are cleaned up and contacts are notified that you're safe.

---

## Community

### What Are Communities?

Communities are groups of users organized around shared locations or interests. There are two types:

- **Communities** — top-level groups that can contain sub-groups
- **Groups** — standalone or nested under a community

### Creating a Community

1. Go to the **Community** tab
2. Tap **Create**
3. Choose an **emoji avatar**
4. Enter a **name** and **description**
5. Set **public** or **private**
6. Submit

### Community Features

- **Real-time chat** — send messages visible to all members
- **Stories** — share images/videos with captions
- **Member list** — see who's in the community
- **Join/Leave** — public communities are open; private ones require approval

### Neighborhood Feed

Communities linked to your neighborhood show local safety discussions and incident reports relevant to your area.

---

## Friends & Trusted Circle

### Friends

1. Go to **My Brume → Friends**
2. **Search** for users by display name
3. Send a **friend request**
4. Once accepted:
   - **Direct message** each other
   - Share images/media in conversations
   - See unread message indicators

### Trusted Circle

Your Trusted Circle is a special group of emergency contacts:

1. Go to **My Brume → Trusted Circle**
2. **Invite** contacts to your circle
3. They accept or decline the invitation
4. Trusted contacts:
   - Are notified when you trigger **SOS**
   - Can see your **live location** when you're sharing
   - Are alerted during **Walk With Me** and **active trips**
   - Appear on your map as **watched contacts**

---

## Safe Spaces

Safe Spaces are verified locations where you can seek help or feel secure.

### Types

| Icon | Type |
|------|------|
| 💊 | Pharmacy |
| 🏥 | Hospital |
| 👮 | Police Station |
| ☕ | Cafe |
| 🏠 | Shelter |

### Sources

- **OpenStreetMap / Overpass API** — automated POI data
- **User-reported** — community-submitted locations
- **Official partners** — businesses with full details (hours, photos, contact)

### What You See

Tap a safe space on the map to view:

- Name, address, type
- Opening hours (per day, with break times)
- Phone number (tap to call)
- Website link
- Photo gallery
- Partner tier and info (if applicable)
- Community upvote count

### Upvoting

Tap the upvote button to validate that a location is genuinely safe. Higher-voted spaces appear more prominently.

---

## Place Notes

Personal location bookmarks visible only to you.

### Creating a Place Note

1. **Long-press** anywhere on the map
2. A creation sheet opens with the reverse-geocoded address
3. Enter a **name** and **note/description**
4. Pick an **emoji**: 📌 ⚠️ 💡 ❤️ 🏠 🍽️ 🌳 🔒 🚶 ⭐
5. Optionally mark as **favorite**
6. Save

### Managing Place Notes

- Tap a place note marker on the map to see details
- Edit or delete from the detail view
- Favorite/unfavorite from My Brume → Favorites

---

## Notifications

### Notification Types

| Type | Icon | Description |
|------|------|-------------|
| Emergency | 🆘 | SOS alert nearby |
| Vote | 👍 | Someone confirmed your pin |
| Comment | 💬 | New comment on your pin |
| Resolve | ✅ | A pin you follow was resolved |
| Community | 💬 | Activity in your communities |
| Trusted Contact | 🤝 | Trust circle update |
| Milestone | 🏆 | Achievement unlocked |
| Digest | 📊 | Weekly safety summary |

### Notification Settings

In **My Brume → Settings**:

- **Proximity radius** — how far away incidents trigger notifications (default: 1km)
- **Nearby pins** — toggle on/off
- **SOS alerts** — always on by default
- **Quiet hours** — disable notifications during set times
- **Follow pin updates** — get notified when followed pins change
- **Milestone notifications** — achievement alerts

### Push Notifications

Brume uses Web Push (VAPID). You'll be asked to allow notifications on your first session. Notifications are geofenced — you only receive alerts for incidents within your configured radius.

---

## My Brume — Profile & Settings

### Profile Sections

| Section | Contents |
|---------|----------|
| **Feed** | Your pins, received comments, notification history, stories |
| **Favorites** | Saved places, saved routes, favorite communities |
| **Stats** | Contribution metrics, expertise tags, level, streaks, milestones |
| **Profile** | Display name, avatar, verification status, bio |

### Stats & Gamification

- **Level** — computed from total contributions (pins + votes + comments + alerts)
- **Expertise tags** — earned from activity types (e.g. "Reporter", "Protector", "Organizer")
- **Streaks** — daily active contribution tracking with milestone rewards at 3, 7, and 30 days
- **Thanks received** — count of users who thanked you for reporting

### Verification

Optional identity verification for a trust badge on your profile. Status: unverified → pending → approved/declined.

### Settings

- **Theme** — Light / Dark mode
- **Language** — 30+ supported languages
- **Notification preferences** — radius, quiet hours, types
- **Account** — password, email
- **Privacy controls**
- **Admin panel** access (if admin role)

---

## Challenges & Gamification

### Weekly Guardian Challenges

Complete tasks to earn reward points:

- Cast X votes on pins
- Submit X incident reports
- Plan X routes
- Post X comments
- Join X communities
- Maintain a X-day streak

Progress is tracked per challenge with a target value and reward points on completion.

---

## Offline Support

Brume works even without connectivity:

- **Report incidents offline** — pins are queued locally (IndexedDB)
- **Automatic sync** — when connection returns, queued reports upload via Service Worker
- **Queue indicator** — orange badge shows pending reports count
- **Background sync** — uses the Background Sync API for seamless uploads

---

## Languages

Brume supports **30+ languages** including:

English, French, Spanish, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, Russian, Bengali, Turkish, Vietnamese, Polish, Dutch, Thai, Swedish, Romanian, Czech, Greek, Hungarian, Danish, Finnish, Norwegian, Hebrew, Indonesian, Malay, Ukrainian

Change language in **My Brume → Settings → Language**. The app auto-detects your browser language on first load.

---

## Admin Panel

Accessible at `/admin` for users with admin privileges.

### Dashboard

- Total pins, active pins, active SOS alerts
- Total users
- Pending user reports
- Live sessions count
- Recent pins table

### Admin Actions

- **Simulation mode** — seed/cleanup test data (pins, safe spaces, users)
- **Toggle simulated data** visibility on the map
- **Manage admin params** — pin expiry duration, SOS expiry, auto-resolve deny threshold, max pins per day, notification radius
- **User management** — view and manage user accounts
- **Report review** — handle flagged content (pending → reviewed → resolved)
- **Live session monitoring** — view active broadcasts
- **Pin management** — manually resolve or hide pins
- **Safe space management** — create/edit partner safe spaces

---

*Built with care for community safety. Stay safe, stay connected.*
