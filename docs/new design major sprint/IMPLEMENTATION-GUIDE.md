# Breveil Design System — Implementation Guide

## Files Overview

| File | Purpose | Location in project |
|------|---------|---------------------|
| `globals.css` | CSS custom properties + base styles | `app/globals.css` or `styles/globals.css` |
| `tokens.ts` | TypeScript constants for JS/React | `lib/tokens.ts` or `constants/tokens.ts` |
| `tailwind-theme.css` | Tailwind v4 theme extensions | Import after `@import "tailwindcss"` |
| `breveil-logo.svg` | Logo SVG file | `public/logo.svg` |
| `breveil-logo-component.jsx` | Logo React component | `components/ui/BreveilLogo.jsx` |

---

## Step 1: Update globals.css

Replace your existing `globals.css` with the new one, or merge the CSS custom properties.

```css
/* app/globals.css */
@import "tailwindcss";
@import "./tailwind-theme.css"; /* Add Breveil theme */

/* ... rest of globals.css content ... */
```

---

## Step 2: Import tokens.ts

```typescript
// In any component
import { colors, motion, typography } from '@/lib/tokens';

// Use in styled-components, inline styles, or Framer Motion
const style = {
  color: colors.text.primary,
  fontSize: typography.fontSize.h1,
};

// Framer Motion
<motion.div
  initial="hidden"
  animate="visible"
  variants={motion.variants.fadeInUp}
  transition={motion.spring.default}
/>
```

---

## Step 3: Use the Logo Component

```jsx
import { BreveilLogo, BreveilLogoLarge } from '@/components/ui/BreveilLogo';

// Default (40px, currentColor)
<BreveilLogo />

// Custom size and color
<BreveilLogo size={80} color="#FFFFFF" />

// Preset sizes
<BreveilLogoSmall />   // 24px
<BreveilLogoMedium />  // 40px
<BreveilLogoLarge />   // 64px
<BreveilLogoXL />      // 80px

// With Tailwind
<BreveilLogo className="text-white" />
```

---

## Step 4: Tailwind Usage

With the theme extension loaded, use these utilities:

```html
<!-- Background gradient -->
<div class="bg-gradient-breveil">...</div>

<!-- Glass effect -->
<div class="glass rounded-2xl">...</div>

<!-- Safe area (mobile) -->
<nav class="safe-area-bottom">...</nav>

<!-- Custom colors -->
<p class="text-text-primary bg-surface-card">...</p>
<button class="bg-accent-cyan">...</button>
```

---

## Step 5: Typography Classes

Use these CSS classes for consistent typography:

```html
<!-- Emotional headlines (300 weight) -->
<h1 class="text-hero">Welcome</h1>
<h1 class="text-h1">Marche avec nous</h1>

<!-- Functional headlines (400 weight) -->
<h1 class="text-h1-functional">Settings</h1>

<!-- Body text -->
<p class="text-body">Regular content</p>
<p class="text-body-sm">Secondary text</p>

<!-- Labels -->
<span class="text-caption">Label</span>
<span class="text-overline">SECTION</span>
```

---

## Step 6: Animation Classes

```html
<!-- Fade animations -->
<div class="animate-fade-in">...</div>
<div class="animate-fade-in-up">...</div>
<div class="animate-slide-in-up">...</div>
```

Or use Framer Motion with the token configs:

```jsx
import { motion as motionConfig } from '@/lib/tokens';

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={motionConfig.spring.default}
>
  Content
</motion.div>
```

---

## Color Reference

### Surfaces
- `--surface-base`: #0F172A (deepest background)
- `--surface-card`: #1E293B (cards, elevated surfaces)
- `--surface-elevated`: #334155 (modals, sheets)

### Text
- `--text-primary`: #FFFFFF
- `--text-secondary`: #94A3B8
- `--text-tertiary`: #64748B

### Accents
- `--accent-cyan`: #22D3EE (primary accent, progress)
- `--accent-gold`: #F5C341 (highlights, premium)
- `--accent-coral`: #F87171 (warm accent)

### Semantic
- `--semantic-success`: #34D399 (safe, arrived)
- `--semantic-warning`: #FBBF24 (attention)
- `--semantic-danger`: #EF4444 (emergency, SOS)

---

## Gradient Reference

```css
/* Primary gradient (vertical) */
background: var(--gradient-primary);

/* Or use Tailwind */
class="bg-gradient-breveil"

/* Horizontal variant */
background: var(--gradient-horizontal);
class="bg-gradient-breveil-horizontal"
```

---

## Migration from Old Tokens

| Old Variable | New Variable |
|--------------|--------------|
| `--bg-secondary` | `--surface-card` |
| `--accent` | `--accent-cyan` or `--gradient-start` |
| `#1A1A2E` | `--surface-base` (#0F172A) |
| `#D4A853` | `--accent-gold` (#F5C341) |
| `#F5F0EB` | Light mode: `--surface-base` |

---

## Theme Switching

```jsx
// Toggle dark/light mode
document.documentElement.setAttribute('data-theme', 'light');
document.documentElement.setAttribute('data-theme', 'dark');

// Or use a class
document.documentElement.classList.add('light');
document.documentElement.classList.remove('light');
```

---

## Questions?

These tokens are designed to be the single source of truth for Breveil's visual identity. Update `tokens.ts` and `globals.css` when making design changes — they propagate everywhere.
