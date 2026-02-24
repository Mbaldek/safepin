// src/components/RoutePlannerForm.tsx
// Multi-mode route planner: fetches ALL transport modes in parallel,
// displays grouped results with collapse/expand per mode.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, BookmarkPlus, Map, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useStore, RouteOption } from '@/stores/useStore';
import { Pin } from '@/types';
import AutocompleteInput from '@/components/AutocompleteInput';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { haversineMetersLngLat } from '@/lib/utils';
import { geocodeForward } from '@/lib/geocode';
import { fetchTransitRoute, TransitRoute, TransitStep, formatTransitDuration, getLineIcon } from '@/lib/transit';

export type Mode = 'walk' | 'bike' | 'drive' | 'transit';

type PlannerPhase = 'form' | 'searching' | 'selecting';

type Props = {
  onRouteSelected: (route: RouteOption, mode: Mode, transitSteps?: TransitStep[]) => void;
  onClose: () => void;
  initialDestination?: string;
  initialDeparture?: string;
  initialDestCoords?: [number, number] | null;
  initialDepartureCoords?: [number, number] | null;
};

const MODES: { id: Mode; emoji: string; label: string }[] = [
  { id: 'walk',    emoji: '🚶', label: 'Walk'    },
  { id: 'bike',    emoji: '🚴', label: 'Bike'    },
  { id: 'drive',   emoji: '🚗', label: 'Drive'   },
  { id: 'transit', emoji: '🚇', label: 'Transit' },
];

const MODE_COLORS: Record<Mode, string> = {
  walk: '#22c55e', bike: '#3b82f6', drive: '#f59e0b', transit: '#6366f1',
};

// Shade variants per mode: index 0 = safest (dark), 1 = balanced, 2 = fastest (light)
const MODE_SHADES: Record<Mode, string[]> = {
  walk:    ['#16a34a', '#22c55e', '#86efac'],
  bike:    ['#2563eb', '#3b82f6', '#93c5fd'],
  drive:   ['#d97706', '#f59e0b', '#fcd34d'],
  transit: ['#4f46e5', '#6366f1', '#a5b4fc'],
};

const OSRM_PROFILES: Record<Mode, string> = {
  walk: 'foot', bike: 'bike', drive: 'driving', transit: 'foot',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
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

// ─── OSRM ─────────────────────────────────────────────────────────────────────

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

function closestDangerPin(coords: [number, number][], pins: Pin[]): { pin: Pin; closest: [number, number] } | null {
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

function bypassWaypoint(closestPt: [number, number], pin: Pin): [number, number] {
  const dLng = closestPt[0] - pin.lng;
  const dLat = closestPt[1] - pin.lat;
  const len = Math.sqrt(dLng * dLng + dLat * dLat) || 1;
  const perpLng = -dLat / len;
  const perpLat = dLng / len;
  const offset = 380 / 111_320;
  return [pin.lng + perpLng * offset, pin.lat + perpLat * offset];
}

async function fetchRouteOptions(
  from: [number, number], to: [number, number], mode: Mode, pins: Pin[],
): Promise<RouteOption[]> {
  const profile = OSRM_PROFILES[mode];
  const raw = await osrmRoutes([from, to], profile);
  if (raw.length === 0) return [];

  const scored = raw.map((r) => ({ ...r, dangerScore: scoreDanger(r.coords, pins), rerouted: false }));
  scored.sort((a, b) => a.dangerScore - b.dangerScore);
  const best = scored[0];

  if (best.dangerScore > 0) {
    const hit = closestDangerPin(best.coords, pins);
    if (hit) {
      const bypass = bypassWaypoint(hit.closest, hit.pin);
      try {
        const reroutedRaw = await osrmRoutes([from, bypass, to], profile);
        if (reroutedRaw.length > 0) {
          const rerouted = reroutedRaw[0];
          const reroutedScore = scoreDanger(rerouted.coords, pins);
          const durationPenalty = rerouted.duration / best.duration;
          if (reroutedScore < best.dangerScore && durationPenalty <= 1.5) {
            scored[0] = { ...rerouted, dangerScore: reroutedScore, rerouted: true };
            scored.sort((a, b) => a.dangerScore - b.dangerScore);
          }
        }
      } catch { /* rerouting failed */ }
    }
  }

  const modeColor = MODE_COLORS[mode];
  const n = Math.min(scored.length, 3);
  const labels = ['Safest', 'Balanced', 'Fastest'];

  return scored.slice(0, n).map((r, i) => ({
    id: `${mode}-${i}`,
    label: n === 1 ? 'Safest' : labels[i] ?? `Route ${i + 1}`,
    color: MODE_SHADES[mode]?.[i] ?? modeColor,
    coords: r.coords,
    duration: r.duration,
    distance: r.distance,
    dangerScore: r.dangerScore,
    rerouted: r.rerouted,
  }));
}

function DangerBadge({ score }: { score: number }) {
  const [label, bg, fg] =
    score === 0 ? ['Clear', 'rgba(34,197,94,0.12)', '#22c55e'] :
    score <= 2  ? ['Low risk', 'rgba(245,158,11,0.12)', '#f59e0b'] :
                  ['Some risk', 'rgba(239,68,68,0.12)', '#ef4444'];
  return (
    <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  );
}

// ─── Types for multi-mode state ───────────────────────────────────────────────

type RoutesByMode = Record<Mode, RouteOption[]>;
type TransitByMode = Record<Mode, TransitRoute[]>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoutePlannerForm({ onRouteSelected, onClose, initialDestination, initialDeparture, initialDestCoords, initialDepartureCoords }: Props) {
  const { userLocation, pins, userProfile, placeNotes, favPlaceIds, setPendingRoutes, setTransitSegments } = useStore();
  const t = useTranslations('trip');

  const [phase, setPhase] = useState<PlannerPhase>('form');
  const [departure, setDeparture] = useState(initialDeparture ?? '');
  const [departureCoords, setDepartureCoords] = useState<[number, number] | null>(initialDepartureCoords ?? null);
  const [destination, setDest] = useState(initialDestination ?? '');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(initialDestCoords ?? null);
  const [error, setError] = useState<string | null>(null);

  // Multi-mode state
  const [routesByMode, setRoutesByMode] = useState<RoutesByMode>({ walk: [], bike: [], drive: [], transit: [] });
  const [transitRoutes, setTransitRoutes] = useState<TransitByMode>({ walk: [], bike: [], drive: [], transit: [] });
  const [expandedModes, setExpandedModes] = useState<Set<Mode>>(new Set());
  const [loadingModes, setLoadingModes] = useState<Set<Mode>>(new Set());
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update map pending routes when expanded modes change
  useEffect(() => {
    if (phase !== 'selecting') return;
    const visibleRoutes: RouteOption[] = [];
    for (const mode of expandedModes) {
      visibleRoutes.push(...routesByMode[mode]);
    }
    setPendingRoutes(visibleRoutes.length > 0 ? visibleRoutes : null);
  }, [expandedModes, routesByMode, phase, setPendingRoutes]);

  // Auto-search when destination changes (debounced 800ms)
  useEffect(() => {
    if (!destination.trim() || phase !== 'form') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (destCoords) findRoutes();
    }, 800);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, destCoords]);

  const findRoutes = useCallback(async () => {
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
      setPhase('form');
      return;
    }

    const toCoords = destCoords ?? await geocodeForward(destination.trim(), userLocation ?? undefined);
    if (!toCoords) {
      setError('Could not find destination. Try a more specific address.');
      setPhase('form');
      return;
    }

    // Reset state
    const emptyRoutes: RoutesByMode = { walk: [], bike: [], drive: [], transit: [] };
    const emptyTransit: TransitByMode = { walk: [], bike: [], drive: [], transit: [] };
    setRoutesByMode(emptyRoutes);
    setTransitRoutes(emptyTransit);
    setLoadingModes(new Set(['walk', 'bike', 'drive', 'transit']));
    setExpandedModes(new Set());
    setExpandedRouteId(null);
    setPhase('selecting');

    // Fetch all modes in parallel, update progressively
    const fetchMode = async (mode: Mode) => {
      try {
        if (mode === 'transit') {
          const routes = await fetchTransitRoute(fromCoords!, toCoords);
          if (routes.length > 0) {
            const routeOptions: RouteOption[] = routes.map((r, i) => ({
              id: `transit-${i}`,
              label: `Option ${i + 1}`,
              color: MODE_SHADES.transit[i % MODE_SHADES.transit.length] ?? MODE_COLORS.transit,
              coords: r.coords,
              dangerScore: 0,
              duration: r.totalDuration,
              distance: 0,
            }));
            setRoutesByMode((prev) => ({ ...prev, transit: routeOptions }));
            setTransitRoutes((prev) => ({ ...prev, transit: routes }));
          }
        } else {
          const opts = await fetchRouteOptions(fromCoords!, toCoords, mode, pins);
          if (opts.length > 0) {
            setRoutesByMode((prev) => ({ ...prev, [mode]: opts }));
          }
        }
      } catch { /* mode failed silently */ }
      setLoadingModes((prev) => {
        const next = new Set(prev);
        next.delete(mode);
        return next;
      });
    };

    await Promise.allSettled(MODES.map((m) => fetchMode(m.id)));
  }, [departure, departureCoords, destination, destCoords, pins, userLocation]);

  function toggleMode(mode: Mode) {
    setExpandedModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }

  async function saveRoute(opt: RouteOption, mode: Mode) {
    if (!userProfile?.id) return;
    const name = destination.trim() || opt.label;
    const { error } = await supabase.from('saved_routes').upsert(
      { user_id: userProfile.id, name, from_label: departure.trim() || null, to_label: destination.trim(), mode, coords: opt.coords, danger_score_last: opt.dangerScore, trip_count: 1, last_used_at: new Date().toISOString() },
      { onConflict: 'user_id,name' },
    );
    if (error) toast.error('Could not save route');
    else toast.success('Route saved');
  }

  function handleSelect(opt: RouteOption, mode: Mode) {
    const transitRoute = opt.id.startsWith('transit-')
      ? transitRoutes.transit[parseInt(opt.id.replace('transit-', ''), 10)] ?? null
      : null;

    if (transitRoute) {
      const segments = transitRoute.steps.map((step) => ({
        coords: step.coords,
        color: step.mode === 'walking' ? '#999' : (step.lineColor ?? '#6366f1'),
        dashed: step.mode === 'walking',
      }));
      setTransitSegments(segments);
    } else {
      setTransitSegments(null);
    }

    onRouteSelected(opt, mode, transitRoute?.steps);
  }

  function backToForm() {
    setPhase('form');
    setPendingRoutes(null);
    setTransitSegments(null);
    setRoutesByMode({ walk: [], bike: [], drive: [], transit: [] });
    setTransitRoutes({ walk: [], bike: [], drive: [], transit: [] });
    setExpandedModes(new Set());
    setLoadingModes(new Set());
    setError(null);
  }

  const totalRoutes = Object.values(routesByMode).reduce((s, r) => s + r.length, 0);
  const anyLoading = loadingModes.size > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {phase === 'selecting' && (
            <button
              onClick={backToForm}
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
          <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            {phase === 'searching' ? t('searching') : phase === 'selecting' ? 'Choose Route' : t('title')}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          ✕
        </button>
      </div>

      {/* Searching (initial) */}
      {phase === 'searching' && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
          />
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('searching')}</p>
        </div>
      )}

      {/* Selecting — grouped by mode */}
      {phase === 'selecting' && (
        <div className="flex flex-col gap-2.5">
          {/* Trip summary */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span className="text-sm">📍</span>
            <div className="min-w-0 flex-1">
              {departure.trim() && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>From: <span className="font-bold">{departure.trim()}</span></p>}
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>To: {destination.trim()}</p>
            </div>
            {anyLoading && (
              <Loader2 size={14} className="animate-spin shrink-0" style={{ color: 'var(--text-muted)' }} />
            )}
            {!anyLoading && (
              <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                {totalRoutes} routes
              </span>
            )}
          </div>

          {/* Mode groups */}
          {MODES.map(({ id: mode, emoji, label }) => {
            const routes = routesByMode[mode];
            const isLoading = loadingModes.has(mode);
            const isExpanded = expandedModes.has(mode);
            const bestDuration = routes.length > 0 ? Math.min(...routes.map((r) => r.duration)) : 0;
            const modeColor = MODE_COLORS[mode];

            return (
              <div key={mode} className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${isExpanded ? modeColor + '60' : 'var(--border)'}`, backgroundColor: 'var(--bg-card)' }}>
                {/* Mode header — always visible */}
                <button
                  onClick={() => routes.length > 0 && toggleMode(mode)}
                  disabled={routes.length === 0 && !isLoading}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 transition"
                  style={{ opacity: routes.length === 0 && !isLoading ? 0.4 : 1 }}
                >
                  <span className="text-lg">{emoji}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                      {isLoading ? 'Calculating...' :
                       routes.length === 0 ? 'No routes found' :
                       `${routes.length} route${routes.length > 1 ? 's' : ''} · best ${fmtDur(bestDuration)}`}
                    </p>
                  </div>
                  {isLoading && <Loader2 size={14} className="animate-spin shrink-0" style={{ color: modeColor }} />}
                  {!isLoading && routes.length > 0 && (
                    <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  )}
                </button>

                {/* Expanded route cards */}
                {isExpanded && routes.length > 0 && (
                  <div className="px-2.5 pb-2.5 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                    {routes.map((opt) => {
                      const isDetailExpanded = expandedRouteId === opt.id;
                      const transitRoute = opt.id.startsWith('transit-')
                        ? transitRoutes.transit[parseInt(opt.id.replace('transit-', ''), 10)] ?? null
                        : null;

                      return (
                        <div key={opt.id} className="rounded-xl mt-2" style={{ border: `1.5px solid ${modeColor}25`, backgroundColor: `${modeColor}06` }}>
                          {/* Route summary row */}
                          <div className="px-3 py-2 flex items-center gap-2 cursor-pointer" onClick={() => setExpandedRouteId(isDetailExpanded ? null : opt.id)}>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black" style={{ color: opt.color }}>
                                  {transitRoute
                                    ? `dep ${fmtTime(transitRoute.departureTime)}`
                                    : opt.label}
                                </span>
                                {opt.rerouted && (
                                  <span className="text-[0.5rem] font-black px-1 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                                    ↺ rerouted
                                  </span>
                                )}
                                {!transitRoute && <DangerBadge score={opt.dangerScore} />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{fmtDur(opt.duration)}</span>
                                {opt.distance > 0 && <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{fmtDist(opt.distance)}</span>}
                                {transitRoute && (
                                  <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                    {transitRoute.transfers} transfer{transitRoute.transfers !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{isDetailExpanded ? '▲' : '▼'}</span>
                              <button onClick={(e) => { e.stopPropagation(); saveRoute(opt, mode); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:opacity-80"
                                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} title="Save route">
                                <BookmarkPlus size={12} style={{ color: 'var(--text-muted)' }} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleSelect(opt, mode); }}
                                className="px-3 py-1.5 rounded-lg text-[0.65rem] font-black transition hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: modeColor, color: '#fff' }}>
                                Start
                              </button>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isDetailExpanded && (
                            <div className="px-3 pb-2.5 pt-1" style={{ borderTop: `1px solid ${modeColor}15` }}>
                              {transitRoute ? (
                                <div className="space-y-2">
                                  {transitRoute.steps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                      <div className="text-base mt-0.5">{getLineIcon(step.mode)}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          {step.mode !== 'walking' && step.line && (
                                            <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-black text-white"
                                              style={{ backgroundColor: step.lineColor || 'var(--accent)' }}>
                                              {step.line}
                                            </span>
                                          )}
                                          <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {step.mode === 'walking' ? `Walk to ${step.to}` : `${step.from} → ${step.to}`}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                            {formatTransitDuration(step.duration)}
                                          </span>
                                          {step.stops != null && step.stops > 0 && (
                                            <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>· {step.stops} stops</span>
                                          )}
                                          {step.departureTime && step.mode !== 'walking' && (
                                            <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                              · dep {fmtTime(step.departureTime)}
                                            </span>
                                          )}
                                          {step.headsign && (
                                            <span className="text-[0.6rem] truncate" style={{ color: 'var(--text-muted)' }}>
                                              → {step.headsign}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                                  <p>{fmtDur(opt.duration)} · {fmtDist(opt.distance)}</p>
                                  {opt.dangerScore > 0 && <p>{opt.dangerScore} incident{opt.dangerScore !== 1 ? 's' : ''} reported near this route</p>}
                                  {opt.rerouted && <p style={{ color: '#6366f1' }}>This route was rerouted to avoid a danger zone</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form */}
      {phase === 'form' && (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ backgroundColor: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
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

          {/* Search button — no mode pills anymore */}
          <button
            onClick={findRoutes}
            disabled={!destination.trim()}
            className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', boxShadow: '0 6px 20px rgba(244,63,94,0.25)' }}
          >
            <Map size={16} strokeWidth={2.5} />
            {t('searchRoutes')}
          </button>
        </div>
      )}
    </div>
  );
}
