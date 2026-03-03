'use client';

import { useState } from 'react';
import { incidentTypes, incidentCategories, type IncidentType } from '@/lib/incident-types';

interface IncidentTypeSelectorProps {
  onSelect: (type: IncidentType) => void;
}

export function IncidentTypeSelector({ onSelect }: IncidentTypeSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('interpersonal');

  const filteredTypes = incidentTypes.filter((t) => t.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs — horizontal scroll */}
      <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
        {incidentCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-card)',
                color: isActive ? '#fff' : 'var(--text-muted)',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Type list — vertical scroll, lean text-only design */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
        {filteredTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type)}
            className="w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-150 text-left active:scale-[0.98]"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span className="font-medium">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
