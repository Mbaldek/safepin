# BRIEF 07 — SOS Flow Polish
### Priority: 🟡 HIGH · Est: 1-2 hours

---

## Objective
The SOS flow works. The logic is sound — countdown, alert nearby, call emergency, route to safe spot, confirm safe. But visually it's the weakest screen in the app. For 20+ testers, this is the feature they'll remember most. It needs to feel powerful and reassuring at the same time.

---

## Current SOS flow (3 screens)

1. **SOS Start (countdown):** Large red "4" countdown, "Alerte des utilisateurs proches...", emergency numbers (15/17/18/112), ANNULER button
2. **SOS Activated (map):** Route to safe spot, "Emergency alert detected nearby", progress bar with ETA, Share/Safe spot/I'm Safe buttons
3. **SOS button on map:** Red square "SOS" label

---

## Screen 1: Countdown — Redesign

**Current problems:**
- Beige/cream background doesn't feel urgent enough
- Emergency numbers look like casual cards
- "ANNULER" button looks like default

**New design:**

Background: Dark with red radial gradient
```css
background: radial-gradient(circle at 50% 40%, rgba(230,57,70,0.15) 0%, #1B2541 60%);
```

Countdown number: Much larger, red, with pulse
```css
.countdown {
  font-family: 'Cormorant Garamond', serif;
  font-size: 120px;
  font-weight: 300;
  color: #E63946;
  animation: countPulse 1s ease-in-out infinite;
}
```

Text below: "Alerte en cours..." in white, 16px

Emergency number cards: Horizontal row, each is a tappable circle
```
  (15)    (17)    (18)    (112)
  SAMU   Police  Pompiers   UE
```

Each circle:
```css
.emergency-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(230, 57, 70, 0.1);
  border: 1.5px solid rgba(230, 57, 70, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E63946;
  font-size: 22px;
  font-weight: 700;
}
.emergency-label {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 6px;
}
```

Cancel button: Full-width at bottom
```css
.cancel-btn {
  width: 100%;
  padding: 18px;
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}
```

Add: Haptic feedback on each countdown tick (if available via navigator.vibrate)
```js
// On each countdown tick
if (navigator.vibrate) navigator.vibrate(100);
// On SOS activation (0 reached)
if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
```

---

## Screen 2: SOS Activated — Redesign

**Current problems:**
- "Emergency alert detected nearby — stay alert!" is in English
- "En route to Option 1" is placeholder text
- The bottom card is cream/beige, doesn't feel urgent

**New design:**

Alert banner at top of bottom sheet:
```css
.alert-banner {
  background: rgba(230, 57, 70, 0.1);
  border: 1px solid rgba(230, 57, 70, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  color: #E63946;
  font-size: 13px;
  font-weight: 600;
}
```
Text: "⚠️ Alerte active — votre cercle a été prévenu"

Route info card:
- "En route vers [safe space name]" (not "Option 1")
- ETA in large text
- Progress bar in `--danger` red

Action buttons row:
```
[Partager]  [Lieu sûr]  [✓ Je suis en sécurité]
```
- "Partager" & "Lieu sûr": outline style, same as cancel above
- "Je suis en sécurité": solid sage green (#6BA68E), white text, full CTA style

When user taps "Je suis en sécurité":
- Show confirmation: "Merci ! Votre cercle a été informé que vous êtes en sécurité. 💛"
- Animate back to normal map state
- Brief subtle confetti or check animation (optional but nice)

---

## Screen 3: SOS FAB on map

Already covered in Brief 06 (56px red circle with breathe animation). Make sure the tap target:
1. First tap → opens SOS confirmation ("Maintenez pour activer le SOS")
2. Hold 3 seconds → starts countdown
3. This prevents accidental triggers

---

## Verification checklist
- [ ] SOS countdown has dark + red gradient background
- [ ] Countdown number is large (120px+) Cormorant Garamond
- [ ] Emergency numbers are tappable circles (not beige cards)
- [ ] Cancel button is full-width, clear
- [ ] SOS activated banner says "Alerte active" in French
- [ ] Route destination shows actual safe space name
- [ ] "Je suis en sécurité" is green, prominent
- [ ] Safe confirmation shows warm message
- [ ] SOS FAB requires hold (not single tap) to prevent accidents
