// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, Train, Loader2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { SEVERITY, Pin } from '@/types';
import { supabase } from '@/lib/supabase';
import { PlaceNote } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const SOURCE_ID    = 'pins-source';
const ROUTE_SRC    = 'route-source';
const ROUTE_LYR    = 'route-line';
const PENDING_SRCS = ['pending-src-0', 'pending-src-1', 'pending-src-2'];
const PENDING_LYRS = ['pending-line-0', 'pending-line-1', 'pending-line-2'];
const WATCH_SRC    = 'watch-contacts-src';
const WATCH_CIRCLE = 'watch-contacts-circle';
const WATCH_LABEL  = 'watch-contacts-label';
const NOTES_SRC    = 'place-notes-src';
const NOTES_LYR    = 'place-notes-layer';
const TRANSIT_SRC    = 'paris-transit-src';
const TRANSIT_CIRCLE = 'paris-transit-circle';
const TRANSIT_LABEL  = 'paris-transit-label';
const TRANSIT_LINES_SRC = 'paris-transit-lines-src';
const TRANSIT_LINES_LYR = 'paris-transit-lines-lyr';

const STYLE_URLS: Record<string, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  light:   'mapbox://styles/mapbox/light-v11',
  dark:    'mapbox://styles/mapbox/dark-v11',
};

// Module-level transit data cache so it survives style switches
let transitCache: GeoJSON.FeatureCollection | null = null;
let transitLinesCache: GeoJSON.FeatureCollection | null = null;

// Single Overpass request for BOTH stations (nodes) and lines (ways) — avoids rate-limiting
const PARIS_BBOX = '48.78,2.20,48.94,2.50'; // wider bbox covering all Paris + inner suburbs
async function fetchParisTransitAll(): Promise<void> {
  if (transitCache && transitLinesCache) return;
  const query = `[out:json][timeout:40];(
    node["station"="subway"](${PARIS_BBOX});
    node["station"="light_rail"](${PARIS_BBOX});
    node["railway"="tram_stop"](${PARIS_BBOX});
    way["railway"="subway"](${PARIS_BBOX});
    way["railway"="light_rail"](${PARIS_BBOX});
    way["railway"="tram"](${PARIS_BBOX});
  );out body geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json() as {
    elements: Array<{
      type: string; id: number; lat?: number; lon?: number;
      tags?: Record<string, string>;
      geometry?: Array<{ lat: number; lon: number }>;
    }>;
  };

  // Split nodes (stations) from ways (lines)
  const nodes = data.elements.filter((el) => el.type === 'node' && el.lat != null);
  const ways  = data.elements.filter((el) => el.type === 'way' && el.geometry?.length);

  transitCache = {
    type: 'FeatureCollection',
    features: nodes.map((el) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [el.lon!, el.lat!] },
      properties: {
        name: el.tags?.name ?? el.tags?.['name:fr'] ?? '',
        kind: el.tags?.station === 'subway' ? 'metro' : el.tags?.station === 'light_rail' ? 'rer' : 'tram',
      },
    })),
  };

  transitLinesCache = {
    type: 'FeatureCollection',
    features: ways.map((el) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: el.geometry!.map((p) => [p.lon, p.lat]),
      },
      properties: {
        kind: el.tags?.railway === 'subway' ? 'metro' : el.tags?.railway === 'light_rail' ? 'rer' : 'tram',
      },
    })),
  };
}

function addTransitLinesLayer(m: mapboxgl.Map) {
  if (!transitLinesCache || m.getSource(TRANSIT_LINES_SRC)) return;
  m.addSource(TRANSIT_LINES_SRC, { type: 'geojson', data: transitLinesCache });
  m.addLayer({
    id: TRANSIT_LINES_LYR,
    type: 'line',
    source: TRANSIT_LINES_SRC,
    paint: {
      'line-color': ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', '#10b981'],
      'line-width': ['match', ['get', 'kind'], 'metro', 3, 'rer', 3, 2],
      'line-opacity': 0.55,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });
}

function addTransitLayer(m: mapboxgl.Map) {
  if (!transitCache || m.getSource(TRANSIT_SRC)) return;
  m.addSource(TRANSIT_SRC, { type: 'geojson', data: transitCache });
  m.addLayer({
    id: TRANSIT_CIRCLE,
    type: 'circle',
    source: TRANSIT_SRC,
    paint: {
      'circle-radius': ['match', ['get', 'kind'], 'metro', 7, 'rer', 7, 5],
      'circle-color':  ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', '#10b981'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.92,
    },
  });
  m.addLayer({
    id: TRANSIT_LABEL,
    type: 'symbol',
    source: TRANSIT_SRC,
    minzoom: 13,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', '#10b981'],
      'text-halo-color': '#fff',
      'text-halo-width': 1.5,
    },
  });
}

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
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const noteMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pins, mapFilters, setSelectedPin, setActiveSheet, mapFlyTo, setMapFlyTo, setUserLocation, activeRoute, pendingRoutes, watchedLocations, userId, setNewPlaceNoteCoords, placeNotes, setPlaceNotes, setSelectedPlaceNote, favPlaceIds } = useStore();
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [mapStyle, setMapStyle]           = useState<'streets' | 'light' | 'dark'>(theme === 'dark' ? 'dark' : 'streets');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showTransit, setShowTransit]     = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);

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

    // Long-press (600 ms) → open Place Note sheet
    map.current.on('mousedown', (e) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        const store = useStore.getState();
        const blockedTab = store.activeTab === 'trip' || store.activeTab === 'mykova' || store.activeTab === 'community' || store.showIncidentsList;
        if (store.activeSheet === 'none' && !store.newPlaceNoteCoords && !blockedTab) {
          store.setNewPlaceNoteCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      }, 600);
    });
    const cancelLong = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    map.current.on('mouseup',   cancelLong);
    map.current.on('mousemove', cancelLong);
    map.current.on('touchend',  cancelLong);
    // Also handle mobile long-press via contextmenu
    map.current.on('contextmenu', (e) => {
      const store = useStore.getState();
      const blockedTab = store.activeTab === 'trip' || store.activeTab === 'mykova' || store.activeTab === 'community' || store.showIncidentsList;
      if (store.activeSheet === 'none' && !store.newPlaceNoteCoords && !blockedTab) {
        store.setNewPlaceNoteCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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

  // Draw / clear trip route
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    // Remove previous route layer + source + destination marker
    if (m.getLayer(ROUTE_LYR)) m.removeLayer(ROUTE_LYR);
    if (m.getSource(ROUTE_SRC)) m.removeSource(ROUTE_SRC);
    destMarkerRef.current?.remove();
    destMarkerRef.current = null;

    if (!activeRoute || activeRoute.coords.length === 0) return;

    // Add route line (beneath cluster dots)
    m.addSource(ROUTE_SRC, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: activeRoute.coords },
        properties: {},
      },
    });
    m.addLayer({
      id: ROUTE_LYR,
      type: 'line',
      source: ROUTE_SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#f43f5e',
        'line-width': 4,
        'line-opacity': 0.80,
        'line-dasharray': [1, 0],
      },
    }, 'clusters');

    // Destination marker
    const last = activeRoute.coords[activeRoute.coords.length - 1];
    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#f43f5e;border:3px solid #fff;box-shadow:0 2px 10px #f43f5e88;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:default';
    el.textContent = '📍';
    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(last)
      .addTo(m);

    // Fly to fit route
    const lngs = activeRoute.coords.map((c) => c[0]);
    const lats  = activeRoute.coords.map((c) => c[1]);
    m.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, duration: 1200 },
    );
  }, [activeRoute, mapReady, layersReady]);

  // Draw / clear pending route options (colored multi-route selection)
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    // Remove previous pending layers + sources
    PENDING_LYRS.forEach((lyr) => { if (m.getLayer(lyr)) m.removeLayer(lyr); });
    PENDING_SRCS.forEach((src) => { if (m.getSource(src)) m.removeSource(src); });

    if (!pendingRoutes || pendingRoutes.length === 0) return;

    pendingRoutes.forEach((route, i) => {
      m.addSource(PENDING_SRCS[i], {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.coords },
          properties: {},
        },
      });
      m.addLayer({
        id: PENDING_LYRS[i],
        type: 'line',
        source: PENDING_SRCS[i],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': route.color,
          'line-width': 4,
          'line-opacity': 0.85,
        },
      }, 'clusters');
    });

    // Fit bounds to show all routes
    const allCoords = pendingRoutes.flatMap((r) => r.coords);
    if (allCoords.length > 0) {
      const lngs = allCoords.map((c) => c[0]);
      const lats  = allCoords.map((c) => c[1]);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 1200 },
      );
    }
  }, [pendingRoutes, mapReady, layersReady]);

  // Draw / update watched contact dots (Walk With Me)
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    const features: GeoJSON.Feature[] = Object.entries(watchedLocations).map(([id, loc]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: { id, initial: (loc.name?.[0] ?? '?').toUpperCase() },
    }));

    const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    if (m.getSource(WATCH_SRC)) {
      (m.getSource(WATCH_SRC) as mapboxgl.GeoJSONSource).setData(geojson);
      return;
    }

    m.addSource(WATCH_SRC, { type: 'geojson', data: geojson });
    m.addLayer({
      id: WATCH_CIRCLE,
      type: 'circle',
      source: WATCH_SRC,
      paint: {
        'circle-radius': 18,
        'circle-color': '#6366f1',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.92,
      },
    });
    m.addLayer({
      id: WATCH_LABEL,
      type: 'symbol',
      source: WATCH_SRC,
      layout: {
        'text-field': ['get', 'initial'],
        'text-size': 13,
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#fff' },
    });
  }, [watchedLocations, mapReady, layersReady]);

  // Load user's place notes into store
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('place_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPlaceNotes((data as PlaceNote[]) ?? []));
  }, [userId, setPlaceNotes]);

  // Render place note markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old note markers
    noteMarkersRef.current.forEach((m) => m.remove());
    noteMarkersRef.current = [];

    for (const note of placeNotes) {
      const el = document.createElement('div');
      const isFavorite = favPlaceIds.includes(note.id);
      el.style.cssText = isFavorite
        ? 'width:32px;height:32px;border-radius:50%;background:#f59e0b;border:2.5px solid #fff;' +
          'box-shadow:0 2px 10px rgba(245,158,11,0.45);display:flex;align-items:center;justify-content:center;' +
          'font-size:15px;cursor:pointer;'
        : 'width:28px;height:28px;border-radius:50%;background:var(--accent);border:2px solid #fff;' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;' +
          'font-size:14px;cursor:pointer;';
      el.textContent = note.emoji;
      el.title = note.name || note.note;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPlaceNote(note);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([note.lng, note.lat])
        .addTo(map.current!);
      noteMarkersRef.current.push(marker);
    }
  }, [placeNotes, favPlaceIds, mapReady]);

  // Load and render personal location heatmap (Sprint 28)
  useEffect(() => {
    if (!userId || !mapReady || !layersReady) return;
    const HEAT_SRC = 'location-history-src';
    const HEAT_LYR = 'location-history-heat';

    supabase
      .from('location_history')
      .select('lat, lng')
      .eq('user_id', userId)
      .limit(2000)
      .then(({ data }) => {
        const m = map.current;
        if (!m || !data?.length) return;

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.map((r) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: {},
          })),
        };

        if (m.getSource(HEAT_SRC)) {
          (m.getSource(HEAT_SRC) as mapboxgl.GeoJSONSource).setData(geojson);
        } else {
          m.addSource(HEAT_SRC, { type: 'geojson', data: geojson });
          m.addLayer({
            id: HEAT_LYR,
            type: 'heatmap',
            source: HEAT_SRC,
            maxzoom: 17,
            paint: {
              'heatmap-weight': 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 17, 3],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0,   'rgba(244,63,94,0)',
                0.2, 'rgba(244,63,94,0.2)',
                0.5, 'rgba(244,63,94,0.5)',
                1,   'rgba(244,63,94,0.85)',
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 17, 20],
              'heatmap-opacity': 0.55,
            },
          }, 'clusters'); // render beneath pin clusters
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mapReady, layersReady]);

  // Auto-follow app theme (unless user manually overrode via style picker)
  useEffect(() => {
    setMapStyle(theme === 'dark' ? 'dark' : 'streets');
  }, [theme]);

  // Apply mapStyle to the actual Mapbox map — re-add cluster layers + transit after style loads
  useEffect(() => {
    if (!map.current || !mapReady) return;
    transitCache = null; transitLinesCache = null; // clear transit cache; layer was wiped by setStyle
    setLayersReady(false);
    map.current.once('style.load', () => {
      addClusterLayers(map.current!, mapStyle === 'dark');
      if (showTransit) {
        fetchParisTransitAll()
          .then(() => { if (map.current) { addTransitLinesLayer(map.current); addTransitLayer(map.current); } })
          .catch((err) => console.warn('[KOVA] Transit fetch failed:', err));
      }
      setLayersReady(true);
    });
    map.current.setStyle(STYLE_URLS[mapStyle]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle, mapReady]);

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
      // Severity
      if (mapFilters.severity !== 'all' && pin.severity !== mapFilters.severity) return false;
      // Age
      const ageMs = Date.now() - new Date(pin.created_at).getTime();
      if (mapFilters.age === '1h'    && ageMs > 3_600_000)      return false;
      if (mapFilters.age === '6h'    && ageMs > 6 * 3_600_000)  return false;
      if (mapFilters.age === 'today' && ageMs > 24 * 3_600_000) return false;
      // Urban context
      if (mapFilters.urban !== 'all' && pin.urban_context !== mapFilters.urban) return false;
      // Confirmed only
      if (mapFilters.confirmedOnly && !pin.last_confirmed_at) return false;
      return true;
    });

    const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJSON(regularPins));
    }
  }, [pins, mapFilters, mapReady, layersReady, theme, setSelectedPin, setActiveSheet]);

  // Show / hide Paris transit layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    if (!showTransit) {
      if (m.getLayer(TRANSIT_LABEL))     m.removeLayer(TRANSIT_LABEL);
      if (m.getLayer(TRANSIT_CIRCLE))    m.removeLayer(TRANSIT_CIRCLE);
      if (m.getSource(TRANSIT_SRC))      m.removeSource(TRANSIT_SRC);
      if (m.getLayer(TRANSIT_LINES_LYR)) m.removeLayer(TRANSIT_LINES_LYR);
      if (m.getSource(TRANSIT_LINES_SRC)) m.removeSource(TRANSIT_LINES_SRC);
      return;
    }

    if (transitCache && transitLinesCache) {
      addTransitLinesLayer(m);
      addTransitLayer(m);
      return;
    }

    setTransitLoading(true);
    fetchParisTransitAll()
      .then(() => { if (map.current && showTransit) { addTransitLinesLayer(map.current); addTransitLayer(map.current); } })
      .catch((err) => console.warn('[KOVA] Transit fetch failed:', err))
      .finally(() => setTransitLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTransit, mapReady, layersReady]);

  // ── UI ───────────────────────────────────────────────────────────────────

  const STYLE_OPTIONS: { id: 'streets' | 'light' | 'dark'; label: string; emoji: string }[] = [
    { id: 'streets', label: 'Streets', emoji: '🗺️' },
    { id: 'light',   label: 'Light',   emoji: '☀️' },
    { id: 'dark',    label: 'Dark',    emoji: '🌙' },
  ];

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Map controls (right side, above bottom nav) ─────────────── */}
      <div className="absolute right-3 bottom-22 z-50 flex flex-col items-end gap-2">

        {/* Style picker popover */}
        <AnimatePresence>
          {showStylePicker && (
            <motion.div
              className="flex flex-col gap-1 p-1.5 rounded-2xl mb-1"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.6 }}
            >
              {STYLE_OPTIONS.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => { setMapStyle(id); setShowStylePicker(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition text-left whitespace-nowrap"
                  style={{
                    backgroundColor: mapStyle === id ? 'var(--accent)' : 'transparent',
                    color: mapStyle === id ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layers toggle button */}
        <button
          onClick={() => setShowStylePicker((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-95"
          style={{
            backgroundColor: showStylePicker
              ? 'var(--accent)'
              : 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          title="Map style"
        >
          <Layers
            size={16}
            strokeWidth={2}
            style={{ color: showStylePicker ? '#fff' : 'var(--text-muted)' }}
          />
        </button>

        {/* Transit toggle button */}
        <button
          onClick={() => setShowTransit((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-95 relative"
          style={{
            backgroundColor: showTransit
              ? '#3b82f6'
              : 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            border: showTransit ? '1px solid #3b82f6' : '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          title="Paris transit stops"
        >
          {transitLoading
            ? <Loader2 size={15} className="animate-spin" style={{ color: '#3b82f6' }} />
            : <Train size={15} strokeWidth={2} style={{ color: showTransit ? '#fff' : 'var(--text-muted)' }} />
          }
        </button>

      </div>
    </div>
  );
}
