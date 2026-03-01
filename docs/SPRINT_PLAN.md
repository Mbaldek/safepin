# BREVEIL — User Test Sprint Plan
### 20+ testers · This week · Ship or die

---

## CURRENT STATE AUDIT

I reviewed all 27 screens of the live app. Here's the honest assessment.

### ✅ What's strong (keep, don't rebuild)
- **Map + Mapbox integration** — working, geocoded, pins render
- **SOS flow** — countdown → emergency numbers → activated state → route to safe spot → "I'm Safe" confirmation
- **Incident reporting** — 3-step flow (category → severity → submit) with 11 incident types
- **Routing** — Walk/Bike/Drive/Transit with real Mapbox Directions, ETA, step-by-step
- **Walk With Me** — code-based pairing, companion tracking
- **Community structure** — hub → trusted circle, friends, groups, neighbourhoods, chat with stories
- **Map layers** — Streets/Light/Dark, security/transport/data toggles
- **Filters** — time, radius, severity filtering
- **Settings** — language, notifications, account, onboarding tour restart
- **Dark/Light toggle** — already wired via moon icon in header

### 🔴 What will KILL your test (must fix)

| # | Issue | Why it kills the test |
|---|-------|----------------------|
| 1 | **Still says "Brume" everywhere** | Brand confusion. 20 testers will think it's a different app than what you pitched them |
| 2 | **Language mix** — French UI labels + English features | Testers won't know if it's a bug or intentional. Pick ONE language for the test |
| 3 | **Empty ghost town** — no incidents, no communities, no friends, no neighbourhoods | New users open the app and see nothing. They'll think it's broken and close it |
| 4 | **Old visual identity** — beige/cream/gold shield, not Breveil brand | Doesn't match any marketing materials or pitch deck you've shown |
| 5 | **No onboarding** — user lands on map cold with zero context | 20+ strangers won't know what to do first |
| 6 | **Emergency-heavy tone** — "safety contact", "alerted during SOS", "these contacts are alerted when you trigger SOS" | Scares casual testers away before they explore |

### 🟡 What can wait (nice to have, not blocking)
- Custom Mapbox Studio branded style (use Dark style for now — it's closer to Breveil)
- Julia AI companion
- Advanced profile stats/gamification
- Favourite routes persistence
- Push notifications (Resend integration)

---

## SPRINT BRIEFS — EXECUTION ORDER

Feed these to Claude Code in this exact order. Each brief is self-contained.

| # | Brief | Est. effort | Impact | File |
|---|-------|-------------|--------|------|
| 01 | **Rebrand Pass** | 2-3h | 🔴 Critical | `BRIEF_01_REBRAND.md` |
| 02 | **Language Consistency** | 1-2h | 🔴 Critical | `BRIEF_02_LANGUAGE.md` |
| 03 | **Seed Data** | 1-2h | 🔴 Critical | `BRIEF_03_SEED_DATA.md` |
| 04 | **Onboarding Integration** | 3-4h | 🔴 Critical | `BRIEF_04_ONBOARDING.md` |
| 05 | **Community Tone Shift** | 1-2h | 🟡 High | `BRIEF_05_COMMUNITY_TONE.md` |
| 06 | **Map & Navigation Polish** | 2-3h | 🟡 High | `BRIEF_06_MAP_POLISH.md` |
| 07 | **SOS Flow Polish** | 1-2h | 🟡 High | `BRIEF_07_SOS_POLISH.md` |
| 08 | **Profile Redesign** | 2-3h | 🟡 Medium | `BRIEF_08_PROFILE.md` |
| 09 | **Test Protocol** | — | 🔴 Critical | `BRIEF_09_TEST_PROTOCOL.md` |

**Minimum viable test = Briefs 01 + 02 + 03 + 04 + 09.** That's your "must ship" line.
Briefs 05-08 make it polished. Do them if you have time.

---

## DECISION: LANGUAGE

For your Paris-based 20+ tester group, I recommend:

**Default to French UI** with English as fallback. Reasons:
- Your testers are in Paris
- Safety-critical text (SOS, emergency numbers) should be in the user's native language
- Community features feel more authentic in local language
- Your current app already has most labels in French

Brief 02 handles this cleanup.

---

## ARCHITECTURE NOTE

Your stack (Next.js + Supabase + Mapbox + Vercel) is solid. The briefs don't ask you to change architecture. They modify:
- **UI components** (Tailwind classes, text content, SVG assets)
- **Supabase seed scripts** (SQL inserts for test data)
- **Copy/microcopy** (strings, labels, empty states)
- **Auth flow** (adding onboarding screens to the existing Supabase Auth flow)

Nothing structural. This is a polish sprint, not a rewrite.
