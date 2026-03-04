'use client';

import { motion } from 'framer-motion';

export interface SettingsToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function SettingsToggle({ value, onChange }: SettingsToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? '#22D3EE' : '#334155',
        position: 'relative',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'background 200ms ease',
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
    </button>
  );
}
