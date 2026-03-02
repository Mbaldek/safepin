// src/components/FilterBar.tsx

'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, type MapFilters } from '@/stores/useStore';
import { SEVERITY, URBAN_CONTEXTS } from '@/types';
import { useTranslations } from 'next-intl';
import CollapsibleSection from '@/components/CollapsibleSection';

const AGE_OPTIONS = [
  { id: 'all',   key: 'any'        as const },
  { id: '1h',    key: 'lessThan1h' as const },
  { id: '6h',    key: 'lessThan6h' as const },
  { id: 'today', key: 'today'      as const },
];

const SEV_I18N: Record<string, string> = { low: 'mild', med: 'moderate', high: 'danger' };
const PLACE_I18N: Record<string, string> = { store: 'storeMall', bus: 'busStop', restaurant: 'restaurantBar' };

const TIME_OPTIONS = [
  { id: 'all'       as const, key: 'anyTime'    as const },
  { id: 'morning'   as const, key: 'morning'    as const },
  { id: 'afternoon' as const, key: 'afternoon'  as const },
  { id: 'evening'   as const, key: 'evening'    as const },
  { id: 'night'     as const, key: 'night'      as const },
];

const DEFAULT: MapFilters = { severity: 'all', age: 'all', urban: 'all', confirmedOnly: false, liveOnly: false, timeOfDay: 'all' };

const springConfig = { type: 'spring', damping: 32, stiffness: 300, mass: 0.8 } as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

type FilterBarProps = {
  open: boolean;
  onClose: () => void;
};

export default function FilterBar({ open, onClose }: FilterBarProps) {
  const { mapFilters, setMapFilters } = useStore();
  const t = useTranslations('filters');
  const tInc = useTranslations('incidents');
  const tPlace = useTranslations('placeTypes');
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeCount = [
    mapFilters.severity !== 'all',
    mapFilters.age !== 'all',
    mapFilters.urban !== 'all',
    mapFilters.confirmedOnly,
    mapFilters.timeOfDay !== 'all',
  ].filter(Boolean).length;

  function patch(partial: Partial<MapFilters>) {
    setMapFilters({ ...mapFilters, ...partial });
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  // Summary helpers
  const severitySummary = mapFilters.severity === 'all'
    ? t('all')
    : tInc(SEV_I18N[mapFilters.severity] ?? mapFilters.severity);

  const ageSummary = (() => {
    const opt = AGE_OPTIONS.find((o) => o.id === mapFilters.age);
    return opt ? t(opt.key) : t('any');
  })();

  const urbanSummary = mapFilters.urban === 'all'
    ? t('any')
    : tPlace(PLACE_I18N[mapFilters.urban] ?? mapFilters.urban);

  const timeSummary = mapFilters.timeOfDay === 'all'
    ? t('anyTime')
    : t(mapFilters.timeOfDay as 'morning' | 'afternoon' | 'evening' | 'night');

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Tap-away overlay */}
          <motion.div
            className="absolute inset-0 z-58"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ backgroundColor: 'var(--bg-overlay)' }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 z-60 rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                {t('title')}
              </h3>
              {activeCount > 0 && (
                <button
                  onClick={() => setMapFilters(DEFAULT)}
                  className="text-xs font-bold transition hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('clearAll')}
                </button>
              )}
            </div>

            {/* Severity */}
            <CollapsibleSection
              label={t('severity')}
              summary={severitySummary}
              isActive={mapFilters.severity !== 'all'}
              expanded={expanded === 'severity'}
              onToggle={() => toggle('severity')}
            >
              <ChipRow>
                <Chip active={mapFilters.severity === 'all'} onClick={() => patch({ severity: 'all' })}>
                  {t('all')}
                </Chip>
                {Object.entries(SEVERITY).map(([key, { emoji, color }]) => (
                  <Chip
                    key={key}
                    active={mapFilters.severity === key}
                    onClick={() => patch({ severity: key })}
                    color={color}
                  >
                    {emoji} {tInc(SEV_I18N[key] ?? key)}
                  </Chip>
                ))}
              </ChipRow>
            </CollapsibleSection>

            {/* Age */}
            <CollapsibleSection
              label={t('age')}
              summary={ageSummary}
              isActive={mapFilters.age !== 'all'}
              expanded={expanded === 'age'}
              onToggle={() => toggle('age')}
            >
              <ChipRow>
                {AGE_OPTIONS.map(({ id, key }) => (
                  <Chip key={id} active={mapFilters.age === id} onClick={() => patch({ age: id })}>
                    {t(key)}
                  </Chip>
                ))}
              </ChipRow>
            </CollapsibleSection>

            {/* Urban context */}
            <CollapsibleSection
              label={t('locationType')}
              summary={urbanSummary}
              isActive={mapFilters.urban !== 'all'}
              expanded={expanded === 'urban'}
              onToggle={() => toggle('urban')}
            >
              <ChipRow wrap>
                <Chip active={mapFilters.urban === 'all'} onClick={() => patch({ urban: 'all' })}>
                  {t('any')}
                </Chip>
                {Object.entries(URBAN_CONTEXTS).map(([key, { emoji }]) => (
                  <Chip
                    key={key}
                    active={mapFilters.urban === key}
                    onClick={() => patch({ urban: key })}
                  >
                    {emoji} {tPlace(PLACE_I18N[key] ?? key)}
                  </Chip>
                ))}
              </ChipRow>
            </CollapsibleSection>

            {/* Time of day */}
            <CollapsibleSection
              label={t('timeOfDay')}
              summary={timeSummary}
              isActive={mapFilters.timeOfDay !== 'all'}
              expanded={expanded === 'timeOfDay'}
              onToggle={() => toggle('timeOfDay')}
            >
              <ChipRow wrap>
                {TIME_OPTIONS.map(({ id, key }) => (
                  <Chip key={id} active={mapFilters.timeOfDay === id} onClick={() => patch({ timeOfDay: id })}>
                    {t(key)}
                  </Chip>
                ))}
              </ChipRow>
            </CollapsibleSection>

            {/* Confirmed only — always visible */}
            <div className="px-5 py-4">
              <button
                onClick={() => patch({ confirmedOnly: !mapFilters.confirmedOnly })}
                className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl transition active:opacity-80"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {t('confirmedOnly')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t('confirmedDesc')}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
