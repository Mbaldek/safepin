// src/components/NeighborhoodScoreLayer.tsx — Grid-based safety score overlay (Pro-only)

'use client';

import { useEffect, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import type { Pin } from '@/types';

const CELL_SIZE_DEG = 0.005; // ~500m at mid-latitudes
const SEVERITY_WEIGHT = { low: 1, med: 2, high: 4 } as const;
const DECAY_DAYS = 30; // Pins older than 30d get reduced weight

type GridCell = {
  lat: number;
  lng: number;
  score: number; // 0-100 (higher = more dangerous)
};

type TimeBracket = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

function matchesTimeBracket(pin: Pin, bracket: TimeBracket): boolean {
  if (bracket === 'all') return true;
  const h = new Date(pin.created_at).getHours();
  if (bracket === 'morning')   return h >= 6  && h < 12;
  if (bracket === 'afternoon') return h >= 12 && h < 18;
  if (bracket === 'evening')   return h >= 18 && h < 22;
  /* night */ return h >= 22 || h < 6;
}

function computeGrid(pins: Pin[], bounds: { north: number; south: number; east: number; west: number }, timeBracket: TimeBracket = 'all'): GridCell[] {
  const cells: GridCell[] = [];
  const now = Date.now();

  for (let lat = bounds.south; lat < bounds.north; lat += CELL_SIZE_DEG) {
    for (let lng = bounds.west; lng < bounds.east; lng += CELL_SIZE_DEG) {
      let rawScore = 0;
      for (const pin of pins) {
        if (!matchesTimeBracket(pin, timeBracket)) continue;
        if (pin.lat >= lat && pin.lat < lat + CELL_SIZE_DEG && pin.lng >= lng && pin.lng < lng + CELL_SIZE_DEG) {
          const ageMs = now - new Date(pin.created_at).getTime();
          const ageDays = ageMs / (24 * 3600_000);
          const decay = ageDays > DECAY_DAYS ? 0.3 : 1 - (ageDays / DECAY_DAYS) * 0.7;
          const weight = SEVERITY_WEIGHT[pin.severity as keyof typeof SEVERITY_WEIGHT] ?? 1;
          rawScore += weight * decay;
        }
      }
      if (rawScore > 0) {
        cells.push({ lat: lat + CELL_SIZE_DEG / 2, lng: lng + CELL_SIZE_DEG / 2, score: Math.min(100, rawScore * 10) });
      }
    }
  }
  return cells;
}

function scoreToColor(score: number): string {
  if (score < 20) return 'rgba(16,185,129,0.15)';  // green
  if (score < 50) return 'rgba(245,158,11,0.2)';    // amber
  return 'rgba(239,68,68,0.25)';                     // red
}

/**
 * This component renders safety score grid cells as a GeoJSON layer on the Mapbox map.
 * It needs to be called from MapView where the map instance is available.
 * For simplicity, we export a helper function that MapView calls.
 */
export function buildScoreGeoJSON(pins: Pin[], bounds: { north: number; south: number; east: number; west: number }, timeBracket: TimeBracket = 'all') {
  const cells = computeGrid(pins, bounds, timeBracket);
  return {
    type: 'FeatureCollection' as const,
    features: cells.map((cell) => ({
      type: 'Feature' as const,
      properties: {
        score: cell.score,
        color: scoreToColor(cell.score),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [cell.lng - CELL_SIZE_DEG / 2, cell.lat - CELL_SIZE_DEG / 2],
          [cell.lng + CELL_SIZE_DEG / 2, cell.lat - CELL_SIZE_DEG / 2],
          [cell.lng + CELL_SIZE_DEG / 2, cell.lat + CELL_SIZE_DEG / 2],
          [cell.lng - CELL_SIZE_DEG / 2, cell.lat + CELL_SIZE_DEG / 2],
          [cell.lng - CELL_SIZE_DEG / 2, cell.lat - CELL_SIZE_DEG / 2],
        ]],
      },
    })),
  };
}

