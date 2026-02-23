# KOVA — Business Brief

> **A safer world, mapped by women — for women.**

---

## 1. Executive Summary

KOVA is a community-driven urban safety platform that empowers women to report, share, and act on safety incidents in real time. Built as a Progressive Web App (PWA), KOVA combines crowd-sourced safety intelligence with personal protection tools, social features, and gamified engagement to create the most comprehensive safety companion for urban women.

**Company:** DBEK
**Headquarters:** 75 rue de Lourmel, 75015 Paris, France
**Contact:** kovaapp@pm.me
**Launch Market:** Paris, France
**Platform:** Web (PWA) — no app store required
**Production URL:** safepin-pearl.vercel.app

---

## 2. The Problem

### Urban Safety for Women Is Broken

- **1 in 3 women** worldwide have experienced physical or sexual violence (WHO, 2021)
- **80% of street harassment** goes unreported — victims feel nothing will change
- **No real-time data** — existing crime maps are based on police reports filed days or weeks later
- **Isolation** — women walking alone at night have no way to signal trusted contacts without calling
- **Fragmented tools** — emergency calling, route planning, community alerts, and location sharing exist in separate apps that nobody carries all at once

### What Women Actually Need

1. Know **right now** which streets to avoid
2. **One-tap SOS** that alerts trusted people with live GPS
3. A **community** of women looking out for each other
4. **Safe routes** that factor in real-time incidents, not just distance
5. All of this in **one place**, always accessible, no download required

---

## 3. The Solution: KOVA

KOVA is a **living safety map** powered by its community. Every user is both a consumer and contributor of safety intelligence.

### Core Loop

```
See something unsafe → Report it (30 seconds)
                              ↓
     Appears on map for all nearby users instantly
                              ↓
     Community votes: Confirm or Clear
                              ↓
     Routes auto-adjust · Alerts fire · Safety scores update
```

### Why KOVA Wins

| Traditional Apps | KOVA |
|---|---|
| Crime data is days old | Reports appear in < 5 seconds via Realtime |
| Police-reported only | Community-reported — captures harassment, dark areas, drunk behavior |
| Static maps | Live map with voting, expiry, and confirmation lifecycle |
| Emergency = call 112 | SOS with 5s countdown + GPS breadcrumb trail + trusted contact dispatch |
| Separate apps for each tool | Map + SOS + Routes + Chat + Live Streaming + Challenges in one PWA |

---

## 4. Target Audience

### Primary: Urban Women (18–45)

- **Commuters** — daily metro/bus/walking routines through city streets
- **Students** — walking between campus, housing, and nightlife areas
- **Night workers** — nurses, hospitality, retail staff with late commutes
- **Runners & walkers** — exercising in parks and along urban paths
- **New residents** — unfamiliar with which neighborhoods feel safe

### Secondary

- **Parents** — monitoring children's commute safety
- **City administrators** — accessing aggregated safety intelligence
- **Transit authorities** — identifying problem stations and routes

### Geographic Focus

- **Phase 1:** Paris, France (dense urban, strong women's safety discourse, EU privacy compliance)
- **Phase 2:** Major EU cities (Lyon, Marseille, Brussels, Barcelona, Berlin)
- **Phase 3:** Global expansion (London, NYC, Toronto, Sydney)

---

## 5. Business Model

### Freemium SaaS

| | Free | KOVA Pro |
|---|---|---|
| **Price** | Free forever | **4.99/mo** or **39.99/yr** |
| Safety map & reporting | Unlimited | Unlimited |
| SOS emergency system | Full access | Full access |
| Safe route planner | Full access | Full access |
| Community & chat | Full access | Full access |
| Walk With Me companion | Full access | Full access |
| Live broadcasting | Full access | Full access |
| Challenges & referrals | Full access | Full access |
| **Location history viewer** | Locked | Unlocked |
| **Safety buddy matching** | Locked | Unlocked |
| **Neighborhood safety scores** | Locked | Unlocked |
| **Advanced trip analytics** | Locked | Unlocked |
| **Priority alert notifications** | Locked | Unlocked |

### Revenue Streams

1. **B2C Subscriptions** — KOVA Pro via Stripe (monthly + annual)
2. **B2B Partnerships** (future) — city safety dashboards, transit authority integrations, corporate safety packages for employees
3. **Anonymized Data Licensing** (future) — aggregated, privacy-compliant safety heatmaps for urban planners and real estate

### Payment Infrastructure

- **Stripe Checkout** — secure payment sessions
- **Stripe Webhooks** — real-time subscription lifecycle management
- **Stripe Billing Portal** — self-service plan changes, cancellation, payment methods
- **Invoice history** — downloadable PDF receipts

---

## 6. Growth Strategies

### 6.1 Viral Referral Engine

Every user gets a unique **KOVA-XXXXX** referral code. Sharing is built into the app:
- One-tap share via native Web Share API
- Referral link: `safepin-pearl.vercel.app/login?ref=KOVA-XXXXX`
- Referral count tracked on profile
- Future: reward tiers for top referrers

### 6.2 Gamification Loop

KOVA uses a multi-layered engagement system:

**Trust Levels** — four progressive tiers that reward sustained contribution:

| Level | Badge | Points |
|---|---|---|
| Watcher | 👁 | 0–49 |
| Reporter | 📡 | 50–199 |
| Guardian | ⚔️ | 200–499 |
| Sentinel | 🛡️ | 500+ |

Points earned from: reporting incidents (10 pts), emergency alerts (15 pts), confirming reports (5 pts), commenting (2 pts).

**Weekly Challenges** — rotating objectives that reset every Monday:
- "Confirm 5 reports" (50 pts)
- "Report 3 incidents" (75 pts)
- "Comment on 3 pins" (40 pts)
- "Save a safe route" (30 pts)

**Milestones** — 11 lifetime achievements (first report, 10 reports, first SOS, Guardian level, etc.)

**Expertise Tags** — auto-computed profile badges (Night Owl, Transit Guardian, First Responder, Neighborhood Expert, Verified Guardian)

### 6.3 Community Network Effects

- **Neighborhoods auto-join** — GPS-based community assignment means every user is immediately part of a local chat
- **Trusted Circles** — invite-based safety networks create organic growth ("add 3 trusted contacts" = 3 new potential users)
- **Walk With Me** — companion safety sessions require sharing an invite code, naturally bringing in new users
- **Community groups** — interest and location-based groups (campus safety, night shift workers, etc.) create retention hooks

### 6.4 Content & Virality

- **Live streaming from incidents** — compelling real-time content that can be shared
- **Pin sharing** — native share button on every safety report
- **Route sharing** — public safe routes that others can upvote and use
- **SOS broadcasts** — nearby users see and can respond to emergencies

### 6.5 PWA Advantage

- **Zero friction onboarding** — no app store download, works instantly in browser
- **"Add to Home Screen"** prompt — feels native, one-tap install
- **Push notifications** — re-engagement without app store dependency
- **Offline-first** — works in metro tunnels and dead zones via IndexedDB queue

---

## 7. Competitive Landscape

| Competitor | Gap KOVA Fills |
|---|---|
| **bSafe** | No community layer, no real-time incident map, app-store dependent |
| **Noonlight** | Emergency-only, no preventive intelligence, no route planning |
| **Citizen** | US-only, police-scanner based (not community), no women-focused safety |
| **Life360** | Family tracking focus, no incident reporting, no community safety layer |
| **Google Maps** | No safety data, no SOS, no community, generic routing |
| **Waze** | Car-only, no pedestrian safety, no incident reporting for personal safety |

**KOVA's moat:** The combination of real-time community intelligence + personal safety tools + social engagement in a single PWA. No competitor offers all three.

---

## 8. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | App framework |
| Styling | Tailwind CSS v4, Framer Motion | UI design + animations |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) | Full backend |
| Maps | Mapbox GL JS v3 + react-map-gl | Interactive maps |
| Routing | OSRM (Open Source Routing Machine) | Safe route calculation |
| Transit Data | Overpass API (OpenStreetMap) | Metro, bus, tram overlays |
| Live Video | LiveKit (WebRTC) | Real-time broadcasting |
| Payments | Stripe (Checkout, Webhooks, Billing Portal) | Subscriptions |
| Push | Web Push API + VAPID | Background notifications |
| i18n | next-intl | English + French |
| State | Zustand v5 | Client state management |
| Icons | Lucide React | Iconography |
| Hosting | Vercel | Edge deployment |

---

## 9. GDPR & Privacy Compliance

- All data stored in **EU-region Supabase infrastructure**
- **GDPR rights** disclosure in-app (access, rectification, erasure, portability)
- **Privacy toggles** — analytics and crash reporting are opt-in
- **Data deletion** — soft-delete account option in Settings
- **Quiet hours** — notification muting for respectful engagement
- **Company registered in France** — within EU jurisdiction

---

## 10. Feature Overview

| # | Feature | Description |
|---|---|---|
| 1 | Safety Map | Real-time interactive map with incident pins, transit lines, POI, and multiple layer toggles |
| 2 | Incident Reporting | 30-second report flow with category, severity, media upload, and offline support |
| 3 | Pin Voting & Lifecycle | Community confirms or clears reports; auto-resolve after 3 denies or expiry |
| 4 | SOS Emergency | 5-second countdown, GPS breadcrumb trail, trusted contact dispatch, emergency number quick-dial |
| 5 | Walk With Me | Companion safety sessions with invite codes, real-time location sharing, 15-minute check-ins |
| 6 | Audio Check-in | Voice memo recording with waveform visualization, uploaded per session or pin |
| 7 | Safe Route Planner | OSRM-powered routing with danger scoring, bypass algorithm, and 3 route alternatives |
| 8 | Live Broadcasting | WebRTC video/audio streaming tied to map pins, with viewer chat overlay |
| 9 | Community Groups | Create/join public or private groups with real-time chat and stories |
| 10 | Neighborhoods | GPS-based auto-assigned local communities with real-time chat |
| 11 | Friends & DMs | Search, add friends, direct messaging with image/video support |
| 12 | Trust Levels | 4-tier progression system rewarding sustained contribution |
| 13 | Weekly Challenges | Rotating objectives with point rewards, auto-tracked from real activity |
| 14 | Referral System | Unique KOVA-XXXXX codes with share button and tracking |
| 15 | SOS Broadcast | Nearby user alerts for emergencies with responder tracking |
| 16 | Safety Buddy | Route-based walking companion matching (Pro) |
| 17 | Milestones | 11 lifetime achievement unlocks with animated notifications |
| 18 | Expertise Tags | 5 auto-computed profile badges based on contribution patterns |
| 19 | Notifications | In-app + Web Push, geo-filtered, with quiet hours and radius settings |
| 20 | Admin Dashboard | 8-tab Tower Control for platform management, analytics, and simulation |
| 21 | Billing | Stripe-powered Pro subscriptions with portal and invoice history |
| 22 | PWA & Offline | Installable, push-enabled, works offline via IndexedDB queue |
| 23 | i18n | English and French with cookie-based locale switching |
| 24 | Shared Routes | Public route sharing with upvotes from community |
| 25 | Trusted Circle | Invite-based safety network with live location sharing |
| 26 | Place Notes | Personal location bookmarks with emoji and favorites |
| 27 | Simulation Engine | Admin tool to seed fake data and run live activity simulations for demos |

---

## 11. Key Metrics to Track

| Metric | Definition |
|---|---|
| **DAU / WAU / MAU** | Daily, weekly, monthly active users |
| **Pins per day** | New safety reports submitted |
| **Resolution rate** | % of pins confirmed or cleared within 24h |
| **SOS activations** | Emergency triggers per week |
| **Engagement rate** | (votes + comments + reports) / DAU |
| **Retention (D7, D30)** | % of users returning after 7 and 30 days |
| **Pro conversion rate** | Free → Pro upgrade rate |
| **Referral coefficient** | Average referrals per user |
| **Challenge completion** | % of weekly challenges completed |

---

## 12. Vision

**Short-term (6 months):** Establish KOVA as the go-to safety companion for women in Paris. 10,000 active users. Dense pin coverage across all arrondissements.

**Medium-term (18 months):** Expand to 5 major EU cities. Launch B2B city dashboard. 100,000 users. Sustainable revenue from Pro subscriptions.

**Long-term (3 years):** Global presence in 50+ cities. Anonymized safety data partnerships with transit authorities and urban planners. 1M+ users. The world's most comprehensive real-time urban safety platform — built by women, for everyone.

---

*KOVA — Because every woman deserves to walk without fear.*
