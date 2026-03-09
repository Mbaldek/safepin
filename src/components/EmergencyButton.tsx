// src/components/EmergencyButton.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { haversineMeters } from '@/lib/utils';
import { geocodeReverse } from '@/lib/geocode';
import type { RealtimeChannel } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

const EmergencyNumbers = dynamic(() => import('./EmergencyNumbers'), { ssr: false });

type Phase = 'idle' | 'count' | 'sending' | 'sent';
type DispatchResult = { contact_id: string; contact_name: string | null; status: string };

const TRAIL_MIN_DIST_M = 30;
const TRAIL_MIN_TIME_MS = 45_000;
const RING_R = 35;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 220

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

// ─────────────────────────────────────────────────────────────────────────────

export default function EmergencyButton({ userId, compact = false }: { userId: string | null; compact?: boolean }) {
  const { userLocation, setUserLocation } = useStore();
  useTheme(); // subscribe to theme changes for CSS var updates
  const t = useTranslations('emergency');

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(5);
  const [dispatchResults, setDispatchResults] = useState<DispatchResult[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [fabHoldProgress, setFabHoldProgress] = useState(0);

  const [resolving, setResolving] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [scrimVisible, setScrimVisible] = useState(false);

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
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (userLocation) locationRef.current = userLocation;
  }, [userLocation]);

  // ─── Sent phase: realtime subscription for external resolution ──────────
  useEffect(() => {
    if (phase !== 'sent') {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
      return;
    }

    useStore.getState().setShowSafeSpaces(true);

    if (userId) {
      const ch = supabase
        .channel('emergency-status')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergency_dispatches', filter: `user_id=eq.${userId}` },
          (payload) => {
            if ((payload.new as { resolved_at: string | null }).resolved_at) {
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
    // Append to emergency_sessions.location_trail for live tracking
    if (dispatchSessionRef.current) {
      const { data: session } = await supabase
        .from('emergency_sessions')
        .select('location_trail')
        .eq('id', dispatchSessionRef.current)
        .single();
      if (session) {
        const trail = (session.location_trail as { lat: number; lng: number; ts: string }[]) || [];
        trail.push({ lat: loc.lat, lng: loc.lng, ts: new Date().toISOString() });
        await supabase
          .from('emergency_sessions')
          .update({ location_trail: trail })
          .eq('id', dispatchSessionRef.current);
      }
    }
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

    // Transition to 'sending' phase
    setPhase('sending');
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

    // Fire-and-forget: create SOS community thread
    (async () => {
      try {
        const { data: contacts } = await supabase
          .from('trusted_contacts')
          .select('user_id, contact_user_id')
          .or(`user_id.eq.${userId},contact_user_id.eq.${userId}`)
          .eq('status', 'accepted');
        const circleMembers = (contacts ?? []).map(c =>
          c.user_id === userId ? c.contact_user_id : c.user_id,
        );
        const label = await geocodeReverse(loc.lng, loc.lat).catch(() => null);
        await fetch('/api/sos/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sosId: data.id,
            location: { lat: loc.lat, lng: loc.lng, label: label ?? null },
            circleMembers,
          }),
        });
      } catch (err) { console.error('[SOSThread]', err); }
    })();

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate, () => {}, { enableHighAccuracy: true, maximumAge: 15_000 }
      );
    }

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 2000);

    // After 1600ms transition to 'sent'
    setTimeout(() => setPhase('sent'), 1600);
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
    // Fire-and-forget: resolve SOS community thread
    if (ids.length > 0) {
      fetch('/api/sos/thread', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sosId: ids[0] }),
      }).catch(err => console.error('[SOSThread resolve]', err));
    }

    emergencyPinIdsRef.current = [];
    lastPinLocRef.current = null;
    dispatchSessionRef.current = null;
    navigator.vibrate?.([100]);
    setResolving(false);
    setPhase('idle');
    toast.success(`✅ ${t('safeConfirmed')}`);
  }, [userId, t]);

  // ─── Countdown ────────────────────────────────────────────────────────────
  function startCountdown() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    navigator.vibrate?.([100, 50, 100]);
    setPhase('count');

    let remaining = 5;
    setCount(remaining);

    intervalRef.current = setInterval(() => {
      remaining--;
      navigator.vibrate?.([30]);
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
    if (phase !== 'idle') return;
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

  // ─── External SOS trigger (from TripHUD, etc.) ──────────────────────────
  useEffect(() => {
    function onExternalSOS() {
      if (phase === 'idle') handleTap();
    }
    window.addEventListener('breveil:trigger-sos', onExternalSOS);
    return () => window.removeEventListener('breveil:trigger-sos', onExternalSOS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── FAB hold-to-activate (3 seconds) ────────────────────────────────────
  function handleFabPointerDown(e: React.PointerEvent) {
    if (phase !== 'idle') return;
    if (fabHoldTimerRef.current) return; // already holding
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

  // ─── Derived values ──────────────────────────────────────────────────────
  const isOverlay = phase === 'count' || phase === 'sending' || phase === 'sent';

  // Fade-in scrim to avoid abrupt red flash on mount
  useEffect(() => {
    if (isOverlay) {
      const t = setTimeout(() => setScrimVisible(true), 50);
      return () => clearTimeout(t);
    }
    setScrimVisible(false);
  }, [isOverlay]);
  const ringOffset = phase === 'count'
    ? RING_CIRCUMFERENCE - ((5 - count) / 5) * RING_CIRCUMFERENCE
    : 0;

  const respondedCount = dispatchResults.filter(r => r.status === 'delivered' || r.status === 'acknowledged').length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Injected keyframes ──────────────────────────────────────── */}
      <style>{`
        @keyframes sos-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.6); opacity: 0;   }
        }
        @keyframes sos-blink {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.2; }
        }
        @keyframes sos-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sos-slideUp {
          from { transform: translateX(-50%) translateY(24px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes flash-fade {
          0%   { opacity: 0.6; }
          100% { opacity: 0;   }
        }
        @keyframes sos-compact-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Hold progress — centered overlay, above the thumb ──────── */}
      {phase === 'idle' && fabHoldProgress > 0 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            background: `rgba(240,64,96,${fabHoldProgress * 0.10})`,
          }}
        >
          <p style={{
            color: '#fff', fontSize: 14, fontWeight: 500, marginBottom: 20,
            letterSpacing: '0.03em',
          }}>
            Maintiens pour déclencher l&apos;alerte
          </p>
          <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40"
              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
            <circle cx="50" cy="50" r="40"
              fill="none" stroke="var(--semantic-danger)" strokeWidth="5"
              strokeDasharray={251}
              strokeDashoffset={251 * (1 - fabHoldProgress)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
        </div>
      )}

      {/* ── SOS modal overlay (count / sending / sent) ──────────────── */}
      {isOverlay && (
        <>
          {/* Scrim */}
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 399,
            opacity: scrimVisible ? 1 : 0,
            transition: 'opacity 0.35s ease',
          }} />

          {/* Emergency numbers card overlay */}
          {showEmergency && (
            <EmergencyNumbers onBack={() => setShowEmergency(false)} />
          )}

          {/* Modal card */}
          <div style={{
            position: 'fixed',
            bottom: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '88%',
            maxWidth: 340,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 28,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            zIndex: 400,
            overflow: 'hidden',
            animation: 'sos-slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Top accent bar */}
            <div style={{
              height: 3,
              background: phase === 'sent'
                ? 'linear-gradient(90deg, var(--semantic-success), #6EE7B7)'
                : 'linear-gradient(90deg, var(--semantic-danger), #FF6B6B)',
              transition: 'background 0.5s ease',
            }} />

            {/* Inner content */}
            <div style={{
              padding: '18px 20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Status pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(240,64,96,0.10)',
                border: '1px solid rgba(240,64,96,0.22)',
                borderRadius: 99, padding: '5px 12px',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--semantic-danger)',
                  animation: 'sos-blink 1s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.10em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--semantic-danger)',
                }}>
                  SOS ACTIVÉ
                </span>
              </div>

              {/* Ring countdown */}
              <div style={{
                position: 'relative', width: 120, height: 120,
                marginTop: 16,
              }}>
                {/* Pulse rings (count phase only) */}
                {phase === 'count' && [0, 0.85, 1.7].map((delay, i) => (
                  <div key={i} style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '1.5px solid var(--semantic-danger)',
                    animation: `sos-ring 2.6s ease-out infinite`,
                    animationDelay: `${delay}s`,
                  }} />
                ))}

                {/* SVG progress ring */}
                <svg width="120" height="120" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r={RING_R}
                    fill="none" stroke="rgba(240,64,96,0.10)" strokeWidth="3" />
                  <circle cx="60" cy="60" r={RING_R}
                    fill="none" stroke="var(--semantic-danger)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 0.95s linear' }}
                  />
                </svg>

                {/* Inner circle */}
                <div style={{
                  position: 'absolute', inset: 11, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.4s ease',
                  ...(phase === 'sent'
                    ? {
                        background: 'var(--semantic-success-soft)',
                        border: '1px solid rgba(52,211,153,0.30)',
                      }
                    : {
                        background: 'rgba(240,64,96,0.10)',
                        border: '1px solid rgba(240,64,96,0.22)',
                      }
                  ),
                }}>
                  {phase === 'count' && (
                    <span style={{
                      fontSize: 46, fontWeight: 300, letterSpacing: '-0.04em',
                      color: 'var(--semantic-danger)',
                      fontFamily: 'Georgia, serif',
                    }}>
                      {count}
                    </span>
                  )}
                  {phase === 'sending' && (
                    <div style={{
                      width: 20, height: 20,
                      border: '3px solid rgba(240,64,96,0.22)',
                      borderTopColor: 'var(--semantic-danger)',
                      borderRadius: '50%',
                      animation: 'sos-spin 0.7s linear infinite',
                    }} />
                  )}
                  {phase === 'sent' && (
                    <span style={{
                      fontSize: 28,
                      color: 'var(--semantic-success)',
                    }}>
                      ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Status text */}
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <div style={{
                  fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  fontFamily: 'Georgia, serif',
                }}>
                  {phase === 'count' && `Alerte dans ${count}s`}
                  {phase === 'sending' && 'Envoi en cours…'}
                  {phase === 'sent' && 'Alerte envoyée'}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginTop: 4,
                }}>
                  {phase === 'count' && 'Ton cercle et les utilisatrices proches seront alertés'}
                  {phase === 'sending' && 'Notification à ton cercle de confiance'}
                  {phase === 'sent' && 'Position partagée · Cercle notifié'}
                </div>
              </div>

              {/* Circle members (sent phase only) */}
              {phase === 'sent' && dispatchResults.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 14, padding: '8px 12px',
                  marginTop: 12, width: '100%',
                }}>
                  <div style={{ display: 'flex' }}>
                    {dispatchResults.slice(0, 4).map((r, i) => {
                      const initial = (r.contact_name ?? '?').charAt(0).toUpperCase();
                      const responded = r.status === 'delivered' || r.status === 'acknowledged';
                      return (
                        <div key={r.contact_id} style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: 'var(--surface-card)',
                          border: `2px solid ${responded ? 'var(--semantic-success)' : 'var(--border-default)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: 'var(--text-primary)',
                          marginLeft: i > 0 ? -6 : 0,
                          zIndex: 10 - i,
                          transition: 'border-color 0.4s',
                        }}>
                          {initial}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {respondedCount > 0 ? `${respondedCount} ont répondu` : `${dispatchResults.length} alertés`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                      {respondedCount > 0 ? (dispatchResults.find(r => r.status === 'acknowledged')?.contact_name ?? 'En attente…') : 'En attente…'}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                width: '100%', marginTop: 14,
              }}>
                {phase === 'sent' && (
                  <button
                    onClick={resolve}
                    disabled={resolving}
                    style={{
                      background: 'var(--text-primary)',
                      color: 'var(--text-inverse)',
                      borderRadius: 99, padding: 12,
                      fontSize: 13, fontWeight: 700,
                      width: '100%',
                      border: 'none', cursor: resolving ? 'wait' : 'pointer',
                      opacity: resolving ? 0.6 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {resolving ? 'Confirmation…' : 'Je suis en sécurité ✓'}
                  </button>
                )}

                {phase === 'count' && (
                  <button
                    onClick={cancel}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-secondary)',
                      borderRadius: 99, padding: 11,
                      fontSize: 12, fontWeight: 500,
                      width: '100%', cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Annuler l&apos;alerte
                  </button>
                )}

                <button
                  onClick={() => window.open('tel:17', '_self')}
                  style={{
                    background: 'rgba(240,64,96,0.10)',
                    border: '1px solid rgba(240,64,96,0.22)',
                    color: 'var(--semantic-danger)',
                    borderRadius: 99, padding: 10,
                    fontSize: 12, fontWeight: 700,
                    width: '100%', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  📞 Appeler le 17 · Police
                </button>

                <button
                  onClick={() => setShowEmergency(true)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--text-tertiary)',
                    fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: 'pointer', padding: '2px 0', width: '100%',
                    fontFamily: 'inherit',
                  }}
                >
                  Numéros d&apos;urgence ↓
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Red flash after SOS triggers ────────────────────────────── */}
      {showFlash && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            pointerEvents: 'none',
            backgroundColor: '#ef4444', opacity: 0.6,
            animation: 'flash-fade 2s ease-out forwards',
          }}
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
        aria-label="Emergency alert — hold 3 seconds to activate"
        style={{
          position: 'fixed',
          ...(compact
            ? { top: 8, left: '50%', transform: 'translateX(-50%)', width: 40, height: 40, fontSize: 10, zIndex: 150, boxShadow: '0 2px 10px rgba(239,68,68,0.4)', opacity: 0.8 }
            : { bottom: 80, right: 20, width: 50, height: 50, fontSize: 13, zIndex: 200, boxShadow: '0 4px 20px rgba(239,68,68,0.5)' }
          ),
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          border: '2px solid rgba(239,68,68,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.05em',
          opacity: phase === 'idle' ? 1 : 0.5,
          transition: 'all 0.3s ease',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {fabHoldProgress > 0 && (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 50 50" fill="none">
            <circle
              cx="25" cy="25" r="23"
              stroke="white" strokeWidth="1.5"
              strokeDasharray={`${fabHoldProgress * 144.5} 144.5`}
              strokeLinecap="round"
              transform="rotate(-90 25 25)"
              opacity="0.35"
            />
          </svg>
        )}
        {compact && (
          <span style={{
            position: 'absolute',
            top: -3, right: -3, bottom: -3, left: -3,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#F59E0B',
            animation: 'sos-compact-spin 1.2s linear infinite',
            pointerEvents: 'none',
          }} />
        )}
        SOS
      </button>
    </>
  );
}
