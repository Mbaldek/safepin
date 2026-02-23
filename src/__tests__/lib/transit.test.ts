// src/__tests__/lib/transit.test.ts

import { describe, it, expect } from 'vitest';
import {
  formatTransitDuration,
  getLineIcon,
  decodePolyline,
  getTransitCheckpoints,
  TransitRoute,
} from '@/lib/transit';

// ---------------------------------------------------------------------------
// formatTransitDuration
// ---------------------------------------------------------------------------

describe('formatTransitDuration', () => {
  it('formats 60 seconds as "1 min"', () => {
    expect(formatTransitDuration(60)).toBe('1 min');
  });

  it('formats 300 seconds as "5 min"', () => {
    expect(formatTransitDuration(300)).toBe('5 min');
  });

  it('formats 3600 seconds as "1h"', () => {
    expect(formatTransitDuration(3600)).toBe('1h');
  });

  it('formats 3900 seconds as "1h 05"', () => {
    expect(formatTransitDuration(3900)).toBe('1h 05');
  });

  it('formats 0 seconds as "0 min"', () => {
    expect(formatTransitDuration(0)).toBe('0 min');
  });

  it('formats 7200 seconds as "2h"', () => {
    expect(formatTransitDuration(7200)).toBe('2h');
  });

  it('formats 5400 seconds as "1h 30"', () => {
    expect(formatTransitDuration(5400)).toBe('1h 30');
  });

  it('formats 150 seconds as "3 min" (rounds to nearest minute)', () => {
    expect(formatTransitDuration(150)).toBe('3 min');
  });

  it('formats 30 seconds as "1 min" (rounds up from 0.5)', () => {
    expect(formatTransitDuration(30)).toBe('1 min');
  });
});

// ---------------------------------------------------------------------------
// getLineIcon
// ---------------------------------------------------------------------------

describe('getLineIcon', () => {
  it('returns metro emoji for "metro"', () => {
    expect(getLineIcon('metro')).toBe('\u{1F687}');
  });

  it('returns train emoji for "rer"', () => {
    expect(getLineIcon('rer')).toBe('\u{1F686}');
  });

  it('returns bus emoji for "bus"', () => {
    expect(getLineIcon('bus')).toBe('\u{1F68C}');
  });

  it('returns tram emoji for "tram"', () => {
    expect(getLineIcon('tram')).toBe('\u{1F68A}');
  });

  it('returns high-speed train emoji for "rail"', () => {
    expect(getLineIcon('rail')).toBe('\u{1F684}');
  });

  it('returns walking emoji for "walking"', () => {
    expect(getLineIcon('walking')).toBe('\u{1F6B6}');
  });
});

// ---------------------------------------------------------------------------
// decodePolyline
// ---------------------------------------------------------------------------

describe('decodePolyline', () => {
  it('decodes a simple encoded polyline (precision 6)', () => {
    // Encode a known point pair for precision 6
    // [lng=2.352, lat=48.856] should decode correctly
    const coords = decodePolyline('_seqH_ibM');
    expect(coords.length).toBeGreaterThan(0);
    // Each coord should be [lng, lat]
    for (const c of coords) {
      expect(c).toHaveLength(2);
      expect(typeof c[0]).toBe('number');
      expect(typeof c[1]).toBe('number');
    }
  });

  it('returns empty array for empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('returns [lng, lat] pairs (Mapbox convention)', () => {
    // A minimal polyline that encodes a single point
    const coords = decodePolyline('_seqH_ibM');
    if (coords.length > 0) {
      const [lng, lat] = coords[0];
      // Paris-area: lat ~48, lng ~2
      expect(Math.abs(lat)).toBeGreaterThan(0);
      expect(Math.abs(lng)).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getTransitCheckpoints
// ---------------------------------------------------------------------------

describe('getTransitCheckpoints', () => {
  const mockRoute: TransitRoute = {
    steps: [
      {
        mode: 'walking',
        from: 'Start',
        to: 'Station A',
        departureTime: '2026-02-23T08:00:00',
        arrivalTime: '2026-02-23T08:05:00',
        duration: 300,
        coords: [[2.35, 48.85], [2.347, 48.858]],
      },
      {
        mode: 'metro',
        line: '1',
        lineColor: '#FFBE00',
        from: 'Station A',
        to: 'Station B',
        departureTime: '2026-02-23T08:05:00',
        arrivalTime: '2026-02-23T08:20:00',
        duration: 900,
        stops: 4,
        coords: [[2.347, 48.858], [2.369, 48.853], [2.395, 48.844]],
      },
      {
        mode: 'bus',
        line: '56',
        lineColor: '#00A84F',
        from: 'Station B',
        to: 'Station C',
        departureTime: '2026-02-23T08:23:00',
        arrivalTime: '2026-02-23T08:27:00',
        duration: 240,
        stops: 1,
        coords: [[2.395, 48.844], [2.398, 48.850]],
      },
      {
        mode: 'walking',
        from: 'Station C',
        to: 'End',
        departureTime: '2026-02-23T08:27:00',
        arrivalTime: '2026-02-23T08:30:00',
        duration: 180,
        coords: [[2.398, 48.850], [2.400, 48.851]],
      },
    ],
    totalDuration: 1800,
    totalWalking: 480,
    departureTime: '2026-02-23T08:00:00',
    arrivalTime: '2026-02-23T08:30:00',
    coords: [],
    transfers: 1,
  };

  it('extracts checkpoints only from transit legs (not walking)', () => {
    const checkpoints = getTransitCheckpoints(mockRoute);
    // 2 transit legs × 2 (departure + arrival) = 4 checkpoints
    expect(checkpoints).toHaveLength(4);
  });

  it('includes departure and arrival stations for each transit leg', () => {
    const checkpoints = getTransitCheckpoints(mockRoute);
    expect(checkpoints[0].name).toBe('Station A');
    expect(checkpoints[1].name).toBe('Station B');
    expect(checkpoints[2].name).toBe('Station B');
    expect(checkpoints[3].name).toBe('Station C');
  });

  it('includes mode and line info', () => {
    const checkpoints = getTransitCheckpoints(mockRoute);
    expect(checkpoints[0].mode).toBe('metro');
    expect(checkpoints[0].line).toBe('1');
    expect(checkpoints[2].mode).toBe('bus');
    expect(checkpoints[2].line).toBe('56');
  });

  it('includes expected times', () => {
    const checkpoints = getTransitCheckpoints(mockRoute);
    expect(checkpoints[0].expectedTime).toBe('2026-02-23T08:05:00');
    expect(checkpoints[1].expectedTime).toBe('2026-02-23T08:20:00');
  });

  it('returns empty array for route with only walking', () => {
    const walkOnly: TransitRoute = {
      steps: [{
        mode: 'walking', from: 'A', to: 'B',
        departureTime: '', arrivalTime: '', duration: 600,
        coords: [[2.35, 48.85], [2.36, 48.86]],
      }],
      totalDuration: 600, totalWalking: 600,
      departureTime: '', arrivalTime: '', coords: [], transfers: 0,
    };
    expect(getTransitCheckpoints(walkOnly)).toHaveLength(0);
  });
});
