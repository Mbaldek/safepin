// src/components/CityContextPanel.tsx

'use client';

import { useEffect, useState } from 'react';
import { Building2, AlertTriangle, Train, X } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';

type TransitStop = {
  id: number;
  tags: {
    name?: string;
    railway?: string;
  };
};

type FetchState = 'idle' | 'loading' | 'done' | 'error';

function flatEarthDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const avgLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  return R * Math.sqrt(dLat * dLat + (Math.cos(avgLat) * dLng) * (Math.cos(avgLat) * dLng));
}

function stopTypeLabel(railway?: string): string {
  if (railway === 'subway_entrance') return 'Metro entrance';
  if (railway === 'station') return 'Station';
  if (railway === 'halt') return 'Halt';
  return 'Transit stop';
}

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

export default function CityContextPanel({ onClose }: { onClose: () => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { userLocation, pins } = useStore();

  const [district, setDistrict] = useState<string | null>(null);
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');

  const nearbyPinCount = userLocation
    ? pins.filter((p) => {
        if (p.resolved_at) return false;
        const distKm = flatEarthDistanceKm(userLocation, { lat: p.lat, lng: p.lng });
        return distKm <= 1;
      }).length
    : 0;

  useEffect(() => {
    if (!userLocation) return;

    const { lat, lng } = userLocation;
    setFetchState('loading');

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const geocodePromise = fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,district&access_token=${token}&language=fr,en&limit=1`
    )
      .then((res) => res.json())
      .then((data) => {
        const placeName: string | undefined = data?.features?.[0]?.place_name;
        return placeName ? placeName.split(',')[0].trim() : null;
      })
      .catch(() => null);

    const overpassQuery = `[out:json][timeout:8];node["railway"~"station|halt|subway_entrance"](around:600,${lat},${lng});out 8;`;
    const overpassPromise = fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
    )
      .then((res) => res.json())
      .then((data) => {
        const elements = (data?.elements ?? []) as TransitStop[];
        return elements.slice(0, 5);
      })
      .catch(() => [] as TransitStop[]);

    Promise.all([geocodePromise, overpassPromise]).then(([resolvedDistrict, resolvedStops]) => {
      setDistrict(resolvedDistrict);
      setStops(resolvedStops);
      setFetchState('done');
    });
  }, [userLocation]);

  const isLoading = fetchState === 'loading' || fetchState === 'idle';

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{ backgroundColor: C.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{
          backgroundColor: C.elevated,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h2 className="text-base font-black" style={{ color: C.textPrimary }}>
          City Context
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-70"
          style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
          aria-label="Close city context panel"
        >
          <X size={15} strokeWidth={2.2} style={{ color: C.textSecondary }} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* District card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
          >
            <Building2 size={18} strokeWidth={2} style={{ color: '#6366f1' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[0.6rem] uppercase tracking-widest font-bold mb-0.5"
              style={{ color: C.textSecondary }}
            >
              Current district
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: C.border, borderTopColor: '#6366f1' }}
                />
                <span className="text-sm font-bold" style={{ color: C.textSecondary }}>
                  Detecting…
                </span>
              </div>
            ) : (
              <p className="text-sm font-bold truncate" style={{ color: C.textPrimary }}>
                {district ?? 'Unknown area'}
              </p>
            )}
          </div>
        </div>

        {/* Nearby pins card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(59,180,193,0.12)' }}
          >
            <AlertTriangle size={18} strokeWidth={2} style={{ color: '#3BB4C1' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[0.6rem] uppercase tracking-widest font-bold mb-0.5"
              style={{ color: C.textSecondary }}
            >
              Active reports
            </p>
            <p className="text-sm font-bold" style={{ color: C.textPrimary }}>
              {isLoading ? (
                <span style={{ color: C.textSecondary }}>Loading…</span>
              ) : (
                <>
                  <span style={{ color: nearbyPinCount > 0 ? '#3BB4C1' : C.textPrimary }}>
                    {nearbyPinCount}
                  </span>
                  {' active '}
                  {nearbyPinCount === 1 ? 'report' : 'reports'}
                  {' within 1km'}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Transit section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
          }}
        >
          {/* Transit header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: `1px solid ${C.border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}
            >
              <Train size={18} strokeWidth={2} style={{ color: '#10b981' }} />
            </div>
            <p
              className="text-[0.6rem] uppercase tracking-widest font-bold"
              style={{ color: C.textSecondary }}
            >
              Nearby Transit
            </p>
            {isLoading && (
              <div
                className="ml-auto w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: C.border, borderTopColor: '#10b981' }}
              />
            )}
          </div>

          {/* Transit list */}
          {isLoading ? (
            <div className="px-4 py-3 flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-xl animate-pulse"
                  style={{ backgroundColor: C.elevated }}
                />
              ))}
            </div>
          ) : stops.length === 0 ? (
            <div className="px-4 py-4 flex items-center gap-2">
              <span className="text-sm" style={{ color: C.textSecondary }}>
                No metro stops found nearby
              </span>
            </div>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
              {stops.map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">
                      {stop.tags.railway === 'subway_entrance' ? '🚇' : '🚉'}
                    </span>
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: C.textPrimary }}
                    >
                      {stop.tags.name ?? 'Unnamed stop'}
                    </p>
                  </div>
                  <span
                    className="text-[0.6rem] font-bold px-2 py-1 rounded-full shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(16,185,129,0.10)',
                      color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.25)',
                    }}
                  >
                    {stopTypeLabel(stop.tags.railway)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* No location fallback */}
        {!userLocation && fetchState === 'idle' && (
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
            style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
          >
            <span className="text-3xl">📍</span>
            <p className="text-sm font-bold" style={{ color: C.textPrimary }}>
              Location not available
            </p>
            <p className="text-xs" style={{ color: C.textSecondary }}>
              Enable location access to see city context
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
