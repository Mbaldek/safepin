// src/components/FilterBar.tsx

'use client';

import { useStore } from '@/stores/useStore';

const filters = [
  { key: 'all', label: 'All', color: '#6b7490' },
  { key: 'high', label: 'Danger', color: '#f43f5e' },
  { key: 'med', label: 'Caution', color: '#f59e0b' },
  { key: 'low', label: 'Mild', color: '#10b981' },
];

export default function FilterBar() {
  const { activeFilter, setActiveFilter } = useStore();

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex gap-1 backdrop-blur-xl rounded-full px-1.5 py-1"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => setActiveFilter(f.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
          style={{
            backgroundColor: activeFilter === f.key ? 'var(--bg-card)' : 'transparent',
            color: activeFilter === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: f.color }}
          />
          {f.label}
        </button>
      ))}
    </div>
  );
}