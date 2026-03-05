'use client';

import { Check } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    textSecondary: '#94A3B8',
    textPrimary: '#FFFFFF',
    gradientStart: '#3BB4C1',
  } : {
    textSecondary: '#475569',
    textPrimary: '#0F172A',
    gradientStart: '#3BB4C1',
  };
}

interface ChipProps {
  label: string;
  emoji?: string;
  color?: {
    text: string;
    bg: string;
  };
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function Chip({
  label,
  emoji,
  color,
  selected = false,
  onClick,
  size = 'md',
}: ChipProps) {
  const isDark = useTheme(s => s.theme) === 'dark';
  const c = getColors(isDark);

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const defaultBg = 'rgba(255,255,255,0.06)';
  const selectedBg = 'rgba(59,180,193,0.25)';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center
        rounded-full font-medium
        border transition-all duration-150
        ${sizes[size]}
      `.replace(/\s+/g, ' ').trim()}
      style={{
        background: selected ? selectedBg : (color?.bg || defaultBg),
        borderColor: selected ? c.gradientStart : 'transparent',
        borderWidth: '1.5px',
        color: selected ? c.textPrimary : (color?.text || c.textSecondary),
      }}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      {label}
      {selected && <Check size={14} style={{ color: c.gradientStart }} />}
    </button>
  );
}
