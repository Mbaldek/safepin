// src/lib/directions.ts — Mapbox Directions API for walk/bike/drive routes

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
