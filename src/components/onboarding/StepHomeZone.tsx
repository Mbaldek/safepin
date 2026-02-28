// Step 5 — Home zone (interactive map + radius circle)

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import mapboxgl from 'mapbox-gl';

const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
];

function generateCircleCoords(center: [number, number], radiusM: number, points = 64): [number, number][] {
  const coords: [number, number][] = [];
  const km = radiusM / 1000;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    const lat = center[1] + dy / 111.32;
    const lng = center[0] + dx / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    coords.push([lng, lat]);
  }
  return coords;
}

type Props = {
  userId: string;
  onNext: () => void;
  onSkip: () => void;
  onZoneSet: () => void;
};

export default function StepHomeZone({ userId, onNext, onSkip, onZoneSet }: Props) {
  const t = useTranslations('onboarding');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { userLocation } = useStore();
  const { theme } = useTheme();
  const [radius, setRadius] = useState(1000);
  const [saving, setSaving] = useState(false);
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lng, userLocation.lat]
    : [2.3522, 48.8566];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: defaultCenter,
      zoom: 14,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('radius-circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [generateCircleCoords(defaultCenter, radius)] },
          properties: {},
        },
      });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: { 'fill-color': 'rgba(212,168,83,0.12)' },
      });
      map.addLayer({
        id: 'radius-outline',
        type: 'line',
        source: 'radius-circle',
        paint: { 'line-color': '#D4A853', 'line-width': 2 },
      });
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      updateCircle([center.lng, center.lat]);
    });

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  function updateCircle(center: [number, number]) {
    const source = mapRef.current?.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [generateCircleCoords(center, radius)] },
      properties: {},
    });
  }

  // Update circle when radius changes
  useEffect(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    updateCircle([center.lng, center.lat]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  async function handleSave() {
    if (!mapRef.current) return;
    setSaving(true);
    const center = mapRef.current.getCenter();
    await supabase.from('profiles').update({
      home_lat: center.lat,
      home_lng: center.lng,
      notification_radius: radius,
    }).eq('id', userId);
    onZoneSet();
    setSaving(false);
    onNext();
  }

  async function handleSkip() {
    // Save current location with default radius
    if (userLocation) {
      await supabase.from('profiles').update({
        home_lat: userLocation.lat,
        home_lng: userLocation.lng,
        notification_radius: 1000,
      }).eq('id', userId);
      onZoneSet();
    }
    onSkip();
  }

  return (
    <div className="flex flex-col items-center text-center pt-2 pb-4">
      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('zoneTitle')}
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('zoneBody')}
      </p>

      {/* Map */}
      <div className="relative w-full h-[260px] rounded-2xl overflow-hidden mb-4">
        <div ref={containerRef} className="w-full h-full" />
        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-2xl" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>📍</div>
        </div>
      </div>

      {/* Radius pills */}
      <div className="flex gap-2 mb-6">
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRadius(opt.value)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition"
            style={{
              backgroundColor: radius === opt.value ? 'var(--accent)' : 'var(--bg-card)',
              color: radius === opt.value ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${radius === opt.value ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-40 mb-3"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {saving ? '...' : t('zoneSave')}
      </button>

      <button
        onClick={handleSkip}
        className="text-xs font-bold py-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('zoneSkip')}
      </button>
    </div>
  );
}
