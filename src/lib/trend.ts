import type { Pin } from '@/types';
import { haversineMeters } from '@/lib/utils';

/**
 * Compute trend direction by comparing recent vs older pin counts.
 * Returns 'up' | 'down' | 'flat'.
 */
export function computeTrend(
  pins: Pin[],
  center: { lat: number; lng: number },
  radiusM: number,
): 'up' | 'down' | 'flat' {
  const now = Date.now();
  const weekMs = 7 * 24 * 3_600_000;

  function nearby(p: Pin): boolean {
    return haversineMeters(center, { lat: p.lat, lng: p.lng }) <= radiusM;
  }

  let recent = 0;
  let older = 0;

  for (const p of pins) {
    if (!nearby(p)) continue;
    const age = now - new Date(p.created_at).getTime();
    if (age <= weekMs) recent++;
    else if (age <= 2 * weekMs) older++;
  }

  if (recent > older) return 'up';
  if (recent < older) return 'down';
  return 'flat';
}
