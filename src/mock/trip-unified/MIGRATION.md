# Migration Plan: Escort + Trip → Unified Trip System

## Overview

Merge the 3 overlapping systems (useEscorte trip mode, TripView, trip_log API) into a single coherent flow using the mock types/hook/HUD as the target architecture.

**Scope**: Trip mode only. Escorte immédiate ("Marche avec moi") reste intact.

---

## Phase 1 — Database: Merge trip_log + escortes (trip mode)

### Step 1.1: Add columns to `trip_log`
```sql
ALTER TABLE trip_log ADD COLUMN IF NOT EXISTS
  circle_notified boolean DEFAULT false,
  escorte_id uuid REFERENCES escortes(id),
  julia_active boolean DEFAULT false,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz;
```

**Why**: `trip_log` becomes the single source of truth for trips. The optional `escorte_id` links to an escorte row only when GPS/circle is active.

### Step 1.2: Keep `escortes` table for GPS tracking only
- Trip mode no longer INSERT into `escortes` directly
- Instead: `useTrip.start()` creates `trip_log` first, then optionally creates `escortes` row for GPS/circle
- `escortes.mode = 'trip'` rows always have a `trip_log` parent

### Step 1.3: Migration script for existing data
```sql
-- Backfill trip_log.escorte_id from escortes where mode='trip'
-- Match on user_id + overlapping time window
UPDATE trip_log t SET escorte_id = e.id
FROM escortes e
WHERE e.user_id = t.user_id AND e.mode = 'trip'
  AND e.created_at BETWEEN t.started_at - interval '5min' AND t.started_at + interval '5min';
```

---

## Phase 2 — Hook: Replace useEscorte.startTrip + TripView state with useTrip

### Step 2.1: Create `src/hooks/useTrip.ts`
Copy from `src/mock/trip-unified/useTrip.ts`, uncomment real Supabase calls, remove mock placeholders.

### Step 2.2: Wire into TripView
```diff
- // TripView manages its own local state + calls /api/trips/start
+ const { trip, start, complete, cancel, triggerSOS, toggleSharing, progress, etaMinutes, remainingKm } = useTrip(userId)
```

TripView keeps: route planning (fetchDirectionsMulti, scoring, route selection UI).
TripView delegates: start/active/complete lifecycle to useTrip.

### Step 2.3: Remove startTrip from useEscorte
```diff
  // useEscorte.ts
- const startTrip = useCallback(async (params) => { ... }, [userId])
  // Keep: startEscorteImmediate, endEscorte, triggerSOS (for immediate mode)
```

### Step 2.4: Update EscorteSheet routing
Currently EscorteSheet has two trip paths:
1. "Trajet destination" → opens TripView (uses trip_log)
2. "Planifier" → INSERT escortes mode='trip' (uses escortes)

**Action**: Remove path 2. All trip destinations go through TripView → useTrip.

### Step 2.5: Remove /api/trips/start and /api/trips/end
useTrip handles trip_log writes client-side via Supabase. The API routes become unnecessary.

---

## Phase 3 — UI: Merge TripHUD + TripActiveHUD → ActiveHUD

### Step 3.1: Create `src/components/trip/ActiveHUD.tsx`
Copy from `src/mock/trip-unified/ActiveHUD.tsx`, adapt imports.

### Step 3.2: Replace in map/page.tsx
```diff
- {escorte.view === 'trip-active' && (
-   <TripHUD isDark={isDark} isVisible destName={...} ... />
- )}
+ {/* TripHUD removed — ActiveHUD lives inside TripView now */}
```

### Step 3.3: Replace in TripView.tsx
```diff
- <TripActiveHUD destination={...} elapsedSeconds={...} ... />
+ <ActiveHUD trip={trip} isDark={isDark} progress={progress} ... />
```

### Step 3.4: Delete old files
- `src/components/TripHUD.tsx` (149 LOC)
- `src/components/trip/TripActiveHUD.tsx` (204 LOC)

---

## Phase 4 — Zustand cleanup

### Step 4.1: Simplify activeTrip in store
```diff
- activeTrip: TripSession  // type that mixed EscortState, never synced
+ // Removed — useTrip hook owns trip state locally
```

### Step 4.2: Clarify route fields
```diff
  // Rename for clarity
- activeRoute   → confirmedRoute    // the route being navigated
- pendingRoutes → previewRoutes     // the 3 options being shown
+ confirmedRoute: { coords, destination } | null
+ previewRoutes: RouteOption[] | null
```

### Step 4.3: Single writer rule
Only `useTrip.start()` sets `confirmedRoute`. Only TripView planning sets `previewRoutes`. No more dual-writer conflict.

---

## Phase 5 — SOS wiring

### Step 5.1: Remove CustomEvent SOS
```diff
- // TripActiveHUD
- window.dispatchEvent(new CustomEvent("sos-trigger"))
+ // ActiveHUD calls onSOS prop directly → useTrip.triggerSOS()
```

### Step 5.2: useTrip.triggerSOS flow
1. If no escorte row exists → create one (mode='trip', status='sos')
2. Update escortes.status = 'sos'
3. Invoke edge function `trigger-sos`
4. Force-notify circle if not already notified

This is already implemented in the mock `useTrip.ts`.

---

## Phase 6 — Cleanup dead code

| File | Action |
|------|--------|
| `EscorteSheet.tsx` renderTripActive | Remove (returns null anyway) |
| `useEscorte.startTrip()` | Remove |
| `useStore.activeTrip` | Remove type + setter |
| `/api/trips/start/route.ts` | Delete |
| `/api/trips/end/route.ts` | Delete |
| `TripHUD.tsx` | Delete |
| `TripActiveHUD.tsx` | Delete |
| `src/lib/trip-constants.ts` CircleContact | Keep (used by ActiveHUD via TripCircleMember) |

---

## Rollout order

1. **Phase 1** (DB) — additive, no breaking changes
2. **Phase 2** (Hook) — biggest change, test thoroughly
3. **Phase 3** (UI) — swap components, visual regression test
4. **Phase 4** (Store) — rename fields, update all consumers
5. **Phase 5** (SOS) — wire real edge function
6. **Phase 6** (Cleanup) — remove dead code last

Each phase is independently deployable. Phases 2+3 can be done together if preferred.

---

## What stays unchanged

- **Escorte immédiate** (startEscorteImmediate) — untouched, keeps its own flow
- **Walk With Me** — completely separate system
- **TripView planning** (multi-route fetch, scoring, route cards) — stays in TripView
- **MapView route rendering** — still reads confirmedRoute/previewRoutes from Zustand
- **TripSummaryModal** — still shown after useTrip.complete(), receives TripSummary
- **Circle realtime subscription** — moves into useTrip but same Supabase channel logic
