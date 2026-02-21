// src/components/IncidentsView.tsx

'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS, Pin } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}min ago`;
  return `${hours}h ago`;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type TimeFilter = 'all' | '1h' | '6h' | 'today';

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all',   label: 'All' },
  { id: '1h',    label: '< 1h' },
  { id: '6h',    label: '< 6h' },
  { id: 'today', label: 'Today' },
];

// ─── Incident card ────────────────────────────────────────────────────────────

function EmergencyCard({ pin, dist }: { pin: Pin; dist: number | null }) {
  const { setSelectedPin, setActiveSheet } = useStore();
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
  const { setSelectedPin, setActiveSheet } = useStore();
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

export default function IncidentsView() {
  const { pins, userLocation } = useStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

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
        // Regular pins expire after 24h
        if (!pin.is_emergency) {
          const ageH = (now - new Date(pin.created_at).getTime()) / 3_600_000;
          if (ageH >= 24) return false;
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
        return true;
      })
      .sort((a, b) => {
        // Emergencies always first
        if (a.is_emergency && !b.is_emergency) return -1;
        if (!a.is_emergency && b.is_emergency) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, timeFilter, emergencyOnly, severityFilter]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
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
            🆘 Emergency
          </button>
        </div>

        {/* Time filter chips */}
        <div className="flex gap-2 mb-2.5">
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

      {/* ── List ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
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
                {timeFilter !== 'all' || emergencyOnly || severityFilter !== 'all'
                  ? 'Try widening your filters'
                  : 'All clear in your area'}
              </p>
            </div>
            {(timeFilter !== 'all' || emergencyOnly || severityFilter !== 'all') && (
              <button
                onClick={() => { setTimeFilter('all'); setEmergencyOnly(false); setSeverityFilter('all'); }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((pin) => {
            const dist = userLocation ? distanceM(userLocation, { lat: pin.lat, lng: pin.lng }) : null;
            return pin.is_emergency
              ? <EmergencyCard key={pin.id} pin={pin} dist={dist} />
              : <PinCard       key={pin.id} pin={pin} dist={dist} />;
          })
        )}
      </div>
    </div>
  );
}
