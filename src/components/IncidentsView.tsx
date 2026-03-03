// src/components/IncidentsView.tsx

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, Pin } from '@/types';

const CAT_I18N: Record<string, string> = {
  verbal_abuse: 'verbalAbuse', poor_lighting: 'poorLighting', dark_area: 'poorLighting',
  unsafe_road: 'unsafeRoad', isolated: 'isolatedArea', drunk: 'intoxicated',
};
import { timeAgoLong as timeAgo, haversineMeters, springTransition } from '@/lib/utils';

// ── Severity brand tokens ──────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  low: '#F4A940', med: '#E8A838', high: '#E63946',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// ── Veil Symbol (empty state icon) ────────────────────────────────────────────

function VeilSymbol() {
  return (
    <svg
      width="60"
      height="80"
      viewBox="0 0 120 160"
      fill="none"
      aria-hidden="true"
      style={{ opacity: 0.15 }}
    >
      <circle cx="60" cy="20" r="4" fill="rgba(232,168,56,0.9)" />
      <circle cx="60" cy="20" r="8" fill="none" stroke="rgba(232,168,56,0.3)" strokeWidth="1" />
      <path d="M 20 20 Q 20 100 60 145" stroke="rgba(232,168,56,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 100 20 Q 100 100 60 145" stroke="rgba(232,168,56,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 30 20 Q 30 95 60 138" stroke="rgba(139,126,200,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 90 20 Q 90 95 60 138" stroke="rgba(139,126,200,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 42 20 Q 42 88 60 130" stroke="rgba(232,168,56,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M 78 20 Q 78 88 60 130" stroke="rgba(232,168,56,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="148" r="2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

// ── Incident Card ─────────────────────────────────────────────────────────────

function IncidentCard({ pin, dist, t }: {
  pin: Pin;
  dist: number | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const { setSelectedPin, setActiveSheet, setMapFlyTo, liveSessions } = useStore();
  const tCat = useTranslations('categories');
  const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
  const isEmergency = pin.is_emergency;
  const isLive = liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
  const isDanger = isEmergency || pin.severity === 'high';
  const sevColor = isEmergency ? '#E63946' : (SEV_COLOR[pin.severity] ?? '#E8A838');
  const sevLabel = isEmergency
    ? t('urgent')
    : pin.severity === 'low' ? t('mild')
    : pin.severity === 'med' ? t('moderate')
    : t('danger');
  const emoji = isEmergency ? '🆘' : (cat?.emoji ?? '⚠️');
  const typeLabel = isEmergency ? t('emergencyAlert') : tCat(CAT_I18N[pin.category] ?? pin.category);

  function handleTap() {
    setSelectedPin(pin);
    setActiveSheet('detail');
    setMapFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16 });
  }

  return (
    <button
      onClick={handleTap}
      className="w-full text-left flex items-start gap-3 rounded-xl p-3.5 transition active:scale-[0.98]"
      style={{
        backgroundColor: isDanger ? 'rgba(230,57,70,0.03)' : 'var(--bg-card)',
        border: `1px solid ${isDanger ? 'rgba(230,57,70,0.15)' : 'var(--border)'}`,
        borderLeft: isDanger ? '3px solid #E63946' : `1px solid var(--border)`,
      }}
    >
      {/* Icon circle */}
      <div
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: `${sevColor}15` }}
        aria-hidden="true"
      >
        {emoji}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {typeLabel}
          </span>
          {isLive && (
            <span
              className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#E63946', color: '#fff' }}
            >
              ● {t('live')}
            </span>
          )}
        </div>
        <span className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
          {pin.description}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-placeholder)' }}>
          {timeAgo(pin.created_at)}
          {dist !== null && ` · ~${formatDist(dist)}`}
        </span>
      </div>

      {/* Severity badge */}
      <div
        className="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: `${sevColor}18`, color: sevColor }}
      >
        {sevLabel}
      </div>
    </button>
  );
}

// ── Filter types ──────────────────────────────────────────────────────────────

type RadiusFilter = 'all' | '500m' | '1km' | '2km' | '5km';

const AGE_FILTERS: { id: string; key: string }[] = [
  { id: 'all',   key: 'severityAll' },
  { id: '1h',    key: 'lessThan1h'  },
  { id: '6h',    key: 'lessThan6h'  },
  { id: 'today', key: 'today'       },
];

const RADIUS_FILTERS: { id: RadiusFilter; label?: string; meters: number }[] = [
  { id: 'all',  meters: Infinity },
  { id: '500m', label: '500m', meters: 500      },
  { id: '1km',  label: '1km',  meters: 1_000    },
  { id: '2km',  label: '2km',  meters: 2_000    },
  { id: '5km',  label: '5km',  meters: 5_000    },
];

const SEV_ORDER: Record<string, number> = { high: 0, med: 1, low: 2 };

// ── Main view ─────────────────────────────────────────────────────────────────

export default function IncidentsView({ onClose }: { onClose: () => void }) {
  const t = useTranslations('incidents');
  const { pins, userLocation, liveSessions, mapFilters, setMapFilters } = useStore();
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>('all');

  function patchFilters(partial: Partial<typeof mapFilters>) {
    setMapFilters({ ...mapFilters, ...partial });
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    return pins
      .filter((pin) => {
        if (pin.is_emergency && pin.resolved_at) return false;
        if (pin.is_emergency) {
          if ((now - new Date(pin.created_at).getTime()) / 3_600_000 >= 2) return false;
        } else {
          const base = pin.last_confirmed_at
            ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
            : new Date(pin.created_at).getTime();
          if ((now - base) / 3_600_000 >= 24) return false;
        }
        const ageMs = now - new Date(pin.created_at).getTime();
        if (mapFilters.age === '1h'    && ageMs > 3_600_000)       return false;
        if (mapFilters.age === '6h'    && ageMs > 6 * 3_600_000)  return false;
        if (mapFilters.age === 'today' && ageMs > 24 * 3_600_000) return false;
        if (mapFilters.severity !== 'all' && !pin.is_emergency && pin.severity !== mapFilters.severity) return false;
        if (radiusFilter !== 'all' && userLocation) {
          const maxM = RADIUS_FILTERS.find((r) => r.id === radiusFilter)!.meters;
          if (haversineMeters(userLocation, { lat: pin.lat, lng: pin.lng }) > maxM) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.is_emergency && !b.is_emergency) return -1;
        if (!a.is_emergency && b.is_emergency) return 1;
        const aLive = liveSessions.some((s) => s.pin_id === a.id && !s.ended_at);
        const bLive = liveSessions.some((s) => s.pin_id === b.id && !s.ended_at);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        const sevDiff = (SEV_ORDER[a.severity] ?? 1) - (SEV_ORDER[b.severity] ?? 1);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [pins, mapFilters.age, mapFilters.severity, radiusFilter, userLocation, liveSessions]);

  const hasFilters = mapFilters.severity !== 'all' || mapFilters.age !== 'all' || radiusFilter !== 'all';

  function clearAll() {
    patchFilters({ severity: 'all', age: 'all' });
    setRadiusFilter('all');
  }

  return (
    <motion.div
      className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201 flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 -10px 40px var(--bg-overlay)',
        maxHeight: '78dvh',
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div
        className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-3 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('nearbyIncidents')}
            </h2>
            {filtered.length > 0 && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
              >
                {filtered.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs rounded-full px-3 py-1.5 font-medium transition active:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕
          </button>
        </div>

        {/* Age filter chips */}
        <div className="flex gap-1.5 mb-2">
          {AGE_FILTERS.map(({ id, key }) => (
            <button
              key={id}
              onClick={() => patchFilters({ age: id })}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition"
              style={
                mapFilters.age === id
                  ? { backgroundColor: 'var(--accent)', color: '#fff' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              {t(key)}
            </button>
          ))}
        </div>

        {/* Radius filter chips */}
        <div className="flex gap-1.5 mb-2 items-center">
          <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--text-placeholder)' }}>
            {t('radius')}
          </span>
          {RADIUS_FILTERS.map(({ id, label }) => {
            const disabled = id !== 'all' && !userLocation;
            return (
              <button
                key={id}
                onClick={() => !disabled && setRadiusFilter(id)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition"
                style={
                  disabled
                    ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-placeholder)', border: '1px solid var(--border)', cursor: 'default', opacity: 0.5 }
                    : radiusFilter === id
                      ? { backgroundColor: 'var(--blue)', color: '#fff' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {id === 'all' ? t('any') : label}
              </button>
            );
          })}
        </div>

        {/* Severity chips */}
        <div className="flex gap-1.5">
          {(['all', 'low', 'med', 'high'] as const).map((sev) => {
            const isActive = mapFilters.severity === sev;
            const color = sev === 'all' ? undefined : SEV_COLOR[sev];
            const label = sev === 'all' ? t('severityAll')
              : sev === 'low' ? t('mild')
              : sev === 'med' ? t('moderate')
              : t('danger');
            return (
              <button
                key={sev}
                onClick={() => patchFilters({ severity: sev })}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition"
                style={
                  isActive
                    ? color
                      ? { backgroundColor: `${color}20`, color, border: `1.5px solid ${color}60` }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1.5px solid var(--border-hover)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-2 pb-8">
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-10">
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 120,
                height: 120,
                background: 'radial-gradient(circle, rgba(232,168,56,0.08) 0%, transparent 70%)',
              }}
            >
              <VeilSymbol />
            </div>
            <p className="mt-4 text-center text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {hasFilters ? t('noResults') : t('allClear')}
            </p>
            <p className="mt-1 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {hasFilters ? t('broadenFilters') : t('allClearSub')}
            </p>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="mt-4 px-4 py-2 rounded-xl text-[12px] font-semibold transition active:opacity-70"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        ) : (
          filtered.map((pin) => {
            const dist = userLocation
              ? haversineMeters(userLocation, { lat: pin.lat, lng: pin.lng })
              : null;
            return <IncidentCard key={pin.id} pin={pin} dist={dist} t={t} />;
          })
        )}
      </div>
    </motion.div>
  );
}
