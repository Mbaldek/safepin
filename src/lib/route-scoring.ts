import type { Pin } from '@/types';
import { DECAY_HOURS } from '@/types';
import { haversineMetersLngLat } from '@/lib/utils';
import { getEffectiveDate } from '@/lib/pin-utils';
import type { TransitStep } from '@/lib/transit';

export const SEVERITY_WEIGHT = { low: 1, med: 2, high: 4 } as const;
const CORRIDOR_M = 200;
const MAX_SAMPLES = 200;

/**
 * Sample N evenly-spaced points along a polyline.
 * Returns [lng, lat] tuples.
 */
function samplePoints(coords: [number, number][], maxSamples: number): [number, number][] {
  if (coords.length <= maxSamples) return coords;
  const step = (coords.length - 1) / (maxSamples - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < maxSamples; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

/**
 * Time decay factor for a pin (1.0 = fresh, 0.0 = expired).
 * Uses last_confirmed_at when available to reset decay timer.
 */
function timeDecay(pin: Pin): number {
  const ageH = (Date.now() - getEffectiveDate(pin).getTime()) / (3600_000);
  const maxH = DECAY_HOURS[pin.category] || 24;
  if (ageH >= maxH) return 0;
  return 1 - (ageH / maxH) * 0.7; // decays to 0.3 at maxH boundary
}

/**
 * Confirmation boost: more confirmations = more weight.
 */
function confirmBoost(confirmations: number | undefined): number {
  return 1 + Math.min(confirmations ?? 0, 10) * 0.1;
}

/**
 * Score a route based on nearby recent pins.
 * Returns a value 0-100 (0 = safe, 100 = very dangerous).
 */
export function scoreRoute(coords: [number, number][], pins: Pin[]): number {
  if (coords.length === 0 || pins.length === 0) return 0;

  // Pre-filter: only unresolved, non-expired pins (accounts for confirmation resets)
  const now = Date.now();
  const activePins = pins.filter((p) => {
    if (p.resolved_at) return false;
    const maxH = DECAY_HOURS[p.category] || 24;
    const ageH = (now - getEffectiveDate(p).getTime()) / 3600_000;
    return ageH < maxH;
  });
  if (activePins.length === 0) return 0;

  const samples = samplePoints(coords, MAX_SAMPLES);
  let totalScore = 0;

  for (const pt of samples) {
    for (const pin of activePins) {
      const dist = haversineMetersLngLat(pt, [pin.lng, pin.lat]);
      if (dist > CORRIDOR_M) continue;

      const sev = SEVERITY_WEIGHT[pin.severity as keyof typeof SEVERITY_WEIGHT] ?? 1;
      const decay = timeDecay(pin);
      const boost = confirmBoost(pin.confirmations);
      totalScore += sev * decay * boost;
    }
  }

  const normalized = (totalScore / samples.length) * 10;
  return Math.min(100, Math.round(normalized * 10) / 10);
}

// ─── Transit-specific scoring ──────────────────────────────────────────────

const TRANSIT_CATEGORIES = ['pickpocket', 'vol', 'agression', 'harcelement', 'racket'];
const STATION_RADIUS_M = 200;

/**
 * Get active pins filtered to transit-relevant categories.
 */
function getActivePins(pins: Pin[]): Pin[] {
  const now = Date.now();
  return pins.filter((p) => {
    if (p.resolved_at) return false;
    const maxH = DECAY_HOURS[p.category] || 24;
    const ageH = (now - getEffectiveDate(p).getTime()) / 3600_000;
    return ageH < maxH;
  });
}

/**
 * Score a single transit step (metro/rer/bus/tram) based on
 * incident pins near its departure and arrival stations.
 */
export function scoreTransitStep(step: TransitStep, pins: Pin[]): number {
  if (step.mode === 'walking' || step.coords.length === 0) return 0;
  const active = getActivePins(pins);
  if (active.length === 0) return 0;

  const stationCoords = [step.coords[0], step.coords[step.coords.length - 1]];
  let total = 0;

  for (const pin of active) {
    if (!TRANSIT_CATEGORIES.includes(pin.category)) continue;
    for (const sc of stationCoords) {
      const dist = haversineMetersLngLat(sc, [pin.lng, pin.lat]);
      if (dist > STATION_RADIUS_M) continue;
      total += (SEVERITY_WEIGHT[pin.severity as keyof typeof SEVERITY_WEIGHT] ?? 1)
        * timeDecay(pin) * confirmBoost(pin.confirmations);
    }
  }

  return total;
}

/**
 * Score a full multi-modal transit route.
 * Walking segments use corridor scoring, transit segments use station scoring (weighted 0.5×).
 */
export function scoreTransitRoute(steps: TransitStep[], pins: Pin[]): number {
  let totalScore = 0;
  let totalDuration = 0;

  for (const step of steps) {
    const dur = Math.max(step.duration, 1);
    if (step.mode === 'walking') {
      totalScore += scoreRoute(step.coords, pins) * dur;
    } else {
      totalScore += scoreTransitStep(step, pins) * dur * 0.5;
    }
    totalDuration += dur;
  }

  return totalDuration > 0
    ? Math.min(100, Math.round((totalScore / totalDuration) * 10) / 10)
    : 0;
}

/**
 * Get alert badge data for a transit step (used by RouteCard UI).
 * Returns null if no relevant incidents near stations.
 */
export function getStepAlerts(
  step: TransitStep,
  pins: Pin[],
): { count: number; maxSeverity: 'low' | 'med' | 'high' } | null {
  if (step.mode === 'walking' || step.coords.length === 0) return null;
  const active = getActivePins(pins);
  if (active.length === 0) return null;

  const stationCoords = [step.coords[0], step.coords[step.coords.length - 1]];
  let count = 0;
  let maxSev: 'low' | 'med' | 'high' = 'low';

  for (const pin of active) {
    if (!TRANSIT_CATEGORIES.includes(pin.category)) continue;
    for (const sc of stationCoords) {
      if (haversineMetersLngLat(sc, [pin.lng, pin.lat]) <= STATION_RADIUS_M) {
        count++;
        if (pin.severity === 'high') maxSev = 'high';
        else if (pin.severity === 'med' && maxSev !== 'high') maxSev = 'med';
        break; // count each pin once
      }
    }
  }

  return count > 0 ? { count, maxSeverity: maxSev } : null;
}
