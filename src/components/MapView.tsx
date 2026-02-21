// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { SEVERITY, Pin } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const SOURCE_ID = 'pins-source';

function getPinOpacity(pin: Pin): number {
  const base = pin.last_confirmed_at
    ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
    : new Date(pin.created_at).getTime();
  const ageH = (Date.now() - base) / 3_600_000;
  if (ageH >= 24) return 0;
  if (ageH >= 18) return 0.25;
  if (ageH >= 12) return 0.5;
  if (ageH >= 6)  return 0.75;
  return 1;
}

function buildGeoJSON(regularPins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regularPins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: {
        id: pin.id,
        color: SEVERITY[pin.severity as keyof typeof SEVERITY]?.color ?? '#6b7490',
        opacity: getPinOpacity(pin),
      },
    })),
  };
}

function addClusterLayers(m: mapboxgl.Map, isDark: boolean) {
  if (m.getSource(SOURCE_ID)) return;

  m.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 50,
  });

  // Cluster circle
  m.addLayer({
    id: 'clusters',
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#f43f5e',
      'circle-radius': ['step', ['get', 'point_count'], 20, 5, 28, 20, 36],
      'circle-opacity': 0.88,
    },
  });

  // Cluster count label
  m.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 13,
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    },
    paint: { 'text-color': '#fff' },
  });

  // Individual unclustered pins
  m.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-opacity': ['get', 'opacity'],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.15)',
    },
  });

  // Cluster click → zoom in
  m.on('click', 'clusters', (e) => {
    const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (!features[0]) return;
    const clusterId = features[0].properties?.cluster_id;
    (m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err || zoom == null) return;
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        m.easeTo({ center: coords, zoom: zoom + 0.5 });
      }
    );
  });

  // Individual pin click
  m.on('click', 'unclustered-point', (e) => {
    const pinId = e.features?.[0]?.properties?.id;
    if (!pinId) return;
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === pinId);
    if (pin) { store.setSelectedPin(pin); store.setActiveSheet('detail'); }
  });

  // Cursor pointers
  m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
  m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
  m.on('mouseenter', 'unclustered-point', () => { m.getCanvas().style.cursor = 'pointer'; });
  m.on('mouseleave', 'unclustered-point', () => { m.getCanvas().style.cursor = ''; });
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { pins, activeFilter, setSelectedPin, setActiveSheet, mapFlyTo, setMapFlyTo, setUserLocation } = useStore();
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 48.8566],
      zoom: 13,
    });

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14 });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      })
    );

    map.current.on('click', (e) => {
      const store = useStore.getState();
      if (store.activeSheet === 'report') {
        store.setNewPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.current.on('load', () => {
      addClusterLayers(map.current!, theme === 'dark');
      setLayersReady(true);
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to address search result
  useEffect(() => {
    if (!mapFlyTo || !map.current) return;
    map.current.flyTo({ center: [mapFlyTo.lng, mapFlyTo.lat], zoom: mapFlyTo.zoom });
    setMapFlyTo(null);
  }, [mapFlyTo, setMapFlyTo]);

  // Switch map style when theme changes — re-add cluster layers after style loads
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const style = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
    setLayersReady(false);
    map.current.once('style.load', () => {
      addClusterLayers(map.current!, theme === 'dark');
      setLayersReady(true);
    });
    map.current.setStyle(style);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Render emergency HTML markers + update regular pins GeoJSON
  useEffect(() => {
    if (!map.current || !mapReady || !layersReady) return;

    // ── Emergency HTML markers (trail effect) ────────────────────────────────
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const now = Date.now();

    const filteredEmergency = pins.filter((pin) => {
      if (!pin.is_emergency || pin.resolved_at) return false;
      const ageH = (now - new Date(pin.created_at).getTime()) / 3_600_000;
      return ageH < 2;
    });

    // Trail groups: userId → pins sorted newest-first
    const trailGroups = new Map<string, Pin[]>();
    filteredEmergency.forEach((pin) => {
      const arr = trailGroups.get(pin.user_id) ?? [];
      arr.push(pin);
      trailGroups.set(pin.user_id, arr);
    });
    trailGroups.forEach((arr, key) => {
      trailGroups.set(key, [...arr].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    });

    const TRAIL_LEVELS: [number, number, number, boolean][] = [
      [1.0, 38, 44, true],
      [0.55, 28, 34, false],
      [0.28, 20, 26, false],
    ];

    filteredEmergency.forEach((pin) => {
      const group = trailGroups.get(pin.user_id) ?? [];
      const idx = group.findIndex((p) => p.id === pin.id);
      const level = TRAIL_LEVELS[idx];
      if (!level) return;
      const [trailOpacity, dotPx, wrapperPx, showRing] = level;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `width:${wrapperPx}px;height:${wrapperPx}px;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;opacity:${trailOpacity}`;

      if (showRing) {
        const ring = document.createElement('div');
        ring.className = 'emergency-ring';
        wrapper.appendChild(ring);
      }

      const dot = document.createElement('div');
      dot.style.cssText = `width:${dotPx}px;height:${dotPx}px;border-radius:50%;background-color:#ef4444;border:3px solid ${theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.15)'};box-shadow:0 2px 8px #ef444488;z-index:1;position:relative;font-size:${Math.round(dotPx * 0.47)}px;display:flex;align-items:center;justify-content:center`;
      dot.textContent = '🆘';

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPin(pin);
        setActiveSheet('detail');
      });
      wrapper.appendChild(dot);

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    // ── Regular pins via GeoJSON clustering ───────────────────────────────────
    const regularPins = pins.filter((pin) => {
      if (pin.is_emergency) return false;
      if (getPinOpacity(pin) === 0) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'verified') return false;
      return pin.severity === activeFilter;
    });

    const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJSON(regularPins));
    }
  }, [pins, activeFilter, mapReady, layersReady, theme, setSelectedPin, setActiveSheet]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
