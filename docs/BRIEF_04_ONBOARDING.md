# BRIEF 04 — Onboarding Integration
### Priority: 🔴 CRITICAL · Est: 3-4 hours

---

## Objective
Wire the onboarding funnel into the live app's Supabase Auth flow. New users should NOT land on a cold map. They should go through: Auth → Profile → Goals → Permissions → Map.

---

## Current state
- Supabase Auth is live (email + social auth likely configured)
- No post-signup onboarding exists — user goes straight to map
- Profile fields (name, birthday, city, persona) are not collected at signup
- Onboarding funnel was designed as a standalone prototype (BREVEIL_FUNNEL.jsx)

## Target flow

```
[Landing / Login page]
  → Supabase Auth (email or Google/Apple)
  → [NEW] Profile setup (name, birthday, city, "I am..." multi-select)
  → [NEW] Goals screen (what matters to you?)
  → [NEW] Location permission prompt
  → [NEW] Notification permission prompt
  → [NEW] Trusted circle (add best people)
  → [EXISTING] Map view (with Nearby panel open on first visit)
```

---

## Database: Add profile fields

```sql
-- Add columns to existing profiles table (or users table)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personas TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
```

---

## Pages to create

### `/onboarding/profile`
**Collect:** first_name, birthday, city, personas (multi-select chips)

Persona options:
```ts
const PERSONAS = [
  { id: "commuter", icon: "🚇", label: "Navetteur" },
  { id: "student", icon: "📚", label: "Étudiante" },
  { id: "nightowl", icon: "🌙", label: "Noctambule" },
  { id: "runner", icon: "🏃‍♀️", label: "Coureuse" },
  { id: "parent", icon: "👶", label: "Parent" },
  { id: "traveler", icon: "✈️", label: "Voyageuse" },
  { id: "freelance", icon: "💻", label: "Freelance" },
  { id: "nightlife", icon: "🎉", label: "Vie nocturne" },
  { id: "everything", icon: "✨", label: "Un peu de tout !" },
];
```

**Design:** Breveil dark theme. Progress bar at 25%. Cormorant Garamond heading.

### `/onboarding/goals`
**Collect:** goals (multi-select cards)

Goals:
```ts
const GOALS = [
  { id: "routes", icon: "🧭", label: "Itinéraires sécurisés", desc: "Navigation intelligente" },
  { id: "alerts", icon: "📍", label: "Alertes de quartier", desc: "Restez informée" },
  { id: "sos", icon: "🆘", label: "Protection SOS", desc: "Urgence en un tap" },
  { id: "transit", icon: "🚇", label: "Sécurité transports", desc: "Trajets plus sûrs" },
  { id: "community", icon: "👥", label: "Ma communauté", desc: "Connexion locale" },
  { id: "companion", icon: "💬", label: "Compagnon virtuel", desc: "Julia, votre IA" },
];
```

**Design:** Progress bar at 50%.

### `/onboarding/permissions`
Two-step permission flow:
1. Location: Show map preview, explain value, "Activer la localisation" / "Plus tard"
2. Notifications: Show notification previews, "Activer les notifications" / "Plus tard"
   - Footer: "Pas d'inquiétude — vous pouvez ajuster tout ça dans votre profil ✨"

**Design:** Progress at 65% then 80%.

### `/onboarding/circle`
**Collect:** trusted contacts (name or phone)

**Copy shift (important):**
- Title: "Ajoutez vos proches"
- Description: "Votre cercle — les amis et la famille avec qui vous partagez vos trajets et gardez le contact. 💛"
- NOT: "safety contacts" or "alerted during SOS"
- Empty state: "Vos proches apparaîtront ici"

**Design:** Progress at 90%.

### `/onboarding/welcome`
Personalized welcome:
- "Bienvenue dans votre communauté, {name} 💛"
- Stats: X proches, X centres d'intérêt, 35 fonctionnalités
- CTA: "Explorer votre carte communautaire →"

---

## Routing logic

```ts
// In middleware or layout wrapper
// Check on every authenticated page load:

const profile = await supabase
  .from('profiles')
  .select('onboarding_completed')
  .eq('id', user.id)
  .single();

if (!profile.data?.onboarding_completed) {
  // Get current step and redirect to correct onboarding page
  const step = profile.data?.onboarding_step || 0;
  const routes = ['/onboarding/profile', '/onboarding/goals', '/onboarding/permissions', '/onboarding/circle', '/onboarding/welcome'];
  redirect(routes[Math.min(step, routes.length - 1)]);
}
```

Each onboarding page saves its data and increments `onboarding_step`. The welcome page sets `onboarding_completed = true`.

---

## Skip behavior
- Every step except profile should have a "Plus tard" / skip option
- Skipping saves current step and moves to next
- Goal: reduce friction. Don't force. Let them explore.

---

## Verification checklist
- [ ] New signup goes to profile setup, not map
- [ ] All 5 onboarding steps work and save to Supabase
- [ ] Progress bar advances correctly
- [ ] Skip works on all optional screens
- [ ] Welcome screen shows personalized name
- [ ] "Explorer" button goes to map
- [ ] Returning users who completed onboarding go straight to map
- [ ] Returning users who abandoned mid-flow resume at correct step
