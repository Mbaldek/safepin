'use client';

import type { NotifChannel } from '@/types';

interface SegmentedControlProps {
  value: NotifChannel;
  onChange: (v: NotifChannel) => void;
  isDark: boolean;
}

const OPTIONS: { id: NotifChannel; label: string }[] = [
  { id: 'push', label: 'Push' },
  { id: 'in_app', label: 'In-app' },
  { id: 'both', label: 'Les deux' },
];

export default function SegmentedControl({ value, onChange, isDark }: SegmentedControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        borderRadius: 10,
        background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: active ? '#3BB4C1' : 'transparent',
              color: active ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
