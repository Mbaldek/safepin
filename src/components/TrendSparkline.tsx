// src/components/TrendSparkline.tsx — 7-day pin activity sparkline

'use client';

import { useMemo } from 'react';
import type { Pin } from '@/types';
import { haversineMeters } from '@/lib/utils';

type Props = {
  pins: Pin[];
  days?: number;
  width?: number;
  height?: number;
  color?: string;
};

/**
 * Returns an array of per-day pin counts for the last N days.
 * Index 0 = oldest day, index N-1 = today.
 */
function dailyCounts(pins: Pin[], days: number): number[] {
  const now = Date.now();
  const msPerDay = 24 * 3_600_000;
  const counts = new Array(days).fill(0);

  for (const pin of pins) {
    const age = now - new Date(pin.created_at).getTime();
    const bucket = days - 1 - Math.floor(age / msPerDay);
    if (bucket >= 0 && bucket < days) counts[bucket]++;
  }

  return counts;
}

export default function TrendSparkline({
  pins,
  days = 7,
  width = 120,
  height = 32,
  color = 'var(--accent)',
}: Props) {
  const counts = useMemo(() => dailyCounts(pins, days), [pins, days]);
  const max = Math.max(...counts, 1);

  const padX = 2;
  const padY = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = counts
    .map((c, i) => {
      const x = padX + (i / (days - 1)) * innerW;
      const y = padY + innerH - (c / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  // Trend arrow: compare last 3 days vs previous 4 days
  const recent = counts.slice(-3).reduce((a, b) => a + b, 0);
  const older = counts.slice(0, -3).reduce((a, b) => a + b, 0);
  const trend = recent > older ? 'up' : recent < older ? 'down' : 'flat';
  const trendColor = trend === 'up' ? '#ef4444' : trend === 'down' ? '#22c55e' : 'var(--text-muted)';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Filled area */}
        <polygon
          points={`${padX},${padY + innerH} ${points} ${padX + innerW},${padY + innerH}`}
          fill={color}
          opacity={0.12}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="text-[0.6rem] font-black"
        style={{ color: trendColor }}
      >
        {trendArrow}
      </span>
    </div>
  );
}

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
