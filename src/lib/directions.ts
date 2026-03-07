// src/lib/directions.ts — Mapbox Directions API for walk/bike/drive routes

import type { Pin } from '@/types';
import { DECAY_HOURS } from '@/types';
import { haversineMetersLngLat } from '@/lib/utils';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const PROFILE_MAP: Record<string, string> = {
  walk: 'walking',
  bike: 'cycling',
  car: 'driving',
};

export type DirectionsResult = {
  coords: [number, number][];
  duration: number; // seconds
  distance: number; // meters
};

/**
 * Fetch a route from the Mapbox Directions API.
 *
 * @param from  [lng, lat] origin
 * @param to    [lng, lat] destination
 * @param mode  'walk' | 'bike' | 'car'
 */
export async function fetchDirections(
  from: [number, number],
  to: [number, number],
  mode: 'walk' | 'bike' | 'car',
): Promise<DirectionsResult | null> {
  try {
    const profile = PROFILE_MAP[mode] ?? 'walking';
    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
      `?geometries=geojson&overview=full&access_token=${TOKEN}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[directions] Mapbox API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    return {
      coords: route.geometry.coordinates as [number, number][],
      duration: route.duration ?? 0,
      distance: route.distance ?? 0,
    };
  } catch (err) {
    console.error('[directions] Failed to fetch route:', err);
    return null;
  }
}

/**
 * Fetch up to 3 alternative routes from the Mapbox Directions API.
 */
export async function fetchDirectionsMulti(
  from: [number, number],
  to: [number, number],
  mode: 'walk' | 'bike' | 'car',
): Promise<DirectionsResult[]> {
  try {
    const profile = PROFILE_MAP[mode] ?? 'walking';
    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
      `?geometries=geojson&overview=full&alternatives=true&access_token=${TOKEN}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[directions] Mapbox API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.routes?.length) return [];

    return data.routes.map((route: any) => ({
      coords: route.geometry.coordinates as [number, number][],
      duration: route.duration ?? 0,
      distance: route.distance ?? 0,
    }));
  } catch (err) {
    console.error('[directions] Failed to fetch routes:', err);
    return [];
  }
}

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "5 min", "1h 15"
 */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`;
}

/**
 * Format a distance in meters to a human-readable string.
 * Examples: "450 m", "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Fetch a route via an intermediate waypoint.
 */
async function fetchDirectionsViaWaypoint(
  from: [number, number],
  via: [number, number],
  to: [number, number],
  mode: 'walk' | 'bike' | 'car',
): Promise<DirectionsResult | null> {
  try {
    const profile = PROFILE_MAP[mode] ?? 'walking';
    const coords = `${from[0]},${from[1]};${via[0]},${via[1]};${to[0]},${to[1]}`;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
      `?geometries=geojson&overview=full&access_token=${TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      coords: route.geometry.coordinates as [number, number][],
      duration: route.duration ?? 0,
      distance: route.distance ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch up to 3 routes, generating avoidance alternatives around
 * dangerous pin clusters when Mapbox doesn't return enough alternatives.
 */
export async function fetchRoutesWithAvoidance(
  from: [number, number],
  to: [number, number],
  mode: 'walk' | 'bike' | 'car',
  pins: Pin[],
): Promise<DirectionsResult[]> {
  const baseRoutes = await fetchDirectionsMulti(from, to, mode);
  if (baseRoutes.length >= 3 || baseRoutes.length === 0) return baseRoutes;

  const now = Date.now();
  const direct = baseRoutes[0];

  // Find active med/high severity pins within 300m of the direct route
  const nearbyPins = pins.filter((p) => {
    if (p.resolved_at) return false;
    if (p.severity === 'low') return false;
    const maxH = DECAY_HOURS[p.category] || 24;
    const ageH = (now - new Date(p.created_at).getTime()) / 3600_000;
    if (ageH >= maxH) return false;
    // Check proximity to any route point (sample every 5th for perf)
    for (let i = 0; i < direct.coords.length; i += 5) {
      if (haversineMetersLngLat(direct.coords[i], [p.lng, p.lat]) < 300) return true;
    }
    return false;
  });

  if (nearbyPins.length === 0) return baseRoutes;

  // Compute centroid of nearby danger pins
  const cLng = nearbyPins.reduce((s, p) => s + p.lng, 0) / nearbyPins.length;
  const cLat = nearbyPins.reduce((s, p) => s + p.lat, 0) / nearbyPins.length;

  // Perpendicular bearing to the from→to direction
  const bearing = Math.atan2(to[0] - from[0], to[1] - from[1]);
  const perpL = bearing + Math.PI / 2;
  const perpR = bearing - Math.PI / 2;
  const offsetDeg = 400 / 111320; // ~400m in degrees

  const wpLeft: [number, number] = [
    cLng + Math.sin(perpL) * offsetDeg,
    cLat + Math.cos(perpL) * offsetDeg,
  ];
  const wpRight: [number, number] = [
    cLng + Math.sin(perpR) * offsetDeg,
    cLat + Math.cos(perpR) * offsetDeg,
  ];

  // Fetch avoidance routes in parallel
  const needed = 3 - baseRoutes.length;
  const waypoints = [wpLeft, wpRight].slice(0, needed);
  const extras = await Promise.all(
    waypoints.map((wp) => fetchDirectionsViaWaypoint(from, wp, to, mode)),
  );

  const allRoutes = [...baseRoutes];
  for (const r of extras) {
    if (r) allRoutes.push(r);
  }
  return allRoutes.slice(0, 3);
}
