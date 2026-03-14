// src/components/map/SafetyFilterBadge.tsx

'use client';

import { X } from 'lucide-react';

export type SafetyFilterBadgeProps = {
  filter: string | null;
  isDark: boolean;
  onClear: () => void;
};

export default function SafetyFilterBadge({ filter, isDark, onClear }: SafetyFilterBadgeProps) {
  if (!filter) return null;

  return (
    <div style={{
      position: 'absolute', top: 66, left: 12, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)',
      borderRadius: 100, padding: '6px 10px 6px 12px',
      boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{filter}</span>
      <button
        onClick={onClear}
        style={{
          width: 20, height: 20, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.25)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
      >
        <X size={12} color="#fff" />
      </button>
    </div>
  );
}
