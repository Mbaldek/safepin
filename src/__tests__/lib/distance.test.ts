// src/__tests__/lib/distance.test.ts — Test the computeTrend distance helper

import { describe, it, expect } from 'vitest';
import { computeTrend } from '@/components/TrendSparkline';
import type { Pin } from '@/types';

function makePin(lat: number, lng: number, daysAgo: number): Pin {
  return {
    id: crypto.randomUUID(),
    user_id: 'test-user',
    lat,
    lng,
    category: 'harassment',
    severity: 'med',
    description: 'test',
    is_emergency: false,
    photo_url: null,
    created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    resolved_at: null,
    environment: null,
    urban_context: null,
    urban_context_custom: null,
    is_moving: false,
    media_urls: null,
    last_confirmed_at: null,
    flag_count: 0,
    hidden_at: null,
  };
}

const CENTER = { lat: 48.8566, lng: 2.3522 }; // Paris

describe('computeTrend', () => {
  it('returns flat when no pins', () => {
    expect(computeTrend([], CENTER, 500)).toBe('flat');
  });

  it('returns flat when all pins are old', () => {
    const pins = [makePin(CENTER.lat, CENTER.lng, 20)];
    expect(computeTrend(pins, CENTER, 500)).toBe('flat');
  });

  it('returns up when recent pins > previous period', () => {
    // 5 pins in last 7 days, 0 in previous 7 days
    const pins = Array.from({ length: 5 }, () => makePin(CENTER.lat, CENTER.lng, 2));
    expect(computeTrend(pins, CENTER, 500)).toBe('up');
  });

  it('returns down when recent pins < previous period', () => {
    // 0 pins in last 7 days, 5 in previous 7 days
    const pins = Array.from({ length: 5 }, () => makePin(CENTER.lat, CENTER.lng, 10));
    expect(computeTrend(pins, CENTER, 500)).toBe('down');
  });

  it('ignores pins outside radius', () => {
    // Pins far away from center
    const pins = Array.from({ length: 5 }, () => makePin(CENTER.lat + 1, CENTER.lng + 1, 2));
    expect(computeTrend(pins, CENTER, 500)).toBe('flat');
  });
});
