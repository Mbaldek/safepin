// src/lib/transit.ts — Transitous API integration for Paris public transit routing
// Uses the free community-run Transitous API (MOTIS-based) — no API key needed.
// Returns real RATP/IDFM data: line names, colors, station names, intermediate stops.

const TRANSITOUS_BASE = 'https://api.transitous.org/api/v5/plan';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransitStep = {
  mode: 'walking' | 'metro' | 'rer' | 'bus' | 'tram' | 'rail';
  line?: string;           // e.g., "6", "A", "91"
  lineColor?: string;      // hex color for the line
  headsign?: string;       // e.g., "La Défense (Grande Arche)"
  from: string;            // station/location name
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;        // seconds
  stops?: number;          // number of intermediate stops
  coords: [number, number][]; // polyline for this segment [lng, lat]
};

export type TransitRoute = {
  steps: TransitStep[];
  totalDuration: number;   // seconds
  totalWalking: number;    // seconds of walking
  departureTime: string;
  arrivalTime: string;
  coords: [number, number][]; // full polyline (all segments concatenated)
  transfers: number;
};

// ─── Transitous mode mapping ─────────────────────────────────────────────────

const MODE_MAP: Record<string, TransitStep['mode']> = {
  SUBWAY: 'metro',
  REGIONAL_FAST_RAIL: 'rer',
  BUS: 'bus',
  TRAM: 'tram',
  RAIL: 'rail',
  FERRY: 'bus', // rare but map to something
};

// ─── Google Encoded Polyline Decoder (precision 6) ───────────────────────────

/**
 * Decode a Google encoded polyline string into an array of [lng, lat] coordinates.
 * Transitous uses precision 6 (1e6), NOT the standard Google Maps precision 5 (1e5).
 */
export function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    // Return as [lng, lat] to match Mapbox convention
    coords.push([lng / factor, lat / factor]);
  }

  return coords;
}

// ─── Parse a single Transitous itinerary ─────────────────────────────────────

function parseTransitousItinerary(itinerary: any): TransitRoute {
  const steps: TransitStep[] = [];
  let totalWalking = 0;
  const allCoords: [number, number][] = [];

  const legs: any[] = itinerary.legs ?? [];

  for (const leg of legs) {
    const mode: string = leg.mode ?? '';
    const duration: number = leg.duration ?? 0;
    const startTime: string = leg.startTime ?? '';
    const endTime: string = leg.endTime ?? '';
    const fromName: string = leg.from?.name ?? '';
    const toName: string = leg.to?.name ?? '';

    // Decode polyline geometry
    const coords = leg.legGeometry?.points
      ? decodePolyline(leg.legGeometry.points)
      : buildFallbackCoords(leg);

    if (mode === 'WALK') {
      totalWalking += duration;
      if (duration > 0 || coords.length > 0) {
        steps.push({
          mode: 'walking',
          from: fromName,
          to: toName,
          departureTime: startTime,
          arrivalTime: endTime,
          duration,
          coords,
        });
      }
    } else {
      const mappedMode = MODE_MAP[mode] ?? 'metro';
      const lineColor = leg.routeColor ? `#${leg.routeColor}` : undefined;
      const stopCount = Array.isArray(leg.intermediateStops) ? leg.intermediateStops.length : undefined;

      steps.push({
        mode: mappedMode,
        line: leg.routeShortName || undefined,
        lineColor: lineColor || undefined,
        headsign: leg.headsign || undefined,
        from: fromName,
        to: toName,
        departureTime: startTime,
        arrivalTime: endTime,
        duration,
        stops: stopCount,
        coords,
      });
    }

    allCoords.push(...coords);
  }

  return {
    steps,
    totalDuration: itinerary.duration ?? 0,
    totalWalking,
    departureTime: itinerary.startTime ?? '',
    arrivalTime: itinerary.endTime ?? '',
    coords: allCoords,
    transfers: itinerary.transfers ?? 0,
  };
}

/**
 * Build a simple 2-point line from leg endpoints when no geometry is available.
 */
function buildFallbackCoords(leg: any): [number, number][] {
  const pts: [number, number][] = [];
  if (leg.from?.lon != null && leg.from?.lat != null) {
    pts.push([leg.from.lon, leg.from.lat]);
  }
  if (leg.to?.lon != null && leg.to?.lat != null) {
    pts.push([leg.to.lon, leg.to.lat]);
  }
  return pts;
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetch transit routes from the Transitous API (free, no API key).
 *
 * @param from - [lng, lat] origin (Mapbox convention)
 * @param to   - [lng, lat] destination (Mapbox convention)
 * @returns Array of parsed TransitRoute objects (up to 5)
 */
export async function fetchTransitRoute(
  from: [number, number],
  to: [number, number],
): Promise<TransitRoute[]> {
  try {
    // Transitous uses "lat,lng" format (reversed from Mapbox [lng, lat])
    const fromParam = `${from[1]},${from[0]}`;
    const toParam = `${to[1]},${to[0]}`;
    const time = new Date().toISOString();

    const url = new URL(TRANSITOUS_BASE);
    url.searchParams.set('fromPlace', fromParam);
    url.searchParams.set('toPlace', toParam);
    url.searchParams.set('time', time);

    const res = await fetch(url.toString());

    if (!res.ok) {
      console.error(`[transit] Transitous API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const itineraries: any[] = data.itineraries ?? [];

    if (itineraries.length === 0) return [];

    // Return up to 5 best options
    return itineraries.slice(0, 5).map(parseTransitousItinerary);
  } catch (err) {
    console.error('[transit] Failed to fetch transit routes:', err);
    return [];
  }
}

// ─── Transit checkpoint extraction ───────────────────────────────────────────

export type TransitCheckpoint = {
  name: string;
  coords: [number, number]; // [lng, lat]
  mode: TransitStep['mode'];
  line?: string;
  expectedTime?: string;
};

/**
 * Extract ordered station waypoints from a TransitRoute for checkpoint monitoring.
 * Returns departure station, all intermediate stops, and arrival station for each transit leg.
 */
export function getTransitCheckpoints(route: TransitRoute): TransitCheckpoint[] {
  const checkpoints: TransitCheckpoint[] = [];

  for (const step of route.steps) {
    if (step.mode === 'walking') continue;

    // Add departure station
    if (step.coords.length > 0) {
      checkpoints.push({
        name: step.from,
        coords: step.coords[0],
        mode: step.mode,
        line: step.line,
        expectedTime: step.departureTime,
      });
    }

    // Add arrival station
    if (step.coords.length > 0) {
      checkpoints.push({
        name: step.to,
        coords: step.coords[step.coords.length - 1],
        mode: step.mode,
        line: step.line,
        expectedTime: step.arrivalTime,
      });
    }
  }

  return checkpoints;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "25 min", "1h 05", "2h 30"
 */
export function formatTransitDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`;
}

/**
 * Returns an emoji icon for a transit mode.
 */
export function getLineIcon(mode: TransitStep['mode']): string {
  switch (mode) {
    case 'metro':   return '\u{1F687}'; // 🚇
    case 'rer':     return '\u{1F686}'; // 🚆
    case 'bus':     return '\u{1F68C}'; // 🚌
    case 'tram':    return '\u{1F68A}'; // 🚊
    case 'rail':    return '\u{1F684}'; // 🚄
    case 'walking': return '\u{1F6B6}'; // 🚶
    default:        return '\u{1F687}'; // 🚇
  }
}
