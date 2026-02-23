# Brume Simulation Engine — Quick Start Guide

The Simulation Engine lets admins populate Paris with realistic fake safety data and run live activity simulations. It is designed for demos, investor pitches, load testing, and development.

---

## Prerequisites

- You must be an **admin** (`is_admin: true` in your profile).
- You must be **logged in**.

---

## Step 1: Open the Simulation Tab

1. Navigate to `/admin`.
2. Click the **Simulation** tab (the robot icon).
3. You will see **4 status cards** at the top of the page:

| Card | Description |
|------|-------------|
| **Status** | Whether the simulation is currently running or stopped |
| **Simulated Users** | Total number of fake user profiles in the database |
| **Simulated Pins** | Total number of fake incident pins in the database |
| **Tick Interval** | How frequently the live simulation generates new activity |

---

## Step 2: Seed Paris with Fake Data

The seeding function populates the database with simulated users and incident pins distributed across Paris.

### Configuration

- **Users field** — Number of fake profiles to create (default: 200)
- **Pins field** — Number of fake incident pins to create (default: 500)

### How to Seed

1. Set the desired user and pin counts.
2. Click **"Seed Paris"**.
3. Wait for the operation to complete.

### What Gets Created

- **Users:** Random French names, `is_simulated = true`, varied registration dates.
- **Pins:** Geographically weighted toward known hotspots:
  - Chatelet
  - Gare du Nord
  - Barbes
  - Republique
  - Pigalle
- Approximately **10% of pins** are marked as emergencies.

### Recommended Presets

| Scenario | Users | Pins | Use Case |
|----------|-------|------|----------|
| Quick demo | 50 | 100 | Fast walkthrough or screenshot |
| Full demo | 200 | 500 | Investor pitch or live presentation |
| Stress test | 500 | 2,000 | Performance and load testing |

---

## Step 3: View Simulated Data on the Map

Simulated pins are **hidden by default** to avoid polluting the real safety map.

To view them:

1. Go to the **Map**.
2. Open the **Layers** panel.
3. Enable the **"Simulated"** toggle.

> **Note:** The Simulated toggle is admin-only and is styled with an amber color to clearly distinguish it from real data layers.

---

## Step 4: Live Simulation

The live simulation generates ongoing activity from simulated users at a configurable pace.

### Tick Interval Options

| Interval | Use Case |
|----------|----------|
| **10 seconds** | Fast demo — rapid activity for visual impact |
| **30 seconds** | Recommended — realistic pace for presentations |
| **1 minute** | Moderate — background activity during extended demos |
| **5 minutes** | Slow — long-running background simulation |

### What Happens Each Tick

On every tick, **1 to 3 random simulated users** perform one of the following actions:

| Action | Probability |
|--------|-------------|
| Create a new pin | 60% |
| Vote on an existing pin | 25% |
| Comment on an existing pin | 15% |

### Activity Log

The activity log displays the **last 50 entries** in reverse chronological order, showing what each simulated user did and when.

---

## Step 5: Clean Up

When you are finished with the simulation, you can remove all fake data.

1. Scroll to the **Danger Zone** section.
2. Click **"Delete All Simulated Data"**.
3. Confirm the action.

The cleanup process deletes **pins first** (to respect foreign key constraints), then **profiles**.

> **Warning:** This action is irreversible. All simulated pins, votes, comments, and user profiles will be permanently deleted.

---

## Architecture Reference

### Database Schema

| Element | Description |
|---------|-------------|
| `pins.is_simulated` | Boolean column — `true` for simulated pins |
| `profiles.is_simulated` | Boolean column — `true` for simulated users |
| `admin_params.simulation_active` | Boolean — whether the live simulation is currently running |
| `idx_pins_is_simulated` | Database index for efficient filtering of simulated pins |

### Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `seed-paris` | POST | Creates simulated users and pins |
| `simulate-activity` | POST | Generates a single tick of simulated activity |

Both functions require **JWT authentication** in the Authorization header.

### Admin Client

The simulation uses `createAdminClient()` from `src/lib/supabase-admin.ts`. This is a **server-only** client that authenticates with the Supabase service role key. It must never be exposed to the browser.

### Map Query Filter

The map excludes simulated data by default using this filter pattern:

```typescript
if (!showSimulated) {
  query = query.or('is_simulated.is.null,is_simulated.eq.false');
}
```

This ensures that only real pins appear on the map unless the admin explicitly enables the simulated layer.

### Store

The simulated layer visibility is controlled by the `showSimulated` boolean in the Zustand store:

```
src/stores/useStore.ts → showSimulated: boolean
```

---

## Tips

- **Start small.** Use the Quick demo preset (50 users / 100 pins) to verify everything works before scaling up.
- **Use 30-second ticks** for investor demos. It creates a natural pace of activity that feels realistic without being overwhelming.
- **Enable the simulated layer** before starting the live simulation so you can watch pins appear in real time on the map.
- **Clean up before production.** Always run "Delete All Simulated Data" before any real users access the platform.
- **Combine with Walk With Me** for compelling demos — seed the data, start a simulated walk, and show how the map responds.

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Seed Paris" button is disabled | Not logged in as admin | Verify your profile has `is_admin: true` |
| Pins do not appear on the map | Simulated layer is off | Open Layers panel and enable the "Simulated" toggle |
| Edge function returns 401 | Invalid or expired JWT | Log out and log back in to refresh your session |
| Seeding is slow | Large dataset requested | Reduce user/pin count or wait — large seeds can take 30-60 seconds |
| Cleanup fails | Foreign key constraint | This should not happen with the built-in cleanup order. If it does, try running the cleanup again |
| Activity log is empty | Live simulation not started | Click the start button and verify the status card shows "Running" |
| Simulated pins appear for non-admins | Store state issue | Verify that `showSimulated` defaults to `false` and the toggle is hidden for non-admins |

---

*Brume Simulation Engine — Part of the Brume Admin Toolkit by DBEK.*
