// src/components/TripView.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Check, X, Map, ArrowLeft, Radio, BookmarkPlus, Star, Shield } from 'lucide-react';
import SavedPanel from '@/components/SavedPanel';
import { useStore, RouteOption } from '@/stores/useStore';
import { Pin, SavedRoute } from '@/types';
import AutocompleteInput from '@/components/AutocompleteInput';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { springTransition, haversineMetersLngLat } from '@/lib/utils';
import { geocodeForward } from '@/lib/geocode';

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

const STORAGE_KEY = 'kova_active_trip';

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

function scoreDanger(coords: [number, number][], pins: Pin[], nightOnly = false): number {
  const step = Math.max(1, Math.floor(coords.length / 20));
  let score = 0;
  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i];
    for (const pin of pins) {
      if (pin.resolved_at) continue;
      if (nightOnly) {
        const h = new Date(pin.created_at).getHours();
        if (h >= 6 && h < 22) continue; // skip non-night pins
      }
      const dx = (pin.lng - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      const dy = (pin.lat - lat) * 110_540;
      if (Math.sqrt(dx * dx + dy * dy) < 200) score += pin.is_emergency ? 3 : 1;
    }
  }
  return score;
}

// ─── OSRM helpers ──────────────────────────────────────────────────────────────

async function osrmRoutes(
  waypoints: [number, number][],
  profile: string,
): Promise<{ coords: [number, number][]; duration: number; distance: number }[]> {
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/${profile}/${coords}` +
    `?overview=full&geometries=geojson&alternatives=2`,
  );
  const data = await res.json();
  return (data.routes ?? []).map((r: { geometry: { coordinates: [number, number][] }; duration: number; distance: number }) => ({
    coords: r.geometry.coordinates as [number, number][],
    duration: r.duration,
    distance: r.distance,
  }));
}

// Closest unresolved danger pin to any point on the route; returns [lng, lat] or null
function closestDangerPin(
  coords: [number, number][],
  pins: Pin[],
): { pin: Pin; closest: [number, number] } | null {
  const step = Math.max(1, Math.floor(coords.length / 30));
  let best: { dist: number; pin: Pin; pt: [number, number] } | null = null;
  for (let i = 0; i < coords.length; i += step) {
    const pt = coords[i];
    for (const pin of pins) {
      if (pin.resolved_at) continue;
      const d = haversineMetersLngLat(pt, [pin.lng, pin.lat]);
      if (d < 200 && (!best || d < best.dist)) best = { dist: d, pin, pt };
    }
  }
  return best ? { pin: best.pin, closest: best.pt } : null;
}

// Compute a bypass waypoint 380 m perpendicular away from the danger pin
function bypassWaypoint(closestPt: [number, number], pin: Pin): [number, number] {
  // Direction vector from pin to route point (perpendicular = rotate 90°)
  const dLng = closestPt[0] - pin.lng;
  const dLat = closestPt[1] - pin.lat;
  const len = Math.sqrt(dLng * dLng + dLat * dLat) || 1;
  // Perpendicular direction
  const perpLng = -dLat / len;
  const perpLat = dLng / len;
  // 380 m in degrees (approx): 380 / 111_320
  const offset = 380 / 111_320;
  return [pin.lng + perpLng * offset, pin.lat + perpLat * offset];
}

async function fetchRouteOptions(
  from: [number, number],
  to: [number, number],
  mode: Mode,
  pins: Pin[],
  nightOnly = false,
): Promise<RouteOption[]> {
  const profile = OSRM_PROFILES[mode];

  // ── Phase 1: standard OSRM alternatives ────────────────────────────────────
  const raw = await osrmRoutes([from, to], profile);
  if (raw.length === 0) return [];

  const scored = raw.map((r) => ({ ...r, dangerScore: scoreDanger(r.coords, pins, nightOnly), rerouted: false }));
  scored.sort((a, b) => a.dangerScore - b.dangerScore);
  const best = scored[0];

  // ── Phase 2: bypass waypoint if best route has danger ──────────────────────
  if (best.dangerScore > 0) {
    const hit = closestDangerPin(best.coords, pins);
    if (hit) {
      const bypass = bypassWaypoint(hit.closest, hit.pin);
      try {
        const reroutedRaw = await osrmRoutes([from, bypass, to], profile);
        if (reroutedRaw.length > 0) {
          const rerouted = reroutedRaw[0];
          const reroutedScore = scoreDanger(rerouted.coords, pins, nightOnly);
          // Accept if: score improved AND duration penalty ≤ 50%
          const durationPenalty = rerouted.duration / best.duration;
          if (reroutedScore < best.dangerScore && durationPenalty <= 1.5) {
            // Replace best route with rerouted version
            scored[0] = { ...rerouted, dangerScore: reroutedScore, rerouted: true };
            scored.sort((a, b) => a.dangerScore - b.dangerScore);
          }
        }
      } catch { /* rerouting failed — keep original */ }
    }
  }

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
    rerouted: r.rerouted,
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
    userProfile, userLocation, pins, userId,
    setActiveRoute, setPendingRoutes,
    isSharingLocation, setIsSharingLocation,
    placeNotes, favPlaceIds,
    tripPrefill, setTripPrefill,
    setActiveTab,
  } = useStore();
  const t = useTranslations('trip');

  const [phase, setPhase]                 = useState<Phase>('idle');
  const [departure, setDeparture]         = useState('');
  const [departureCoords, setDepartureCoords] = useState<[number, number] | null>(null);
  const [destination, setDest]           = useState('');
  const [destCoords, setDestCoords]      = useState<[number, number] | null>(null);
  const [mode, setMode]                  = useState<Mode>('walk');
  const [durationMs, setDuration]        = useState(30 * 60_000);
  const [options, setOptions]            = useState<RouteOption[]>([]);
  const [trip, setTrip]                  = useState<TripState | null>(null);
  const [now, setNow]                    = useState(Date.now());
  const [error, setError]               = useState<string | null>(null);
  const [activeOpt, setActiveOpt]        = useState<RouteOption | null>(null);
  const [nightOnly, setNightOnly]        = useState(false);
  const locationHistoryRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // My saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSaved, setShowSaved]     = useState(false);

  // Favourite routes — persisted in localStorage
  const FAV_KEY = 'kova_fav_routes';
  const [favIds, setFavIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });

  function toggleFav(id: string) {
    setFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  // Sorted list — favourites first
  const sortedRoutes = [
    ...savedRoutes.filter((r) => favIds.has(r.id)),
    ...savedRoutes.filter((r) => !favIds.has(r.id)),
  ];

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

  // Apply trip prefill from map popup (place note tap)
  useEffect(() => {
    if (!tripPrefill) return;
    if (tripPrefill.departure !== undefined) {
      setDeparture(tripPrefill.departure);
      setDepartureCoords(tripPrefill.departureCoords ?? null);
    }
    if (tripPrefill.destination !== undefined) {
      setDest(tripPrefill.destination);
      setDestCoords(tripPrefill.destCoords ?? null);
    }
    setTripPrefill(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPrefill]);

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

    let fromCoords: [number, number] | null = departureCoords;
    if (!fromCoords) {
      if (departure.trim()) {
        fromCoords = await geocodeForward(departure.trim(), userLocation ?? undefined);
      } else if (userLocation) {
        fromCoords = [userLocation.lng, userLocation.lat];
      }
    }

    if (!fromCoords) {
      setError('Could not find departure. Enable location or enter an address.');
      setPhase('idle');
      return;
    }

    const toCoords = destCoords ?? await geocodeForward(destination.trim(), userLocation ?? undefined);
    if (!toCoords) {
      setError('Could not find destination. Try a more specific address.');
      setPhase('idle');
      return;
    }

    const opts = await fetchRouteOptions(fromCoords, toCoords, mode, pins, nightOnly).catch(() => []);
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
    setDepartureCoords(null);
    setDest(r.to_label);
    setDestCoords(r.coords?.[(r.coords?.length ?? 1) - 1] as [number, number] | null ?? null);
    setMode(r.mode as Mode);
    setShowSaved(false);
  }

  async function deleteRoute(id: string) {
    await supabase.from('saved_routes').delete().eq('id', id);
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
    setFavIds((prev) => { const next = new Set(prev); next.delete(id); try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* noop */ } return next; });
  }

  function selectRoute(opt: RouteOption) {
    const tripState: TripState = {
      destination: destination.trim(),
      startedAt:   Date.now(),
      expiresAt:   Date.now() + durationMs,
    };
    setTrip(tripState);
    setActiveOpt(opt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tripState));
    setActiveRoute({ coords: opt.coords, destination: destination.trim() });
    setPendingRoutes(null);
    setPhase('active');

    // Append location history every 30s
    if (locationHistoryRef.current) clearInterval(locationHistoryRef.current);
    locationHistoryRef.current = setInterval(() => {
      const store = useStore.getState();
      const loc = store.userLocation;
      const uid = store.userId;
      if (!loc || !uid) return;
      supabase.from('location_history').insert({ user_id: uid, lat: loc.lat, lng: loc.lng }).then(() => {});
    }, 30_000);

    onClose(); // go to map to see the route
  }

  async function endTrip() {
    // Stop location history tracking
    if (locationHistoryRef.current) {
      clearInterval(locationHistoryRef.current);
      locationHistoryRef.current = null;
    }

    // Save trip log
    if (trip && userId && activeOpt) {
      const durationS = Math.round((Date.now() - trip.startedAt) / 1000);
      await supabase.from('trip_log').insert({
        user_id:      userId,
        from_label:   departure.trim() || null,
        to_label:     trip.destination,
        mode,
        danger_score: activeOpt.dangerScore,
        distance_m:   Math.round(activeOpt.distance),
        duration_s:   durationS,
        started_at:   new Date(trip.startedAt).toISOString(),
        ended_at:     new Date().toISOString(),
      });
    }

    setTrip(null);
    setActiveOpt(null);
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
    phase === 'idle'      ? (showSaved ? 'My Favorites' : t('title')) :
    phase === 'searching' ? t('searching') :
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
          {(phase === 'selecting' || (phase === 'idle' && showSaved)) && (
            <button
              onClick={() => { if (showSaved) setShowSaved(false); else backToIdle(); }}
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
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('searching')}</p>
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
                  className="px-4 py-2 flex items-center justify-between gap-2"
                  style={{ backgroundColor: `${opt.color}18` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: opt.color }}>{opt.label}</span>
                    {opt.rerouted && (
                      <span
                        className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1' }}
                      >
                        {'↺ ' + t('rerouted')}
                      </span>
                    )}
                  </div>
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
                  {t('endTrip')}
                </button>
                <button
                  onClick={endTrip}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <X size={14} strokeWidth={2} />
                  {t('cancelTrip')}
                </button>
                <button
                  onClick={() => {
                    const store = useStore.getState();
                    store.setShowSafeSpaces(true);
                    const loc = store.userLocation;
                    if (!loc || store.safeSpaces.length === 0) {
                      toast(t('navigateToSafe'));
                      onClose();
                      return;
                    }
                    // Find nearest safe space
                    let best = store.safeSpaces[0];
                    let bestDist = Infinity;
                    for (const sp of store.safeSpaces) {
                      const d = haversineMetersLngLat([loc.lng, loc.lat], [sp.lng, sp.lat]);
                      if (d < bestDist) { bestDist = d; best = sp; }
                    }
                    toast(`${best.name} — ${fmtDist(bestDist)} away`);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <Shield size={14} strokeWidth={2} />
                  {t('navigateToSafe')}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Idle (saved panel) ──────────────────────────────────────── */}
        {phase === 'idle' && showSaved && (
          <div className="flex flex-col pt-1" style={{ minHeight: 0, flex: 1 }}>
            <SavedPanel
              savedRoutes={savedRoutes}
              favRouteIds={favIds}
              onToggleFavRoute={toggleFav}
              onLoadPlace={(note, as) => {
                const label = note.name || `${note.emoji} ${note.note.slice(0, 30)}`;
                const coords: [number, number] = [note.lng, note.lat];
                if (as === 'from') { setDeparture(label); setDepartureCoords(coords); }
                else               { setDest(label);      setDestCoords(coords); }
                setShowSaved(false);
              }}
              onLoadRoute={loadSavedRoute}
              onDeleteRoute={deleteRoute}
              onAddPlace={() => { onClose(); setActiveTab('map'); }}
              onRouteAdded={(route) => setSavedRoutes((prev) => {
                const filtered = prev.filter((r) => r.id !== route.id);
                return [route, ...filtered];
              })}
            />
          </div>
        )}

        {/* ── Idle (form) ─────────────────────────────────────────────── */}
        {phase === 'idle' && !showSaved && (
          <div className="flex flex-col gap-4 pt-1">

            {/* My Favorites shortcut */}
            <button
              onClick={() => setShowSaved(true)}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2">
                <Star size={14} strokeWidth={2.5} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>My Favorites</span>
                {(favPlaceIds.length > 0 || savedRoutes.length > 0) && (
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    {favPlaceIds.length} place{favPlaceIds.length !== 1 ? 's' : ''} · {savedRoutes.length} route{savedRoutes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>›</span>
            </button>

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
                {t('departure')}
              </p>
              <AutocompleteInput
                value={departure}
                onChange={(text, coords) => { setDeparture(text); setDepartureCoords(coords ?? null); }}
                placeholder={t('yourLocation')}
                localSections={[{
                  title: 'My Places',
                  items: placeNotes.filter((n) => favPlaceIds.includes(n.id)).map((n) => ({
                    label: n.name ?? `${n.emoji} ${n.note.slice(0, 30)}`,
                    sublabel: n.name ? `${n.emoji} ${n.note.slice(0, 40)}` : undefined,
                    coords: [n.lng, n.lat] as [number, number],
                    icon: n.emoji,
                  })),
                }]}
              />
            </div>

            {/* Destination */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {t('destination')} <span style={{ color: 'var(--accent)' }}>*</span>
              </p>
              <AutocompleteInput
                value={destination}
                onChange={(text, coords) => { setDest(text); setDestCoords(coords ?? null); }}
                placeholder="e.g. Home, Gare du Nord, Café…"
                localSections={[
                  {
                    title: 'My Places',
                    items: placeNotes.filter((n) => favPlaceIds.includes(n.id)).map((n) => ({
                      label: n.name ?? `${n.emoji} ${n.note.slice(0, 30)}`,
                      sublabel: n.name ? `${n.emoji} ${n.note.slice(0, 40)}` : undefined,
                      coords: [n.lng, n.lat] as [number, number],
                      icon: n.emoji,
                    })),
                  },
                  {
                    title: 'My Routes',
                    items: savedRoutes.map((r) => ({
                      label: r.to_label,
                      sublabel: r.from_label
                        ? `From: ${r.from_label}`
                        : `${MODES.find((m) => m.id === r.mode)?.emoji ?? ''} ${r.mode} · ${r.trip_count}× used`,
                      coords: r.coords?.[(r.coords?.length ?? 1) - 1] as [number, number] | undefined,
                      icon: MODES.find((m) => m.id === r.mode)?.emoji,
                    })),
                  },
                ]}
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

            {/* Plan for tonight toggle */}
            <button
              onClick={() => setNightOnly(!nightOnly)}
              className="w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-between px-4 transition"
              style={{
                backgroundColor: nightOnly ? 'rgba(99,102,241,0.10)' : 'var(--bg-card)',
                border: nightOnly ? '1.5px solid #6366f1' : '1px solid var(--border)',
                color: nightOnly ? '#6366f1' : 'var(--text-muted)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🌙</span>
                {t('planForNight')}
              </div>
              <div
                className="w-9 h-5 rounded-full relative transition-colors"
                style={{ backgroundColor: nightOnly ? '#6366f1' : 'var(--border)' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: nightOnly ? '18px' : '2px' }}
                />
              </div>
            </button>

            {/* Duration */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {t('duration')}
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

            {/* Smart Alerts indicator */}
            {savedRoutes.length > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  color: '#6366f1',
                }}
              >
                🔔 Smart Alerts active — monitoring {savedRoutes.length} saved {savedRoutes.length === 1 ? 'route' : 'routes'}
              </div>
            )}

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
              {t('searchRoutes')}
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
