// src/components/EmergencyButton.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { haversineMeters } from '@/lib/utils';
import { geocodeReverse } from '@/lib/geocode';
import type { SafeSpace } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Phase = 'idle' | 'countdown' | 'active';
type DispatchResult = { contact_id: string; contact_name: string | null; status: string };

const DANGER_RED = '#E63946';
const SAGE_GREEN = '#6BA68E';
const TRAIL_MIN_DIST_M = 30;
const TRAIL_MIN_TIME_MS = 45_000;
const RING_CIRCUMFERENCE = 163.36; // 2π × 26

const EMERGENCY_NUMBERS = [
  { num: '15',  labelKey: 'numbers.samu'   as const },
  { num: '17',  labelKey: 'numbers.police' as const },
  { num: '18',  labelKey: 'numbers.fire'   as const },
  { num: '112', labelKey: 'numbers.eu'     as const },
] as const;

// ─── Dispatch to trusted contacts via Edge Function ─────────────────────────
async function dispatchToContacts(
  action: string, userId: string, pinId: string,
  lat: number, lng: number, displayName: string | null, sessionId: string,
): Promise<{ dispatched: number; contacts: DispatchResult[] } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/emergency-dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, user_id: userId, pin_id: pinId, lat, lng, display_name: displayName, session_id: sessionId }),
    });
    if (res.ok) return await res.json();
    return null;
  } catch { return null; }
}

// ─── OSRM walking route ──────────────────────────────────────────────────────
async function fetchWalkingEta(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`,
    );
    const data = await res.json();
    return data.routes?.[0]?.duration ?? null; // seconds
  } catch { return null; }
}

function formatEta(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EmergencyButton({ userId }: { userId: string | null }) {
  const { userLocation, setUserLocation } = useStore();
  const t = useTranslations('emergency');

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(5);
  const [animKey, setAnimKey] = useState(0);
  const [dispatchResults, setDispatchResults] = useState<DispatchResult[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [fabHoldProgress, setFabHoldProgress] = useState(0);

  // Active phase state
  const [nearestSafeSpace, setNearestSafeSpace] = useState<SafeSpace | null>(null);
  const [etaText, setEtaText] = useState('');
  const [etaDurationSec, setEtaDurationSec] = useState(0);
  const [routeProgress, setRouteProgress] = useState(0);
  const [resolving, setResolving] = useState(false);

  // Safe-hold refs (1-second hold to confirm I'm safe — kept for accessibility)
  const safeHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeHoldAnimRef = useRef<number | null>(null);
  const [safeHoldProgress, setSafeHoldProgress] = useState(0);

  // FAB hold refs (3-second hold to activate countdown)
  const fabHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fabHoldAnimRef = useRef<number | null>(null);

  // Location + session refs
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const emergencyPinIdsRef = useRef<string[]>([]);
  const lastPinLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPinTimeRef = useRef<number>(0);
  const dispatchSessionRef = useRef<string | null>(null);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeStartTimeRef = useRef<number>(0);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (userLocation) locationRef.current = userLocation;
  }, [userLocation]);

  // ─── Active phase: nearest safe space + OSRM ETA + realtime ──────────────
  useEffect(() => {
    if (phase !== 'active') {
      if (routeTimerRef.current) clearInterval(routeTimerRef.current);
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
      setNearestSafeSpace(null);
      setEtaText('');
      setRouteProgress(0);
      return;
    }

    // Find nearest safe space from store
    const spaces = useStore.getState().safeSpaces;
    const loc = locationRef.current;

    if (loc && spaces.length > 0) {
      const nearest = spaces.reduce((best, space) => {
        const d = haversineMeters(loc, { lat: space.lat, lng: space.lng });
        const dBest = haversineMeters(loc, { lat: best.lat, lng: best.lng });
        return d < dBest ? space : best;
      });
      setNearestSafeSpace(nearest);

      // OSRM walking ETA
      fetchWalkingEta(loc, { lat: nearest.lat, lng: nearest.lng }).then((sec) => {
        if (!sec) { setEtaText('--:--'); return; }
        setEtaDurationSec(sec);
        setEtaText(formatEta(sec));
        // Animate progress bar from 0 over the route duration
        routeStartTimeRef.current = Date.now();
        routeTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - routeStartTimeRef.current) / 1000;
          const pct = Math.min((elapsed / sec) * 100, 95);
          setRouteProgress(pct);
        }, 3000);
      });
    }

    // Realtime on emergency_dispatches — close sheet if resolved externally
    if (userId) {
      const ch = supabase
        .channel('emergency-status')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergency_dispatches', filter: `user_id=eq.${userId}` },
          (payload) => {
            if ((payload.new as { resolved_at: string | null }).resolved_at) {
              // Resolved from another device/contact — clean up
              if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
              emergencyPinIdsRef.current = [];
              dispatchSessionRef.current = null;
              setPhase('idle');
            }
          },
        )
        .subscribe();
      realtimeRef.current = ch;
    }

    return () => {
      if (routeTimerRef.current) clearInterval(routeTimerRef.current);
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
  }, [phase, userId]);

  // ─── Geocode + patch pin description ─────────────────────────────────────
  async function geocodeAndPatchPin(pinId: string, loc: { lat: number; lng: number }) {
    try {
      const address = await geocodeReverse(loc.lng, loc.lat);
      if (address) {
        await supabase.from('pins').update({
          description: `🆘 EMERGENCY ALERT — I need help\n📍 ~${address} (approximate)`,
        }).eq('id', pinId);
      }
    } catch { /* non-critical */ }
  }

  // ─── Trail pin ────────────────────────────────────────────────────────────
  async function createTrailPin(loc: { lat: number; lng: number }) {
    if (!userId) return;
    const { data, error } = await supabase.from('pins').insert({
      user_id: userId, lat: loc.lat, lng: loc.lng,
      category: 'other', severity: 'high',
      description: '🆘 EMERGENCY ALERT — I need help',
      is_emergency: true, photo_url: null,
    }).select().single();
    if (error) return;
    emergencyPinIdsRef.current.push(data.id);
    geocodeAndPatchPin(data.id, loc);
  }

  // ─── watchPosition callback ───────────────────────────────────────────────
  function handlePositionUpdate(pos: GeolocationPosition) {
    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setUserLocation(newLoc);
    locationRef.current = newLoc;
    const now = Date.now();
    const timeSinceLast = now - lastPinTimeRef.current;
    const distSinceLast = lastPinLocRef.current
      ? haversineMeters(lastPinLocRef.current, newLoc) : Infinity;
    if (timeSinceLast < TRAIL_MIN_TIME_MS || distSinceLast < TRAIL_MIN_DIST_M) return;
    lastPinTimeRef.current = now;
    lastPinLocRef.current = newLoc;
    createTrailPin(newLoc);
  }

  // ─── Send alert ───────────────────────────────────────────────────────────
  async function sendAlert() {
    if (!userId || !locationRef.current) { setPhase('idle'); return; }

    navigator.vibrate?.([200, 100, 200, 100, 400]);

    const loc = locationRef.current;
    const { data, error } = await supabase.from('pins').insert({
      user_id: userId, lat: loc.lat, lng: loc.lng,
      category: 'other', severity: 'high',
      description: '🆘 EMERGENCY ALERT — I need help',
      is_emergency: true, photo_url: null,
    }).select().single();

    if (error) {
      toast.error('Could not send the alert. Check your connection and try again.');
      setPhase('idle');
      return;
    }

    emergencyPinIdsRef.current = [data.id];
    lastPinLocRef.current = loc;
    lastPinTimeRef.current = Date.now();

    const sessionId = crypto.randomUUID();
    dispatchSessionRef.current = sessionId;
    const displayName = useStore.getState().userProfile?.display_name ?? null;
    setDispatchResults([]);
    dispatchToContacts('dispatch', userId, data.id, loc.lat, loc.lng, displayName, sessionId)
      .then((res) => { if (res?.contacts) setDispatchResults(res.contacts); });

    escalationTimerRef.current = setTimeout(() => {
      if (emergencyPinIdsRef.current.length > 0) {
        dispatchToContacts('escalate', userId, data.id, loc.lat, loc.lng, displayName, sessionId);
      }
    }, 15 * 60 * 1000);

    useStore.getState().setShowSafeSpaces(true);
    geocodeAndPatchPin(data.id, loc);

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate, () => {}, { enableHighAccuracy: true, maximumAge: 15_000 }
      );
    }

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 2000);
    setPhase('active');
  }

  // ─── Resolve ("I'm safe") ─────────────────────────────────────────────────
  const resolve = useCallback(async () => {
    setResolving(true);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    const ids = emergencyPinIdsRef.current;
    if (ids.length > 0) {
      await supabase.from('pins').update({ resolved_at: new Date().toISOString() }).in('id', ids);
    }
    if (userId && ids.length > 0 && dispatchSessionRef.current) {
      const displayName = useStore.getState().userProfile?.display_name ?? null;
      await dispatchToContacts('resolve', userId, ids[0], 0, 0, displayName, dispatchSessionRef.current);
    }
    if (escalationTimerRef.current) {
      clearTimeout(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    emergencyPinIdsRef.current = [];
    lastPinLocRef.current = null;
    dispatchSessionRef.current = null;
    navigator.vibrate?.([100]);
    setResolving(false);
    setPhase('idle');
    toast.success(`✅ ${t('safeConfirmed')}`);
  }, [userId, t]);

  // ─── Share current location ───────────────────────────────────────────────
  async function handleShare() {
    const loc = locationRef.current;
    if (!loc) return;
    try {
      await navigator.share({
        title: 'Breveil SOS',
        text: `🆘 ${t('description')}`,
        url: `https://maps.google.com/?q=${loc.lat},${loc.lng}`,
      });
    } catch { /* user dismissed */ }
  }

  // ─── Fly to nearest safe space ───────────────────────────────────────────
  function handleFlyToSafeSpace() {
    if (!nearestSafeSpace) return;
    useStore.getState().setMapFlyTo({ lat: nearestSafeSpace.lat, lng: nearestSafeSpace.lng, zoom: 17 });
  }

  // ─── "I'm safe" hold handlers (1 second, kept for safety UX) ─────────────
  function handleSafePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const start = Date.now();
    safeHoldAnimRef.current = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / 1000, 1);
      setSafeHoldProgress(pct);
      if (pct < 1) { safeHoldAnimRef.current = requestAnimationFrame(tick); }
    });
    safeHoldRef.current = setTimeout(() => { setSafeHoldProgress(0); resolve(); }, 1000);
  }

  function handleSafePointerUp() {
    if (safeHoldRef.current) { clearTimeout(safeHoldRef.current); safeHoldRef.current = null; }
    if (safeHoldAnimRef.current) { cancelAnimationFrame(safeHoldAnimRef.current); safeHoldAnimRef.current = null; }
    setSafeHoldProgress(0);
  }

  // ─── Countdown ────────────────────────────────────────────────────────────
  function startCountdown() {
    navigator.vibrate?.([100, 50, 100]);
    setPhase('countdown');
    setAnimKey(1);

    let remaining = 5;
    setCount(remaining);

    intervalRef.current = setInterval(() => {
      remaining--;
      navigator.vibrate?.([30]);
      setAnimKey((k) => k + 1);
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setCount(0);
        sendAlert();
      } else {
        setCount(remaining);
      }
    }, 1000);
  }

  function cancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setCount(5);
    setAnimKey(0);
  }

  // ─── Check contacts + start ───────────────────────────────────────────────
  async function checkContactsAndStart() {
    const { count } = await supabase
      .from('trusted_contacts')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},contact_user_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (count === 0) toast.warning(t('noTrustedContacts'));
    startCountdown();
  }

  // ─── handleTap (called after FAB hold completes) ──────────────────────────
  function handleTap() {
    if (!userId) { toast.error(t('signInFirst')); return; }
    if (locationRef.current) { checkContactsAndStart(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locationRef.current = loc;
        setUserLocation(loc);
        checkContactsAndStart();
      },
      () => { toast.error(t('locationRequired')); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // ─── FAB hold-to-activate (3 seconds) ────────────────────────────────────
  function handleFabPointerDown(e: React.PointerEvent) {
    if (phase !== 'idle') return;
    e.preventDefault();
    const start = Date.now();
    fabHoldAnimRef.current = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / 3000, 1);
      setFabHoldProgress(pct);
      if (pct < 1) { fabHoldAnimRef.current = requestAnimationFrame(tick); }
    });
    fabHoldTimerRef.current = setTimeout(() => {
      setFabHoldProgress(0);
      handleTap();
    }, 3000);
  }

  function handleFabPointerUp() {
    if (fabHoldTimerRef.current) { clearTimeout(fabHoldTimerRef.current); fabHoldTimerRef.current = null; }
    if (fabHoldAnimRef.current) { cancelAnimationFrame(fabHoldAnimRef.current); fabHoldAnimRef.current = null; }
    setFabHoldProgress(0);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Hold progress — centered overlay, above the thumb ──────── */}
      {phase === 'idle' && fabHoldProgress > 0 && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: `rgba(230,57,70,${fabHoldProgress * 0.10})` }}
        >
          <p className="text-white text-sm font-medium mb-5 tracking-wide">
            Maintiens pour déclencher l&apos;alerte
          </p>
          {/* SVG circular ring — r=40, circumference≈251px */}
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r="40"
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
            <circle cx="50" cy="50" r="40"
              fill="none" stroke={DANGER_RED} strokeWidth="5"
              strokeDasharray={251}
              strokeDashoffset={251 * (1 - fabHoldProgress)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
        </div>
      )}

      {/* ── Countdown overlay — v0 design ───────────────────────────── */}
      {phase === 'countdown' && (
        <div
          className="absolute inset-0 z-400 flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 35%, rgba(230,57,70,0.15) 0%, #1B2541 60%)` }}
        >
          {/* Breveil wordmark */}
          <header className="px-6 pt-5">
            <span
              className="font-serif text-[14px] font-light tracking-[3px]"
              style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Cormorant Garamond', serif" }}
            >
              BREVEIL
            </span>
          </header>

          {/* Countdown center */}
          <div className="flex flex-1 flex-col items-center justify-center gap-0 px-6">
            <div className="relative flex items-center justify-center">
              <div
                key={`ring-${animKey}`}
                className="animate-ring-expand absolute rounded-full"
                style={{ width: 140, height: 140, border: `1.5px solid ${DANGER_RED}`, opacity: 0.3 }}
              />
              <span
                key={`num-${animKey}`}
                className="animate-countdown-pulse select-none font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 120, lineHeight: 1,
                  color: count === 0 ? 'rgba(255,255,255,0.2)' : DANGER_RED,
                  transition: 'color 0.3s ease',
                }}
              >
                {count}
              </span>
            </div>
            <p className="mt-3 text-[16px] font-medium" style={{ color: 'rgba(255,255,255,0.95)' }}>
              {t('alerting')}
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {t('locationShared')}
            </p>
          </div>

          {/* Emergency numbers + Cancel */}
          <div className="px-6 pb-6">
            <div className="flex items-start justify-between">
              {EMERGENCY_NUMBERS.map(({ num, labelKey }) => (
                <a
                  key={num}
                  href={`tel:${num}`}
                  className="flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, backgroundColor: 'rgba(230,57,70,0.1)', border: `1.5px solid rgba(230,57,70,0.25)` }}
                  >
                    <span className="font-sans text-[22px] font-bold" style={{ color: DANGER_RED }}>{num}</span>
                  </div>
                  <span className="font-sans text-[10px] font-medium uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t(labelKey)}
                  </span>
                </a>
              ))}
            </div>
            <button
              onClick={cancel}
              className="mt-8 w-full rounded-[14px] text-[16px] font-bold uppercase tracking-[1px] transition-all duration-200 hover:brightness-125 active:scale-[0.98]"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '18px' }}
            >
              {t('cancelCountdown')}
            </button>
          </div>
        </div>
      )}

      {/* ── Active phase — SOS bottom sheet (v0 design) ─────────────── */}
      {phase === 'active' && (
        <>
          {/* Dim overlay (non-interactive, map still visible) */}
          <div className="absolute inset-0 z-350 pointer-events-none" style={{ backgroundColor: 'rgba(15,23,41,0.45)' }} />

          {/* Bottom sheet */}
          <div
            className="absolute inset-x-0 bottom-0 z-360 animate-slide-up rounded-t-3xl px-5 pb-8 pt-2"
            style={{ backgroundColor: '#1B2541', boxShadow: '0 -8px 40px rgba(0,0,0,0.45)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="rounded-full" style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Alert banner — realtime-updated contact list */}
            <div
              className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)' }}
            >
              <span className="shrink-0 text-[14px]" aria-hidden="true">⚠️</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: DANGER_RED }}>
                  {t('activeBanner')}
                </p>
                {dispatchResults.length > 0 && (
                  <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {dispatchResults.map((r) => r.contact_name ?? t('numbers.samu')).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Route card — nearest safe space with OSRM ETA */}
            {nearestSafeSpace && (
              <div
                className="mt-3 rounded-[14px] p-3.5"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'rgba(230,57,70,0.1)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M8 1L10.5 6H14L11 9.5L12.5 14.5L8 11.5L3.5 14.5L5 9.5L2 6H5.5L8 1Z"
                          stroke={DANGER_RED} strokeWidth="1.2" strokeLinejoin="round" fill={`${DANGER_RED}30`} />
                      </svg>
                    </div>
                    <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('enRouteTo')} {nearestSafeSpace.name}
                    </span>
                  </div>
                  {etaText && (
                    <span className="shrink-0 pt-0.5 text-[13px] font-medium tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      ETA {etaText}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3.5">
                  <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-3000 ease-out"
                      style={{ width: `${routeProgress}%`, backgroundColor: DANGER_RED }}
                    />
                  </div>
                  {etaText && (
                    <p className="mt-1.5 text-right text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {etaText}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3.5 flex gap-2">
              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 rounded-xl py-3 text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]"
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                {t('share')}
              </button>

              {/* Safe space */}
              <button
                type="button"
                onClick={handleFlyToSafeSpace}
                disabled={!nearestSafeSpace}
                className="flex-1 rounded-xl py-3 text-[13px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                {t('safeSpot')}
              </button>

              {/* I'm safe — hold 1 second */}
              <button
                type="button"
                onPointerDown={handleSafePointerDown}
                onPointerUp={handleSafePointerUp}
                onPointerCancel={handleSafePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                disabled={resolving}
                className="relative flex-[1.4] overflow-hidden rounded-xl py-3 text-[13px] font-bold select-none touch-none transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
                style={{ backgroundColor: SAGE_GREEN, color: '#FFFFFF', border: '1px solid transparent' }}
              >
                {safeHoldProgress > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: `${safeHoldProgress * 100}%`, transition: 'none' }}
                  />
                )}
                <span className="relative z-10">
                  {resolving ? '…' : safeHoldProgress > 0 ? 'Hold…' : `✓ ${t('imSafe')}`}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Red flash after SOS triggers ────────────────────────────── */}
      {showFlash && (
        <div
          className="absolute inset-0 z-500 pointer-events-none"
          style={{ backgroundColor: '#ef4444', opacity: 0.6, animation: 'flash-fade 2s ease-out forwards' }}
        />
      )}

      {/* ── FAB — hold 3 seconds to activate ────────────────────────── */}
      <button
        onPointerDown={handleFabPointerDown}
        onPointerUp={handleFabPointerUp}
        onPointerLeave={handleFabPointerUp}
        onPointerCancel={handleFabPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        data-tour="sos-button"
        disabled={phase !== 'idle'}
        className={`absolute bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl select-none touch-none ${
          phase === 'idle' ? 'animate-sos-glow' : 'opacity-50'
        }`}
        style={{ backgroundColor: DANGER_RED, color: 'white' }}
        aria-label="Emergency alert — hold 3 seconds to activate"
      >
        {fabHoldProgress > 0 && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 56 56" fill="none">
            <circle
              cx="28" cy="28" r="26"
              stroke="white" strokeWidth="1.5"
              strokeDasharray={`${fabHoldProgress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              opacity="0.35"
            />
          </svg>
        )}
        🆘
      </button>
    </>
  );
}
