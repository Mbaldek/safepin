'use client';

import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    elevated: '#334155',
    textSecondary: '#94A3B8',
    border: 'rgba(255,255,255,0.08)',
  } : {
    elevated: '#F1F5F9',
    textSecondary: '#475569',
    border: 'rgba(15,23,42,0.06)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
  accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341',
  semanticSuccess: '#34D399',
  semanticSuccessSoft: 'rgba(52,211,153,0.12)',
  semanticDanger: '#EF4444',
  semanticDangerSoft: 'rgba(239,68,68,0.12)',
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'cyan';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

function getVariantStyle(variant: BadgeVariant, C: ReturnType<typeof getColors>): React.CSSProperties {
  switch (variant) {
    case 'default':
      return { background: C.elevated, color: C.textSecondary, border: `1px solid ${C.border}` };
    case 'success':
      return { background: FIXED.semanticSuccessSoft, color: FIXED.semanticSuccess };
    case 'warning':
      return { background: 'rgba(245,195,65,0.15)', color: FIXED.accentGold };
    case 'danger':
      return { background: FIXED.semanticDangerSoft, color: FIXED.semanticDanger };
    case 'gold':
      return { background: 'rgba(245,195,65,0.15)', color: FIXED.accentGold };
    case 'cyan':
      return { background: FIXED.accentCyanSoft, color: FIXED.accentCyan };
  }
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        ...getVariantStyle(variant, C),
      }}
    >
      {children}
    </span>
  );
}
