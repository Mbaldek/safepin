'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';

export interface SettingsToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function SettingsToggle({ value, onChange }: SettingsToggleProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';

  return (
    <div
      role="switch"
      aria-checked={value}
      onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? '#22D3EE' : isDark ? '#334155' : '#CBD5E1',
        position: 'relative',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'background 200ms ease',
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ left: value ? 21 : 3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{
          position: 'absolute',
          top: 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
        }}
      />
    </div>
  );
}
