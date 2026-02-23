// src/lib/transit.ts — IDFM Navitia API integration for Paris public transit routing

const NAVITIA_KEY = process.env.NEXT_PUBLIC_NAVITIA_KEY;
const NAVITIA_BASE = 'https://api.navitia.io/v1/coverage/fr-idf/journeys';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransitStep = {
  mode: 'walking' | 'metro' | 'rer' | 'bus' | 'tram' | 'rail';
  line?: string;           // e.g., "6", "A", "91"
  lineColor?: string;      // hex color for the line
  from: string;            // station/location name
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;        // seconds
  stops?: number;          // number of stops for transit
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

// ─── Navitia mode mapping ─────────────────────────────────────────────────────

const MODE_MAP: Record<string, TransitStep['mode']> = {
  Metro: 'metro',
  RapidTransit: 'rer',
  Bus: 'bus',
  Tramway: 'tram',
  LocalTrain: 'rail',
  Train: 'rail',
};

// ─── Navitia datetime parsing ─────────────────────────────────────────────────

/**
 * Convert Navitia datetime string "20260223T120000" → ISO string "2026-02-23T12:00:00".
 */
function parseNavitiaDatetime(dt: string): string {
  if (!dt || dt.length < 15) return dt ?? '';
  const y = dt.slice(0, 4);
  const mo = dt.slice(4, 6);
  const d = dt.slice(6, 8);
  const h = dt.slice(9, 11);
  const mi = dt.slice(11, 13);
  const s = dt.slice(13, 15);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

/**
 * Extract coordinates from a Navitia geojson section.
 * Navitia returns [lon, lat] which matches Mapbox [lng, lat] convention.
 */
function extractCoords(section: any): [number, number][] {
  const raw = section?.geojson?.coordinates;
  if (!Array.isArray(raw) || raw.length === 0) {
    // Fallback: build a 2-point line from the section endpoints
    const fromCoord = section?.from?.stop_point?.coord ?? section?.from?.address?.coord;
    const toCoord = section?.to?.stop_point?.coord ?? section?.to?.address?.coord;
    const points: [number, number][] = [];
    if (fromCoord) points.push([parseFloat(fromCoord.lon), parseFloat(fromCoord.lat)]);
    if (toCoord) points.push([parseFloat(toCoord.lon), parseFloat(toCoord.lat)]);
    return points;
  }
  // Navitia geojson coordinates are already [lon, lat]
  return raw.map((c: number[]) => [c[0], c[1]] as [number, number]);
}

/**
 * Extract a human-readable name from a Navitia place object.
 */
function placeName(place: any): string {
  if (!place) return '';
  return place.stop_point?.name ?? place.name ?? place.address?.name ?? '';
}

// ─── Parse a single Navitia journey ───────────────────────────────────────────

export function parseNavitiaJourney(journey: any): TransitRoute {
  const steps: TransitStep[] = [];
  let totalWalking = 0;
  const allCoords: [number, number][] = [];

  const sections: any[] = journey.sections ?? [];

  for (const section of sections) {
    const sType: string = section.type ?? '';
    const duration: number = section.duration ?? 0;
    const coords = extractCoords(section);
    const depTime = parseNavitiaDatetime(section.departure_date_time ?? '');
    const arrTime = parseNavitiaDatetime(section.arrival_date_time ?? '');
    const fromName = placeName(section.from);
    const toName = placeName(section.to);

    if (sType === 'street_network' || sType === 'crow_fly') {
      // Walking segment
      totalWalking += duration;
      if (duration > 0 || coords.length > 0) {
        steps.push({
          mode: 'walking',
          from: fromName,
          to: toName,
          departureTime: depTime,
          arrivalTime: arrTime,
          duration,
          coords,
        });
      }
    } else if (sType === 'public_transport') {
      const display = section.display_informations ?? {};
      const commercialMode: string = display.commercial_mode ?? '';
      const mode = MODE_MAP[commercialMode] ?? 'metro';
      const lineCode: string = display.code ?? '';
      const lineColor: string = display.color ? `#${display.color}` : '';

      // Count stops from stop_date_times
      const stopDateTimes: any[] = section.stop_date_times ?? [];
      const stopCount = stopDateTimes.length > 0 ? stopDateTimes.length - 1 : undefined;

      steps.push({
        mode,
        line: lineCode || undefined,
        lineColor: lineColor || undefined,
        from: fromName,
        to: toName,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration,
        stops: stopCount,
        coords,
      });
    } else if (sType === 'transfer') {
      // Transfer = walking between platforms
      totalWalking += duration;
      if (duration > 0) {
        steps.push({
          mode: 'walking',
          from: fromName,
          to: toName,
          departureTime: depTime,
          arrivalTime: arrTime,
          duration,
          coords,
        });
      }
    }
    // Skip 'waiting' sections — they don't produce visible steps

    // Accumulate all coords for the full polyline
    allCoords.push(...coords);
  }

  return {
    steps,
    totalDuration: journey.duration ?? 0,
    totalWalking,
    departureTime: parseNavitiaDatetime(journey.departure_date_time ?? ''),
    arrivalTime: parseNavitiaDatetime(journey.arrival_date_time ?? ''),
    coords: allCoords,
    transfers: journey.nb_transfers ?? 0,
  };
}

// ─── Fallback: simple metro-line approximation ────────────────────────────────

/**
 * When no Navitia API key is configured, generate a rough transit approximation:
 * walking (5 min) → metro (straight line) → walking (5 min).
 */
function fallbackTransitRoute(
  from: [number, number],
  to: [number, number],
): TransitRoute[] {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;

  // Haversine distance in meters
  const R = 6_371_000;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Rough transit speed: ~30 km/h average including stops
  const transitDuration = Math.round(dist / (30_000 / 3600)); // seconds
  const walkDuration = 300; // 5 min walking on each end
  const totalDuration = transitDuration + walkDuration * 2;

  // Intermediate points for the "metro" segment (offset from endpoints by ~300m)
  const offsetLat = 300 / 111_320;
  const offsetLng = 300 / (111_320 * Math.cos((fromLat * Math.PI) / 180));
  const metroFromLng = fromLng + offsetLng * Math.sign(toLng - fromLng || 1);
  const metroFromLat = fromLat + offsetLat * Math.sign(toLat - fromLat || 1);
  const metroToLng = toLng - offsetLng * Math.sign(toLng - fromLng || 1);
  const metroToLat = toLat - offsetLat * Math.sign(toLat - fromLat || 1);

  const now = new Date();
  const depWalkEnd = new Date(now.getTime() + walkDuration * 1000);
  const transitEnd = new Date(depWalkEnd.getTime() + transitDuration * 1000);
  const arrival = new Date(transitEnd.getTime() + walkDuration * 1000);

  const steps: TransitStep[] = [
    {
      mode: 'walking',
      from: 'Your location',
      to: 'Nearest station',
      departureTime: now.toISOString(),
      arrivalTime: depWalkEnd.toISOString(),
      duration: walkDuration,
      coords: [from, [metroFromLng, metroFromLat]],
    },
    {
      mode: 'metro',
      line: '~',
      lineColor: '#999999',
      from: 'Nearest station',
      to: 'Destination station',
      departureTime: depWalkEnd.toISOString(),
      arrivalTime: transitEnd.toISOString(),
      duration: transitDuration,
      stops: Math.max(1, Math.round(dist / 800)), // ~1 stop per 800m
      coords: [
        [metroFromLng, metroFromLat],
        [(metroFromLng + metroToLng) / 2, (metroFromLat + metroToLat) / 2],
        [metroToLng, metroToLat],
      ],
    },
    {
      mode: 'walking',
      from: 'Destination station',
      to: 'Destination',
      departureTime: transitEnd.toISOString(),
      arrivalTime: arrival.toISOString(),
      duration: walkDuration,
      coords: [[metroToLng, metroToLat], to],
    },
  ];

  const allCoords: [number, number][] = steps.flatMap((s) => s.coords);

  return [
    {
      steps,
      totalDuration,
      totalWalking: walkDuration * 2,
      departureTime: now.toISOString(),
      arrivalTime: arrival.toISOString(),
      coords: allCoords,
      transfers: 0,
    },
  ];
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetch transit routes from the IDFM Navitia API.
 *
 * @param from - [lng, lat] origin (Mapbox convention)
 * @param to   - [lng, lat] destination (Mapbox convention)
 * @returns Array of parsed TransitRoute objects (up to 3)
 */
export async function fetchTransitRoute(
  from: [number, number],
  to: [number, number],
): Promise<TransitRoute[]> {
  // If no API key, use fallback approximation
  if (!NAVITIA_KEY) {
    return fallbackTransitRoute(from, to);
  }

  try {
    // Navitia uses "lat;lng" format (reversed from Mapbox [lng, lat])
    const fromParam = `${from[1]};${from[0]}`;
    const toParam = `${to[1]};${to[0]}`;
    const datetime = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);

    const url = new URL(NAVITIA_BASE);
    url.searchParams.set('from', fromParam);
    url.searchParams.set('to', toParam);
    url.searchParams.set('datetime', datetime);
    url.searchParams.set('count', '3');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: NAVITIA_KEY,
      },
    });

    if (!res.ok) {
      console.error(`[transit] Navitia API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const journeys: any[] = data.journeys ?? [];

    if (journeys.length === 0) {
      return [];
    }

    return journeys.map(parseNavitiaJourney);
  } catch (err) {
    console.error('[transit] Failed to fetch transit routes:', err);
    return [];
  }
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
