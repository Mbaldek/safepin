// src/components/TripView.tsx

'use client';

import { useState, useEffect } from 'react';
import { Navigation, Check, X, Map } from 'lucide-react';
import { useStore } from '@/stores/useStore';

type TripState = {
  destination: string;
  startedAt: number;
  expiresAt: number;
};

const DURATION_OPTIONS = [
  { label: '15 min', ms: 15 * 60_000 },
  { label: '30 min', ms: 30 * 60_000 },
  { label: '1 hr',  ms:  1 * 60 * 60_000 },
  { label: '2 hr',  ms:  2 * 60 * 60_000 },
  { label: '4 hr',  ms:  4 * 60 * 60_000 },
];

const STORAGE_KEY = 'safepin_active_trip';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const hrs  = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function fetchRoute(
  userLoc: { lat: number; lng: number },
  destText: string,
): Promise<[number, number][] | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    // Geocode the destination
    const geoRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destText)}.json` +
      `?proximity=${userLoc.lng},${userLoc.lat}&access_token=${token}&limit=1&language=fr,en`,
    );
    const geoData = await geoRes.json();
    const destCoords: [number, number] | undefined = geoData.features?.[0]?.geometry?.coordinates;
    if (!destCoords) return null;

    // OSRM walking route (public demo, no key needed)
    const routeRes = await fetch(
      `https://router.project-osrm.org/route/v1/foot/` +
      `${userLoc.lng},${userLoc.lat};${destCoords[0]},${destCoords[1]}` +
      `?overview=full&geometries=geojson`,
    );
    const routeData = await routeRes.json();
    const coords: [number, number][] | undefined = routeData.routes?.[0]?.geometry?.coordinates;
    return coords ?? null;
  } catch {
    return null;
  }
}

export default function TripView() {
  const { userProfile, setActiveRoute, setActiveTab } = useStore();
  const [trip, setTrip]           = useState<TripState | null>(null);
  const [destination, setDest]    = useState('');
  const [durationMs, setDuration] = useState(30 * 60_000);
  const [now, setNow]             = useState(Date.now());
  const [routeLoading, setRouteLoading] = useState(false);
  const [hasRoute, setHasRoute]   = useState(false);

  // Restore saved trip on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TripState;
        if (parsed.expiresAt > Date.now()) {
          setTrip(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          useStore.getState().setActiveRoute(null);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Tick every second while a trip is active
  useEffect(() => {
    if (!trip) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [trip]);

  // Auto-expire
  useEffect(() => {
    if (trip && now >= trip.expiresAt) {
      setTrip(null);
      localStorage.removeItem(STORAGE_KEY);
      useStore.getState().setActiveRoute(null);
    }
  }, [now, trip]);

  async function startTrip() {
    if (!destination.trim()) return;
    const t: TripState = {
      destination: destination.trim(),
      startedAt:   Date.now(),
      expiresAt:   Date.now() + durationMs,
    };
    setTrip(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    const destText = destination.trim();
    setDest('');

    // Fetch route in background
    const loc = useStore.getState().userLocation;
    if (loc) {
      setRouteLoading(true);
      const coords = await fetchRoute(loc, destText);
      setRouteLoading(false);
      if (coords) {
        useStore.getState().setActiveRoute({ coords, destination: destText });
        setHasRoute(true);
      }
    }
  }

  function endTrip() {
    setTrip(null);
    setHasRoute(false);
    localStorage.removeItem(STORAGE_KEY);
    useStore.getState().setActiveRoute(null);
  }

  // ── Active trip ─────────────────────────────────────────────────────────────

  if (trip) {
    const remaining = Math.max(0, trip.expiresAt - now);
    const progress  = 1 - remaining / (trip.expiresAt - trip.startedAt);
    const critical  = remaining < 5 * 60_000;

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div
          className="shrink-0 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Active Trip</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Stay safe{userProfile?.display_name ? `, ${userProfile.display_name}` : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 gap-8">
          {/* Destination */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(244,63,94,0.12)' }}
              >
                <Navigation size={36} style={{ color: 'var(--accent)' }} />
              </div>
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 animate-pulse"
                style={{ backgroundColor: '#22c55e', borderColor: 'var(--bg-primary)' }}
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                Heading to
              </p>
              <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                {trip.destination}
              </p>
              {/* Route status */}
              {routeLoading && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Calculating route…
                </p>
              )}
              {hasRoute && !routeLoading && (
                <button
                  onClick={() => setActiveTab('map')}
                  className="flex items-center gap-1 mx-auto mt-1.5 text-xs font-bold"
                  style={{ color: 'var(--accent)' }}
                >
                  <Map size={11} strokeWidth={2.5} />
                  View on map
                </button>
              )}
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2 w-full max-w-[280px]">
            <div
              className="text-5xl font-black tracking-tight"
              style={{
                color: critical ? '#ef4444' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCountdown(remaining)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>remaining</p>

            <div
              className="w-full h-2 rounded-full overflow-hidden mt-1"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: critical ? '#ef4444' : 'var(--accent)',
                  transition: 'width 1s linear, background-color 0.5s',
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <button
              onClick={endTrip}
              className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#22c55e',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
              }}
            >
              <Check size={20} strokeWidth={2.5} />
              I&apos;m Safe
            </button>
            <button
              onClick={endTrip}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              <X size={16} strokeWidth={2} />
              Cancel Trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create trip ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="shrink-0 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Trip Planner</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Set a destination &amp; timer — stay safe
        </p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 gap-8">
        <div className="w-full max-w-[360px] flex flex-col gap-6">

          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(244,63,94,0.10)' }}
            >
              <Navigation size={36} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                Plan a Safe Trip
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Set a destination and a timer. A route will appear on the map.
              </p>
            </div>
          </div>

          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Destination
            </p>
            <input
              value={destination}
              onChange={(e) => setDest(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') startTrip(); }}
              placeholder="e.g. Home, Coffee shop, Park…"
              className="w-full text-sm rounded-xl px-4 py-3 outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Expected Duration
            </p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(({ label, ms }) => (
                <button
                  key={label}
                  onClick={() => setDuration(ms)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition"
                  style={{
                    backgroundColor: durationMs === ms ? 'var(--accent)' : 'var(--bg-card)',
                    color:           durationMs === ms ? '#fff'          : 'var(--text-muted)',
                    border:          durationMs === ms ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startTrip}
            disabled={!destination.trim()}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition disabled:opacity-40"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(244,63,94,0.25)',
            }}
          >
            <Navigation size={18} strokeWidth={2.5} />
            Start Trip
          </button>

        </div>
      </div>
    </div>
  );
}
