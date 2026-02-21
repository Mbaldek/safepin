// src/components/TripView.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Check, X, Map, ArrowLeft, Radio, BookmarkPlus, BookOpen } from 'lucide-react';
import { useStore, RouteOption } from '@/stores/useStore';
import { Pin, SavedRoute } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

type Phase = 'idle' | 'searching' | 'selecting' | 'active';
type Mode  = 'walk' | 'bike' | 'drive' | 'transit';

type TripState = {
  destination: string;
  startedAt: number;
  expiresAt: number;
};

const DURATION_OPTIONS = [
  { label: '15 min', ms: 15 * 60_000 },
  { label: '30 min', ms: 30 * 60_000 },
  { label: '1 hr',   ms:  1 * 3_600_000 },
  { label: '2 hr',   ms:  2 * 3_600_000 },
  { label: '4 hr',   ms:  4 * 3_600_000 },
];

const MODES: { id: Mode; emoji: string; label: string; soon?: boolean }[] = [
  { id: 'walk',    emoji: '🚶', label: 'Walk'    },
  { id: 'bike',    emoji: '🚴', label: 'Bike'    },
  { id: 'drive',   emoji: '🚗', label: 'Drive'   },
  { id: 'transit', emoji: '🚇', label: 'Transit', soon: true },
];

const OSRM_PROFILES: Record<Mode, string> = {
  walk:    'foot',
  bike:    'bike',
  drive:   'driving',
  transit: 'foot', // proxy until transit data is integrated
};

const STORAGE_KEY = 'safepin_active_trip';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtDur(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function fmtDist(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function scoreDanger(coords: [number, number][], pins: Pin[]): number {
  const step = Math.max(1, Math.floor(coords.length / 20));
  let score = 0;
  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i];
    for (const pin of pins) {
      if (pin.resolved_at) continue;
      const dx = (pin.lng - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      const dy = (pin.lat - lat) * 110_540;
      if (Math.sqrt(dx * dx + dy * dy) < 200) score += pin.is_emergency ? 3 : 1;
    }
  }
  return score;
}

async function geocodePlace(
  query: string,
  proximity?: { lat: number; lng: number },
): Promise<[number, number] | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const prox = proximity ? `&proximity=${proximity.lng},${proximity.lat}` : '';
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${token}&limit=1&language=fr,en${prox}`,
    );
    const data = await res.json();
    return data.features?.[0]?.geometry?.coordinates ?? null;
  } catch { return null; }
}

async function fetchRouteOptions(
  from: [number, number],
  to: [number, number],
  mode: Mode,
  pins: Pin[],
): Promise<RouteOption[]> {
  const profile = OSRM_PROFILES[mode];
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson&alternatives=2`,
  );
  const data = await res.json();
  const rawRoutes: { geometry: { coordinates: [number, number][] }; duration: number; distance: number }[] =
    data.routes ?? [];
  if (rawRoutes.length === 0) return [];

  const scored = rawRoutes.map((r) => ({
    coords: r.geometry.coordinates as [number, number][],
    duration: r.duration,
    distance: r.distance,
    dangerScore: scoreDanger(r.geometry.coordinates as [number, number][], pins),
  }));

  scored.sort((a, b) => a.dangerScore - b.dangerScore);

  const n = Math.min(scored.length, 3);
  const LABEL_SETS: Record<number, Array<{ label: RouteOption['label']; color: string }>> = {
    1: [{ label: 'Safest', color: '#22c55e' }],
    2: [{ label: 'Safest', color: '#22c55e' }, { label: 'Fastest', color: '#3b82f6' }],
    3: [
      { label: 'Safest',   color: '#22c55e' },
      { label: 'Balanced', color: '#f59e0b' },
      { label: 'Fastest',  color: '#3b82f6' },
    ],
  };

  return scored.slice(0, n).map((r, i) => ({
    id: String(i),
    ...LABEL_SETS[n][i],
    coords: r.coords,
    duration: r.duration,
    distance: r.distance,
    dangerScore: r.dangerScore,
  }));
}

function DangerBadge({ score }: { score: number }) {
  const [label, bg, fg] =
    score === 0      ? ['Clear',     'rgba(34,197,94,0.12)',  '#22c55e'] :
    score <= 2       ? ['Low risk',  'rgba(245,158,11,0.12)', '#f59e0b'] :
                       ['Some risk', 'rgba(239,68,68,0.12)',  '#ef4444'];
  return (
    <span
      className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripView({ onClose }: { onClose: () => void }) {
  const {
    userProfile, userLocation, pins,
    setActiveRoute, setPendingRoutes,
    isSharingLocation, setIsSharingLocation,
  } = useStore();

  const [phase, setPhase]         = useState<Phase>('idle');
  const [departure, setDeparture] = useState('');
  const [destination, setDest]    = useState('');
  const [mode, setMode]           = useState<Mode>('walk');
  const [durationMs, setDuration] = useState(30 * 60_000);
  const [options, setOptions]     = useState<RouteOption[]>([]);
  const [trip, setTrip]           = useState<TripState | null>(null);
  const [now, setNow]             = useState(Date.now());
  const [error, setError]         = useState<string | null>(null);

  // My saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showRoutes, setShowRoutes]   = useState(false);

  useEffect(() => {
    if (!userProfile?.id) return;
    supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('last_used_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setSavedRoutes((data as SavedRoute[]) ?? []));
  }, [userProfile?.id]);

  // Restore saved trip on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TripState;
        if (parsed.expiresAt > Date.now()) {
          setTrip(parsed);
          setPhase('active');
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setActiveRoute(null);
        }
      }
    } catch { localStorage.removeItem(STORAGE_KEY); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second while active
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Auto-expire
  useEffect(() => {
    if (trip && now >= trip.expiresAt) {
      setTrip(null);
      setPhase('idle');
      localStorage.removeItem(STORAGE_KEY);
      setActiveRoute(null);
      setPendingRoutes(null);
      setOptions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, trip]);

  async function findRoutes() {
    if (!destination.trim()) return;
    setError(null);
    setPhase('searching');

    let fromCoords: [number, number] | null = null;
    if (departure.trim()) {
      fromCoords = await geocodePlace(departure.trim(), userLocation ?? undefined);
    } else if (userLocation) {
      fromCoords = [userLocation.lng, userLocation.lat];
    }

    if (!fromCoords) {
      setError('Could not find departure. Enable location or enter an address.');
      setPhase('idle');
      return;
    }

    const toCoords = await geocodePlace(destination.trim(), userLocation ?? undefined);
    if (!toCoords) {
      setError('Could not find destination. Try a more specific address.');
      setPhase('idle');
      return;
    }

    const opts = await fetchRouteOptions(fromCoords, toCoords, mode, pins).catch(() => []);
    if (opts.length === 0) {
      setError('No routes found. Try a different destination or transport mode.');
      setPhase('idle');
      return;
    }

    setOptions(opts);
    setPendingRoutes(opts);
    setPhase('selecting');
  }

  async function saveRoute(opt: RouteOption) {
    if (!userProfile?.id) return;
    const name = destination.trim() || opt.label;
    const { error } = await supabase.from('saved_routes').upsert(
      {
        user_id:          userProfile.id,
        name,
        from_label:       departure.trim() || null,
        to_label:         destination.trim(),
        mode,
        coords:           opt.coords,
        danger_score_last: opt.dangerScore,
        trip_count:       1,
        last_used_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,name' }
    );
    if (error) { toast.error('Could not save route'); return; }
    toast.success('Route saved ✓');
    // Refresh list
    const { data } = await supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('last_used_at', { ascending: false })
      .limit(10);
    setSavedRoutes((data as SavedRoute[]) ?? []);
  }

  function loadSavedRoute(r: SavedRoute) {
    setDeparture(r.from_label ?? '');
    setDest(r.to_label);
    setMode(r.mode as Mode);
    setShowRoutes(false);
  }

  function selectRoute(opt: RouteOption) {
    const t: TripState = {
      destination: destination.trim(),
      startedAt:   Date.now(),
      expiresAt:   Date.now() + durationMs,
    };
    setTrip(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setActiveRoute({ coords: opt.coords, destination: destination.trim() });
    setPendingRoutes(null);
    setPhase('active');
    onClose(); // go to map to see the route
  }

  function endTrip() {
    setTrip(null);
    setPhase('idle');
    localStorage.removeItem(STORAGE_KEY);
    setActiveRoute(null);
    setPendingRoutes(null);
    setOptions([]);
    setIsSharingLocation(false);
  }

  function backToIdle() {
    setPhase('idle');
    setPendingRoutes(null);
    setOptions([]);
    setError(null);
  }

  // ── Header title ──────────────────────────────────────────────────────────

  const phaseTitle =
    phase === 'idle'      ? 'Trip Planner' :
    phase === 'searching' ? 'Finding routes…' :
    phase === 'selecting' ? 'Choose Route' :
                            'Active Trip';

  // ── Sheet ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl z-201 flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 -10px 40px var(--bg-overlay)',
        maxHeight: '72dvh',
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {phase === 'selecting' && (
            <button
              onClick={backToIdle}
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
          <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            {phaseTitle}
          </h2>
        </div>
        {phase !== 'searching' && (
          <button
            onClick={onClose}
            className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">

        {/* ── Searching ───────────────────────────────────────────────── */}
        {phase === 'searching' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div
              className="w-10 h-10 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
            />
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Finding safe routes…</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Checking for nearby incidents</p>
          </div>
        )}

        {/* ── Selecting ───────────────────────────────────────────────── */}
        {phase === 'selecting' && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Trip summary */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm">📍</span>
              <div className="min-w-0 flex-1">
                {departure.trim() && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    From: <span className="font-bold">{departure.trim()}</span>
                  </p>
                )}
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  To: {destination.trim()}
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded-full font-bold shrink-0"
                style={{ backgroundColor: 'rgba(244,63,94,0.10)', color: 'var(--accent)' }}
              >
                {MODES.find((m) => m.id === mode)?.emoji} {mode}
              </span>
            </div>

            {/* Route cards */}
            {options.map((opt) => (
              <div
                key={opt.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `2px solid ${opt.color}33`, backgroundColor: 'var(--bg-card)' }}
              >
                <div
                  className="px-4 py-2 flex items-center justify-between"
                  style={{ backgroundColor: `${opt.color}18` }}
                >
                  <span className="text-sm font-black" style={{ color: opt.color }}>{opt.label}</span>
                  <DangerBadge score={opt.dangerScore} />
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                      {fmtDur(opt.duration)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDist(opt.distance)}</span>
                  </div>
                  {opt.dangerScore > 0 && (
                    <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
                      {opt.dangerScore} risk {opt.dangerScore === 1 ? 'point' : 'points'} nearby
                    </p>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={() => saveRoute(opt)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-80"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      title="Save route"
                    >
                      <BookmarkPlus size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => selectRoute(opt)}
                      className="px-4 py-2 rounded-xl text-xs font-black transition hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: opt.color, color: '#fff' }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* See on map hint */}
            <p className="text-center text-xs pb-1" style={{ color: 'var(--text-muted)' }}>
              Routes are visible on the map behind this sheet
            </p>
          </div>
        )}

        {/* ── Active trip ─────────────────────────────────────────────── */}
        {phase === 'active' && trip && (() => {
          const remaining = Math.max(0, trip.expiresAt - now);
          const progress  = 1 - remaining / (trip.expiresAt - trip.startedAt);
          const critical  = remaining < 5 * 60_000;
          return (
            <div className="flex flex-col items-center gap-6 pt-2 pb-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(244,63,94,0.12)' }}
                  >
                    <Navigation size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse"
                    style={{ backgroundColor: '#22c55e', borderColor: 'var(--bg-secondary)' }}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    Heading to
                  </p>
                  <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                    {trip.destination}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Stay safe{userProfile?.display_name ? `, ${userProfile.display_name}` : ''}
                  </p>
                  {isSharingLocation && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                      <Radio size={9} strokeWidth={2.5} />
                      Sharing with Trusted Circle
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-full">
                <div
                  className="text-4xl font-black tracking-tight"
                  style={{ color: critical ? '#ef4444' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCountdown(remaining)}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>remaining</p>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: critical ? '#ef4444' : 'var(--accent)',
                      transition: 'width 1s linear, background-color 0.5s',
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={endTrip}
                  className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#22c55e', color: '#fff', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }}
                >
                  <Check size={18} strokeWidth={2.5} />
                  I&apos;m Safe
                </button>
                <button
                  onClick={endTrip}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <X size={14} strokeWidth={2} />
                  Cancel Trip
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Idle (form) ─────────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-4 pt-1">

            {/* My Saved Routes */}
            {savedRoutes.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRoutes(!showRoutes)}
                  className="flex items-center justify-between w-full mb-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} strokeWidth={2.5} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[0.65rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      My Routes ({savedRoutes.length})
                    </p>
                  </div>
                  <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                    {showRoutes ? '▲' : '▼'}
                  </span>
                </button>
                {showRoutes && (
                  <div className="flex flex-col gap-1.5">
                    {savedRoutes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => loadSavedRoute(r)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition active:scale-[0.98]"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {r.from_label ? `${r.from_label} → ` : ''}{r.to_label}
                          </p>
                          <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                            {MODES.find((m) => m.id === r.mode)?.emoji ?? ''} {r.mode} · {r.trip_count}× used
                          </p>
                        </div>
                        <span
                          className="text-[0.55rem] font-black px-2 py-0.5 rounded-full shrink-0 ml-2"
                          style={{
                            backgroundColor: r.danger_score_last === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                            color: r.danger_score_last === 0 ? '#22c55e' : '#f59e0b',
                          }}
                        >
                          {r.danger_score_last === 0 ? 'Clear' : `${r.danger_score_last} risk`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm font-bold"
                style={{ backgroundColor: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}

            {/* Departure */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Departure
              </p>
              <input
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                placeholder="My current location"
                className="w-full text-sm rounded-xl px-4 py-2.5 outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Destination */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Destination <span style={{ color: 'var(--accent)' }}>*</span>
              </p>
              <input
                value={destination}
                onChange={(e) => setDest(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') findRoutes(); }}
                placeholder="e.g. Home, Gare du Nord, Café…"
                className="w-full text-sm rounded-xl px-4 py-2.5 outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Mode — 4-button grid */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Transport
              </p>
              <div className="grid grid-cols-4 gap-2">
                {MODES.map(({ id, emoji, label, soon }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-2xl relative transition"
                    style={{
                      backgroundColor: mode === id ? 'var(--accent)' : 'var(--bg-card)',
                      border: mode === id ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                      color: mode === id ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span className="text-[0.6rem] font-bold leading-none">{label}</span>
                    {soon && (
                      <span
                        className="absolute -top-1.5 -right-1.5 text-[0.45rem] font-black px-1 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ backgroundColor: '#6366f1', color: '#fff' }}
                      >
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {mode === 'transit' && (
                <p className="text-[0.6rem] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
                  🚇 Transit routing coming soon · showing walking route as proxy
                </p>
              )}
            </div>

            {/* Duration */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Expected Duration
              </p>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(({ label, ms }) => (
                  <button
                    key={label}
                    onClick={() => setDuration(ms)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition"
                    style={{
                      backgroundColor: durationMs === ms ? 'var(--accent)' : 'var(--bg-card)',
                      color:           durationMs === ms ? '#fff'          : 'var(--text-muted)',
                      border:          durationMs === ms ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Share with Trusted Circle toggle */}
            <button
              onClick={() => setIsSharingLocation(!isSharingLocation)}
              className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-between px-4 transition"
              style={{
                backgroundColor: isSharingLocation ? 'rgba(99,102,241,0.10)' : 'var(--bg-card)',
                border: isSharingLocation ? '1.5px solid #6366f1' : '1px solid var(--border)',
                color: isSharingLocation ? '#6366f1' : 'var(--text-muted)',
              }}
            >
              <div className="flex items-center gap-2">
                <Radio size={14} strokeWidth={2.5} />
                Share location with Trusted Circle
              </div>
              <div
                className="w-9 h-5 rounded-full relative transition-colors"
                style={{ backgroundColor: isSharingLocation ? '#6366f1' : 'var(--border)' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: isSharingLocation ? '18px' : '2px' }}
                />
              </div>
            </button>

            <button
              onClick={findRoutes}
              disabled={!destination.trim()}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 6px 20px rgba(244,63,94,0.25)',
              }}
            >
              <Map size={16} strokeWidth={2.5} />
              Find Safe Routes
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
