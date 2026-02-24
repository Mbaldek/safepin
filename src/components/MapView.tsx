// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { AnimatePresence } from 'framer-motion';
import { Layers } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import LayerPanel from './LayerPanel';
import { useTheme } from '@/stores/useTheme';
import { SEVERITY, Pin } from '@/types';
import { buildScoreGeoJSON } from '@/components/NeighborhoodScoreLayer';
import { supabase } from '@/lib/supabase';
import { PlaceNote } from '@/types';
import SafeSpaceDetailSheet from './SafeSpaceDetailSheet';

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
const POI_SRC    = 'paris-poi-src';
const POI_CIRCLE = 'paris-poi-circle';
const POI_LABEL  = 'paris-poi-label';
const HEAT_SRC = 'location-history-src';
const HEAT_LYR = 'location-history-heat';
const SAFE_SRC = 'safe-spaces-src';
const SAFE_CIRCLE = 'safe-spaces-circle';
const SAFE_LABEL = 'safe-spaces-label';
const SAFE_PARTNER = 'safe-spaces-partner';

const STYLE_URLS: Record<string, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  light:   'mapbox://styles/mapbox/light-v11',
  dark:    'mapbox://styles/mapbox/dark-v11',
};

// Module-level caches so they survive style switches
let transitCache: GeoJSON.FeatureCollection | null = null;
let poiCache: GeoJSON.FeatureCollection | null = null;
let heatmapGeoJSON: GeoJSON.FeatureCollection | null = null;

// Single Overpass request for transit stations + bus stops
const PARIS_BBOX = '48.78,2.20,48.94,2.50'; // wider bbox covering all Paris + inner suburbs
async function fetchParisTransitStations(): Promise<void> {
  if (transitCache) return;
  const query = `[out:json][timeout:40];(
    node["railway"="station"]["station"~"subway|RER"](${PARIS_BBOX});
    node["railway"="stop"]["train"="yes"](${PARIS_BBOX});
    node["railway"="tram_stop"](${PARIS_BBOX});
    node["highway"="bus_stop"](${PARIS_BBOX});
  );out body;`;
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
    }>;
  };

  const nodes = data.elements.filter((el) => el.type === 'node' && el.lat != null);

  function classifyNode(tags?: Record<string, string>): string {
    if (!tags) return 'bus';
    if (tags.highway === 'bus_stop') return 'bus';
    if (tags.railway === 'tram_stop') return 'tram';
    const station = tags.station?.toLowerCase() ?? '';
    if (station.includes('rer') || station === 'light_rail') return 'rer';
    if (station === 'subway') return 'metro';
    const net = (tags.network ?? '').toLowerCase();
    if (net.includes('rer')) return 'rer';
    return 'metro';
  }

  transitCache = {
    type: 'FeatureCollection',
    features: nodes.map((el) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [el.lon!, el.lat!] },
      properties: {
        name: el.tags?.name ?? el.tags?.['name:fr'] ?? '',
        kind: classifyNode(el.tags),
      },
    })),
  };
}

const KIND_EMOJI: Record<string, string> = { metro: '🚇', rer: '🚆', tram: '🚊', bus: '🚌' };

function addTransitLayer(m: mapboxgl.Map) {
  if (!transitCache || m.getSource(TRANSIT_SRC)) return;
  m.addSource(TRANSIT_SRC, { type: 'geojson', data: transitCache });
  m.addLayer({
    id: TRANSIT_CIRCLE,
    type: 'circle',
    source: TRANSIT_SRC,
    paint: {
      'circle-radius': ['match', ['get', 'kind'], 'metro', 7, 'rer', 7, 'bus', 4, 5],
      'circle-color':  ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', 'bus', '#f59e0b', '#10b981'],
      'circle-stroke-width': ['match', ['get', 'kind'], 'bus', 1.5, 2],
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.92,
    },
  });
  m.addLayer({
    id: TRANSIT_LABEL,
    type: 'symbol',
    source: TRANSIT_SRC,
    minzoom: 14,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', 'bus', '#f59e0b', '#10b981'],
      'text-halo-color': '#fff',
      'text-halo-width': 1.5,
    },
  });

  // Station click → popup with name + transport type
  m.on('click', TRANSIT_CIRCLE, (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const name = f.properties?.name || 'Station';
    const kind: string = f.properties?.kind || 'metro';
    const emoji = KIND_EMOJI[kind] || '🚉';
    const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
    new mapboxgl.Popup({ closeButton: false, maxWidth: '200px', offset: 12 })
      .setLngLat(coords)
      .setHTML(`<div style="font-size:13px;font-weight:600">${emoji} ${name}</div><div style="font-size:11px;color:#666;text-transform:capitalize">${kind}</div>`)
      .addTo(m);
  });
  m.on('mouseenter', TRANSIT_CIRCLE, () => { m.getCanvas().style.cursor = 'pointer'; });
  m.on('mouseleave', TRANSIT_CIRCLE, () => { m.getCanvas().style.cursor = ''; });
}

// ── POI (Points of Interest) ──────────────────────────────────────────────────

async function fetchParisPOIs(): Promise<void> {
  if (poiCache) return;
  const query = `[out:json][timeout:40];(
    node["amenity"="pharmacy"](${PARIS_BBOX});
    node["amenity"="hospital"](${PARIS_BBOX});
    node["amenity"="clinic"](${PARIS_BBOX});
    node["amenity"="police"](${PARIS_BBOX});
  );out body;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json() as {
    elements: Array<{ type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }>;
  };
  poiCache = {
    type: 'FeatureCollection',
    features: data.elements
      .filter((el) => el.type === 'node' && el.lat != null)
      .map((el) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [el.lon!, el.lat!] },
        properties: {
          name: el.tags?.name ?? '',
          kind: el.tags?.amenity === 'police' ? 'police'
            : el.tags?.amenity === 'pharmacy' ? 'pharmacy'
            : 'hospital',
        },
      })),
  };
}

function addPOILayers(m: mapboxgl.Map) {
  if (!poiCache || m.getSource(POI_SRC)) return;
  m.addSource(POI_SRC, { type: 'geojson', data: poiCache });
  m.addLayer({
    id: POI_CIRCLE,
    type: 'circle',
    source: POI_SRC,
    paint: {
      'circle-radius': 6,
      'circle-color': ['match', ['get', 'kind'], 'pharmacy', '#10b981', 'hospital', '#ef4444', 'police', '#3b82f6', '#6b7280'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.9,
    },
  });
  m.addLayer({
    id: POI_LABEL,
    type: 'symbol',
    source: POI_SRC,
    minzoom: 14,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': ['match', ['get', 'kind'], 'pharmacy', '#10b981', 'hospital', '#ef4444', 'police', '#3b82f6', '#6b7280'],
      'text-halo-color': '#fff',
      'text-halo-width': 1.5,
    },
  });
}

function buildPOIFilter(show: { pharmacy: boolean; hospital: boolean; police: boolean }): mapboxgl.FilterSpecification {
  const conds: mapboxgl.FilterSpecification[] = [];
  if (show.pharmacy) conds.push(['==', ['get', 'kind'], 'pharmacy']);
  if (show.hospital) conds.push(['==', ['get', 'kind'], 'hospital']);
  if (show.police)   conds.push(['==', ['get', 'kind'], 'police']);
  if (conds.length === 0) return ['==', ['get', 'kind'], '__none__'];
  return ['any', ...conds] as mapboxgl.FilterSpecification;
}

function addHeatmapLayer(m: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) {
  if (m.getSource(HEAT_SRC)) return;
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
  }, 'clusters');
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
  const { pins, mapFilters, setSelectedPin, setActiveSheet, mapFlyTo, setMapFlyTo, setUserLocation, activeRoute, pendingRoutes, transitSegments, watchedLocations, userId, setNewPlaceNoteCoords, placeNotes, setPlaceNotes, setSelectedPlaceNote, favPlaceIds, safeSpaces, setSafeSpaces, showSafeSpaces, setShowSafeSpaces, showSimulated, setShowSimulated, userProfile } = useStore();
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [mapStyle, setMapStyle]           = useState<'streets' | 'light' | 'dark'>(theme === 'dark' ? 'dark' : 'streets');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showStations, setShowStations]   = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);
  const [showPharmacy, setShowPharmacy]   = useState(false);
  const [showHospital, setShowHospital]   = useState(false);
  const [showPolice, setShowPolice]       = useState(false);
  const [poiLoading, setPOILoading]       = useState(false);
  const [showHeatmap, setShowHeatmap]     = useState(true);
  const [showScores, setShowScores]       = useState(false);
  const [selectedSafeSpace, setSelectedSafeSpace] = useState<import('@/types').SafeSpace | null>(null);
  const prevPinIdsRef = useRef<Set<string>>(new Set());
  const dropMarkersRef = useRef<mapboxgl.Marker[]>([]);

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

    // Long-press (2 s) → open Place Note sheet
    map.current.on('mousedown', (e) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        const store = useStore.getState();
        const blockedTab = store.activeTab === 'trip' || store.activeTab === 'mykova' || store.activeTab === 'community' || store.showIncidentsList;
        if (store.activeSheet === 'none' && !store.newPlaceNoteCoords && !blockedTab) {
          store.setNewPlaceNoteCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      }, 2000);
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

  // ── Per-segment transit route colors ──────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    // Clean up previous transit segment layers/sources
    const prevIds: string[] = [];
    m.getStyle()?.layers?.forEach((l) => {
      if (l.id.startsWith('transit-seg-')) prevIds.push(l.id);
    });
    prevIds.forEach((id) => { try { m.removeLayer(id); } catch { /* */ } });
    prevIds.forEach((id) => {
      const srcId = id.replace('-line', '-src');
      try { m.removeSource(srcId); } catch { /* */ }
    });

    if (!transitSegments || transitSegments.length === 0) return;

    transitSegments.forEach((seg, i) => {
      const srcId = `transit-seg-${i}-src`;
      const lyrId = `transit-seg-${i}-line`;
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: seg.coords },
        properties: {},
      };
      m.addSource(srcId, { type: 'geojson', data: geojson });
      m.addLayer({
        id: lyrId,
        type: 'line',
        source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': seg.color,
          'line-width': seg.dashed ? 3 : 5,
          'line-opacity': 0.9,
          ...(seg.dashed ? { 'line-dasharray': [2, 2] } : {}),
        },
      }, 'clusters');
    });

    // Fit bounds to show all segments
    const allCoords = transitSegments.flatMap((s) => s.coords);
    if (allCoords.length > 0) {
      const lngs = allCoords.map((c) => c[0]);
      const lats = allCoords.map((c) => c[1]);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 1200 },
      );
    }
  }, [transitSegments, mapReady, layersReady]);

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

  // Load and render personal location heatmap
  useEffect(() => {
    if (!userId || !mapReady || !layersReady) return;

    const m = map.current;
    if (!m) return;

    // Use cached data if available (e.g. after style switch)
    if (heatmapGeoJSON) {
      if (m.getSource(HEAT_SRC)) {
        (m.getSource(HEAT_SRC) as mapboxgl.GeoJSONSource).setData(heatmapGeoJSON);
      } else {
        addHeatmapLayer(m, heatmapGeoJSON);
      }
      return;
    }

    supabase
      .from('location_history')
      .select('lat, lng')
      .eq('user_id', userId)
      .limit(2000)
      .then(({ data }) => {
        if (!map.current || !data?.length) return;
        heatmapGeoJSON = {
          type: 'FeatureCollection',
          features: data.map((r) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: {},
          })),
        };
        addHeatmapLayer(map.current, heatmapGeoJSON);
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
    transitCache = null; poiCache = null; heatmapGeoJSON = null;
    setLayersReady(false);
    map.current.once('style.load', () => {
      addClusterLayers(map.current!, mapStyle === 'dark');
      if (showStations) {
        fetchParisTransitStations()
          .then(() => { if (map.current) addTransitLayer(map.current); })
          .catch((err: unknown) => console.warn('[Brume] Transit fetch failed:', err));
      }
      if (showPharmacy || showHospital || showPolice) {
        fetchParisPOIs()
          .then(() => {
            if (map.current) {
              addPOILayers(map.current);
              const f = buildPOIFilter({ pharmacy: showPharmacy, hospital: showHospital, police: showPolice });
              if (map.current.getLayer(POI_CIRCLE)) map.current.setFilter(POI_CIRCLE, f);
              if (map.current.getLayer(POI_LABEL))  map.current.setFilter(POI_LABEL, f);
            }
          })
          .catch((err: unknown) => console.warn('[Brume] POI fetch failed:', err));
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
      // Time of day
      if (mapFilters.timeOfDay !== 'all') {
        const h = new Date(pin.created_at).getHours();
        if (mapFilters.timeOfDay === 'morning'   && (h < 6  || h >= 12)) return false;
        if (mapFilters.timeOfDay === 'afternoon'  && (h < 12 || h >= 18)) return false;
        if (mapFilters.timeOfDay === 'evening'    && (h < 18 || h >= 22)) return false;
        if (mapFilters.timeOfDay === 'night'      && (h >= 6 && h < 22))  return false;
      }
      return true;
    });

    const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJSON(regularPins));
    }

    // Pin drop animation for newly arrived pins
    const currentIds = new Set(regularPins.map((p) => p.id));
    const prevIds = prevPinIdsRef.current;
    if (prevIds.size > 0 && map.current) {
      const m = map.current;
      for (const pin of regularPins) {
        if (prevIds.has(pin.id)) continue;
        const color = SEVERITY[pin.severity as keyof typeof SEVERITY]?.color ?? '#f43f5e';
        const el = document.createElement('div');
        el.className = 'pin-drop';
        el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px ${color}66;pointer-events:none;`;
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pin.lng, pin.lat])
          .addTo(m);
        dropMarkersRef.current.push(marker);
        setTimeout(() => { marker.remove(); }, 800);
      }
    }
    prevPinIdsRef.current = currentIds;
  }, [pins, mapFilters, mapReady, layersReady, theme, setSelectedPin, setActiveSheet]);

  // Show / hide Paris transit station dots
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    if (!showStations) {
      if (m.getLayer(TRANSIT_LABEL))  m.removeLayer(TRANSIT_LABEL);
      if (m.getLayer(TRANSIT_CIRCLE)) m.removeLayer(TRANSIT_CIRCLE);
      if (m.getSource(TRANSIT_SRC))   m.removeSource(TRANSIT_SRC);
      return;
    }

    if (transitCache) {
      addTransitLayer(m);
      return;
    }

    setTransitLoading(true);
    fetchParisTransitStations()
      .then(() => { if (map.current) addTransitLayer(map.current); })
      .catch((err: unknown) => console.warn('[Brume] Transit fetch failed:', err))
      .finally(() => setTransitLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStations, mapReady, layersReady]);

  // Show / hide POI layers
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    const anyVisible = showPharmacy || showHospital || showPolice;

    if (!anyVisible) {
      if (m.getLayer(POI_LABEL))  m.removeLayer(POI_LABEL);
      if (m.getLayer(POI_CIRCLE)) m.removeLayer(POI_CIRCLE);
      if (m.getSource(POI_SRC))   m.removeSource(POI_SRC);
      return;
    }

    if (poiCache) {
      addPOILayers(m);
      const f = buildPOIFilter({ pharmacy: showPharmacy, hospital: showHospital, police: showPolice });
      if (m.getLayer(POI_CIRCLE)) m.setFilter(POI_CIRCLE, f);
      if (m.getLayer(POI_LABEL))  m.setFilter(POI_LABEL, f);
      return;
    }

    setPOILoading(true);
    fetchParisPOIs()
      .then(() => {
        if (!map.current) return;
        addPOILayers(map.current);
        const f = buildPOIFilter({ pharmacy: showPharmacy, hospital: showHospital, police: showPolice });
        if (map.current.getLayer(POI_CIRCLE)) map.current.setFilter(POI_CIRCLE, f);
        if (map.current.getLayer(POI_LABEL))  map.current.setFilter(POI_LABEL, f);
      })
      .catch((err) => console.warn('[Brume] POI fetch failed:', err))
      .finally(() => setPOILoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPharmacy, showHospital, showPolice, mapReady, layersReady]);

  // Toggle heatmap visibility
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;
    if (m.getLayer(HEAT_LYR)) {
      m.setLayoutProperty(HEAT_LYR, 'visibility', showHeatmap ? 'visible' : 'none');
    }
  }, [showHeatmap, mapReady, layersReady]);

  // Toggle safety scores layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const SCORE_SRC = 'safety-scores-src';
    const SCORE_LYR = 'safety-scores-fill';

    if (!showScores) {
      if (m.getLayer(SCORE_LYR)) m.setLayoutProperty(SCORE_LYR, 'visibility', 'none');
      return;
    }

    const bounds = m.getBounds();
    if (!bounds) return;
    const geojson = buildScoreGeoJSON(pins, {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    }, mapFilters.timeOfDay);

    if (m.getSource(SCORE_SRC)) {
      (m.getSource(SCORE_SRC) as mapboxgl.GeoJSONSource).setData(geojson as GeoJSON.FeatureCollection);
      if (m.getLayer(SCORE_LYR)) m.setLayoutProperty(SCORE_LYR, 'visibility', 'visible');
    } else {
      m.addSource(SCORE_SRC, { type: 'geojson', data: geojson as GeoJSON.FeatureCollection });
      m.addLayer({
        id: SCORE_LYR,
        type: 'fill',
        source: SCORE_SRC,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.6,
        },
      });
    }
  }, [showScores, mapReady, pins, mapFilters.timeOfDay]);

  // Toggle safe spaces layer
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    if (!showSafeSpaces) {
      if (m.getLayer(SAFE_LABEL))   m.removeLayer(SAFE_LABEL);
      if (m.getLayer(SAFE_PARTNER)) m.removeLayer(SAFE_PARTNER);
      if (m.getLayer(SAFE_CIRCLE))  m.removeLayer(SAFE_CIRCLE);
      if (m.getSource(SAFE_SRC))    m.removeSource(SAFE_SRC);
      return;
    }

    // Fetch safe spaces if not already loaded
    if (safeSpaces.length === 0) {
      supabase
        .from('safe_spaces')
        .select('*')
        .order('upvotes', { ascending: false })
        .limit(500)
        .then(({ data }) => {
          if (data) setSafeSpaces(data as import('@/types').SafeSpace[]);
        });
      return; // will re-trigger when safeSpaces updates
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: safeSpaces.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { id: s.id, name: s.name, kind: s.type, isPartner: s.is_partner, partnerTier: s.partner_tier },
      })),
    };

    if (m.getSource(SAFE_SRC)) {
      (m.getSource(SAFE_SRC) as mapboxgl.GeoJSONSource).setData(geojson);
      return;
    }

    m.addSource(SAFE_SRC, { type: 'geojson', data: geojson });

    // Generate drop-pin images for partner spaces (once)
    if (!m.hasImage('pin-premium')) {
      const mkPin = (color: string) => {
        const s = 48;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        // Drop-pin body
        ctx.beginPath();
        ctx.arc(s / 2, s * 0.38, s * 0.32, Math.PI, 0);
        ctx.quadraticCurveTo(s * 0.82, s * 0.55, s / 2, s * 0.92);
        ctx.quadraticCurveTo(s * 0.18, s * 0.55, s * 0.18, s * 0.38);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner white dot
        ctx.beginPath();
        ctx.arc(s / 2, s * 0.38, s * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        return { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) };
      };
      m.addImage('pin-premium', mkPin('#f59e0b'));
      m.addImage('pin-basic', mkPin('#3b82f6'));
    }

    // Non-partner: green circles
    m.addLayer({
      id: SAFE_CIRCLE,
      type: 'circle',
      source: SAFE_SRC,
      filter: ['!', ['get', 'isPartner']],
      paint: {
        'circle-radius': 7,
        'circle-color': '#22c55e',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });

    // Partner: drop-pin icons
    m.addLayer({
      id: SAFE_PARTNER,
      type: 'symbol',
      source: SAFE_SRC,
      filter: ['get', 'isPartner'],
      layout: {
        'icon-image': ['case', ['==', ['get', 'partnerTier'], 'premium'], 'pin-premium', 'pin-basic'],
        'icon-size': 0.7,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
      },
    });

    // Labels for all safe spaces
    m.addLayer({
      id: SAFE_LABEL,
      type: 'symbol',
      source: SAFE_SRC,
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-offset': ['case', ['get', 'isPartner'], ['literal', [0, 0.4]], ['literal', [0, 1.4]]],
        'text-anchor': 'top',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
      },
      paint: {
        'text-color': ['case', ['get', 'isPartner'],
          ['case', ['==', ['get', 'partnerTier'], 'premium'], '#f59e0b', '#3b82f6'],
          '#22c55e'],
        'text-halo-color': '#fff',
        'text-halo-width': 1.5,
      },
    });

    const handleSafeClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) {
        const space = safeSpaces.find(s => s.id === id);
        if (space) setSelectedSafeSpace(space);
      }
    };
    m.on('click', SAFE_CIRCLE, handleSafeClick);
    m.on('click', SAFE_PARTNER, handleSafeClick);
    m.on('mouseenter', SAFE_CIRCLE, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', SAFE_CIRCLE, () => { m.getCanvas().style.cursor = ''; });
    m.on('mouseenter', SAFE_PARTNER, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', SAFE_PARTNER, () => { m.getCanvas().style.cursor = ''; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSafeSpaces, safeSpaces, mapReady, layersReady]);

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Map controls (right side, above bottom nav) ─────────────── */}
      <div className="absolute left-3 bottom-22 z-50 flex flex-col items-start gap-2">

        {/* Layer panel popover */}
        <AnimatePresence>
          {showLayerPanel && (
            <LayerPanel
              key="layer-panel"
              mapStyle={mapStyle}
              onStyleChange={(s) => { setMapStyle(s); }}
              showStations={showStations}
              onStationsToggle={() => setShowStations((v) => !v)}
              transitLoading={transitLoading}
              showPharmacy={showPharmacy}
              onPharmacyToggle={() => setShowPharmacy((v) => !v)}
              showHospital={showHospital}
              onHospitalToggle={() => setShowHospital((v) => !v)}
              showPolice={showPolice}
              onPoliceToggle={() => setShowPolice((v) => !v)}
              poiLoading={poiLoading}
              showHeatmap={showHeatmap}
              onHeatmapToggle={() => setShowHeatmap((v) => !v)}
              showScores={showScores}
              onScoresToggle={() => setShowScores((v) => !v)}
              showSafeSpaces={showSafeSpaces}
              onSafeSpacesToggle={() => setShowSafeSpaces(!showSafeSpaces)}
              isAdmin={!!(userProfile as Record<string, unknown>)?.is_admin}
              showSimulated={showSimulated}
              onSimulatedToggle={() => setShowSimulated(!showSimulated)}
              onClose={() => setShowLayerPanel(false)}
            />
          )}
        </AnimatePresence>

        {/* Layers toggle button */}
        <button
          onClick={() => setShowLayerPanel((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-95"
          style={{
            backgroundColor: showLayerPanel
              ? 'var(--accent)'
              : 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          title="Map layers"
        >
          <Layers
            size={16}
            strokeWidth={2}
            style={{ color: showLayerPanel ? '#fff' : 'var(--text-muted)' }}
          />
        </button>

      </div>

      <SafeSpaceDetailSheet space={selectedSafeSpace} onClose={() => setSelectedSafeSpace(null)} />
    </div>
  );
}
