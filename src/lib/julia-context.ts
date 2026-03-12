// src/lib/julia-context.ts — Context builder for Julia AI companion

import { haversineMeters } from '@/lib/utils';
import type { Pin, SafeSpace } from '@/types';
import type { TripSession } from '@/stores/useStore';

export interface JuliaContext {
  userName: string | null;
  verified: boolean;
  language: string;
  location: { lat: number; lng: number } | null;
  nearbyPins: {
    category: string;
    severity: string;
    distance: number;
    description: string | null;
    created_at: string;
  }[];
  activeTrip: {
    destination: string;
    mode: string;
    eta: string;
    elapsed: string;
  } | null;
  circleMembers: {
    name: string;
    status: string;
  }[];
  safeSpaces: {
    name: string;
    distance: number;
  }[];
  currentTime: string;
}

export function buildJuliaContext(
  userId: string,
  storeState: {
    userProfile: { display_name: string | null; verified?: boolean } | null;
    userLocation: { lat: number; lng: number } | null;
    pins: Pin[];
    activeTrip: TripSession | null;
    safeSpaces: SafeSpace[];
  },
): JuliaContext {
  const { userProfile, userLocation, pins, activeTrip, safeSpaces } = storeState;

  // Filter pins within 500m of user
  const nearbyPins = userLocation
    ? pins
        .map((pin) => ({
          category: pin.category,
          severity: pin.severity,
          distance: Math.round(
            haversineMeters(userLocation, { lat: pin.lat, lng: pin.lng }),
          ),
          description: pin.description ?? null,
          created_at: pin.created_at,
        }))
        .filter((p) => p.distance <= 500)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : [];

  // Filter safe spaces within 1km
  const nearbySafeSpaces = userLocation
    ? safeSpaces
        .map((s) => ({
          name: s.name,
          distance: Math.round(
            haversineMeters(userLocation, { lat: s.lat, lng: s.lng }),
          ),
        }))
        .filter((s) => s.distance <= 1000)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10)
    : [];

  // Format active trip
  let tripContext: JuliaContext['activeTrip'] = null;
  if (activeTrip) {
    const elapsedMs = Date.now() - new Date(activeTrip.startedAt).getTime();
    const elapsedMin = Math.round(elapsedMs / 60_000);
    tripContext = {
      destination: activeTrip.destination.label,
      mode: activeTrip.mode,
      eta: activeTrip.estimatedArrival,
      elapsed: `${elapsedMin} min`,
    };
  }

  return {
    userName: userProfile?.display_name ?? null,
    verified: userProfile?.verified ?? false,
    language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
    location: userLocation,
    nearbyPins,
    activeTrip: tripContext,
    circleMembers: [], // populated when cercle data is available in store
    safeSpaces: nearbySafeSpaces,
    currentTime: new Date().toISOString(),
  };
}
