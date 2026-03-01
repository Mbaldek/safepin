# BRIEF 08 — Profile Redesign
### Priority: 🟡 MEDIUM · Est: 2-3 hours

---

## Objective
The profile screen ("Moi" tab) is the user's home base. Currently it feels like an admin panel — stats, levels, empty sections. Redesign it to feel personal and rewarding.

---

## Current layout
```
Mon Brume
[Avatar B] Set your name    0
           Watcher
[0 Signalements] [Watcher Niveau] [0 Votes]
[Trusted Circle — No contacts yet]
[Communauté — Groupes, quartiers & messages]
[Activité] [Sauvegardé] [Statistiques]
(empty state)
```

---

## New layout

```
Mon Breveil
─────────────────────────
[Avatar]  {First Name}
          @username · Paris
          Noctambule 🌙 · Étudiante 📚
─────────────────────────
  12          Veilleur        5
Signalements   Niveau       Merci
─────────────────────────
💛 Mon Cercle                    →
   3 proches · Clara, Sarah...
─────────────────────────
👥 Mes communautés               →
   4 groupes · Marais Solidaire...
─────────────────────────
[Activité] [Sauvegardé] [Stats]
   (feed content)
```

---

## Detailed changes

### 1. Profile header
- Avatar: Show user initial in a circle with gradient background (like the onboarding funnel)
  - Gradient: `linear-gradient(135deg, #E8A838, #8B7EC8)`
  - Size: 56px circle
  - Letter: white, 22px, bold
- Name: Cormorant Garamond, 22px, font-weight 400
- Username line: Plus Jakarta Sans, 12px, muted color
- Persona tags: Show the personas selected during onboarding as small chips below name
  - Style: subtle background, emoji + label, 11px

### 2. Stats row
Three equal cards in a row:

```
Signalements | Niveau    | Merci
     12      | Veilleur  |   5
```

- Rename "Votes" → "Merci" (warmer — it's community thank-yous)
- Rename "Watcher" level → "Veilleur" (French)
- Number: Cormorant Garamond, 24px, `--veil` color
- Label: Plus Jakarta Sans, 10px, uppercase, muted

Level progression (for future):
```
Veilleur (0-10 reports)
Gardien (11-50 reports)  
Sentinelle (51-200 reports)
Protecteur (201+ reports)
```
Show level name + subtle progress bar to next level.

### 3. Mon Cercle card
- Show count + first 2-3 names as preview
- Tap → opens trusted circle management
- Empty state: "Ajoutez vos premiers proches 💛" with invite button

### 4. Mes communautés card
- Show count + first community name as preview
- Tap → opens communities hub
- Empty state: "Rejoignez votre premier quartier 🏘️"

### 5. Activity / Saved / Stats tabs

**Activity tab:** Show a feed of the user's reports, verifications, and community activity
- Each item: emoji + description + time ago
- "Vous avez signalé: Harcèlement · Rue Lecourbe · il y a 2h"
- "Vous avez rejoint: Quartier Grenelle · il y a 1j"

**Saved tab:** Bookmarked incidents and routes
- Empty: "Vos signalements sauvegardés apparaîtront ici ⭐"

**Stats tab:** Simple numbers
- "Ce mois: 3 signalements, 12 vérifications, 45 min de trajet partagé"
- Empty: "Vos statistiques apparaîtront au fil du temps 📊"

### 6. Settings access
Current: via hamburger menu → full settings sheet
Keep this. But also add a small gear icon in the top-right of the profile screen for quick access.

---

## Design tokens

```css
/* Profile card */
.profile-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 16px;
}

/* Stat card */
.stat-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px;
  text-align: center;
}

/* Tab active */
.tab-active {
  background: #E8A838;
  color: #1B2541;
  border-radius: 20px;
  padding: 8px 16px;
  font-weight: 700;
  font-size: 12px;
}

/* Tab inactive */
.tab-inactive {
  background: transparent;
  color: rgba(255,255,255,0.4);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
}
```

---

## Verification checklist
- [ ] Header shows "Mon Breveil" (not "Mon Brume")
- [ ] Avatar has gradient background with user initial
- [ ] Persona chips display from onboarding data
- [ ] Stats show "Signalements / Niveau / Merci"
- [ ] Level is in French ("Veilleur")
- [ ] Mon Cercle card shows contact preview or warm empty state
- [ ] Mes communautés card shows group preview
- [ ] Activity feed has at least placeholder structure
- [ ] Settings gear icon in top-right
