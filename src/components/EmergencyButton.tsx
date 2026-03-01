// src/components/EmergencyButton.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { haversineMeters } from '@/lib/utils';
import { geocodeReverse } from '@/lib/geocode';

type Phase = 'idle' | 'countdown' | 'active';
type DispatchResult = { contact_id: string; contact_name: string | null; status: string };

const DANGER_RED = '#E63946';
const TRAIL_MIN_DIST_M = 30;
const TRAIL_MIN_TIME_MS = 45_000;
// Circumference of progress ring: 2π × 26
const RING_CIRCUMFERENCE = 163.36;

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

export default function EmergencyButton({ userId }: { userId: string | null }) {
  const { userLocation, setUserLocation } = useStore();
  const t = useTranslations('emergency');

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(5);
  const [animKey, setAnimKey] = useState(0);
  const [dispatchResults, setDispatchResults] = useState<DispatchResult[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [fabHoldProgress, setFabHoldProgress] = useState(0);

  // Safe-hold refs (1-second hold to confirm I'm safe)
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

  useEffect(() => {
    if (userLocation) locationRef.current = userLocation;
  }, [userLocation]);

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
  async function resolve() {
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
      dispatchToContacts('resolve', userId, ids[0], 0, 0, displayName, dispatchSessionRef.current);
    }
    if (escalationTimerRef.current) {
      clearTimeout(escalationTimerRef.current);
      escalationTimerRef.current = null;
    }
    emergencyPinIdsRef.current = [];
    lastPinLocRef.current = null;
    dispatchSessionRef.current = null;
    navigator.vibrate?.([100]);
    setPhase('idle');
    toast.success(`✅ ${t('resolved')}`);
  }

  // ─── "I'm safe" hold handlers (1 second) ─────────────────────────────────
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
      navigator.vibrate?.([30]); // haptic per tick
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

  // ─── Original handleTap (called after hold completes) ────────────────────
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
              {/* Expanding ring */}
              <div
                key={`ring-${animKey}`}
                className="animate-ring-expand absolute rounded-full"
                style={{ width: 140, height: 140, border: `1.5px solid ${DANGER_RED}`, opacity: 0.3 }}
              />
              {/* Number */}
              <span
                key={`num-${animKey}`}
                className="animate-countdown-pulse select-none font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 120,
                  lineHeight: 1,
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
                    style={{
                      width: 64,
                      height: 64,
                      backgroundColor: 'rgba(230,57,70,0.1)',
                      border: `1.5px solid rgba(230,57,70,0.25)`,
                    }}
                  >
                    <span className="font-sans text-[22px] font-bold" style={{ color: DANGER_RED }}>
                      {num}
                    </span>
                  </div>
                  <span
                    className="font-sans text-[10px] font-medium uppercase tracking-[1px]"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {t(labelKey)}
                  </span>
                </a>
              ))}
            </div>

            <button
              onClick={cancel}
              className="mt-8 w-full rounded-[14px] text-[16px] font-bold uppercase tracking-[1px] transition-all duration-200 hover:brightness-125 active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                padding: '18px',
              }}
            >
              {t('cancelCountdown')}
            </button>
          </div>
        </div>
      )}

      {/* ── Active phase — bottom sheet ──────────────────────────────── */}
      {phase === 'active' && (
        <>
          {/* Dim overlay */}
          <div
            className="absolute inset-0 z-350 pointer-events-none"
            style={{ backgroundColor: 'rgba(15,23,41,0.5)' }}
          />

          {/* Bottom sheet */}
          <div
            className="absolute inset-x-0 bottom-0 z-360 animate-slide-up rounded-t-3xl px-5 pb-8 pt-2"
            style={{ backgroundColor: '#1B2541', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="rounded-full" style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Alert banner */}
            <div
              className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{
                backgroundColor: 'rgba(230,57,70,0.1)',
                border: '1px solid rgba(230,57,70,0.2)',
              }}
            >
              <span className="text-[14px]" aria-hidden="true">🆘</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: DANGER_RED }}>
                  {t('alertActive')} — {t('locationUpdating')}
                </p>
                {dispatchResults.length > 0 && (
                  <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {dispatchResults.map((r) => r.contact_name ?? 'Contact').join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3.5 flex gap-2">
              {/* Emergency quick-dial shortcut */}
              <a
                href="tel:17"
                className="flex-1 rounded-xl py-3 text-center text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]"
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                {t('numbers.police')} · 17
              </a>

              {/* I'm Safe — hold 1 second */}
              <button
                type="button"
                onPointerDown={handleSafePointerDown}
                onPointerUp={handleSafePointerUp}
                onPointerCancel={handleSafePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className="relative flex-[1.5] overflow-hidden rounded-xl py-3 text-[13px] font-bold select-none touch-none transition-all duration-200 active:scale-[0.97]"
                style={{ backgroundColor: '#6BA68E', color: '#FFFFFF', border: '1px solid transparent' }}
              >
                {safeHoldProgress > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      width: `${safeHoldProgress * 100}%`,
                      transition: 'none',
                    }}
                  />
                )}
                <span className="relative z-10">
                  {safeHoldProgress > 0 ? 'Hold…' : `✅ ${t('imSafe')}`}
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
        disabled={phase !== 'idle'}
        className={`absolute bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl select-none touch-none ${
          phase === 'idle' ? 'animate-sos-glow' : 'opacity-50'
        }`}
        style={{ backgroundColor: DANGER_RED, color: 'white' }}
        aria-label="Emergency alert — hold 3 seconds to activate"
      >
        {/* Circular progress ring while holding */}
        {fabHoldProgress > 0 && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 56 56" fill="none">
            <circle
              cx="28" cy="28" r="26"
              stroke="white" strokeWidth="3"
              strokeDasharray={`${fabHoldProgress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              opacity="0.8"
            />
          </svg>
        )}
        🆘
      </button>
    </>
  );
}
