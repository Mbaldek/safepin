// src/components/TripView.tsx
// Live Safety Escort hub — 4-state machine:
//   IDLE → PLANNING → ACTIVE → COMPLETED
// Delegates route planning to RoutePlannerForm, trip summary to TripSummary.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Check, X, Star, ArrowLeft, Radio, Shield, Clock, Route, Flame, BarChart3 } from 'lucide-react';
import SavedPanel from '@/components/SavedPanel';
import RoutePlannerForm, { Mode } from '@/components/RoutePlannerForm';
import TripSummary from '@/components/TripSummary';
import { useStore, RouteOption, TripSession, EscortState } from '@/stores/useStore';
import { SavedRoute } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { springTransition, haversineMetersLngLat } from '@/lib/utils';
import { TransitStep } from '@/lib/transit';
import { tripMonitor, MonitorEvent } from '@/lib/TripMonitor';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtDist(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

type RecentTrip = {
  id: string;
  to_label: string;
  mode: string;
  duration_s: number;
  danger_score: number;
  started_at: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripView({ onClose }: { onClose: () => void }) {
  const {
    userProfile, userId, pins,
    activeTrip, setActiveTrip,
    setActiveRoute, setPendingRoutes, setTransitSegments,
    isSharingLocation, setIsSharingLocation,
    placeNotes, favPlaceIds,
    tripPrefill, setTripPrefill,
    setActiveTab,
    currentStreak,
    setTripNudge,
    setShowWalkWithMe,
  } = useStore();
  const t = useTranslations('trip');

  // Derive escort state from activeTrip
  const [escortState, setEscortState] = useState<EscortState>(() => {
    if (activeTrip?.state === 'ACTIVE') return 'ACTIVE';
    return 'IDLE';
  });
  const [completedTrip, setCompletedTrip] = useState<TripSession | null>(null);
  const [now, setNow] = useState(Date.now());

  // Prefill state from map popup
  const [prefillDest, setPrefillDest] = useState<string | undefined>();
  const [prefillDestCoords, setPrefillDestCoords] = useState<[number, number] | null>(null);
  const [prefillDep, setPrefillDep] = useState<string | undefined>();
  const [prefillDepCoords, setPrefillDepCoords] = useState<[number, number] | null>(null);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const FAV_KEY = 'brume_fav_routes';
  const [favIds, setFavIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });

  function toggleFav(id: string) {
    setFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  // Load saved routes + recent trips
  useEffect(() => {
    if (!userProfile?.id) return;
    supabase.from('saved_routes').select('*').eq('user_id', userProfile.id)
      .order('last_used_at', { ascending: false }).limit(10)
      .then(({ data }) => setSavedRoutes((data as SavedRoute[]) ?? []));

    supabase.from('trip_log').select('id, to_label, mode, duration_s, danger_score, started_at')
      .eq('user_id', userProfile.id)
      .order('started_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecentTrips((data as RecentTrip[]) ?? []));
  }, [userProfile?.id]);

  // Restore active trip on mount + cleanup on unmount
  useEffect(() => {
    if (activeTrip?.state === 'ACTIVE') {
      const etaMs = new Date(activeTrip.estimatedArrival).getTime();
      if (etaMs > Date.now()) {
        setEscortState('ACTIVE');
        if (!tripMonitor.isRunning()) startMonitor(activeTrip);
      } else {
        completeTrip('expired');
      }
    }
    return () => { /* monitor persists across tab switches, stopped only on completeTrip */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply trip prefill from map popup
  useEffect(() => {
    if (!tripPrefill) return;
    if (tripPrefill.departure !== undefined) { setPrefillDep(tripPrefill.departure); setPrefillDepCoords(tripPrefill.departureCoords ?? null); }
    if (tripPrefill.destination !== undefined) { setPrefillDest(tripPrefill.destination); setPrefillDestCoords(tripPrefill.destCoords ?? null); }
    setEscortState('PLANNING');
    setTripPrefill(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPrefill]);

  // Tick while active
  useEffect(() => {
    if (escortState !== 'ACTIVE') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [escortState]);

  // Auto-expire
  useEffect(() => {
    if (escortState === 'ACTIVE' && activeTrip) {
      const etaMs = new Date(activeTrip.estimatedArrival).getTime();
      if (now >= etaMs) completeTrip('expired');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, escortState]);

  // Monitor event handler
  const handleMonitorEvent = useCallback((event: MonitorEvent) => {
    switch (event.type) {
      case 'nudge':
        setTripNudge(event.message);
        toast(event.message);
        setTimeout(() => setTripNudge(null), 15_000);
        break;
      case 'incident':
        setTripNudge(event.message);
        toast.warning(event.message);
        setTimeout(() => setTripNudge(null), 10_000);
        break;
      case 'arrival':
        toast.success(t('autoArrival'));
        completeTrip('safe');
        break;
      case 'escalate':
        toast.error(`Auto-escalated: ${event.reason}`);
        break;
      case 'checkpoint':
        // Silent — logged for stats
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTripNudge]);

  function startMonitor(session: TripSession) {
    tripMonitor.start(session, handleMonitorEvent);
  }

  function handleRouteSelected(opt: RouteOption, mode: Mode, transitSteps?: TransitStep[]) {
    const routeDurationMs = Math.max(opt.duration * 1000 * 1.25, 5 * 60_000);
    const fromCoords: [number, number] = opt.coords[0] ?? [0, 0];
    const toCoords: [number, number] = opt.coords[opt.coords.length - 1] ?? [0, 0];

    const session: TripSession = {
      id: crypto.randomUUID(),
      state: 'ACTIVE',
      origin: { label: prefillDep || 'Current location', coords: fromCoords },
      destination: { label: opt.label || prefillDest || 'Destination', coords: toCoords },
      mode,
      route: opt,
      transitSteps,
      startedAt: new Date().toISOString(),
      estimatedArrival: new Date(Date.now() + routeDurationMs).toISOString(),
      sharingWithCircle: isSharingLocation,
      incidents: 0,
      nudges: 0,
      escalated: false,
    };

    setActiveTrip(session);
    setActiveRoute({ coords: opt.coords, destination: session.destination.label });
    setPendingRoutes(null);
    setEscortState('ACTIVE');
    startMonitor(session);

    // Register trip on server (fire-and-forget)
    if (userId) {
      fetch('/api/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          from_label: session.origin.label,
          to_label: session.destination.label,
          mode: session.mode,
          origin_lat: fromCoords[1],
          origin_lng: fromCoords[0],
          dest_lat: toCoords[1],
          dest_lng: toCoords[0],
          planned_duration_s: Math.round(opt.duration),
          danger_score: opt.dangerScore,
          distance_m: Math.round(opt.distance),
        }),
      }).then((r) => r.json()).then((data) => {
        if (data.trip_id) {
          // Store server-side trip ID for later use
          const updated = { ...session, id: data.trip_id };
          setActiveTrip(updated);
        }
      }).catch(() => { /* non-critical */ });
    }

    onClose(); // switch to map
  }

  const completeTrip = useCallback(async (reason: 'safe' | 'cancelled' | 'expired') => {
    tripMonitor.stop();
    setTripNudge(null);

    const trip = activeTrip ?? useStore.getState().activeTrip;
    if (trip && userId) {
      const startMs = new Date(trip.startedAt).getTime();
      const durationS = Math.round((Date.now() - startMs) / 1000);
      const status = reason === 'safe' ? 'completed' : reason;

      // Call end API (fire-and-forget)
      fetch('/api/trips/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: trip.id,
          user_id: userId,
          actual_duration_s: durationS,
          incidents_encountered: trip.incidents,
          nudges_sent: trip.nudges,
          escalated: trip.escalated,
          status,
        }),
      }).catch(() => { /* non-critical */ });
    }

    if (reason === 'safe' && trip) {
      // Show summary
      setCompletedTrip({ ...trip, state: 'COMPLETED' });
      setEscortState('COMPLETED');
    } else {
      setEscortState('IDLE');
    }

    setActiveTrip(null);
    setActiveRoute(null);
    setPendingRoutes(null);
    setTransitSegments(null);
    setIsSharingLocation(false);
  }, [activeTrip, userId, setActiveTrip, setActiveRoute, setPendingRoutes, setTransitSegments, setIsSharingLocation]);

  function loadSavedRoute(r: SavedRoute) {
    setPrefillDep(r.from_label ?? '');
    setPrefillDepCoords(null);
    setPrefillDest(r.to_label);
    setPrefillDestCoords(r.coords?.[(r.coords?.length ?? 1) - 1] as [number, number] | null ?? null);
    setShowSaved(false);
    setEscortState('PLANNING');
  }

  async function deleteRoute(id: string) {
    await supabase.from('saved_routes').delete().eq('id', id);
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
    setFavIds((prev) => { const next = new Set(prev); next.delete(id); try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* noop */ } return next; });
  }

  const headerTitle =
    escortState === 'IDLE' ? (showSaved ? 'My Favorites' : t('safetyEscort')) :
    escortState === 'PLANNING' ? t('title') :
    escortState === 'ACTIVE' ? t('activeTrip') :
    t('tripComplete');

  // Mode emoji helper
  const modeEmoji = (m: string) => {
    switch (m) { case 'walk': return '🚶'; case 'bike': return '🚴'; case 'drive': return '🚗'; case 'transit': return '🚇'; default: return '📍'; }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="sheet-motion absolute z-201 flex flex-col overflow-hidden bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-3xl lg:top-2 lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-[380px] lg:max-w-none lg:rounded-2xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 -10px 40px var(--bg-overlay)',
        maxHeight: '72dvh',
        transition: 'max-height 0.3s ease-in-out',
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0 lg:hidden" style={{ backgroundColor: 'var(--border)' }} />

      {/* Header — shown for idle, active, completed */}
      {escortState !== 'PLANNING' && (
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            {escortState === 'IDLE' && showSaved && (
              <button
                onClick={() => setShowSaved(false)}
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              {escortState === 'IDLE' && !showSaved && '🛡️ '}{headerTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="overflow-y-auto px-5 pb-8 lg:flex-1 min-h-0">

        {/* ── PLANNING (RoutePlannerForm) ────────────────────────────── */}
        {escortState === 'PLANNING' && (
          <div className="pt-3">
            <RoutePlannerForm
              onRouteSelected={handleRouteSelected}
              onClose={() => { setEscortState('IDLE'); setPendingRoutes(null); setTransitSegments(null); }}
              initialDestination={prefillDest}
              initialDeparture={prefillDep}
              initialDestCoords={prefillDestCoords}
              initialDepartureCoords={prefillDepCoords}
            />
          </div>
        )}

        {/* ── ACTIVE trip ────────────────────────────────────────────── */}
        {escortState === 'ACTIVE' && activeTrip && (() => {
          const etaMs = new Date(activeTrip.estimatedArrival).getTime();
          const startMs = new Date(activeTrip.startedAt).getTime();
          const remaining = Math.max(0, etaMs - now);
          const progress = 1 - remaining / (etaMs - startMs);
          const critical = remaining < 5 * 60_000;
          return (
            <div className="flex flex-col items-center gap-6 pt-2 pb-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(244,63,94,0.12)' }}>
                    <Navigation size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse" style={{ backgroundColor: '#22c55e', borderColor: 'var(--bg-secondary)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>{t('headingTo')}</p>
                  <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{activeTrip.destination.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t('staySafe')}{userProfile?.display_name ? `, ${userProfile.display_name}` : ''} · ETA {new Date(activeTrip.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isSharingLocation && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                      <Radio size={9} strokeWidth={2.5} />
                      {t('sharingWithCircle')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-full">
                <div className="text-4xl font-black tracking-tight" style={{ color: critical ? '#ef4444' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCountdown(remaining)}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('remaining')}</p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: critical ? '#ef4444' : 'var(--accent)', transition: 'width 1s linear, background-color 0.5s' }} />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <button onClick={() => completeTrip('safe')}
                  className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#22c55e', color: '#fff', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }}>
                  <Check size={18} strokeWidth={2.5} /> {t('endTrip')}
                </button>
                <button onClick={() => completeTrip('cancelled')}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <X size={14} strokeWidth={2} /> {t('cancelTrip')}
                </button>
                <button
                  onClick={() => {
                    const store = useStore.getState();
                    store.setShowSafeSpaces(true);
                    const loc = store.userLocation;
                    if (!loc || store.safeSpaces.length === 0) { toast(t('navigateToSafe')); onClose(); return; }
                    let best = store.safeSpaces[0];
                    let bestDist = Infinity;
                    for (const sp of store.safeSpaces) {
                      const d = haversineMetersLngLat([loc.lng, loc.lat], [sp.lng, sp.lat]);
                      if (d < bestDist) { bestDist = d; best = sp; }
                    }
                    toast(`${best.name} — ${fmtDist(bestDist)} away`); onClose();
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Shield size={14} strokeWidth={2} /> {t('navigateToSafe')}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── COMPLETED — trip summary ───────────────────────────────── */}
        {escortState === 'COMPLETED' && completedTrip && (
          <TripSummary
            trip={completedTrip}
            onDismiss={() => { setCompletedTrip(null); setEscortState('IDLE'); }}
            streak={currentStreak}
          />
        )}

        {/* ── IDLE: Saved panel ──────────────────────────────────────── */}
        {escortState === 'IDLE' && showSaved && (
          <div className="flex flex-col pt-1" style={{ minHeight: 0, flex: 1 }}>
            <SavedPanel
              savedRoutes={savedRoutes}
              favRouteIds={favIds}
              onToggleFavRoute={toggleFav}
              onLoadPlace={(note, as) => {
                const label = note.name || `${note.emoji} ${note.note.slice(0, 30)}`;
                const coords: [number, number] = [note.lng, note.lat];
                if (as === 'from') { setPrefillDep(label); setPrefillDepCoords(coords); }
                else { setPrefillDest(label); setPrefillDestCoords(coords); }
                setShowSaved(false);
                setEscortState('PLANNING');
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

        {/* ── IDLE: Hub ──────────────────────────────────────────────── */}
        {escortState === 'IDLE' && !showSaved && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Walk With Me — main CTA */}
            <button
              onClick={() => { onClose(); setShowWalkWithMe(true); }}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', boxShadow: '0 6px 20px rgba(244,63,94,0.25)' }}
            >
              🚶 {t('walkWithMe')}
            </button>

            {/* Quick Actions row */}
            <div className="flex gap-2">
              <button
                onClick={() => setEscortState('PLANNING')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <Route size={13} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
                {t('planRoute')}
              </button>
              <button
                onClick={() => setShowSaved(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition active:scale-[0.98]"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <Star size={13} strokeWidth={2.5} style={{ color: '#f59e0b' }} />
                My Favorites
              </button>
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
                {t('shareLocation')}
              </div>
              <div className="w-9 h-5 rounded-full relative transition-colors" style={{ backgroundColor: isSharingLocation ? '#6366f1' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: isSharingLocation ? '18px' : '2px' }} />
              </div>
            </button>

            {/* Recent Trips */}
            {recentTrips.length > 0 && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  {t('recentTrips')}
                </p>
                <div className="flex flex-col gap-1.5">
                  {recentTrips.slice(0, 3).map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        setPrefillDest(trip.to_label);
                        setPrefillDestCoords(null);
                        setEscortState('PLANNING');
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition active:scale-[0.98]"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-sm">{modeEmoji(trip.mode)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{trip.to_label}</p>
                        <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                          {Math.round(trip.duration_s / 60)} min · {new Date(trip.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: trip.danger_score === 0 ? 'rgba(34,197,94,0.12)' : trip.danger_score <= 2 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          color: trip.danger_score === 0 ? '#22c55e' : trip.danger_score <= 2 ? '#f59e0b' : '#ef4444',
                        }}>
                        ✓
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Stats */}
            <div className="flex gap-2">
              {recentTrips.length > 0 && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <Flame size={14} strokeWidth={2.5} style={{ color: '#f43f5e' }} />
                  <div>
                    <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      {recentTrips.length} {t('tripsThisWeek')}
                    </p>
                    {currentStreak > 0 && (
                      <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                        {currentStreak} {t('dayStreak')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {recentTrips.length > 0 && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <BarChart3 size={14} strokeWidth={2.5} style={{ color: '#22c55e' }} />
                  <div>
                    <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      {t('avgDanger')}
                    </p>
                    <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                      {(recentTrips.reduce((acc, r) => acc + r.danger_score, 0) / recentTrips.length).toFixed(1)} ({t('low')})
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Alerts indicator */}
            {savedRoutes.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1' }}>
                🔔 {t('smartAlerts')} — {savedRoutes.length} {savedRoutes.length === 1 ? 'route' : 'routes'}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}
