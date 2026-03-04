'use client';

import { forwardRef } from 'react';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    card: '#1E293B',
    elevated: '#334155',
    border: 'rgba(255,255,255,0.08)',
    borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)',
    active: 'rgba(255,255,255,0.10)',
  } : {
    card: '#FFFFFF',
    elevated: '#F1F5F9',
    border: 'rgba(15,23,42,0.06)',
    borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)',
    active: 'rgba(15,23,42,0.06)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
};

type CardVariant = 'default' | 'elevated' | 'glass' | 'selection';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  selected?: boolean;
  children: React.ReactNode;
}

function getVariantStyle(variant: CardVariant, selected: boolean, C: ReturnType<typeof getColors>, isDark: boolean): React.CSSProperties {
  switch (variant) {
    case 'default':
      return {
        background: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)',
      };
    case 'elevated':
      return {
        background: C.elevated,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)',
      };
    case 'glass':
      return {
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${C.border}`,
      };
    case 'selection':
      return selected
        ? { background: C.active, border: `1px solid ${FIXED.accentCyan}` }
        : { background: 'transparent', border: `1px solid ${C.border}` };
  }
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', selected = false, children, className = '', onClick, style: styleProp, ...props }, ref) => {
    const isDark = useTheme((s) => s.theme) === 'dark';
    const C = getColors(isDark);

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={className}
        style={{
          borderRadius: 16,
          padding: 20,
          transition: 'all 150ms',
          cursor: onClick ? 'pointer' : undefined,
          ...getVariantStyle(variant, selected, C, isDark),
          ...styleProp,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
