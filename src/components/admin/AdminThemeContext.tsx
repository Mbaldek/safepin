'use client';

import { useTheme } from '@/stores/useTheme';

/* ─────────────────────────────────────────────
   CSS-var backed theme — all values resolve at
   paint time via globals.css :root / [data-theme]
   ───────────────────────────────────────────── */

const vars = {
  bg:          'var(--surface-base)',
  card:        'var(--surface-card)',
  elevated:    'var(--surface-elevated)',
  border:      'var(--border-subtle)',
  borderMd:    'var(--border-default)',
  t1:          'var(--text-primary)',
  t2:          'var(--text-secondary)',
  t3:          'var(--text-tertiary)',
  cyan:        'var(--gradient-start)',
  cyanSoft:    'rgba(59,180,193,0.10)',
  cyanBorder:  'rgba(59,180,193,0.22)',
  gold:        'var(--accent-gold)',
  goldSoft:    'var(--accent-gold-soft)',
  success:     'var(--semantic-success)',
  successSoft: 'var(--semantic-success-soft)',
  danger:      'var(--semantic-danger)',
  dangerSoft:  'var(--semantic-danger-soft)',
  warning:     'var(--semantic-warning)',
  warningSoft: 'var(--semantic-warning-soft)',
  purple:      'var(--accent-purple)',
  purpleSoft:  'var(--accent-purple-soft)',
  topbarBg:    'var(--surface-glass)',
  topbarBorder:'var(--border-default)',
  shadow:      'var(--shadow-sm)',
  panelShadow: 'var(--shadow-md)',
} as const;

export type AdminTheme = typeof vars;

/** No-op wrapper kept for back-compat — no React context needed */
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAdminTheme() {
  const { theme, toggleTheme } = useTheme();
  return {
    theme: vars,
    isDark: theme === 'dark',
    toggle: toggleTheme,
  };
}
