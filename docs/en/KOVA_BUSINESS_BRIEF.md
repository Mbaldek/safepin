# KOVA Business Brief

**Company:** DBEK
**Headquarters:** 75 rue de Lourmel, 75015 Paris, France
**Contact:** kovaapp@pm.me
**Platform:** PWA (Progressive Web App)
**Production URL:** [safepin-pearl.vercel.app](https://safepin-pearl.vercel.app)
**Tagline:** *A safer world, mapped by women — for women.*

---

## 1. Problem

- **1 in 3 women** worldwide experience physical or sexual violence (WHO, 2021).
- **80% of street harassment** goes unreported.
- There is no source of real-time, crowd-sourced safety data. Existing tools are fragmented, siloed, and passive.

Women navigate cities without actionable safety intelligence. Current solutions either focus on emergency response (too late) or static crime databases (too stale). Nothing connects real-time community awareness with proactive route planning and personal safety tools in a single platform.

---

## 2. Solution

KOVA is a **community-driven urban safety platform** — a living safety map powered by its community.

### Core Loop

```
See something → Report (30 seconds) → Appears on map instantly
→ Community votes confirm or clear → Routes auto-adjust,
alerts fire, safety scores update
```

KOVA transforms passive bystanders into an active safety network. Every report enriches the map, every vote refines accuracy, and every user benefits from the collective intelligence of the community.

---

## 3. Target Audience

| Segment | Description |
|---------|-------------|
| **Primary** | Urban women aged 18-45 — commuters, students, night workers, runners, new residents |
| **Secondary** | Parents, city administrators, transit authorities |

### Geographic Rollout

| Phase | Scope |
|-------|-------|
| **Phase 1** | Paris |
| **Phase 2** | EU cities |
| **Phase 3** | Global |

---

## 4. Business Model — Freemium SaaS

### Free Tier

All core features at no cost:

- Safety map
- Incident reporting
- SOS emergency
- Safe route planner
- Community groups and neighborhoods
- Walk With Me
- Live broadcasting
- Weekly challenges
- Referral system

### KOVA Pro

| Plan | Price |
|------|-------|
| Monthly | **EUR 4.99/mo** |
| Annual | **EUR 39.99/yr** |

Pro features include:

- Location history
- Safety buddy
- Neighborhood safety scores
- Advanced analytics
- Priority alerts

### Payments

Powered by **Stripe**:

- Stripe Checkout for subscription initiation
- Stripe Webhooks for event handling
- Stripe Billing Portal for self-service management
- Full invoice history

### Future Revenue Streams

- B2B city dashboards
- Anonymized data licensing

---

## 5. Growth Strategy

### Viral Referral

Every user gets a unique referral code (`KOVA-XXXXX`). Sharing drives organic acquisition with built-in incentives.

### Gamification

| Trust Level | Progression |
|-------------|-------------|
| Watcher | Starting level |
| Reporter | Active contributor |
| Guardian | Trusted community member |
| Sentinel | Top-tier verified contributor |

Additional engagement mechanics:

- Weekly challenges
- Milestones and achievements
- Expertise tags

### Community Network Effects

- Neighborhoods create local density
- Trusted circles build social graphs
- Walk With Me drives paired usage and real-time engagement

### PWA Advantages

- Zero friction — no app store required
- Installable on any device
- Push notifications via Web Push API
- Offline-first architecture

---

## 6. Competitive Landscape

| Competitor | Category | KOVA Differentiator |
|------------|----------|---------------------|
| bSafe | Personal safety | KOVA adds community intelligence and live map |
| Noonlight | Emergency dispatch | KOVA is proactive, not just reactive |
| Citizen | Incident alerts | KOVA is women-focused with trusted community |
| Life360 | Family tracking | KOVA adds safety reporting and route planning |
| Google Maps | Navigation | KOVA layers real-time safety data on routes |
| Waze | Community navigation | KOVA focuses on personal safety, not traffic |

**KOVA uniquely combines** community intelligence + personal safety + social engagement in a single PWA.

---

## 7. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Maps | Mapbox GL JS v3 (direct integration, no wrapper) |
| Routing | OSRM |
| Transit | Overpass API (OpenStreetMap) |
| Live Video | LiveKit (WebRTC) |
| Payments | Stripe (Checkout, Webhooks, Portal) |
| Push | Web Push API + VAPID |
| i18n | next-intl — 30 languages |
| Identity Verification | Veriff |
| State Management | Zustand v5 |
| Icons | Lucide React |
| Hosting | Vercel |

---

## 8. Authentication Methods

KOVA supports four authentication methods:

1. **Google OAuth**
2. **Apple Sign-In**
3. **Magic Link** (email OTP)
4. **Email + Password**

---

## 9. Landing Page

The landing page has been redesigned with:

- **Hero section** with gradient text and clear value proposition
- **Stats bar** — 10K+ reports, 30 languages, 24/7 availability, 100% free
- **Auth card** with tabbed interface for sign-in and sign-up
- **Features grid** showcasing 6 core features
- **Social proof** section
- **Footer** with legal links (Privacy Policy, Terms of Service, Cookie Policy)

---

## 10. GDPR and Privacy

- **EU-region Supabase** instance for data residency compliance
- **Full legal pages:**
  - Privacy Policy (`/privacy`)
  - Terms of Service (`/terms`)
  - Cookie Policy (`/cookies`)
- **Privacy toggles** for granular user control
- **Data deletion** support
- **Quiet hours** configuration
- **Identity verification** via Veriff

---

## 11. Feature Overview (29 Features)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Safety Map | Real-time map of community-reported safety incidents |
| 2 | Incident Reporting | Submit a report in under 30 seconds |
| 3 | Pin Voting and Lifecycle | Community confirms or clears incidents via votes |
| 4 | SOS Emergency | One-tap emergency alert to contacts and authorities |
| 5 | Walk With Me | Request a virtual companion for your walk |
| 6 | Audio Check-in | Periodic audio-based safety confirmations |
| 7 | Safe Route Planner | Routes that avoid reported incidents |
| 8 | Live Broadcasting | Stream video in real time during unsafe situations |
| 9 | Community Groups | Join or create safety-focused groups |
| 10 | Neighborhoods | Localized safety communities for your area |
| 11 | Friends and DMs | Connect with trusted contacts and direct message |
| 12 | Trust Levels | Progress through Watcher, Reporter, Guardian, Sentinel |
| 13 | Weekly Challenges | Gamified engagement tasks refreshed weekly |
| 14 | Referral System | Unique KOVA-XXXXX codes for viral growth |
| 15 | SOS Broadcast | Broadcast SOS alerts to nearby users |
| 16 | Safety Buddy (Pro) | Dedicated virtual companion with enhanced features |
| 17 | Milestones | Achievement tracking and rewards |
| 18 | Expertise Tags | Earn tags based on contribution areas |
| 19 | Notifications | Push notifications via Web Push API |
| 20 | Admin Dashboard | Full administrative control panel |
| 21 | Billing | Stripe-powered subscription management |
| 22 | PWA and Offline | Installable app with offline-first capabilities |
| 23 | i18n (30 languages) | Full internationalization via next-intl |
| 24 | Shared Routes | Share safe routes with friends and contacts |
| 25 | Trusted Circle | Inner circle of verified trusted contacts |
| 26 | Place Notes | Add personal safety notes to locations |
| 27 | Simulation Engine | Admin tool for demo data and load testing |
| 28 | Identity Verification | Veriff-powered identity confirmation |
| 29 | Legal Pages | Privacy Policy, Terms of Service, Cookie Policy |

---

## 12. Key Metrics

| Category | Metrics |
|----------|---------|
| Engagement | DAU / WAU / MAU |
| Content | Pins per day |
| Quality | Resolution rate |
| Safety | SOS activations |
| Activity | Engagement rate |
| Retention | D7 / D30 retention |
| Monetization | Pro conversion rate |
| Growth | Referral coefficient |
| Gamification | Challenge completion rate |

---

## 13. Vision

| Horizon | Goals |
|---------|-------|
| **6 months** | Go-to safety companion in Paris, 10K users |
| **18 months** | 5 EU cities, B2B dashboard launched, 100K users |
| **3 years** | 50+ cities, data partnerships established, 1M+ users |

---

*KOVA by DBEK — A safer world, mapped by women, for women.*
