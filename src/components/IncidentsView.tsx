// src/components/IncidentsView.tsx

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS, Pin } from '@/types';
import { timeAgoLong as timeAgo, haversineMeters, springTransition } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type TimeFilter = 'all' | '1h' | '6h' | 'today';
type RadiusFilter = 'all' | '500m' | '1km' | '2km' | '5km';

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all',   label: 'All' },
  { id: '1h',    label: '< 1h' },
  { id: '6h',    label: '< 6h' },
  { id: 'today', label: 'Today' },
];

const RADIUS_FILTERS: { id: RadiusFilter; label: string; meters: number }[] = [
  { id: 'all',  label: 'Any',  meters: Infinity },
  { id: '500m', label: '500m', meters: 500      },
  { id: '1km',  label: '1km',  meters: 1_000    },
  { id: '2km',  label: '2km',  meters: 2_000    },
  { id: '5km',  label: '5km',  meters: 5_000    },
];

// ─── Incident card ────────────────────────────────────────────────────────────

function EmergencyCard({ pin, dist }: { pin: Pin; dist: number | null }) {
  const { setSelectedPin, setActiveSheet, liveSessions } = useStore();
  const isLive = liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
  const mediaCount = pin.media_urls?.length ?? (pin.photo_url ? 1 : 0);

  return (
    <button
      onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
      className="w-full text-left rounded-2xl overflow-hidden transition active:scale-[0.98]"
      style={{
        backgroundColor: 'rgba(239,68,68,0.07)',
        border: '1.5px solid rgba(239,68,68,0.35)',
      }}
    >
      {/* Top stripe */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🆘</span>
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: '#ef4444' }}>
            Emergency Alert
          </span>
          {isLive && (
            <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}>
              ● LIVE
            </span>
          )}
        </div>
        <span className="text-[0.65rem] font-bold" style={{ color: 'rgba(239,68,68,0.8)' }}>
          {timeAgo(pin.created_at)}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p
          className="text-sm leading-snug line-clamp-2 mb-2"
          style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
        >
          {pin.description}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pulsing active dot */}
          <span className="flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#ef4444' }} />
              <span className="relative inline-flex rounded-full w-2 h-2"
                style={{ backgroundColor: '#ef4444' }} />
            </span>
            <span className="text-[0.65rem] font-bold" style={{ color: '#ef4444' }}>
              Active
            </span>
          </span>
          {dist !== null && (
            <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
              📍 ~{formatDist(dist)}
            </span>
          )}
          {mediaCount > 0 && (
            <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
              📎 {mediaCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function PinCard({ pin, dist }: { pin: Pin; dist: number | null }) {
  const { setSelectedPin, setActiveSheet, liveSessions } = useStore();
  const isLive = liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
  const cat = CATEGORIES[pin.category as keyof typeof CATEGORIES];
  const sev = SEVERITY[pin.severity as keyof typeof SEVERITY];
  const env = pin.environment ? ENVIRONMENTS[pin.environment as keyof typeof ENVIRONMENTS] : null;
  const mediaCount = pin.media_urls?.length ?? (pin.photo_url ? 1 : 0);

  return (
    <button
      onClick={() => { setSelectedPin(pin); setActiveSheet('detail'); }}
      className="w-full text-left rounded-2xl overflow-hidden transition active:scale-[0.98] flex"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Left severity bar */}
      <div className="w-1 shrink-0 rounded-l-2xl" style={{ backgroundColor: sev?.color ?? '#6b7490' }} />

      {/* Content */}
      <div className="flex-1 px-4 py-3 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base leading-none">{cat?.emoji}</span>
            <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {cat?.label ?? pin.category}
            </span>
          </div>
          {isLive && (
            <span className="shrink-0 text-[0.55rem] font-black px-1.5 py-0.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}>
              ● LIVE
            </span>
          )}
          <span
            className="shrink-0 text-[0.6rem] font-black px-2 py-0.5 rounded-full"
            style={{ backgroundColor: (sev?.color ?? '#6b7490') + '18', color: sev?.color ?? '#6b7490' }}
          >
            {sev?.emoji} {sev?.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>
          {pin.description}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
            🕐 {timeAgo(pin.created_at)}
          </span>
          {dist !== null && (
            <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
              📍 ~{formatDist(dist)}
            </span>
          )}
          {env && (
            <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
              {env.emoji} {env.label}
            </span>
          )}
          {mediaCount > 0 && (
            <span className="text-[0.65rem] font-medium" style={{ color: 'var(--text-muted)' }}>
              📎 {mediaCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function IncidentsView({ onClose }: { onClose: () => void }) {
  const { pins, userLocation, liveSessions } = useStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>('all');
  const [liveOnly, setLiveOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const now = Date.now();

  const filtered = useMemo(() => {
    return pins
      .filter((pin) => {
        // Skip resolved emergencies
        if (pin.is_emergency && pin.resolved_at) return false;
        // Emergency pins expire after 2h
        if (pin.is_emergency) {
          const ageH = (now - new Date(pin.created_at).getTime()) / 3_600_000;
          if (ageH >= 2) return false;
        }
        // Regular pins expire after 24h (reset by last confirmation)
        if (!pin.is_emergency) {
          const base = pin.last_confirmed_at
            ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
            : new Date(pin.created_at).getTime();
          if ((now - base) / 3_600_000 >= 24) return false;
        }
        // Time filter
        const ageMs = now - new Date(pin.created_at).getTime();
        if (timeFilter === '1h'    && ageMs > 3_600_000)       return false;
        if (timeFilter === '6h'    && ageMs > 6 * 3_600_000)  return false;
        if (timeFilter === 'today' && ageMs > 24 * 3_600_000) return false;
        // Emergency only
        if (emergencyOnly && !pin.is_emergency) return false;
        // Severity filter (not applied to emergency pins)
        if (severityFilter !== 'all' && !pin.is_emergency && pin.severity !== severityFilter) return false;
        // Radius filter (only applied when user location is known)
        if (radiusFilter !== 'all' && userLocation) {
          const maxM = RADIUS_FILTERS.find((r) => r.id === radiusFilter)!.meters;
          if (haversineMeters(userLocation, { lat: pin.lat, lng: pin.lng }) > maxM) return false;
        }
        // Live only filter
        if (liveOnly) {
          const hasLive = liveSessions.some((s) => s.pin_id === pin.id && !s.ended_at);
          if (!hasLive) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Live sessions first
        const aLive = liveSessions.some((s) => s.pin_id === a.id && !s.ended_at);
        const bLive = liveSessions.some((s) => s.pin_id === b.id && !s.ended_at);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        // Emergencies always next
        if (a.is_emergency && !b.is_emergency) return -1;
        if (!a.is_emergency && b.is_emergency) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, timeFilter, emergencyOnly, severityFilter, radiusFilter, liveOnly, userLocation, liveSessions]);

  return (
    <motion.div
      className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-201 flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 -10px 40px var(--bg-overlay)',
        maxHeight: '78dvh',
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-3 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
      <div className="w-full">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              Nearby Incidents
            </h2>
            {filtered.length > 0 && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
              >
                {filtered.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
          {/* LIVE only toggle */}
          <button
            onClick={() => setLiveOnly(!liveOnly)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
            style={
              liveOnly
                ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.5)' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            🔴 Live
          </button>
          {/* Emergency only toggle */}
          <button
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
            style={
              emergencyOnly
                ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.5)' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            🆘 SOS
          </button>
          <button
            onClick={onClose}
            className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕
          </button>
          </div>
        </div>

        {/* Time filter chips */}
        <div className="flex gap-2 mb-2">
          {TIME_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeFilter(id)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition"
              style={
                timeFilter === id
                  ? { backgroundColor: 'var(--accent)', color: '#fff' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Radius filter chips */}
        <div className="flex gap-2 mb-2.5 items-center">
          <span className="text-[0.6rem] font-black tracking-widest uppercase shrink-0" style={{ color: 'var(--text-muted)' }}>
            Radius
          </span>
          {RADIUS_FILTERS.map(({ id, label }) => {
            const disabled = id !== 'all' && !userLocation;
            return (
              <button
                key={id}
                onClick={() => !disabled && setRadiusFilter(id)}
                className="px-3 py-1 rounded-full text-[0.65rem] font-bold transition"
                style={
                  disabled
                    ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-placeholder)', border: '1px solid var(--border)', opacity: 0.5, cursor: 'default' }
                    : radiusFilter === id
                      ? { backgroundColor: 'var(--blue)', color: '#fff' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Severity chips */}
        {!emergencyOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setSeverityFilter('all')}
              className="px-3 py-1 rounded-full text-[0.65rem] font-bold transition"
              style={
                severityFilter === 'all'
                  ? { backgroundColor: 'var(--text-muted)', color: 'var(--bg-primary)' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              All severity
            </button>
            {Object.entries(SEVERITY).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => setSeverityFilter(severityFilter === key ? 'all' : key)}
                className="px-3 py-1 rounded-full text-[0.65rem] font-bold transition"
                style={
                  severityFilter === key
                    ? { backgroundColor: color + '20', color, border: `1.5px solid ${color}` }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* ── List (grouped by category) ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 pb-8">
      <div className="w-full px-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              🛡️
            </div>
            <div className="text-center">
              <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                No incidents found
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {timeFilter !== 'all' || emergencyOnly || severityFilter !== 'all' || radiusFilter !== 'all'
                  ? 'Try widening your filters'
                  : 'All clear in your area'}
              </p>
            </div>
            {(timeFilter !== 'all' || emergencyOnly || severityFilter !== 'all' || radiusFilter !== 'all') && (
              <button
                onClick={() => { setTimeFilter('all'); setEmergencyOnly(false); setSeverityFilter('all'); setRadiusFilter('all'); }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (() => {
          // Group: emergencies first, then by category
          const emergencies = filtered.filter((p) => p.is_emergency);
          const byCategory = new Map<string, Pin[]>();
          filtered.filter((p) => !p.is_emergency).forEach((pin) => {
            const arr = byCategory.get(pin.category) ?? [];
            arr.push(pin);
            byCategory.set(pin.category, arr);
          });
          const sections: { key: string; label: string; emoji: string; color?: string; pins: Pin[] }[] = [];
          if (emergencies.length) sections.push({ key: '_sos', label: 'Emergency Alerts', emoji: '🆘', color: '#ef4444', pins: emergencies });
          for (const [cat, catPins] of byCategory) {
            const catInfo = CATEGORIES[cat as keyof typeof CATEGORIES];
            sections.push({ key: cat, label: catInfo?.label ?? cat, emoji: catInfo?.emoji ?? '⚠️', pins: catPins });
          }
          return sections.map(({ key, label, emoji, color, pins: sectionPins }) => {
            const open = expandedSections.has(key);
            return (
              <div key={key}>
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between py-2.5 px-1 transition-opacity hover:opacity-70"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{emoji}</span>
                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: color ?? 'var(--text-muted)' }}>
                      {label}
                    </span>
                    <span
                      className="text-[0.6rem] font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: (color ?? 'var(--text-muted)') + '18', color: color ?? 'var(--text-muted)' }}
                    >
                      {sectionPins.length}
                    </span>
                  </div>
                  {open
                    ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
                {open && (
                  <div className="flex flex-col gap-2 pb-2">
                    {sectionPins.map((pin) => {
                      const dist = userLocation ? haversineMeters(userLocation, { lat: pin.lat, lng: pin.lng }) : null;
                      return pin.is_emergency
                        ? <EmergencyCard key={pin.id} pin={pin} dist={dist} />
                        : <PinCard key={pin.id} pin={pin} dist={dist} />;
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
      </div>
    </motion.div>
  );
}
