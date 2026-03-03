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
