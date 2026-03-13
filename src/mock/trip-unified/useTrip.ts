/**
 * MOCK — useTrip: Hook unifie pour le cycle de vie d'un trajet
 *
 * Remplace:
 *   - useEscorte.startTrip() (GPS tracking + circle notify + escortes table)
 *   - TripView local state (elapsed, distance, tripId, state machine)
 *   - /api/trips/start + /api/trips/end (trip_log table)
 *
 * Principe:
 *   1. TripView planifie (multi-route, scoring) — inchange
 *   2. "Demarrer" → useTrip.start(params)
 *   3. useTrip cree trip_log + optionnel escortes row
 *   4. GPS tracking + circle notify si withCircle=true
 *   5. "Je suis arrivee" → useTrip.complete()
 *   6. SOS → useTrip.triggerSOS() — wire au vrai edge function
 */

import { useState, useCallback, useRef, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { useStore } from '@/stores/useStore';
// import { haversineMetersRaw } from '@/lib/utils';
import type { ActiveTrip, StartTripParams, TripSummary } from './types';

export function useTrip(userId: string) {
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const juliaCdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const walkedRef = useRef(0);

  // ── START ──────────────────────────────────────────
  const start = useCallback(async (params: StartTripParams) => {
    if (!userId || isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      // 1. Creer trip_log (comme avant via /api/trips/start)
      const tripLogRes = await fetch('/api/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          from_label: 'Ma position',
          to_label: params.destination,
          mode: params.mode,
          // origin coords from getCurrentPosition
          dest_lat: params.destLat,
          dest_lng: params.destLng,
          planned_duration_s: params.plannedDurationS,
          danger_score: params.dangerScore,
          distance_m: params.distanceM,
        }),
      });
      const tripLogData = await tripLogRes.json();
      const tripLogId = tripLogData.trip_id;

      // 2. Si circle actif, creer aussi un record escortes pour GPS tracking
      let escorteId: string | null = null;
      if (params.withCircle) {
        // INSERT escortes (mode='trip') — pour GPS tracking + circle
        // const { data } = await supabase.from('escortes').insert({...}).select().single();
        // escorteId = data.id;
        // await notifyCircle(escorteId);
        escorteId = 'mock-escorte-id';
      }

      // 3. Init active trip
      const active: ActiveTrip = {
        tripLogId,
        escorteId,
        destination: params.destination,
        destLat: params.destLat,
        destLng: params.destLng,
        mode: params.mode,
        coords: params.coords,
        plannedDurationS: params.plannedDurationS,
        distanceM: params.distanceM,
        dangerScore: params.dangerScore,
        state: 'active',
        elapsedS: 0,
        walkedDistanceM: 0,
        circleNotified: params.withCircle,
        isSharingLocation: params.withCircle,
        juliaActive: false,
        juliaCdSeconds: params.withCircle ? 120 : 0,
        circleMembers: [],
      };

      setTrip(active);

      // 4. Set activeRoute dans Zustand (pour MapView)
      // useStore.getState().setActiveRoute({ coords: params.coords, destination: params.destination });
      // useStore.getState().setPendingRoutes(null);

      // 5. Demarrer GPS tracking si circle actif
      if (params.withCircle && escorteId) {
        startGPS(escorteId);
        startJuliaCd(escorteId);
      }

      // 6. Demarrer timer elapsed
      startTimer();

    } catch (e) {
      setError(String(e));
    } finally {
      setIsStarting(false);
    }
  }, [userId, isStarting]);

  // ── COMPLETE (Je suis arrivee) ─────────────────────
  const complete = useCallback(async (): Promise<TripSummary | null> => {
    if (!trip) return null;

    // Stop tracking
    cleanup();

    // 1. End trip_log via API
    const res = await fetch('/api/trips/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: trip.tripLogId,
        user_id: userId,
        actual_duration_s: trip.elapsedS,
      }),
    });
    const data = await res.json();

    // 2. End escorte si present
    if (trip.escorteId) {
      // await supabase.from('escortes').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', trip.escorteId);
    }

    // 3. Clear map route
    // useStore.getState().setActiveRoute(null);

    const summary: TripSummary = {
      durationS: trip.elapsedS,
      distanceM: trip.walkedDistanceM || trip.distanceM,
      incidentsAvoided: data.incidents_avoided ?? 0,
      dangerScore: trip.dangerScore,
    };

    setTrip(prev => prev ? { ...prev, state: 'arrived' } : null);
    return summary;
  }, [trip, userId]);

  // ── CANCEL ─────────────────────────────────────────
  const cancel = useCallback(async () => {
    if (!trip) return;
    cleanup();

    // End trip_log with status=cancelled
    await fetch('/api/trips/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: trip.tripLogId,
        user_id: userId,
        actual_duration_s: trip.elapsedS,
        status: 'cancelled',
      }),
    });

    if (trip.escorteId) {
      // await supabase.from('escortes').update({ status: 'ended' }).eq('id', trip.escorteId);
    }

    // useStore.getState().setActiveRoute(null);
    setTrip(null);
  }, [trip, userId]);

  // ── SOS — wire au vrai systeme ─────────────────────
  const triggerSOS = useCallback(async () => {
    if (!trip) return;

    // Si pas d'escorte, en creer un pour le SOS
    let escorteId = trip.escorteId;
    if (!escorteId) {
      // const { data } = await supabase.from('escortes').insert({
      //   user_id: userId, mode: 'trip', status: 'sos',
      //   dest_name: trip.destination, ...
      // }).select().single();
      // escorteId = data.id;
      // await notifyCircle(escorteId); // force notify circle on SOS
    }

    // Mettre a jour le status
    // await supabase.from('escortes').update({ status: 'sos' }).eq('id', escorteId);

    // Invoquer edge function trigger-sos
    // await supabase.functions.invoke('trigger-sos', {
    //   body: { escorte_id: escorteId, user_id: userId }
    // });

    setTrip(prev => prev ? { ...prev, state: 'sos' } : null);
  }, [trip, userId]);

  // ── TOGGLE SHARING ─────────────────────────────────
  const toggleSharing = useCallback(() => {
    setTrip(prev => {
      if (!prev) return null;
      const next = !prev.isSharingLocation;
      // Si on active le partage et pas d'escorte, en creer un
      // Si on desactive, garder l'escorte mais stop GPS updates
      return { ...prev, isSharingLocation: next };
    });
  }, []);

  // ── GPS TRACKING (prive) ───────────────────────────
  const startGPS = useCallback((escorteId: string) => {
    if (!navigator.geolocation) return;
    prevCoordsRef.current = null;
    walkedRef.current = 0;

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // useStore.getState().setUserLocation({ lat, lng });

        // Accumulate distance (ignore jitter <3m and teleports >500m)
        if (prevCoordsRef.current) {
          // const d = haversineMetersRaw(prev.lat, prev.lng, lat, lng);
          // if (d > 3 && d < 500) { walkedRef.current += d; }
        }
        prevCoordsRef.current = { lat, lng };

        setTrip(prev => prev ? { ...prev, walkedDistanceM: walkedRef.current } : null);

        // Update escorte GPS
        // await supabase.from('escortes').update({
        //   last_lat: lat, last_lng: lng, last_seen_at: new Date().toISOString()
        // }).eq('id', escorteId);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, []);

  // ── ELAPSED TIMER (prive) ──────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTrip(prev => prev ? { ...prev, elapsedS: prev.elapsedS + 1 } : null);
    }, 1000);
  }, []);

  // ── JULIA COUNTDOWN (prive) ────────────────────────
  const startJuliaCd = useCallback((escorteId: string) => {
    juliaCdRef.current = setInterval(() => {
      setTrip(prev => {
        if (!prev) return null;
        const next = prev.juliaCdSeconds - 1;
        if (next <= 0) {
          clearInterval(juliaCdRef.current!);
          // Julia auto-join
          // await supabase.from('escortes').update({ julia_active: true }).eq('id', escorteId);
          // await supabase.functions.invoke('julia-join', { body: { escorte_id: escorteId, user_id: userId } });
          return { ...prev, juliaCdSeconds: 0, juliaActive: true };
        }
        return { ...prev, juliaCdSeconds: next };
      });
    }, 1000);
  }, []);

  // ── CLEANUP (prive) ────────────────────────────────
  const cleanup = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (juliaCdRef.current) clearInterval(juliaCdRef.current);
    watchRef.current = null;
    timerRef.current = null;
    juliaCdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // ── COMPUTED ───────────────────────────────────────
  const progress = trip
    ? Math.min(100, trip.plannedDurationS > 0 ? (trip.elapsedS / trip.plannedDurationS) * 100 : 0)
    : 0;

  const etaMinutes = trip
    ? Math.max(0, Math.round((trip.plannedDurationS - trip.elapsedS) / 60))
    : 0;

  const remainingKm = trip
    ? Math.max(0, (trip.distanceM * (1 - progress / 100)) / 1000)
    : 0;

  return {
    trip,
    isStarting,
    error,
    progress,
    etaMinutes,
    remainingKm,
    // Actions
    start,
    complete,
    cancel,
    triggerSOS,
    toggleSharing,
    // Reset (apres modal arrivee fermee)
    reset: useCallback(() => setTrip(null), []),
  };
}
