'use client';

import { Check } from 'lucide-react';

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
  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const defaultBg = 'rgba(255,255,255,0.06)';
  const selectedBg = 'rgba(59,180,193,0.25)';
  const defaultColor = 'var(--text-secondary)';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center
        rounded-full font-medium
        border transition-all duration-[var(--duration-fast)]
        ${sizes[size]}
      `.replace(/\s+/g, ' ').trim()}
      style={{
        background: selected ? selectedBg : (color?.bg || defaultBg),
        borderColor: selected ? 'var(--gradient-start)' : 'transparent',
        borderWidth: '1.5px',
        color: selected ? 'var(--text-primary)' : (color?.text || defaultColor),
      }}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      {label}
      {selected && <Check size={14} className="text-[var(--gradient-start)]" />}
    </button>
  );
}
