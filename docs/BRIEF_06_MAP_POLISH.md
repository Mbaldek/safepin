# BRIEF 06 — Map & Navigation Polish
### Priority: 🟡 HIGH · Est: 2-3 hours

---

## Objective
The map is the home screen — the first thing every tester sees after onboarding. It needs to feel polished, alive, and immediately useful. Not a default Mapbox Streets embed with a few pins.

---

## 1. Default map style

**Current:** Mapbox Streets (light, colorful, busy — looks like Google Maps)

**For testing, switch default to Mapbox Dark** (`mapbox://styles/mapbox/dark-v11`)
- Much closer to Breveil brand
- Incident pins POP on dark backgrounds
- Feels premium, not like a generic map embed
- Your app already has a dark mode toggle and layer picker — just change the default

If you have time to create a custom Mapbox Studio style later, great. For this sprint, dark default is the move.

**Light mode:** When user switches to light theme, use `mapbox://styles/mapbox/light-v11`

---

## 2. Pin redesign

Current pins are Mapbox default + emoji overlays. For the test, create custom pin markers:

### Incident pins
```
Mild (léger):     ● yellow/amber circle, 12px, no pulse
Moderate (modéré): ● orange circle, 14px, subtle pulse  
Danger:           ● red circle, 16px, pulse animation, glow
```

Colors:
- Mild: `#F4A940` (warning)
- Moderate: `#E8A838` (veil)
- Danger: `#E63946` (danger)

Each pin on tap → bottom sheet with incident detail (type, severity, time, # verifications, description)

### Safe space pins
```
Police:    🛡️ in sage green circle
Pharmacy:  💊 in sage green circle  
Hospital:  🏥 in sage green circle
Refuge:    🏠 in aurora purple circle
Station:   🚉 in aurora purple circle
```

Color: `#6BA68E` (sage) for verified safe spaces, `#8B7EC8` (aurora) for partner refuges

### User location pin
Current blue dot is fine. But add a soft glow ring in aurora:
```
background: #8B7EC8
border: 2px solid white
box-shadow: 0 0 0 8px rgba(139, 126, 200, 0.15)
```

---

## 3. "Nearby" panel redesign

The Nearby button (top-left) opens a bottom sheet with incident list and filters.

**Changes:**
- Rename: "À proximité" (already in Brief 02)
- When no incidents: Show warm empty state, NOT the sad shield icon
- New empty state: "Tout est calme autour de vous ☀️" with a subtle illustration or the Veil symbol
- When incidents exist: Show as cards, not just a list
  - Each card: type emoji + label + severity badge + time ago + distance
  - Card background: subtle severity color tinting (danger gets `rgba(230,57,70,0.05)` bg)

### Filter chips redesign
Current: Beige pills with text

New: Glass-style chips on dark, subtle chips on light
```css
/* Dark mode */
.chip { 
  background: rgba(255,255,255,0.06); 
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
}
.chip.active { 
  background: rgba(232,168,56,0.15); 
  border-color: rgba(232,168,56,0.3);
  color: #E8A838;
}
```

---

## 4. FAB buttons (bottom-right)

**Current:** Large gold "+" circle + red "SOS" square, awkwardly stacked

**New layout (bottom to top):**
```
[SOS]  ← 56px red circle, always visible, slight pulse
 gap 8px
 [+]   ← 44px veil gold circle, reports incident
```

SOS should be THE most prominent button on the screen. The "+" is secondary.

**SOS button:**
```css
.sos-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #E63946;
  color: white;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 1px;
  box-shadow: 0 4px 20px rgba(230, 57, 70, 0.4);
  /* Subtle breathe animation */
  animation: sosBreathe 3s ease-in-out infinite;
}
@keyframes sosBreathe {
  0%, 100% { box-shadow: 0 4px 20px rgba(230, 57, 70, 0.4); }
  50% { box-shadow: 0 4px 28px rgba(230, 57, 70, 0.55); }
}
```

**Report button:**
```css
.report-fab {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #E8A838;
  color: #1B2541;
  font-size: 22px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(232, 168, 56, 0.3);
}
```

---

## 5. Address bar

Current: Gold dot + address in cream pill (top-center)

Keep the concept but align with brand:
```css
.address-bar {
  background: rgba(27, 37, 65, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 8px 16px;
  color: white;
  font-size: 13px;
}
.address-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E8A838;
}
```

---

## 6. Map controls position

Current: Filter icon (bottom-left), Layers icon (bottom-left below filter), Mapbox logo (bottom-left)

Move to avoid conflict with bottom sheet drag zones:
- Layers toggle → top-right, below location button
- Filter → integrated into Nearby panel
- Mapbox logo → let it stay (required by Mapbox ToS)
- Location button (crosshairs) → keep top-right

---

## Verification checklist
- [ ] Default map style is dark
- [ ] Incident pins use severity-colored circles (not default markers)
- [ ] Safe space pins use sage/aurora circles with emoji
- [ ] SOS FAB is a 56px red circle with breathe animation
- [ ] Report FAB is a 44px veil gold circle
- [ ] Address bar matches brand
- [ ] Nearby panel has warm empty state
- [ ] Filter chips follow brand styling
