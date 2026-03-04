# Phase 1: Brand System Integration

> Copie ce prompt ENTIER dans Claude Code

---

## Context

Je travaille sur Breveil, une app de safety communautaire. J'ai un nouveau brand system à intégrer. Le stack est Next.js 15, React 19, Tailwind v4, Supabase.

## Task

Intègre le nouveau Breveil Brand System dans le projet.

---

## 1. Remplace `src/app/globals.css`

Remplace le contenu actuel avec ce nouveau système de design :

```css
@import 'tailwindcss';

/* ══════════════════════════════════════════════════════════════════
   BREVEIL DESIGN SYSTEM v1.0
   Brand: Community safety app for women
   Theme: Calm, warm, reassuring
   ══════════════════════════════════════════════════════════════════ */

:root {
  /* ─────────────────────────────────────────────────────────────────
     PRIMARY GRADIENT — BREVEIL WARM
     Teal → Deep blue → Purple-rose → Warm violet
     ───────────────────────────────────────────────────────────────── */
  --gradient-start: #3BB4C1;
  --gradient-mid: #1E3A5F;
  --gradient-transition: #4A2C5A;
  --gradient-end: #5C3D5E;
  
  --gradient-primary: linear-gradient(
    180deg, 
    #3BB4C1 0%,
    #1E3A5F 45%,
    #4A2C5A 75%,
    #5C3D5E 100%
  );

  /* ─────────────────────────────────────────────────────────────────
     SURFACE COLORS
     ───────────────────────────────────────────────────────────────── */
  --surface-base: #0F172A;
  --surface-card: #1E293B;
  --surface-elevated: #334155;
  --surface-glass: rgba(30, 41, 59, 0.8);

  /* ─────────────────────────────────────────────────────────────────
     TEXT COLORS
     ───────────────────────────────────────────────────────────────── */
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  --text-tertiary: #64748B;
  --text-inverse: #0F172A;

  /* ─────────────────────────────────────────────────────────────────
     SEMANTIC COLORS
     ───────────────────────────────────────────────────────────────── */
  --semantic-success: #34D399;
  --semantic-success-soft: rgba(52, 211, 153, 0.15);
  --semantic-warning: #FBBF24;
  --semantic-warning-soft: rgba(251, 191, 36, 0.15);
  --semantic-danger: #EF4444;
  --semantic-danger-soft: rgba(239, 68, 68, 0.15);
  --semantic-info: #60A5FA;
  --semantic-info-soft: rgba(96, 165, 250, 0.15);

  /* ─────────────────────────────────────────────────────────────────
     ACCENT COLORS
     ───────────────────────────────────────────────────────────────── */
  --accent-gold: #F5C341;
  --accent-coral: #F87171;
  --accent-cyan: #22D3EE;
  --accent-teal: #3BB4C1;

  /* ─────────────────────────────────────────────────────────────────
     INTERACTIVE STATES
     ───────────────────────────────────────────────────────────────── */
  --interactive-hover: rgba(255, 255, 255, 0.05);
  --interactive-active: rgba(255, 255, 255, 0.10);
  --interactive-focus: rgba(59, 180, 193, 0.5);

  /* ─────────────────────────────────────────────────────────────────
     BORDERS
     ───────────────────────────────────────────────────────────────── */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.20);
  --border-focus: var(--gradient-start);

  /* ─────────────────────────────────────────────────────────────────
     SPACING (8px grid)
     ───────────────────────────────────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ─────────────────────────────────────────────────────────────────
     BORDER RADIUS
     ───────────────────────────────────────────────────────────────── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;

  /* ─────────────────────────────────────────────────────────────────
     SHADOWS
     ───────────────────────────────────────────────────────────────── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px rgba(59, 180, 193, 0.3);
  --shadow-glow-gold: 0 0 20px rgba(245, 195, 65, 0.3);

  /* ─────────────────────────────────────────────────────────────────
     MOTION
     ───────────────────────────────────────────────────────────────── */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ─────────────────────────────────────────────────────────────────
     CATEGORY COLORS (Incident system)
     ───────────────────────────────────────────────────────────────── */
  --category-urgent: #EF4444;
  --category-urgent-bg: rgba(239, 68, 68, 0.12);
  --category-warning: #F59E0B;
  --category-warning-bg: rgba(245, 158, 11, 0.12);
  --category-infra: #64748B;
  --category-infra-bg: rgba(148, 163, 184, 0.12);
  --category-positive: #34D399;
  --category-positive-bg: rgba(52, 211, 153, 0.12);

  /* ─────────────────────────────────────────────────────────────────
     LEGACY COMPATIBILITY (migrate away from these)
     ───────────────────────────────────────────────────────────────── */
  --bg-primary: var(--surface-base);
  --bg-secondary: var(--surface-card);
  --bg-card: var(--surface-card);
  --accent: var(--accent-gold);
  --safe: var(--semantic-success);
  --warn: var(--semantic-warning);
  --blue: #8B7EC8;
  --text-muted: var(--text-secondary);
  --border: var(--border-default);
}

/* ══════════════════════════════════════════════════════════════════
   LIGHT MODE
   ══════════════════════════════════════════════════════════════════ */
[data-theme="light"] {
  --surface-base: #F8FAFC;
  --surface-card: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-glass: rgba(255, 255, 255, 0.9);
  
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-tertiary: #94A3B8;
  --text-inverse: #FFFFFF;
  
  --border-subtle: rgba(15, 23, 42, 0.06);
  --border-default: rgba(15, 23, 42, 0.10);
  --border-strong: rgba(15, 23, 42, 0.20);
  
  --interactive-hover: rgba(0, 0, 0, 0.03);
  --interactive-active: rgba(0, 0, 0, 0.06);

  /* Light gradient (warmer) */
  --gradient-primary: linear-gradient(
    180deg,
    #67E8F9 0%,
    #3B82F6 50%,
    #6366F1 100%
  );

  /* Legacy */
  --bg-primary: var(--surface-base);
  --bg-secondary: var(--surface-card);
}

/* ══════════════════════════════════════════════════════════════════
   ANIMATIONS
   ══════════════════════════════════════════════════════════════════ */

/* Pin ripple (transport incidents) */
@keyframes pin-ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(3); opacity: 0; }
}

.pin-ripple {
  position: absolute;
  border-radius: 50%;
  border: 2px solid currentColor;
  animation: pin-ripple 2s ease-out infinite;
}
.pin-ripple-1 { animation-delay: 0s; }
.pin-ripple-2 { animation-delay: 0.5s; }
.pin-ripple-3 { animation-delay: 1s; }

/* Pin drop */
@keyframes pin-drop {
  0% { transform: translateY(-20px) scale(0.8); opacity: 0; }
  60% { transform: translateY(5px) scale(1.1); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.pin-drop {
  animation: pin-drop 700ms var(--ease-spring) forwards;
}

/* Breathe (logo, loading) */
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

.breathe {
  animation: breathe 3.5s ease-in-out infinite;
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Sheet motion optimization */
.sheet-motion {
  will-change: transform, opacity;
}

/* ══════════════════════════════════════════════════════════════════
   UTILITY CLASSES
   ══════════════════════════════════════════════════════════════════ */

/* Glass effect */
.glass {
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Gradient background */
.bg-gradient {
  background: var(--gradient-primary);
}

/* Glow effects */
.glow-teal {
  box-shadow: var(--shadow-glow);
}

.glow-gold {
  box-shadow: var(--shadow-glow-gold);
}

/* Hide scrollbar */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Safe area padding */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ══════════════════════════════════════════════════════════════════
   TYPOGRAPHY
   ══════════════════════════════════════════════════════════════════ */

.text-hero {
  font-size: 40px;
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-h1 {
  font-size: 32px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.text-h1-functional {
  font-size: 32px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.text-h2 {
  font-size: 24px;
  font-weight: 400;
  line-height: 1.3;
}

.text-h3 {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
}

.text-body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.text-body-sm {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

.text-caption {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

.text-overline {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ══════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ══════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ══════════════════════════════════════════════════════════════════
   BASE STYLES
   ══════════════════════════════════════════════════════════════════ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--surface-base);
  color: var(--text-primary);
  min-height: 100vh;
  min-height: 100dvh;
}

/* Focus visible */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Selection */
::selection {
  background-color: rgba(59, 180, 193, 0.3);
}
```

---

## 2. Crée `src/lib/tokens.ts`

```typescript
/**
 * Breveil Design Tokens
 * TypeScript constants for motion, typography, and colors
 */

// ════════════════════════════════════════════════════════════════════
// MOTION
// ════════════════════════════════════════════════════════════════════

export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const gentleSpring = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
};

export const snappySpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
};

export const sheetTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
};

// ════════════════════════════════════════════════════════════════════
// COLORS
// ════════════════════════════════════════════════════════════════════

export const colors = {
  gradient: {
    start: '#3BB4C1',
    mid: '#1E3A5F',
    transition: '#4A2C5A',
    end: '#5C3D5E',
  },
  surface: {
    base: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    tertiary: '#64748B',
  },
  semantic: {
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    info: '#60A5FA',
  },
  accent: {
    gold: '#F5C341',
    cyan: '#22D3EE',
    coral: '#F87171',
    teal: '#3BB4C1',
  },
  category: {
    urgent: { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
    warning: { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
    infra: { text: '#64748B', bg: 'rgba(148, 163, 184, 0.12)' },
    positive: { text: '#34D399', bg: 'rgba(52, 211, 153, 0.12)' },
  },
};

// ════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ════════════════════════════════════════════════════════════════════

export const typography = {
  hero: {
    fontSize: 40,
    fontWeight: 300,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  h1: {
    fontSize: 32,
    fontWeight: 300,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  h1Functional: {
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  h2: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
};

// ════════════════════════════════════════════════════════════════════
// SPACING
// ════════════════════════════════════════════════════════════════════

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

// ════════════════════════════════════════════════════════════════════
// RADIUS
// ════════════════════════════════════════════════════════════════════

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

// ════════════════════════════════════════════════════════════════════
// Z-INDEX
// ════════════════════════════════════════════════════════════════════

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 150,
  sheet: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
};
```

---

## 3. Migration des anciennes références

Cherche et remplace dans tout le projet :

| Ancien | Nouveau |
|--------|---------|
| `--bg-primary` | `var(--surface-base)` |
| `--bg-secondary` | `var(--surface-card)` |
| `#1A1A2E` | `var(--surface-base)` |
| `#1B2541` | `var(--surface-base)` |
| `#0F1729` | `var(--surface-card)` |
| `#2A3A5C` | `var(--surface-card)` |
| `#D4A853` | `var(--accent-gold)` |
| `#E8A838` | `var(--accent-gold)` |
| `#F5F2EE` | `var(--text-primary)` |

Note: Garde les anciennes variables dans la section "LEGACY COMPATIBILITY" pour ne rien casser.

---

## Vérification

Après exécution :
1. `npm run dev` — l'app démarre sans erreur
2. Les couleurs sont cohérentes (dark mode)
3. Pas de warning CSS dans la console
4. Les animations fonctionnent (pulse, breathe)

---

*Fin Phase 1*
