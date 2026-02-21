// src/components/EmergencyButton.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

type Phase = 'idle' | 'countdown' | 'active';

export default function EmergencyButton({ userId }: { userId: string | null }) {
  const { userLocation, setUserLocation } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(5);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep locationRef in sync with store
  useEffect(() => {
    if (userLocation) locationRef.current = userLocation;
  }, [userLocation]);

  function handleTap() {
    if (!userId) { toast.error('Sign in first'); return; }

    // If we already have a cached location, start immediately
    if (locationRef.current) {
      startCountdown();
      return;
    }

    // Otherwise request GPS on the spot
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locationRef.current = loc;
        setUserLocation(loc);
        startCountdown();
      },
      () => {
        toast.error('Could not get your location. Try again.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function startCountdown() {
    navigator.vibrate?.([100, 50, 100]);
    setPhase('countdown');
    setCount(5);

    intervalRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          sendAlert();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function cancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setCount(5);
  }

  async function sendAlert() {
    if (!userId || !locationRef.current) {
      setPhase('idle');
      return;
    }

    navigator.vibrate?.([200, 100, 200, 100, 400]);

    const { data, error } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        lat: locationRef.current.lat,
        lng: locationRef.current.lng,
        category: 'other',
        severity: 'high',
        description: '🆘 EMERGENCY ALERT — I need help',
        is_emergency: true,
        photo_url: null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to send emergency alert');
      setPhase('idle');
      return;
    }

    setEmergencyId(data.id);
    setPhase('active');
  }

  async function resolve() {
    if (!emergencyId) return;

    await supabase
      .from('pins')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', emergencyId);

    navigator.vibrate?.([100]);
    setPhase('idle');
    setEmergencyId(null);
    toast.success("✅ Alert resolved — glad you're safe!");
  }

  return (
    <>
      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div
          className="absolute inset-0 z-[400] flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
        >
          <div
            className="text-[96px] font-black leading-none mb-4 animate-pulse"
            style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}
          >
            {count}
          </div>
          <p className="text-white text-xl font-bold mb-1">Alerting nearby users…</p>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Your location will be shared
          </p>
          <button
            onClick={cancel}
            className="px-10 py-4 rounded-2xl text-white font-bold text-lg border-2 transition hover:opacity-80"
            style={{ borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* "I'm safe" active banner */}
      {phase === 'active' && (
        <div
          className="absolute top-0 left-0 right-0 z-[350] flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: '#ef4444' }}
        >
          <div>
            <p className="text-white font-bold text-sm">🆘 Alert active</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Others nearby have been notified
            </p>
          </div>
          <button
            onClick={resolve}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white font-bold text-xs transition hover:opacity-90"
            style={{ color: '#ef4444' }}
          >
            ✅ I'm safe
          </button>
        </div>
      )}

      {/* FAB — emergency button */}
      <button
        onClick={phase === 'idle' ? handleTap : undefined}
        disabled={phase === 'active'}
        className={`absolute bottom-6 left-4 w-14 h-14 rounded-full flex items-center justify-center text-2xl z-50 transition ${phase === 'idle' ? 'emergency-btn-pulse' : 'opacity-50'}`}
        style={{ backgroundColor: '#ef4444', color: 'white' }}
        aria-label="Emergency alert"
      >
        🆘
      </button>
    </>
  );
}
