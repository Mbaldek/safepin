// src/components/FilterBar.tsx

'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useStore, type MapFilters } from '@/stores/useStore';
import { SEVERITY, URBAN_CONTEXTS } from '@/types';

const AGE_OPTIONS = [
  { id: 'all',   label: 'Any'   },
  { id: '1h',    label: '< 1h'  },
  { id: '6h',    label: '< 6h'  },
  { id: 'today', label: 'Today' },
];

const springConfig = { type: 'spring', damping: 32, stiffness: 300, mass: 0.8 } as const;

const DEFAULT: MapFilters = { severity: 'all', age: 'all', urban: 'all', confirmedOnly: false };

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      {label && (
        <p className="text-[0.6rem] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function ChipRow({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  return (
    <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}>
      {children}
    </div>
  );
}

function Chip({
  active, onClick, children, color,
}: {
  active: boolean; onClick: () => void; children: ReactNode; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition"
      style={
        active
          ? color
            ? { backgroundColor: color + '20', color, border: `1.5px solid ${color}` }
            : { backgroundColor: 'var(--accent)', color: '#fff', border: '1.5px solid var(--accent)' }
          : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FilterBar() {
  const { mapFilters, setMapFilters } = useStore();
  const [open, setOpen] = useState(false);

  const activeCount = [
    mapFilters.severity !== 'all',
    mapFilters.age !== 'all',
    mapFilters.urban !== 'all',
    mapFilters.confirmedOnly,
  ].filter(Boolean).length;

  function patch(partial: Partial<MapFilters>) {
    setMapFilters({ ...mapFilters, ...partial });
  }

  return (
    <>
      {/* ── Filter icon button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute top-3 left-3 z-[60] w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-95"
        style={{
          backgroundColor: open || activeCount > 0
            ? 'var(--accent)'
            : 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <SlidersHorizontal
          size={16}
          strokeWidth={2}
          style={{ color: open || activeCount > 0 ? '#fff' : 'var(--text-muted)' }}
        />
        {activeCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[15px] h-[15px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
            style={{ backgroundColor: '#fff', color: 'var(--accent)' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Overlay + Panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Tap-away overlay */}
            <motion.div
              className="absolute inset-0 z-[55]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ backgroundColor: 'var(--bg-overlay)' }}
              onClick={() => setOpen(false)}
            />

            {/* Filter panel */}
            <motion.div
              className="sheet-motion absolute bottom-0 left-0 right-0 z-[56] rounded-t-3xl max-h-[65dvh] overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={springConfig}
            >
              {/* Handle */}
              <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />

              <div className="px-5 pt-3 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                    Map Filters
                  </h3>
                  {activeCount > 0 && (
                    <button
                      onClick={() => setMapFilters(DEFAULT)}
                      className="text-xs font-bold transition hover:opacity-70"
                      style={{ color: 'var(--accent)' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Severity */}
                <Section label="Severity">
                  <ChipRow>
                    <Chip active={mapFilters.severity === 'all'} onClick={() => patch({ severity: 'all' })}>
                      All
                    </Chip>
                    {Object.entries(SEVERITY).map(([key, { label, emoji, color }]) => (
                      <Chip
                        key={key}
                        active={mapFilters.severity === key}
                        onClick={() => patch({ severity: key })}
                        color={color}
                      >
                        {emoji} {label}
                      </Chip>
                    ))}
                  </ChipRow>
                </Section>

                {/* Age */}
                <Section label="Age">
                  <ChipRow>
                    {AGE_OPTIONS.map(({ id, label }) => (
                      <Chip key={id} active={mapFilters.age === id} onClick={() => patch({ age: id })}>
                        {label}
                      </Chip>
                    ))}
                  </ChipRow>
                </Section>

                {/* Urban context */}
                <Section label="Location type">
                  <ChipRow wrap>
                    <Chip active={mapFilters.urban === 'all'} onClick={() => patch({ urban: 'all' })}>
                      Any
                    </Chip>
                    {Object.entries(URBAN_CONTEXTS).map(([key, { label, emoji }]) => (
                      <Chip
                        key={key}
                        active={mapFilters.urban === key}
                        onClick={() => patch({ urban: key })}
                      >
                        {emoji} {label}
                      </Chip>
                    ))}
                  </ChipRow>
                </Section>

                {/* Confirmed only */}
                <Section>
                  <button
                    onClick={() => patch({ confirmedOnly: !mapFilters.confirmedOnly })}
                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl transition active:opacity-80"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Confirmed only
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Show pins verified by other users
                      </p>
                    </div>
                    {/* iOS-style toggle */}
                    <div
                      className="relative w-11 h-6 rounded-full shrink-0 ml-4 transition-colors"
                      style={{ backgroundColor: mapFilters.confirmedOnly ? 'var(--accent)' : 'var(--border)' }}
                    >
                      <motion.div
                        className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm"
                        style={{ backgroundColor: '#fff' }}
                        animate={{ left: mapFilters.confirmedOnly ? '22px' : '2px' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      />
                    </div>
                  </button>
                </Section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
