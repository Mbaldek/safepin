// src/lib/TripMonitor.ts
// Background safety engine that runs during active trips.
// Checks: nearby incidents, stationary anomaly, auto-arrival, transit checkpoints.

import { useStore, TripSession } from '@/stores/useStore';
import { haversineMetersLngLat } from '@/lib/utils';
import { getTransitCheckpoints, TransitCheckpoint } from '@/lib/transit';
import { supabase } from '@/lib/supabase';

const TICK_INTERVAL_MS = 30_000; // 30 seconds
const INCIDENT_RADIUS_M = 200;
const STATIONARY_THRESHOLD_M = 15;
const STATIONARY_WINDOW = 3; // 3 ticks = 90 seconds
const ARRIVAL_RADIUS_M = 50;
const ARRIVAL_HOLD_TICKS = 1; // 30s near destination = arrival

export type MonitorEvent =
  | { type: 'nudge'; message: string }
  | { type: 'incident'; message: string; pinId: string }
  | { type: 'arrival' }
  | { type: 'escalate'; reason: string }
  | { type: 'checkpoint'; checkpoint: TransitCheckpoint };

export type MonitorCallback = (event: MonitorEvent) => void;

export class TripMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private positions: { lat: number; lng: number; time: number }[] = [];
  private arrivalTicks = 0;
  private stationaryTicks = 0;
  private stationaryNudgeSent = false;
  private escalated = false;
  private seenIncidentIds = new Set<string>();
  private reachedCheckpoints = new Set<number>();
  private checkpoints: TransitCheckpoint[] = [];
  private trip: TripSession | null = null;
  private callback: MonitorCallback | null = null;

  start(trip: TripSession, callback: MonitorCallback): void {
    this.stop();
    this.trip = trip;
    this.callback = callback;
    this.positions = [];
    this.arrivalTicks = 0;
    this.stationaryTicks = 0;
    this.stationaryNudgeSent = false;
    this.escalated = false;
    this.seenIncidentIds = new Set();
    this.reachedCheckpoints = new Set();

    // Extract transit checkpoints if applicable
    if (trip.mode === 'transit' && trip.transitSteps) {
      const mockRoute = {
        steps: trip.transitSteps,
        totalDuration: 0,
        totalWalking: 0,
        departureTime: '',
        arrivalTime: '',
        coords: [],
        transfers: 0,
      };
      this.checkpoints = getTransitCheckpoints(mockRoute);
    }

    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    // Run first tick immediately
    this.tick();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.trip = null;
    this.callback = null;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  private async tick(): Promise<void> {
    const store = useStore.getState();
    const loc = store.userLocation;
    if (!loc || !this.trip) return;

    const now = Date.now();
    this.positions.push({ lat: loc.lat, lng: loc.lng, time: now });
    // Keep only last 5 positions (2.5 min window)
    if (this.positions.length > 5) this.positions.shift();

    // Record location to DB
    const uid = store.userId;
    if (uid) {
      supabase.from('location_history').insert({
        user_id: uid, lat: loc.lat, lng: loc.lng,
      }).then(() => {});
    }

    // Run all checks
    this.checkIncidents(loc, store.pins);
    this.checkStationary();
    this.checkArrival(loc);
    this.checkTransitCheckpoints(loc);
  }

  private checkIncidents(loc: { lat: number; lng: number }, pins: { id: string; lat: number; lng: number; resolved_at?: string | null; is_emergency?: boolean }[]): void {
    for (const pin of pins) {
      if (pin.resolved_at) continue;
      if (this.seenIncidentIds.has(pin.id)) continue;
      const dist = haversineMetersLngLat([loc.lng, loc.lat], [pin.lng, pin.lat]);
      if (dist < INCIDENT_RADIUS_M) {
        this.seenIncidentIds.add(pin.id);
        // Update trip incident count
        if (this.trip) {
          this.trip = { ...this.trip, incidents: this.trip.incidents + 1 };
          useStore.getState().setActiveTrip(this.trip);
        }
        this.callback?.({
          type: 'incident',
          message: pin.is_emergency
            ? 'Emergency alert detected nearby — stay alert!'
            : 'Incident reported nearby — stay alert',
          pinId: pin.id,
        });
      }
    }
  }

  private checkStationary(): void {
    if (this.positions.length < STATIONARY_WINDOW) return;

    const recent = this.positions.slice(-STATIONARY_WINDOW);
    let maxDist = 0;
    for (let i = 1; i < recent.length; i++) {
      const d = haversineMetersLngLat(
        [recent[0].lng, recent[0].lat],
        [recent[i].lng, recent[i].lat],
      );
      if (d > maxDist) maxDist = d;
    }

    if (maxDist < STATIONARY_THRESHOLD_M) {
      this.stationaryTicks++;

      if (this.stationaryTicks >= STATIONARY_WINDOW && !this.stationaryNudgeSent) {
        this.stationaryNudgeSent = true;
        if (this.trip) {
          this.trip = { ...this.trip, nudges: this.trip.nudges + 1 };
          useStore.getState().setActiveTrip(this.trip);
        }
        this.callback?.({
          type: 'nudge',
          message: "You've been stationary for a while. Are you OK?",
        });
      }

      // Escalate after 6 ticks (3 min) with no movement
      if (this.stationaryTicks >= 6 && !this.escalated) {
        this.escalated = true;
        if (this.trip) {
          this.trip = { ...this.trip, escalated: true };
          useStore.getState().setActiveTrip(this.trip);
        }
        this.escalate('Stationary for over 3 minutes — no response to nudge');
      }
    } else {
      this.stationaryTicks = 0;
      this.stationaryNudgeSent = false;
    }
  }

  private checkArrival(loc: { lat: number; lng: number }): void {
    if (!this.trip) return;
    const destCoords = this.trip.destination.coords;
    const dist = haversineMetersLngLat([loc.lng, loc.lat], destCoords);

    if (dist < ARRIVAL_RADIUS_M) {
      this.arrivalTicks++;
      if (this.arrivalTicks >= ARRIVAL_HOLD_TICKS) {
        this.callback?.({ type: 'arrival' });
      }
    } else {
      this.arrivalTicks = 0;
    }
  }

  private checkTransitCheckpoints(loc: { lat: number; lng: number }): void {
    if (this.checkpoints.length === 0) return;

    for (let i = 0; i < this.checkpoints.length; i++) {
      if (this.reachedCheckpoints.has(i)) continue;
      const cp = this.checkpoints[i];
      const dist = haversineMetersLngLat([loc.lng, loc.lat], cp.coords);
      if (dist < 100) {
        this.reachedCheckpoints.add(i);
        this.callback?.({ type: 'checkpoint', checkpoint: cp });
        // Record checkpoint on server (fire-and-forget)
        if (this.trip) {
          fetch('/api/trips/checkpoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trip_id: this.trip.id,
              checkpoint_type: 'station',
              label: cp.name,
              lat: cp.coords[1],
              lng: cp.coords[0],
              expected_at: cp.expectedTime ?? null,
            }),
          }).catch(() => { /* non-critical */ });
        }
      }
    }
  }

  private escalate(reason: string): void {
    // Auto-enable location sharing for Trusted Circle
    const store = useStore.getState();
    if (!store.isSharingLocation) {
      store.setIsSharingLocation(true);
    }
    this.callback?.({ type: 'escalate', reason });
  }
}

// Singleton instance
export const tripMonitor = new TripMonitor();
