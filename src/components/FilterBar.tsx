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
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[rgba(10,12,16,0.85)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-full px-1.5 py-1">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => setActiveFilter(f.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
            activeFilter === f.key
              ? 'bg-[#191d28] text-white'
              : 'text-[#6b7490] hover:text-white'
          }`}
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