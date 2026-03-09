// src/lib/utils.ts — Shared utilities (extracted from 30+ component copies)

/**
 * Human-readable relative time string.
 * Compact form: "now", "5m", "3h", "2d"
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

/**
 * Verbose relative time: "just now", "5min ago", "3h ago", "2d ago"
 */
export function timeAgoLong(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2) return 'just now';
  if (hours < 1) return `${mins}min ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Haversine distance in meters between two {lat, lng} points.
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Haversine distance in kilometers.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineMeters(a, b) / 1000;
}

/**
 * Haversine for [lng, lat] tuple pairs (Mapbox/GeoJSON coordinate order).
 */
export function haversineMetersLngLat(
  a: [number, number],
  b: [number, number],
): number {
  return haversineMeters(
    { lat: a[1], lng: a[0] },
    { lat: b[1], lng: b[0] },
  );
}

/**
 * Haversine using raw lat/lng numbers.
 */
export function haversineMetersRaw(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  return haversineMeters({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

/**
 * Shared spring transition config for bottom sheets.
 */
export const springTransition = {
  type: 'spring' as const,
  damping: 32,
  stiffness: 320,
  mass: 0.8,
};

/** Simple class name joiner (no tailwind-merge needed). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
