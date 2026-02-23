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

// Minimum distance (metres) before a new trail pin is created
const TRAIL_MIN_DIST_M = 30;

// Dispatch SOS to trusted contacts via Edge Function
async function dispatchToContacts(action: string, userId: string, pinId: string, lat: number, lng: number, displayName: string | null, sessionId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/emergency-dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, user_id: userId, pin_id: pinId, lat, lng, display_name: displayName, session_id: sessionId }),
    });
  } catch { /* Non-critical — don't block SOS flow */ }
}
// Minimum time (ms) between two trail pins
const TRAIL_MIN_TIME_MS = 45_000;

export default function EmergencyButton({ userId }: { userId: string | null }) {
  const { userLocation, setUserLocation } = useStore();
  const t = useTranslations('emergency');
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(5);

  // Refs — don't cause re-renders, safe inside callbacks/intervals
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const emergencyPinIdsRef = useRef<string[]>([]);
  const lastPinLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPinTimeRef = useRef<number>(0);
  const dispatchSessionRef = useRef<string | null>(null);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep locationRef in sync with store (cached from map load)
  useEffect(() => {
    if (userLocation) locationRef.current = userLocation;
  }, [userLocation]);

  // ─── Geocode a location and patch the pin description ───────────────────────
  async function geocodeAndPatchPin(pinId: string, loc: { lat: number; lng: number }) {
    try {
      const address = await geocodeReverse(loc.lng, loc.lat);
      if (address) {
        await supabase
          .from('pins')
          .update({
            description: `🆘 EMERGENCY ALERT — I need help\n📍 ~${address} (approximate)`,
          })
          .eq('id', pinId);
      }
    } catch {
      // Geocoding failure is non-critical — original description stays
    }
  }

  // ─── Create a trail pin at the new location ──────────────────────────────────
  async function createTrailPin(loc: { lat: number; lng: number }) {
    if (!userId) return;
    const { data, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: loc.lat,
        lng: loc.lng,
        category: 'other',
        severity: 'high',
        description: '🆘 EMERGENCY ALERT — I need help',
        is_emergency: true,
        photo_url: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Trail pin error:', error);
      return;
    }

    emergencyPinIdsRef.current.push(data.id);
    geocodeAndPatchPin(data.id, loc); // fire-and-forget
  }

  // ─── watchPosition callback ──────────────────────────────────────────────────
  function handlePositionUpdate(pos: GeolocationPosition) {
    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setUserLocation(newLoc);
    locationRef.current = newLoc;

    const now = Date.now();
    const timeSinceLast = now - lastPinTimeRef.current;
    const distSinceLast = lastPinLocRef.current
      ? haversineMeters(lastPinLocRef.current, newLoc)
      : Infinity;

    // Only create a new trail pin if moved enough AND enough time has passed
    if (timeSinceLast < TRAIL_MIN_TIME_MS && distSinceLast < TRAIL_MIN_DIST_M) return;

    lastPinTimeRef.current = now;
    lastPinLocRef.current = newLoc;
    createTrailPin(newLoc);
  }

  // ─── Main alert send ─────────────────────────────────────────────────────────
  async function sendAlert() {
    if (!userId || !locationRef.current) {
      setPhase('idle');
      return;
    }

    navigator.vibrate?.([200, 100, 200, 100, 400]);

    const loc = locationRef.current;
    const { data, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: loc.lat,
        lng: loc.lng,
        category: 'other',
        severity: 'high',
        description: '🆘 EMERGENCY ALERT — I need help',
        is_emergency: true,
        photo_url: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Emergency alert insert error:', error);
      toast.error(`Failed to send alert: ${error.message}`);
      setPhase('idle');
      return;
    }

    emergencyPinIdsRef.current = [data.id];
    lastPinLocRef.current = loc;
    lastPinTimeRef.current = Date.now();

    // Dispatch to trusted contacts
    const sessionId = crypto.randomUUID();
    dispatchSessionRef.current = sessionId;
    const displayName = useStore.getState().userProfile?.display_name ?? null;
    dispatchToContacts('dispatch', userId, data.id, loc.lat, loc.lng, displayName, sessionId);

    // Escalation: re-dispatch after 15min if not resolved
    escalationTimerRef.current = setTimeout(() => {
      if (emergencyPinIdsRef.current.length > 0) {
        dispatchToContacts('escalate', userId, data.id, loc.lat, loc.lng, displayName, sessionId);
      }
    }, 15 * 60 * 1000);

    // Auto-show safe spaces on map during emergency
    useStore.getState().setShowSafeSpaces(true);

    // Geocode and patch the description (async, won't block UI)
    geocodeAndPatchPin(data.id, loc);

    // Start live location tracking for trail
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        () => {},
        { enableHighAccuracy: true, maximumAge: 15_000 }
      );
    }

    setPhase('active');
  }

  // ─── Countdown ───────────────────────────────────────────────────────────────
  // FIX: use a local variable for the tick — NEVER call async functions
  // inside React state updaters (they must be pure).
  function startCountdown() {
    navigator.vibrate?.([100, 50, 100]);
    setPhase('countdown');

    let remaining = 5;
    setCount(remaining);

    intervalRef.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setCount(0);
        sendAlert(); // called OUTSIDE state updater — safe
      } else {
        setCount(remaining);
      }
    }, 1000);
  }

  function cancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setCount(5);
  }

  // ─── Resolve — mark ALL session pins as resolved ─────────────────────────────
  async function resolve() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    const ids = emergencyPinIdsRef.current;
    if (ids.length > 0) {
      await supabase
        .from('pins')
        .update({ resolved_at: new Date().toISOString() })
        .in('id', ids);
    }

    // Notify trusted contacts that we're safe
    if (userId && ids.length > 0 && dispatchSessionRef.current) {
      const displayName = useStore.getState().userProfile?.display_name ?? null;
      dispatchToContacts('resolve', userId, ids[0], 0, 0, displayName, dispatchSessionRef.current);
    }

    // Clear escalation timer
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

  // ─── Tap the button ──────────────────────────────────────────────────────────
  function handleTap() {
    if (!userId) { toast.error(t('signInFirst')); return; }

    if (locationRef.current) {
      startCountdown();
      return;
    }

    // No cached location — request it now
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locationRef.current = loc;
        setUserLocation(loc);
        startCountdown();
      },
      () => { toast.error(t('locationRequired')); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <>
      {/* ── Countdown overlay ────────────────────────────────────── */}
      {phase === 'countdown' && (
        <div
          className="absolute inset-0 z-[400] flex flex-col items-center justify-center"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div
            className="font-black leading-none mb-4 animate-pulse"
            style={{ fontSize: '96px', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}
          >
            {count}
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {t('alerting')}
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
            {t('locationShared')}
          </p>
          {/* Emergency quick-dials */}
          <div className="flex gap-3 mb-6">
            {[
              { label: t('numbers.samu'), num: '15' },
              { label: t('numbers.police'), num: '17' },
              { label: t('numbers.fire'), num: '18' },
              { label: t('numbers.eu'), num: '112' },
            ].map(({ label, num }) => (
              <a
                key={num}
                href={`tel:${num}`}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-center"
                style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
              >
                <span className="text-base font-black leading-none">{num}</span>
                <span className="text-[0.55rem] font-bold uppercase tracking-wide">{label}</span>
              </a>
            ))}
          </div>

          <button
            onClick={cancel}
            className="px-10 py-4 rounded-2xl font-bold text-lg border-2 transition hover:opacity-80"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            {t('cancelCountdown')}
          </button>
        </div>
      )}

      {/* ── "I'm safe" active banner ──────────────────────────────── */}
      {phase === 'active' && (
        <div
          className="absolute top-0 left-0 right-0 z-[350] flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: '#ef4444' }}
        >
          <div>
            <p className="text-white font-bold text-sm">🆘 {t('alertActive')}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {t('locationUpdating')}
            </p>
          </div>
          <button
            onClick={resolve}
            className="px-3 py-1.5 rounded-full bg-white font-bold text-xs transition hover:opacity-90 flex-shrink-0"
            style={{ color: '#ef4444' }}
          >
            ✅ {t('imSafe')}
          </button>
        </div>
      )}

      {/* ── Emergency FAB ────────────────────────────────────────── */}
      <button
        onClick={phase === 'idle' ? handleTap : undefined}
        disabled={phase === 'active'}
        className={`absolute bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl z-50 transition ${
          phase === 'idle' ? 'emergency-btn-pulse' : 'opacity-50'
        }`}
        style={{ backgroundColor: '#ef4444', color: 'white' }}
        aria-label="Emergency alert"
      >
        🆘
      </button>
    </>
  );
}
