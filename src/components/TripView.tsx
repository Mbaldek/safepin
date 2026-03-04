// src/components/TripView.tsx
// Live Safety Escort hub — 4-state machine:
//   IDLE → PLANNING → ACTIVE → COMPLETED
// Delegates route planning to RoutePlannerForm, trip summary to TripSummary.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Star, ArrowLeft, Route, Signal, User, ChevronRight, Eye, Share2, Shield, Users, MessageCircle } from 'lucide-react';
import SavedPanel from '@/components/SavedPanel';
import RoutePlannerForm, { Mode } from '@/components/RoutePlannerForm';
import TripSummary from '@/components/TripSummary';
import { useStore, RouteOption, TripSession, EscortState } from '@/stores/useStore';
import { SavedRoute } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/stores/useTheme';
import { springTransition, haversineMeters } from '@/lib/utils';
import { useMapPadding } from '@/hooks/useMapPadding';
import { TransitStep } from '@/lib/transit';
import TripChat from '@/components/TripChat';
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

function safeScore(dangerScore: number): number {
  return Math.max(1, Math.round(10 - dangerScore * 2));
}
function safeColor(dangerScore: number) {
  const s = safeScore(dangerScore);
  if (s >= 8) return { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' };
  if (s >= 5) return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' };
  return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' };
}

type RecentTrip = {
  id: string;
  to_label: string;
  mode: string;
  duration_s: number;
  danger_score: number;
  started_at: string;
};

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripView({ onClose }: { onClose: () => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const {
    userProfile, userId, pins, userLocation,
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
  const sheetRef = useRef<HTMLDivElement>(null);
  useMapPadding(sheetRef);

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
  const [showChat, setShowChat] = useState(false);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  // Circle contacts — shown in active trip awareness bar
  const [circleContacts, setCircleContacts] = useState<{ id: string; display_name: string | null }[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from('trusted_contacts').select('*')
      .or(`user_id.eq.${userId},contact_id.eq.${userId}`)
      .eq('status', 'accepted')
      .then(async ({ data }) => {
        if (!data?.length) return;
        const ids = data.map((r) => r.user_id === userId ? r.contact_id : r.user_id);
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
        setCircleContacts(profiles ?? []);
      });
  }, [userId]);

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

  // Sync: when page.tsx signals COMPLETED via store, trigger the full completion flow
  useEffect(() => {
    if (activeTrip?.state === 'COMPLETED' && escortState !== 'COMPLETED') {
      completeTrip('safe');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.state]);

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
    escortState === 'IDLE' ? (showSaved ? t('myFavorites') : t('safetyEscort')) :
    escortState === 'PLANNING' ? t('title') :
    escortState === 'ACTIVE' ? t('activeTrip') :
    t('tripComplete');

  // Mode emoji helper
  const modeEmoji = (m: string) => {
    switch (m) { case 'walk': return '🚶'; case 'bike': return '🚴'; case 'drive': return '🚗'; case 'transit': return '🚇'; default: return '📍'; }
  };

  // Danger mode: >= 3 unresolved incidents within 500 m in last 24 h
  const nearbyIncidentCount = userLocation
    ? pins.filter((p) => {
        if (p.resolved_at) return false;
        if ((Date.now() - new Date(p.created_at).getTime()) > 24 * 3600_000) return false;
        return haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) < 500;
      }).length
    : 0;
  const isDangerMode = nearbyIncidentCount >= 3;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      ref={sheetRef}
      className={`sheet-motion absolute z-201 flex flex-col overflow-hidden bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-[380px] lg:max-w-none lg:rounded-2xl ${escortState !== 'IDLE' || showSaved ? 'lg:top-2' : ''}`}
      style={{
        backgroundColor: C.elevated,
        boxShadow: isDark ? '0 -10px 40px rgba(0,0,0,0.4)' : '0 -10px 40px rgba(0,0,0,0.08)',
        ...((escortState !== 'IDLE' || showSaved) ? { maxHeight: '72dvh' } : {}),
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0 lg:hidden" style={{ backgroundColor: C.border }} />

      {/* Header — saved panel + completed */}
      {(escortState === 'IDLE' && showSaved || escortState === 'COMPLETED') && (
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            {escortState === 'IDLE' && showSaved && (
              <button
                onClick={() => setShowSaved(false)}
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <ArrowLeft size={14} style={{ color: C.textSecondary }} />
              </button>
            )}
            <h2 className="text-base font-black" style={{ color: C.textPrimary }}>{headerTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80"
            style={{ color: C.textSecondary, border: `1px solid ${C.border}` }}
          >
            ✕ {t('close')}
          </button>
        </div>
      )}

      {/* Active trip top HUD — elapsed + status chip + Terminer */}
      {escortState === 'ACTIVE' && activeTrip && (
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          {/* Elapsed timer */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isDangerMode ? '#f4a940' : '#22c55e' }} />
            <span className="text-base font-semibold" style={{ color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {formatCountdown(Math.max(0, now - new Date(activeTrip.startedAt).getTime()))}
            </span>
          </div>
          {/* Status badge */}
          {isDangerMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(244,169,64,0.15)', border: '1px solid #f4a940' }}>
              <span className="text-xs font-semibold" style={{ color: '#f4a940' }}>⚠️ {t('dangerZone')}</span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f4a940' }} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(107,166,142,0.15)', border: '1px solid #22c55e' }}>
              <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>{t('enRoute')}</span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }} />
            </div>
          )}
          {/* Terminer */}
          <button
            onClick={() => completeTrip('safe')}
            className="text-[0.8125rem] font-medium transition hover:opacity-80"
            style={{ color: 'rgba(239,68,68,0.7)' }}
          >
            {t('cancelTrip')}
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="overflow-y-auto px-5 pb-4 lg:flex-1 min-h-0">

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
          const progress = Math.min(1, 1 - remaining / (etaMs - startMs));

          async function shareLink() {
            const url = `${window.location.origin}/track/${activeTrip!.id}`;
            try {
              await navigator.share({ title: 'Mon trajet Breveil', url });
            } catch {
              try { await navigator.clipboard.writeText(url); toast.success('Lien copié !'); } catch { /* noop */ }
            }
          }

          return (
            <div className="flex flex-col gap-4 pt-2 pb-2">

              {/* RouteSummaryCard */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                  ...(isDangerMode ? { borderLeft: '3px solid #f4a940' } : {}),
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{modeEmoji(activeTrip.mode)}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>
                      {activeTrip.destination.label}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium" style={{ color: FIXED.accentCyan }}>
                        ~{Math.ceil(remaining / 60_000)} min
                      </span>
                      <span className="text-xs" style={{ color: C.textSecondary }}>
                        · {fmtDist(Math.max(0, activeTrip.route.distance * (1 - progress)))} {t('remaining')}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Progress bar with dot indicator */}
                <div className="relative h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress * 100}%`, backgroundColor: FIXED.accentCyan }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow"
                    style={{ left: `calc(${progress * 100}% - 5px)`, background: '#FFFFFF' }}
                  />
                </div>
                {isDangerMode && (
                  <p className="text-[0.6875rem] mt-2.5" style={{ color: '#f4a940' }}>
                    {t('dangerTip')}
                  </p>
                )}
              </div>

              {/* SafetyContextStrip */}
              <div className="flex gap-2">
                <div
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-center"
                  style={{
                    backgroundColor: isDangerMode ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${isDangerMode ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.20)'}`,
                  }}
                >
                  <span className="text-xs font-medium leading-tight" style={{ color: isDangerMode ? '#ef4444' : '#f59e0b' }}>
                    {t('signalements', { n: nearbyIncidentCount })}
                  </span>
                </div>
                <div
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}
                >
                  <span className="text-xs font-medium leading-tight" style={{ color: '#22c55e' }}>
                    {t('connectedContacts', { n: circleContacts.length })}
                  </span>
                </div>
                <div
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-center"
                  style={{
                    backgroundColor: isDangerMode ? 'rgba(244,169,64,0.10)' : 'rgba(107,166,142,0.10)',
                    border: `1px solid ${isDangerMode ? 'rgba(244,169,64,0.25)' : 'rgba(107,166,142,0.25)'}`,
                  }}
                >
                  <span className="text-xs font-medium leading-tight" style={{ color: isDangerMode ? '#f4a940' : '#6ba68e' }}>
                    {isDangerMode ? `⚠️ ${t('dangerZone')}` : `✓ ${t('activeZone')}`}
                  </span>
                </div>
              </div>

              {/* CircleAwareness */}
              {circleContacts.length > 0 && (
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
                >
                  <div className="flex -space-x-2 shrink-0">
                    {circleContacts.slice(0, 4).map((c, i) => (
                      <div
                        key={c.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5625rem] font-semibold text-white"
                        style={{
                          zIndex: 4 - i,
                          backgroundColor: 'rgba(139,126,200,0.6)',
                          border: `2px solid ${C.elevated}`,
                        }}
                      >
                        {(c.display_name?.[0] ?? '?').toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="flex-1 text-[0.6875rem]" style={{ color: C.textSecondary }}>
                    {circleContacts.length === 1
                      ? `${circleContacts[0].display_name?.split(' ')[0] ?? '?'} ${t('followingYou')}`
                      : circleContacts.length === 2
                      ? `${circleContacts[0].display_name?.split(' ')[0] ?? '?'}, ${circleContacts[1].display_name?.split(' ')[0] ?? '?'} ${t('followingYou')}`
                      : `${circleContacts[0].display_name?.split(' ')[0] ?? '?'}, ${circleContacts[1].display_name?.split(' ')[0] ?? '?'} ${t('andMore', { n: circleContacts.length - 2 })} ${t('followingYou')}`}
                  </span>
                  <Eye size={14} className="shrink-0" style={{ color: C.textSecondary }} />
                </div>
              )}

              {/* Partager le lien — full width */}
              <button
                onClick={shareLink}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
                style={{ border: `1px solid ${C.border}`, backgroundColor: C.card }}
              >
                <Share2 size={15} style={{ color: C.textSecondary }} />
                <span className="text-sm" style={{ color: C.textPrimary }}>{t('shareLink')}</span>
              </button>

              {/* Trip Chat */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: C.elevated, border: `1px solid ${C.border}` }}
              >
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} style={{ color: C.textSecondary }} />
                    <span className="text-sm" style={{ color: C.textPrimary }}>{t('tripChat') ?? 'Messages'}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    style={{ color: C.textSecondary, transform: showChat ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </button>
                {showChat && activeTrip && (
                  <div className="px-4 pb-3">
                    <TripChat tripId={activeTrip.id} />
                  </div>
                )}
              </div>

              {/* SOS + Arrived */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="w-[30%] h-12 rounded-full flex items-center justify-center transition active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <span className="text-sm font-bold" style={{ color: '#ef4444' }}>SOS</span>
                </button>
                <button
                  onClick={() => completeTrip('safe')}
                  className="flex-1 h-12 rounded-xl flex items-center justify-center transition active:scale-[0.98]"
                  style={{ backgroundColor: FIXED.accentCyan }}
                >
                  <span className="text-sm font-semibold" style={{ color: '#000' }}>{t('arrived')} ✓</span>
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
        {escortState === 'IDLE' && !showSaved && (() => {
          const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const modeIconBg = (m: string) => {
            switch (m) {
              case 'walk':    return 'rgba(245,158,11,0.15)';
              case 'bike':    return 'rgba(59,130,246,0.15)';
              case 'drive':   return 'rgba(245,158,11,0.15)';
              case 'transit': return 'rgba(99,102,241,0.15)';
              default:        return 'rgba(255,255,255,0.08)';
            }
          };
          const modeIconRing = (m: string) => {
            switch (m) {
              case 'walk':    return 'rgba(245,158,11,0.3)';
              case 'bike':    return 'rgba(59,130,246,0.3)';
              case 'drive':   return 'rgba(245,158,11,0.3)';
              case 'transit': return 'rgba(99,102,241,0.3)';
              default:        return 'rgba(255,255,255,0.12)';
            }
          };
          return (
            <div className="flex flex-col gap-4 pt-1">

              {/* Inline header — Mon trajet + time + close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold" style={{ color: C.textPrimary }}>{t('monTrajet')}</h1>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: C.card }}>
                    <span className="text-xs" style={{ color: C.textSecondary }}>{currentTime}</span>
                    <Signal size={12} strokeWidth={1.5} style={{ color: C.textSecondary }} />
                  </div>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full transition hover:opacity-60" style={{ color: C.textSecondary }}>
                  <X size={20} />
                </button>
              </div>

              {/* Walk With Me — main CTA (gradient) */}
              <button
                onClick={() => { onClose(); setShowWalkWithMe(true); }}
                className="group w-full rounded-2xl flex items-center gap-4 px-4 py-3.5 transition active:scale-[0.98] gradient-accent"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <Users size={20} style={{ color: '#fff' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[0.9375rem] font-semibold block" style={{ color: '#fff' }}>{t('walkWithMe')}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('walkWithMeSubtitle')}</span>
                </div>
                <ChevronRight size={20} className="shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>

              {/* Plan / Favorites — segmented control */}
              <div className="flex p-1 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <button
                  onClick={() => setEscortState('PLANNING')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: C.textPrimary }}
                >
                  <Route size={15} />
                  {t('plan')}
                </button>
                <button
                  onClick={() => setShowSaved(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition active:scale-[0.98]"
                  style={{ color: C.textSecondary }}
                >
                  <Star size={15} />
                  {t('myFavorites')}
                  {savedRoutes.length > 0 && (
                    <span className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(232,168,56,0.12)', color: FIXED.accentCyan }}>
                      {savedRoutes.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Circle share toggle */}
              <button
                onClick={() => setIsSharingLocation(!isSharingLocation)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition active:scale-[0.98]"
                style={{
                  backgroundColor: isSharingLocation ? 'rgba(34,197,94,0.08)' : C.card,
                  border: `1px solid ${isSharingLocation ? 'rgba(34,197,94,0.25)' : C.border}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Signal size={15} style={{ color: isSharingLocation ? '#22c55e' : C.textSecondary }} />
                  <span className="text-sm" style={{ color: C.textPrimary }}>{t('shareWithCircle')}</span>
                </div>
                <div className="w-10 h-5.5 rounded-full relative transition-colors duration-200 shrink-0" style={{ backgroundColor: isSharingLocation ? '#22c55e' : 'rgba(255,255,255,0.15)' }}>
                  <div className="absolute top-0.75 w-4 h-4 rounded-full shadow-sm transition-all duration-200" style={{ left: isSharingLocation ? '21px' : '3px', background: '#FFFFFF' }} />
                </div>
              </button>

              {/* Recent Trips */}
              {recentTrips.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                      {t('recentTrips')}
                    </span>
                    <button
                      onClick={() => setShowSaved(true)}
                      className="text-xs font-medium flex items-center gap-0.5 transition hover:opacity-70"
                      style={{ color: FIXED.accentCyan }}
                    >
                      {t('seeAll')} <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {recentTrips.slice(0, 3).map((trip) => {
                      const col = safeColor(trip.danger_score);
                      const sc = safeScore(trip.danger_score);
                      return (
                        <button
                          key={trip.id}
                          onClick={() => { setPrefillDest(trip.to_label); setPrefillDestCoords(null); setEscortState('PLANNING'); }}
                          className="group flex items-center gap-3 p-2.5 rounded-xl text-left transition active:scale-[0.98]"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
                            style={{ backgroundColor: modeIconBg(trip.mode), border: `2px solid ${modeIconRing(trip.mode)}` }}
                          >
                            {modeEmoji(trip.mode)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: C.textPrimary }}>{trip.to_label}</p>
                            <p className="text-xs" style={{ color: C.textSecondary }}>
                              {new Date(trip.started_at).toLocaleDateString('fr-FR', { weekday: 'short' })} · {Math.round(trip.duration_s / 60)} min
                            </p>
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-semibold shrink-0"
                            style={{ backgroundColor: col.bg, color: col.text }}
                          >
                            {sc}
                          </div>
                          <ChevronRight size={16} className="shrink-0 group-hover:translate-x-0.5 transition-all" style={{ color: C.textSecondary }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stats row */}
              {recentTrips.length > 0 && (
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(232,168,56,0.12)' }}>
                      <Route size={14} style={{ color: FIXED.accentCyan }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none" style={{ color: C.textPrimary }}>{recentTrips.length}</p>
                      <p className="text-[0.625rem] mt-0.5" style={{ color: C.textSecondary }}>{t('tripsThisWeek')}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                      <Shield size={14} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none" style={{ color: '#22c55e' }}>
                        {(recentTrips.reduce((acc, r) => acc + safeScore(r.danger_score), 0) / recentTrips.length).toFixed(1)}
                      </p>
                      <p className="text-[0.625rem] mt-0.5" style={{ color: C.textSecondary }}>{t('safetyAvgLabel')}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

      </div>
    </motion.div>
  );
}
