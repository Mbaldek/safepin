// src/__tests__/lib/transit.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatTransitDuration,
  getLineIcon,
  parseNavitiaJourney,
  fetchTransitRoute,
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
    // 150s = 2.5 min → Math.round → 3
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
// parseNavitiaJourney
// ---------------------------------------------------------------------------

describe('parseNavitiaJourney', () => {
  const mockJourney = {
    duration: 1800,
    departure_date_time: '20260223T080000',
    arrival_date_time: '20260223T083000',
    nb_transfers: 1,
    sections: [
      {
        type: 'street_network',
        duration: 300,
        departure_date_time: '20260223T080000',
        arrival_date_time: '20260223T080500',
        from: { address: { name: '12 Rue de Rivoli', coord: { lon: '2.352', lat: '48.856' } } },
        to: { stop_point: { name: 'Chatelet', coord: { lon: '2.347', lat: '48.858' } } },
        geojson: {
          coordinates: [[2.352, 48.856], [2.347, 48.858]],
        },
      },
      {
        type: 'public_transport',
        duration: 900,
        departure_date_time: '20260223T080500',
        arrival_date_time: '20260223T082000',
        from: { stop_point: { name: 'Chatelet' } },
        to: { stop_point: { name: 'Nation' } },
        display_informations: {
          commercial_mode: 'Metro',
          code: '1',
          color: 'FFCD00',
        },
        stop_date_times: [
          { stop_point: { name: 'Chatelet' } },
          { stop_point: { name: 'Hotel de Ville' } },
          { stop_point: { name: 'Bastille' } },
          { stop_point: { name: 'Gare de Lyon' } },
          { stop_point: { name: 'Nation' } },
        ],
        geojson: {
          coordinates: [[2.347, 48.858], [2.353, 48.853], [2.369, 48.853], [2.395, 48.844]],
        },
      },
      {
        type: 'transfer',
        duration: 180,
        departure_date_time: '20260223T082000',
        arrival_date_time: '20260223T082300',
        from: { stop_point: { name: 'Nation (Line 1)' } },
        to: { stop_point: { name: 'Nation (Line 2)' } },
        geojson: { coordinates: [] },
      },
      {
        type: 'public_transport',
        duration: 240,
        departure_date_time: '20260223T082300',
        arrival_date_time: '20260223T082700',
        from: { stop_point: { name: 'Nation' } },
        to: { stop_point: { name: 'Avron' } },
        display_informations: {
          commercial_mode: 'Bus',
          code: '56',
          color: '00A84F',
        },
        stop_date_times: [
          { stop_point: { name: 'Nation' } },
          { stop_point: { name: 'Avron' } },
        ],
        geojson: {
          coordinates: [[2.395, 48.844], [2.398, 48.850]],
        },
      },
      {
        type: 'street_network',
        duration: 180,
        departure_date_time: '20260223T082700',
        arrival_date_time: '20260223T083000',
        from: { stop_point: { name: 'Avron', coord: { lon: '2.398', lat: '48.850' } } },
        to: { address: { name: '5 Rue Avron', coord: { lon: '2.400', lat: '48.851' } } },
        geojson: {
          coordinates: [[2.398, 48.850], [2.400, 48.851]],
        },
      },
    ],
  };

  it('extracts all steps from sections', () => {
    const route = parseNavitiaJourney(mockJourney);
    // 2 walking + 2 public_transport + 1 transfer = 5 steps
    expect(route.steps).toHaveLength(5);
  });

  it('correctly identifies walking steps', () => {
    const route = parseNavitiaJourney(mockJourney);
    const walkingSteps = route.steps.filter((s) => s.mode === 'walking');
    expect(walkingSteps).toHaveLength(3); // 2 street_network + 1 transfer
  });

  it('correctly maps commercial mode to transit mode', () => {
    const route = parseNavitiaJourney(mockJourney);
    const transitSteps = route.steps.filter((s) => s.mode !== 'walking');
    expect(transitSteps[0].mode).toBe('metro');
    expect(transitSteps[1].mode).toBe('bus');
  });

  it('extracts line codes', () => {
    const route = parseNavitiaJourney(mockJourney);
    const transitSteps = route.steps.filter((s) => s.mode !== 'walking');
    expect(transitSteps[0].line).toBe('1');
    expect(transitSteps[1].line).toBe('56');
  });

  it('formats line colors with # prefix', () => {
    const route = parseNavitiaJourney(mockJourney);
    const transitSteps = route.steps.filter((s) => s.mode !== 'walking');
    expect(transitSteps[0].lineColor).toBe('#FFCD00');
    expect(transitSteps[1].lineColor).toBe('#00A84F');
  });

  it('counts stops correctly (stop_date_times.length - 1)', () => {
    const route = parseNavitiaJourney(mockJourney);
    const transitSteps = route.steps.filter((s) => s.mode !== 'walking');
    expect(transitSteps[0].stops).toBe(4); // 5 stop_date_times - 1
    expect(transitSteps[1].stops).toBe(1); // 2 stop_date_times - 1
  });

  it('computes total duration from the journey object', () => {
    const route = parseNavitiaJourney(mockJourney);
    expect(route.totalDuration).toBe(1800);
  });

  it('computes total walking time from walking + transfer sections', () => {
    const route = parseNavitiaJourney(mockJourney);
    // 300 (street_network) + 180 (transfer) + 180 (street_network) = 660
    expect(route.totalWalking).toBe(660);
  });

  it('parses departure and arrival datetime strings', () => {
    const route = parseNavitiaJourney(mockJourney);
    expect(route.departureTime).toBe('2026-02-23T08:00:00');
    expect(route.arrivalTime).toBe('2026-02-23T08:30:00');
  });

  it('extracts transfers count', () => {
    const route = parseNavitiaJourney(mockJourney);
    expect(route.transfers).toBe(1);
  });

  it('concatenates all coordinates into the route coords', () => {
    const route = parseNavitiaJourney(mockJourney);
    // 2 + 4 + 0 (empty transfer) + 2 + 2 = 10 coordinate pairs
    expect(route.coords).toHaveLength(10);
  });

  it('extracts place names from stop_points and addresses', () => {
    const route = parseNavitiaJourney(mockJourney);
    expect(route.steps[0].from).toBe('12 Rue de Rivoli');
    expect(route.steps[0].to).toBe('Chatelet');
    expect(route.steps[1].from).toBe('Chatelet');
    expect(route.steps[1].to).toBe('Nation');
  });

  it('handles an empty journey with no sections', () => {
    const emptyJourney = {
      duration: 0,
      departure_date_time: '',
      arrival_date_time: '',
      nb_transfers: 0,
      sections: [],
    };
    const route = parseNavitiaJourney(emptyJourney);
    expect(route.steps).toHaveLength(0);
    expect(route.totalDuration).toBe(0);
    expect(route.totalWalking).toBe(0);
    expect(route.coords).toHaveLength(0);
  });

  it('skips waiting sections', () => {
    const journeyWithWaiting = {
      duration: 600,
      departure_date_time: '20260223T090000',
      arrival_date_time: '20260223T091000',
      nb_transfers: 0,
      sections: [
        {
          type: 'waiting',
          duration: 120,
          departure_date_time: '20260223T090000',
          arrival_date_time: '20260223T090200',
          from: { stop_point: { name: 'Station A' } },
          to: { stop_point: { name: 'Station A' } },
        },
        {
          type: 'public_transport',
          duration: 480,
          departure_date_time: '20260223T090200',
          arrival_date_time: '20260223T091000',
          from: { stop_point: { name: 'Station A' } },
          to: { stop_point: { name: 'Station B' } },
          display_informations: {
            commercial_mode: 'RapidTransit',
            code: 'A',
            color: 'E2231A',
          },
          stop_date_times: [
            { stop_point: { name: 'Station A' } },
            { stop_point: { name: 'Station B' } },
          ],
          geojson: { coordinates: [[2.3, 48.8], [2.4, 48.9]] },
        },
      ],
    };
    const route = parseNavitiaJourney(journeyWithWaiting);
    // Waiting section is skipped; only the public_transport step remains
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0].mode).toBe('rer');
    expect(route.steps[0].line).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// fetchTransitRoute — fallback when no API key
// ---------------------------------------------------------------------------

describe('fetchTransitRoute', () => {
  it('returns a fallback route when NAVITIA_KEY is not set', async () => {
    // NAVITIA_KEY reads process.env.NEXT_PUBLIC_NAVITIA_KEY at module level,
    // which is undefined in the test environment, so the fallback path is used.
    const from: [number, number] = [2.352, 48.856];
    const to: [number, number] = [2.400, 48.851];

    const routes = await fetchTransitRoute(from, to);

    expect(routes).toHaveLength(1);
    const route = routes[0];

    // Fallback generates 3 steps: walking → metro → walking
    expect(route.steps).toHaveLength(3);
    expect(route.steps[0].mode).toBe('walking');
    expect(route.steps[1].mode).toBe('metro');
    expect(route.steps[2].mode).toBe('walking');

    // Walking durations on each end are 300s (5 minutes)
    expect(route.steps[0].duration).toBe(300);
    expect(route.steps[2].duration).toBe(300);
    expect(route.totalWalking).toBe(600);

    // The metro step has an approximate line marker
    expect(route.steps[1].line).toBe('~');
    expect(route.steps[1].lineColor).toBe('#999999');

    // Total duration = walking + transit + walking
    expect(route.totalDuration).toBe(route.steps[0].duration + route.steps[1].duration + route.steps[2].duration);

    // Zero transfers in fallback
    expect(route.transfers).toBe(0);

    // Coords are populated
    expect(route.coords.length).toBeGreaterThan(0);
  });

  it('fallback route has stops based on distance', async () => {
    const from: [number, number] = [2.30, 48.85];
    const to: [number, number] = [2.40, 48.85];

    const routes = await fetchTransitRoute(from, to);
    const metroStep = routes[0].steps[1];

    // The stops calculation is Math.max(1, Math.round(dist / 800))
    expect(metroStep.stops).toBeGreaterThanOrEqual(1);
  });
});
