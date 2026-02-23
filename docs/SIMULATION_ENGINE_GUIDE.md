# KOVA Simulation Engine — Quick Start Guide

The Simulation Engine (S43) lets admins populate Paris with realistic fake safety data and run live activity simulations. Perfect for demos, investor pitches, load testing, and development.

---

## Prerequisites

- You must be an **admin user** (profile has `is_admin: true`)
- You must be **logged in** to KOVA

---

## Step 1: Open the Simulation Tab

1. Navigate to `/admin` (or tap **Settings → Admin → Tower Control**)
2. Click the **Simulation** tab (last tab, with the robot emoji)

You'll see four status cards:
- **Status** — Active or Inactive
- **Simulated Users** — count of fake profiles in the database
- **Simulated Pins** — count of fake incident pins
- **Tick Interval** — current simulation speed

---

## Step 2: Seed Paris with Fake Data

This creates fake users and incident pins scattered across Paris.

1. In the **"Seed Paris with Fake Data"** section:
   - **Users** — number of fake profiles to create (default: 200)
   - **Pins** — number of fake incident pins to create (default: 500)
2. Click **"Seed Paris"**
3. Wait for the success toast (e.g., "Seeded 200 users + 500 pins")

### What Gets Created

**Fake Users:**
- Random French first names + last names
- All flagged with `is_simulated = true`
- Varied `created_at` dates over the last 90 days

**Fake Pins:**
- Random category (Harassment, Stalking, Dark Area, Aggression, Drunk Person, Other)
- Random severity (low, medium, high)
- **Weighted toward Paris hotspots:** Chatelet, Gare du Nord, Barbes, Republique, Pigalle
- All flagged with `is_simulated = true`
- Varied `created_at` dates over the last 30 days
- ~10% marked as emergency

### Recommended Counts

| Use Case | Users | Pins |
|---|---|---|
| Quick demo | 50 | 100 |
| Full demo | 200 | 500 |
| Stress test | 500 | 2000 |

---

## Step 3: View Simulated Data on the Map

By default, simulated data is **hidden** from the map. To see it:

1. Go to the main **Map** view (`/map`)
2. Tap the **Layers** button (bottom-left of the map)
3. Scroll to the bottom — you'll see an amber-colored **"Simulated"** toggle (admin-only)
4. Enable it

Simulated pins now appear on the map alongside real data. Disable the toggle to hide them again.

> **Note:** This toggle is only visible to admin users. Regular users never see simulated data.

---

## Step 4: Start Live Simulation

Live simulation auto-creates new activity at regular intervals, making the map feel alive.

1. In the **"Live Simulation"** section of the Simulation tab:
2. Choose a **tick interval:**
   - **10s** — very fast, good for live demos
   - **30s** — moderate pace (recommended for demos)
   - **1min** — natural pace
   - **5min** — slow background activity
3. Click **"Start Simulation"** (green button)

### What Each Tick Does

Every tick, the simulation engine picks 1–3 random simulated users and:

| Action | Probability | Description |
|---|---|---|
| New Pin | 60% | Creates a new incident pin near Paris center |
| Vote | 25% | Adds a confirm or deny vote on a random recent simulated pin |
| Comment | 15% | Adds a comment on a random recent simulated pin |

### Activity Log

Below the controls, an **Activity Log** shows what happened on each tick:

```
14:32:15 — Created pin (harassment, medium) at 48.8612, 2.3411
14:32:45 — Voted confirm on pin abc123
14:33:15 — Created pin (dark_area, low) at 48.8701, 2.3298, Commented on pin def456
```

The log keeps the last 50 entries.

### Stop Simulation

Click the **"Stop Simulation"** button (red) to halt all automatic activity. The simulation engine checks the `simulation_active` admin parameter — when set to `false`, ticks are no-ops.

---

## Step 5: Clean Up

When you're done, remove all simulated data:

1. In the **"Danger Zone"** section (red border)
2. Review the counts shown: "Delete all simulated users (X) and pins (Y)"
3. Click **"Delete All Simulated Data"**
4. Confirm the browser dialog

This deletes:
- All `profiles` where `is_simulated = true`
- All `pins` where `is_simulated = true`
- Pins are deleted first (foreign key dependency), then profiles

> **Warning:** This action cannot be undone.

---

## Architecture Reference

### Database

| Table | Column | Purpose |
|---|---|---|
| `pins` | `is_simulated` (boolean, default false) | Flags fake pins |
| `profiles` | `is_simulated` (boolean, default false) | Flags fake users |
| `admin_params` | key: `simulation_active` | Controls live sim on/off |

Index: `idx_pins_is_simulated` — fast filtering on `pins.is_simulated = true`

### Edge Functions

| Function | Method | Purpose |
|---|---|---|
| `seed-paris` | POST | Generates bulk fake users + pins |
| `simulate-activity` | POST | Creates one tick of live activity |

Both require a valid JWT in the `Authorization` header (obtained from the user's Supabase session).

### Map Query Filter

In `src/app/map/page.tsx`, the pin loading query includes:

```typescript
if (!showSimulated) {
  query = query.or('is_simulated.is.null,is_simulated.eq.false');
}
```

This ensures simulated data is invisible to regular users and to admins who haven't toggled the layer on.

### Store

In `src/stores/useStore.ts`:

```typescript
showSimulated: boolean    // default: false
setShowSimulated: (v: boolean) => void
```

---

## Tips

- **For investor demos:** Seed 200 users + 500 pins, then start live simulation at 10s interval. Show the map filling up with activity in real-time.
- **For screenshots:** Seed data, enable the simulated layer, take screenshots, then clean up.
- **Multiple seeds:** You can seed multiple times — data accumulates. Clean up between seeds if you want fresh data.
- **No impact on real users:** Simulated data is completely isolated. Real users never see it unless they are admins with the toggle enabled.
- **Edge function auth:** Both edge functions require JWT auth. The admin page handles this automatically using the current session token.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Not authenticated" error on seed | Refresh the admin page to get a fresh session token |
| Seed button stuck on "Seeding..." | Check browser console for errors. The edge function may have timed out — try smaller counts |
| Simulated toggle not visible | Ensure your profile has `is_admin: true` in the `profiles` table |
| Live simulation not creating activity | Check that `admin_params` has `simulation_active = 'true'`. Verify the edge function is deployed |
| Cleanup not working | Ensure RLS policies allow delete for admin users. Check browser console for permission errors |
