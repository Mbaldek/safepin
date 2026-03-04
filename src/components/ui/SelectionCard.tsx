'use client';

import { Check } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    textPrimary: '#FFFFFF',
    textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.05)',
    active: 'rgba(255,255,255,0.10)',
  } : {
    textPrimary: '#0F172A',
    textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)',
    hover: 'rgba(15,23,42,0.03)',
    active: 'rgba(15,23,42,0.06)',
  };
}

const FIXED = {
  accentCyan: '#3BB4C1',
  accentCyanSoft: 'rgba(59,180,193,0.12)',
};

interface SelectionCardProps {
  icon?: React.ReactNode;
  label: string;
  selected?: boolean;
  onChange?: (selected: boolean) => void;
  className?: string;
}

export function SelectionCard({
  icon,
  label,
  selected = false,
  onChange,
  className = '',
}: SelectionCardProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  return (
    <div
      onClick={() => onChange?.(!selected)}
      className={className}
      style={{
        padding: 16,
        borderRadius: 16,
        transition: 'all 150ms',
        cursor: 'pointer',
        background: selected ? C.active : 'transparent',
        border: `1px solid ${selected ? FIXED.accentCyan : C.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selected ? FIXED.accentCyanSoft : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'),
              color: selected ? FIXED.accentCyan : C.textTertiary,
            }}
          >
            {icon}
          </div>
        )}
        <p style={{ flex: 1, color: C.textPrimary, fontSize: 16, fontWeight: 500, margin: 0 }}>{label}</p>
        {selected && (
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: FIXED.accentCyan,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Check size={14} color="white" strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}
