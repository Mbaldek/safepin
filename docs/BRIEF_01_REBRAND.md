# BRIEF 01 — Rebrand Pass (v2)
### Priority: 🔴 CRITICAL · Est: 2-3 hours
### Source: `BREVEIL_BRAND_SYSTEM.html` + `BREVEIL_APP_V2.jsx`

---

## Objective
Replace all "Brume" branding with "Breveil". Apply the official brand system — exact SVGs, exact tokens, exact usage rules. No improvising.

---

## 1. Color Constants

The app should use a `C` object matching the brand system exactly:

```ts
export const C = {
  midnight:     "#1B2541",
  midnightDeep: "#0F1729",
  midnightLight:"#2A3A5C",
  veil:         "#E8A838",
  veilLight:    "#F2D49A",
  veilDark:     "#C48A1E",
  aurora:       "#8B7EC8",
  auroraLight:  "#B5ABE0",
  auroraDark:   "#6A5FA8",
  rose:         "#D4687A",
  roseLight:    "#E8A0AE",
  roseDark:     "#B84D5E",
  sage:         "#6BA68E",
  sageLight:    "#A3D4BF",
  danger:       "#E63946",
  dangerDark:   "#C62828",
  success:      "#4CAF79",
  warning:      "#F4A940",
  n50:  "#FAFAF8",
  n100: "#F5F2EE",   // Ivoire
  n200: "#E8E4DE",
  n300: "#D1CCC4",
  n400: "#A39E96",
  n500: "#7A756D",
  n600: "#585450",
  n700: "#3A3836",
  n800: "#2C2C3A",
  n900: "#1A1A24",
  white: "#FFFFFF",
};

export const F = {
  display: "'Cormorant Garamond', serif",
  body: "'Plus Jakarta Sans', sans-serif",
};
```

Google Fonts (ensure in layout `<head>`):
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400&display=swap" rel="stylesheet">
```

---

## 2. Text Replacement

```bash
grep -rn "Brume" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.json" --include="*.html"
# Replace: "Brume" → "Breveil", "brume" → "breveil", "BRUME" → "BREVEIL"
```

Check: `<title>`, meta tags, manifest.json, package.json name, alt texts, aria-labels, OG tags.

---

## 3. SVG Components — EXACT Brand System Assets

### A. The Veil Symbol
Used for: map watermark (10-15% opacity), onboarding illustrations, community badges.
From brand system section 06, 80×80 viewBox:

```tsx
export const VeilSymbol = ({ size = 40, variant = "dark" }: { size?: number; variant?: "dark" | "light" }) => {
  const isDark = variant === "dark";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Outer arcs — community awareness */}
      <path d="M40 12 C18 12, 8 35, 8 50 C8 56, 11 61, 15 64" stroke={isDark ? "rgba(232,168,56,0.25)" : "rgba(27,37,65,0.12)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M40 12 C62 12, 72 35, 72 50 C72 56, 69 61, 65 64" stroke={isDark ? "rgba(232,168,56,0.25)" : "rgba(27,37,65,0.12)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Middle arcs — trusted circle */}
      <path d="M40 22 C24 22, 18 40, 18 52 C18 57, 21 62, 26 64" stroke={isDark ? "rgba(139,126,200,0.5)" : "rgba(139,126,200,0.45)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M40 22 C56 22, 62 40, 62 52 C62 57, 59 62, 54 64" stroke={isDark ? "rgba(139,126,200,0.5)" : "rgba(139,126,200,0.45)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Inner arcs — personal protection */}
      <path d="M40 32 C30 32, 28 44, 28 54 C28 58, 31 62, 35 64" stroke={isDark ? "rgba(232,168,56,0.8)" : "rgba(27,37,65,0.6)"} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M40 32 C50 32, 52 44, 52 54 C52 58, 49 62, 45 64" stroke={isDark ? "rgba(232,168,56,0.8)" : "rgba(27,37,65,0.6)"} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Central point of light */}
      <circle cx="40" cy="38" r="3" fill={isDark ? "rgba(232,168,56,0.9)" : "rgba(27,37,65,0.7)"}/>
      <circle cx="40" cy="38" r="6" fill="none" stroke={isDark ? "rgba(232,168,56,0.25)" : "rgba(27,37,65,0.15)"} strokeWidth="0.8"/>
      {/* Base dot — the individual, grounded */}
      <circle cx="40" cy="68" r="1.5" fill={isDark ? "rgba(255,255,255,0.25)" : "rgba(27,37,65,0.2)"}/>
    </svg>
  );
};
```

### B. The Monogram (app icon, favicon, badges, contexts < 48px)
From brand system section 05 — "B" with veil arcs extending from bowls:

```tsx
export const BreveilMonogram = ({ size = 40, variant = "dark" }: { size?: number; variant?: "dark" | "light" }) => {
  const isDark = variant === "dark";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <text x="40" y="56" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontWeight="400" fontSize="48" fill={isDark ? "white" : "#1B2541"}>B</text>
      <path d="M52 24 C62 28, 68 36, 62 42" stroke={isDark ? "rgba(232,168,56,0.6)" : "rgba(232,168,56,0.7)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M52 42 C65 46, 70 56, 60 62" stroke={isDark ? "rgba(232,168,56,0.6)" : "rgba(232,168,56,0.7)"} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M55 20 C70 26, 76 38, 66 46" stroke={isDark ? "rgba(139,126,200,0.35)" : "rgba(139,126,200,0.4)"} strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M55 44 C73 50, 78 60, 64 68" stroke={isDark ? "rgba(139,126,200,0.35)" : "rgba(139,126,200,0.4)"} strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  );
};
```

### C. The Wordmark (headers, landing pages — NOT for small sizes)

```tsx
export const BreveilWordmark = ({ width = 200, color = "white" }) => (
  <svg width={width} viewBox="0 0 400 60">
    <text x="200" y="48" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontWeight="300" fontSize="52" fill={color} letterSpacing="12">BREVEIL</text>
  </svg>
);
```

### D. App Icon Component (splash, store listing)

```tsx
export const BreveilAppIcon = ({ size = 60 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.22,
    background: "linear-gradient(145deg, #1B2541 0%, #0F1729 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 15px rgba(27,37,65,0.3)",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", width: "200%", height: "200%", background: "radial-gradient(ellipse at 55% 40%, rgba(232,168,56,0.15) 0%, transparent 60%)" }}/>
    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: size * 0.47, color: "white", position: "relative", zIndex: 1 }}>B</span>
  </div>
);
```

---

## 4. Usage Rules — Where Each Element Goes

| Element | Where | Rule |
|---------|-------|------|
| **Wordmark** | Header bar, landing page, press kit, legal | Always UPPERCASE. Never lowercase. Cormorant Garamond 300. |
| **Monogram** | App icon, favicon, notification badges, splash, loading | For contexts under 48px. Midnight-to-deep gradient bg. |
| **Symbol** | Map watermark, onboarding, community badges, merch | At 10-15% opacity on maps. Never in same lockup with monogram. |

---

## 5. Header Bar

Current: `[🛡️ shield] Brume    [🔍] [🔔] [🌙] [☰]`
New: `[BreveilMonogram 28px] BREVEIL    [🔔] [🌙] [☰]`

- "BREVEIL" in Cormorant Garamond 300, letter-spacing 3, uppercase
- Remove standalone search icon (move into Nearby panel)
- Keep: bell, dark/light toggle, hamburger

---

## 6. Bottom Nav

From APP_V2 pattern — already correct. Ensure:
- Active color: `C.veil`
- Inactive: `dark ? "rgba(255,255,255,0.3)" : C.n400`
- Active indicator: 4px veil dot below label
- Labels via i18n (see Brief 02)

---

## 7. Bottom Sheets

Dark: `bg: C.midnight`, cards: `rgba(255,255,255,0.04)` + `border: rgba(255,255,255,0.08)`
Light: `bg: C.n100 (Ivoire)`, cards: `rgba(27,37,65,0.03)` + `border: rgba(27,37,65,0.08)`
Primary CTA: `bg: C.veil, color: C.midnight, fontWeight: 700, borderRadius: 14`
Secondary: `transparent bg, border: dark ? rgba(255,255,255,0.1) : rgba(27,37,65,0.12)`

---

## 8. FABs (bottom-right, above tab bar)

**SOS** — 56px red circle:
`bg: #E63946, color: white, font: 800, shadow: 0 4px 20px rgba(230,57,70,0.4)`

**Report (+)** — 44px veil circle, above SOS:
`bg: #E8A838, color: #1B2541, shadow: 0 4px 12px rgba(232,168,56,0.3)`

---

## 9. Brand Rules — HARD CONSTRAINTS

✅ DO: Wordmark on Midnight/Ivoire bg · Monogram for <48px · Veil for CTAs · Danger red ONLY for SOS
❌ DON'T: Wordmark on photos · Stretch/distort · Red for non-emergency · Mix symbol+monogram · Aurora bg for text · Lowercase wordmark · Shadows on logo

---

## Verification
- [ ] Zero "Brume" in codebase
- [ ] Header: Monogram + BREVEIL in Cormorant 300
- [ ] SVGs match brand system exactly (80×80 viewBox, correct paths)
- [ ] Color constants match (25+ tokens)
- [ ] Danger red only on SOS
- [ ] Fonts loaded
- [ ] Compiles clean
