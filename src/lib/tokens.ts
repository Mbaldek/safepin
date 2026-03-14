// ============================================
// BREVEIL DESIGN TOKENS — TypeScript
// Version: 1.0 | March 2026
// ============================================

// ============================================
// COLORS
// ============================================

export const colors = {
  // Primary gradient
  gradient: {
    start: '#3BB4C1',
    mid: '#1E3A5F',
    transition: '#4A2C5A',
    end: '#5C3D5E',
  },

  // Surfaces
  surface: {
    base: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
    glass: 'rgba(30, 41, 59, 0.8)',
    overlay: 'rgba(15, 23, 42, 0.8)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    inverse: '#0F172A',
    muted: '#475569',
  },

  // Semantic
  semantic: {
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.15)',
    danger: '#EF4444',
    dangerSoft: 'rgba(239, 68, 68, 0.15)',
    info: '#60A5FA',
    infoSoft: 'rgba(96, 165, 250, 0.15)',
  },

  // Accents
  accent: {
    gold: '#F5C341',
    goldSoft: 'rgba(245, 195, 65, 0.15)',
    coral: '#F87171',
    coralSoft: 'rgba(248, 113, 113, 0.15)',
    cyan: '#22D3EE',
    cyanSoft: 'rgba(34, 211, 238, 0.15)',
    purple: '#A78BFA',
    purpleSoft: 'rgba(167, 139, 250, 0.15)',
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },
} as const;

// Light theme overrides
export const colorsLight = {
  surface: {
    base: '#F8FAFC',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.9)',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    subtle: 'rgba(15, 23, 42, 0.06)',
    default: 'rgba(15, 23, 42, 0.10)',
    strong: 'rgba(15, 23, 42, 0.20)',
  },
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  primary: `linear-gradient(180deg, ${colors.gradient.start} 0%, ${colors.gradient.mid} 45%, ${colors.gradient.transition} 75%, ${colors.gradient.end} 100%)`,
  horizontal: `linear-gradient(90deg, ${colors.gradient.start} 0%, ${colors.gradient.mid} 50%, ${colors.gradient.end} 100%)`,
  radial: `radial-gradient(circle at 50% 0%, ${colors.gradient.start} 0%, ${colors.gradient.mid} 50%, ${colors.gradient.end} 100%)`,
  
  // For specific uses
  success: `linear-gradient(135deg, ${colors.semantic.success} 0%, #10B981 100%)`,
  danger: `linear-gradient(135deg, ${colors.semantic.danger} 0%, #DC2626 100%)`,
  gold: `linear-gradient(135deg, ${colors.accent.gold} 0%, #F59E0B 100%)`,
  cyan: `linear-gradient(135deg, ${colors.accent.cyan} 0%, #06B6D4 100%)`,
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },

  fontSize: {
    hero: '40px',
    h1: '32px',
    h2: '24px',
    h3: '20px',
    body: '16px',
    bodySm: '14px',
    caption: '12px',
    overline: '11px',
  },

  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.1,
    snug: 1.2,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },

  letterSpacing: {
    tight: '-0.02em',
    snug: '-0.01em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
    widest: '0.08em',
  },
} as const;

// Typography presets for common use cases
export const textStyles = {
  hero: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.light,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h1: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.light, // Emotional
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.snug,
  },
  h1Functional: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.regular, // Functional
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.snug,
  },
  h2: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  h3: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  body: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },
  bodySm: {
    fontSize: typography.fontSize.bodySm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },
  caption: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wide,
  },
  overline: {
    fontSize: typography.fontSize.overline,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
} as const;

// ============================================
// SPACING (8px base grid)
// ============================================

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
  20: 80,
  24: 96,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 4px 12px rgba(0, 0, 0, 0.25)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.3)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.4)',
  glow: '0 0 20px rgba(59, 180, 193, 0.3)',
  glowStrong: '0 0 30px rgba(59, 180, 193, 0.5)',
} as const;

// ============================================
// MOTION — Framer Motion configs
// ============================================

export const motion = {
  // Spring transitions
  spring: {
    default: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
    gentle: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 25,
    },
    snappy: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 35,
    },
    bouncy: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 20,
    },
  },

  // Duration-based transitions
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
    slower: 0.6,
  },

  // Easing curves
  ease: {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.65, 0, 0.35, 1],
    spring: [0.34, 1.56, 0.64, 1],
  },

  // Common animation variants
  variants: {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    fadeInUp: {
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0 },
    },
    fadeInDown: {
      hidden: { opacity: 0, y: -16 },
      visible: { opacity: 1, y: 0 },
    },
    slideInUp: {
      hidden: { y: '100%' },
      visible: { y: 0 },
    },
    slideInRight: {
      hidden: { x: '100%' },
      visible: { x: 0 },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
  },

  // Stagger children config
  stagger: {
    fast: 0.03,
    normal: 0.05,
    slow: 0.1,
  },
} as const;

// Alias for backward compatibility (used by UI components)
export const springTransition = motion.spring.default;

// Convenience function for Framer Motion
export const getTransition = (type: 'spring' | 'duration' = 'spring', variant: string = 'default') => {
  if (type === 'spring') {
    return motion.spring[variant as keyof typeof motion.spring] || motion.spring.default;
  }
  return {
    duration: motion.duration[variant as keyof typeof motion.duration] || motion.duration.normal,
    ease: motion.ease.out,
  };
};

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Media query helpers
export const media = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
} as const;

// ============================================
// LOGO SVG PATH
// ============================================

export const logo = {
  // G1 Together Mark paths
  paths: {
    outer: 'M20 60 Q20 30, 40 20 Q60 30, 60 60',
    inner: 'M28 55 Q28 35, 40 28 Q52 35, 52 55',
    dot: { cx: 40, cy: 22, r: 4 },
  },
  viewBox: '0 0 80 80',
  strokeWidth: 4,
  innerOpacity: 0.6,
} as const;

// ============================================
// ONBOARDING GOALS
// ============================================

export const onboardingGoals = [
  { id: 'walk', labelFr: 'Rentrer chez moi en sécurité', labelEn: 'Walking home safely', icon: 'Moon' },
  { id: 'area', labelFr: 'Connaître mon quartier', labelEn: 'Knowing my area', icon: 'MapPin' },
  { id: 'connect', labelFr: 'Me connecter avec d\'autres', labelEn: 'Connecting with others', icon: 'Users' },
  { id: 'peace', labelFr: 'Rassurer mes proches', labelEn: 'Peace of mind for loved ones', icon: 'Heart' },
  { id: 'watch', labelFr: 'Veiller sur mes proches', labelEn: 'Watch over my loved ones', icon: 'Eye' },
  { id: 'report', labelFr: 'Signaler des incidents', labelEn: 'Reporting incidents', icon: 'AlertTriangle' },
  { id: 'safe', labelFr: 'Trouver des lieux sûrs', labelEn: 'Finding safe spaces', icon: 'Shield' },
] as const;

// ============================================
// EXPORT ALL
// ============================================

const tokens = {
  colors,
  colorsLight,
  gradients,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  motion,
  zIndex,
  breakpoints,
  media,
  logo,
  onboardingGoals,
};

export default tokens;

// ============================================
// FLAT TOKEN OBJECT — used by inline-style components
// ============================================

export const T = {
  // Surfaces
  surfaceBase:      '#0F172A',  surfaceBaseL:      '#F8FAFC',
  surfaceCard:      '#1E293B',  surfaceCardL:      '#FFFFFF',
  surfaceElevated:  '#334155',  surfaceElevatedL:  '#FFFFFF',
  surfaceGlass:     'rgba(30,41,59,0.88)',
  surfaceGlassL:    'rgba(255,255,255,0.92)',

  // Text
  textPrimary:    '#FFFFFF',  textPrimaryL:    '#0F172A',
  textSecondary:  '#94A3B8',  textSecondaryL:  '#475569',
  textTertiary:   '#64748B',  textTertiaryL:   '#94A3B8',
  textInverse:    '#0F172A',  textInverseL:    '#FFFFFF',

  // Brand
  gradientStart:  '#3BB4C1',
  accentGold:     '#F5C341',
  accentCyan:     '#22D3EE',
  accentPurple:   '#A78BFA',

  // Semantic
  semanticSuccess:      '#34D399',
  semanticSuccessSoft:  'rgba(52,211,153,0.12)',
  semanticWarning:      '#FBBF24',
  semanticWarningSoft:  'rgba(251,191,36,0.10)',
  semanticDanger:       '#EF4444',
  semanticDangerSoft:   'rgba(239,68,68,0.10)',
  semanticInfo:         '#60A5FA',
  semanticInfoSoft:     'rgba(96,165,250,0.10)',

  // Borders
  borderSubtle:   'rgba(255,255,255,0.08)',  borderSubtleL:   'rgba(15,23,42,0.06)',
  borderDefault:  'rgba(255,255,255,0.12)',  borderDefaultL:  'rgba(15,23,42,0.10)',
  borderStrong:   'rgba(255,255,255,0.20)',  borderStrongL:   'rgba(15,23,42,0.20)',

  // Interactive
  interactiveHover:   'rgba(255,255,255,0.05)',  interactiveHoverL:   'rgba(15,23,42,0.04)',
  interactiveActive:  'rgba(255,255,255,0.10)',  interactiveActiveL:  'rgba(15,23,42,0.07)',

  // Radii
  radiusMd: '12px',  radiusLg: '16px',  radiusXl: '24px',
  radius2xl: '32px', radiusFull: '9999px',

  // Shadows
  shadowMd: '0 4px 12px rgba(0,0,0,0.25)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.40)',
  shadowGlow: '0 0 20px rgba(59,180,193,0.3)',

  // Focus
  borderFocus: '#3BB4C1',

  // Motion
  easeOut:    'cubic-bezier(0.16,1,0.3,1)',
  easeSpring: 'cubic-bezier(0.34,1.56,0.64,1)',
} as const;

export const springConfig = { type: 'spring' as const, stiffness: 300, damping: 36 };
export const gentleSpring = { type: 'spring' as const, stiffness: 200, damping: 25 };

// Helper: returns resolved tokens for current theme
export const tok = (isDark: boolean) => ({
  surface:    isDark ? T.surfaceElevated   : '#FFFFFF',
  card:       isDark ? T.surfaceCard       : T.surfaceCardL,
  tp:         isDark ? T.textPrimary       : T.textPrimaryL,
  ts:         isDark ? T.textSecondary     : T.textSecondaryL,
  tt:         isDark ? T.textTertiary      : T.textTertiaryL,
  bd:         isDark ? T.borderSubtle      : T.borderSubtleL,
  bdd:        isDark ? T.borderDefault     : T.borderDefaultL,
  ih:         isDark ? T.interactiveHover  : T.interactiveHoverL,
  ia:         isDark ? T.interactiveActive : T.interactiveActiveL,
  glass:      isDark ? T.surfaceGlass      : T.surfaceGlassL,
});
