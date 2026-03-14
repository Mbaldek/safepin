// src/components/map/CompassButton.tsx

'use client';

import { Navigation } from 'lucide-react';

export type CompassButtonProps = {
  bearing: number;
  isDark: boolean;
  onReset: () => void;
};

export default function CompassButton({ bearing, isDark, onReset }: CompassButtonProps) {
  if (Math.abs(bearing) <= 2) return null;

  return (
    <button
      onClick={onReset}
      style={{
        position: 'absolute',
        top: 112,
        right: 10,
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 10,
      }}
      aria-label="Reset north"
    >
      <Navigation size={18} style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.2s' }} color="#1E3A5F" />
    </button>
  );
}
