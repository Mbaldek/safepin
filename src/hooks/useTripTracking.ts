'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { haversineMeters } from '@/lib/utils';

const UPDATE_INTERVAL_MS = 5_000;
const ARRIVAL_RADIUS_M = 80;

export function useTripTracking(tripId: string | null) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!tripId) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setPosition(pos);

        const now = Date.now();
        if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
        lastUpdateRef.current = now;

        await supabase
          .from('trips')
          .update({
            last_lat: pos.coords.latitude,
            last_lng: pos.coords.longitude,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', tripId);
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [tripId]);

  return { position };
}

/** Check if user is within arrival radius of destination */
export function isNearDestination(
  lat: number,
  lng: number,
  destLat: number,
  destLng: number,
): boolean {
  return haversineMeters({ lat, lng }, { lat: destLat, lng: destLng }) < ARRIVAL_RADIUS_M;
}
