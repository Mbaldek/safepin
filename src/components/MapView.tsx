// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState, memo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '@/stores/useTheme';
import { Pin, CATEGORY_DETAILS } from '@/types';
import { getPinOpacity as getPinOpacityUtil } from '@/lib/pin-utils';
import type { Escorte, EscorteView } from '@/types';
import { buildScoreGeoJSON } from '@/components/NeighborhoodScoreLayer';
import { T } from '@/lib/tokens';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SafeSpaceDetailSheet from './SafeSpaceDetailSheet';
import { MapPin } from './MapPin';

// Import layer functions
import {
  addClusterLayers,
  updateClusterData,
  updateDBClusters,
  removeClusterLayers,
  SOURCE_ID,
  DB_CLUSTER_SRC,
  DB_CLUSTER_CIRCLE,
  DB_CLUSTER_HALO,
  DB_CLUSTER_LABEL,
} from './map/layers/ClusterLayer';
import {
  addRouteLayer,
  removeRouteLayer,
  ROUTE_SRC,
  ROUTE_LYR,
} from './map/layers/RouteLayer';
import {
  addSOSTrailLayer,
  removeSOSTrailLayer,
  SOS_TRAIL_SRC,
  SOS_TRAIL_LYR,
} from './map/layers/SOSLayer';
import {
  addWatchContactsLayer,
  removeWatchContactsLayer,
  WATCH_SRC,
  WATCH_CIRCLE,
  WATCH_LABEL,
} from './map/layers/WatchContactsLayer';
import {
  addPendingRoutesLayer,
  removePendingRoutesLayer,
  PENDING_SRCS,
  PENDING_LYRS,
} from './map/layers/PendingRoutesLayer';

// Import extracted modules
import {
  STYLE_URLS,
  TRANSIT_SRC, TRANSIT_CIRCLE, TRANSIT_LABEL,
  POI_SRC, POI_CIRCLE, POI_LABEL,
  HEAT_SRC, HEAT_LYR,
  SAFE_SRC, SAFE_CIRCLE, SAFE_LABEL, SAFE_PARTNER,
  PIN_COLORS,
  SAFE_SPACE_EMOJI,
} from './map/constants';
import {
  fetchParisTransitStations,
  addTransitLayer,
  getTransitCache,
  clearTransitCache,
} from './map/transit-layer';
import {
  fetchParisPOIs,
  addPOILayers,
  buildPOIFilter,
  getPOICache,
  clearPOICache,
} from './map/poi-layer';
import {
  addHeatmapLayer,
  getHeatmapCache,
  setHeatmapCache,
  clearHeatmapCache,
} from './map/heatmap-layer';
import { makeSafePin, getEffectiveOpacity, getCategoryGroupId } from './map/pin-renderer';
import { buildGeoJSON, pinMatchesSafetyFilter, getColors, hideBuiltinPOIDots } from './map/geo-utils';
import CompassButton from './map/CompassButton';
import SafetyFilterBadge from './map/SafetyFilterBadge';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Prewarm WebGL dès le chargement du module
if (typeof window !== 'undefined') {
  mapboxgl.prewarm();
}

export type MapViewProps = {
  mapStyle: 'custom' | 'streets' | 'light' | 'dark';
  showBus: boolean;
  showMetroRER: boolean;
  showPharmacy: boolean;
  showHospital: boolean;
  showPolice: boolean;
  showHeatmap: boolean;
  showScores: boolean;
  showPinLabels: boolean;
  onTransitLoadingChange?: (v: boolean) => void;
  onPoiLoadingChange?: (v: boolean) => void;
  escorteView?: EscorteView;
  activeEscorte?: Escorte | null;
  onTriggerSOS?: () => void;
  safetyFilter?: string | null;
  onClearSafetyFilter?: () => void;
  onMapTap?: () => void;
};

function MapView({
  mapStyle,
  showBus,
  showMetroRER,
  showPharmacy,
  showHospital,
  showPolice,
  showHeatmap,
  showScores,
  showPinLabels,
  onTransitLoadingChange,
  onPoiLoadingChange,
  escorteView,
  activeEscorte,
  onTriggerSOS,
  safetyFilter,
  onClearSafetyFilter,
  onMapTap,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const departDragMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const previewMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const onMapTapRef = useRef(onMapTap);
  onMapTapRef.current = onMapTap;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    pins, mapFilters, setSelectedPin, activeSheet, setActiveSheet, mapFlyTo, setMapFlyTo,
    setUserLocation, activeRoute, pendingRoutes, setPendingRoutes, selectedRouteIdx, transitSegments, watchedLocations, userId,
    safeSpaces, setSafeSpaces, showSafeSpaces, mapBottomPadding,
    setTripPrefill, setActiveTab, departDragPin, setDepartDragPin, newPinCoords,
    setMapViewport, dbClusters,
    highlightedPinIds, setSelectedRouteIdx, setTappedRouteIdx,
  } = useStore(useShallow((s) => ({
    pins: s.pins, mapFilters: s.mapFilters, setSelectedPin: s.setSelectedPin,
    activeSheet: s.activeSheet, setActiveSheet: s.setActiveSheet,
    mapFlyTo: s.mapFlyTo, setMapFlyTo: s.setMapFlyTo,
    setUserLocation: s.setUserLocation, activeRoute: s.activeRoute,
    pendingRoutes: s.pendingRoutes, setPendingRoutes: s.setPendingRoutes,
    selectedRouteIdx: s.selectedRouteIdx, transitSegments: s.transitSegments,
    watchedLocations: s.watchedLocations, userId: s.userId,
    safeSpaces: s.safeSpaces, setSafeSpaces: s.setSafeSpaces,
    showSafeSpaces: s.showSafeSpaces, mapBottomPadding: s.mapBottomPadding,
    setTripPrefill: s.setTripPrefill, setActiveTab: s.setActiveTab,
    departDragPin: s.departDragPin, setDepartDragPin: s.setDepartDragPin,
    newPinCoords: s.newPinCoords,
    setMapViewport: s.setMapViewport,
    dbClusters: s.dbClusters,
    highlightedPinIds: s.highlightedPinIds,
    setSelectedRouteIdx: s.setSelectedRouteIdx,
    setTappedRouteIdx: s.setTappedRouteIdx,
  })));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const c = getColors(isDark);
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [selectedSafeSpace, setSelectedSafeSpace] = useState<import('@/types').SafeSpace | null>(null);
  const [bearing, setBearing] = useState(0);

  const handleSafeNavigate = useCallback((lat: number, lng: number, name: string) => {
    setTripPrefill({ destination: name, destCoords: [lng, lat] });
    setActiveTab('trip');
    setSelectedSafeSpace(null);
  }, [setTripPrefill, setActiveTab]);
  const [filteredTransportPins, setFilteredTransportPins] = useState<Pin[]>([]);
  const [filteredRegularPins, setFilteredRegularPins] = useState<Pin[]>([]);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);
  const zoomRef = useRef(12);
  const prevPinIdsRef = useRef<Set<string>>(new Set());
  const [newPinIds, setNewPinIds] = useState<Set<string>>(new Set());
  const ghostTrailRef = useRef<mapboxgl.Marker[]>([]);
  const prevMapStyleRef = useRef(mapStyle); // tracks last-applied style to skip redundant setStyle
  const LABEL_ZOOM_THRESHOLD = 14;
  const effectiveLabels = showPinLabels && labelsVisible;

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: STYLE_URLS.custom,
      center: [2.3522, 48.8566],
      zoom: 12,
      performanceMetricsCollection: false,
      fadeDuration: 0,
      antialias: false,
      renderWorldCopies: false,
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

    // Long-press (2 s) → open Report sheet (add pin funnel)
    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        const store = useStore.getState();
        const blockedTab = store.activeTab === 'trip' || store.activeTab === 'me' || store.showIncidentsList;
        if (store.activeSheet === 'none' && !blockedTab) {
          store.setNewPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          store.setActiveSheet('report');
        }
      }, 2000);
    };
    const cancelLong = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    // Also handle mobile long-press via contextmenu
    const handleContextMenu = (e: mapboxgl.MapMouseEvent) => {
      const store = useStore.getState();
      const blockedTab = store.activeTab === 'trip' || store.activeTab === 'me' || store.showIncidentsList;
      if (store.activeSheet === 'none' && !blockedTab) {
        store.setNewPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        store.setActiveSheet('report');
      }
    };
    // ── Viewport emission (debounced 400ms) ──────────────────────────────────
    let moveendTimer: ReturnType<typeof setTimeout> | null = null;
    const emitViewport = () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      const zoom   = map.current.getZoom();
      const bounds = map.current.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latSpan = Math.abs(ne.lat - sw.lat);
      const lngSpan = Math.abs(ne.lng - sw.lng);
      const radiusM = Math.sqrt(latSpan * latSpan + lngSpan * lngSpan) * 111320 / 2;
      setMapViewport({ lat: center.lat, lng: center.lng, zoom, radiusM: Math.max(radiusM, 500) });
      setMapZoom(Math.round(zoom));
    };
    const handleMoveEnd = () => {
      if (moveendTimer) clearTimeout(moveendTimer);
      moveendTimer = setTimeout(emitViewport, 400);
    };

    const handleLoad = () => {
      hideBuiltinPOIDots(map.current!);
      addClusterLayers(map.current!);
      setLayersReady(true);
      setMapReady(true);
      emitViewport();
    };
    const handleZoomEnd = () => {
      if (!map.current) return;
      const z = Math.round(map.current.getZoom());
      const prev = zoomRef.current;
      zoomRef.current = z;
      // Only trigger re-render when crossing the label threshold
      const crossed = (prev < LABEL_ZOOM_THRESHOLD) !== (z < LABEL_ZOOM_THRESHOLD);
      if (crossed) setLabelsVisible(z >= LABEL_ZOOM_THRESHOLD);
      emitViewport();
    };

    map.current.on('mousedown', handleMouseDown);
    map.current.on('mouseup',   cancelLong);
    map.current.on('mousemove', cancelLong);
    map.current.on('touchend',  cancelLong);
    map.current.on('contextmenu', handleContextMenu);
    map.current.on('load', handleLoad);
    map.current.on('zoomend', handleZoomEnd);
    map.current.on('moveend', handleMoveEnd);
    const handleRotate = () => setBearing(map.current?.getBearing() ?? 0);
    map.current.on('rotate', handleRotate);

    return () => {
      if (moveendTimer) clearTimeout(moveendTimer);
      map.current?.off('mousedown', handleMouseDown);
      map.current?.off('mouseup',   cancelLong);
      map.current?.off('mousemove', cancelLong);
      map.current?.off('touchend',  cancelLong);
      map.current?.off('contextmenu', handleContextMenu);
      map.current?.off('load', handleLoad);
      map.current?.off('zoomend', handleZoomEnd);
      map.current?.off('moveend', handleMoveEnd);
      map.current?.off('rotate', handleRotate);
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

  // ── User location pulsing dot ──────────────────────────────────────────────
  useEffect(() => {
    if (!map.current) return;
    const el = document.createElement('div');
    el.style.cssText = 'width:22px;height:22px;position:relative;display:none;';
    el.innerHTML =
      '<div style="width:14px;height:14px;border-radius:50%;background:#3BB4C1;border:3px solid #fff;box-shadow:0 0 6px rgba(59,180,193,0.5);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1"></div>' +
      '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,180,193,0.25);animation:pulse-ring 2s ease-out infinite"></div>';
    const marker = new mapboxgl.Marker({ element: el }).setLngLat([0, 0]).addTo(map.current);
    let prevLoc = useStore.getState().userLocation;
    const unsub = useStore.subscribe((s) => {
      const loc = s.userLocation;
      if (loc === prevLoc) return;
      prevLoc = loc;
      if (loc) {
        marker.setLngLat([loc.lng, loc.lat]);
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
    // Set initial position if already available
    const init = useStore.getState().userLocation;
    if (init) { marker.setLngLat([init.lng, init.lat]); el.style.display = 'block'; }
    return () => { unsub(); marker.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draggable departure pin
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Remove previous marker
    departDragMarkerRef.current?.remove();
    departDragMarkerRef.current = null;

    if (!departDragPin) return;

    const marker = new mapboxgl.Marker({ draggable: true, color: '#34D399' })
      .setLngLat(departDragPin)
      .addTo(m);

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      setDepartDragPin([lng, lat]);
    });

    departDragMarkerRef.current = marker;

    return () => {
      marker.remove();
      departDragMarkerRef.current = null;
    };
  }, [departDragPin, mapReady, setDepartDragPin]);

  // Adjust map logical center when a bottom sheet opens/resizes/closes
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    m.easeTo({
      padding: { top: 0, left: 0, right: 0, bottom: mapBottomPadding },
      duration: 300,
    });
  }, [mapBottomPadding, mapReady]);

  // Tap-to-place pin for incident reporting: tap empty canvas → move pin there
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    // Set initial coords when report opens without them
    const unsub = useStore.subscribe((state, prev) => {
      if (state.activeSheet === 'report' && prev.activeSheet !== 'report') {
        if (!state.newPinCoords) {
          const center = m.getCenter();
          state.setNewPinCoords({ lat: center.lat, lng: center.lng });
        }
      }
    });

    // Tap on empty canvas → move pin or dismiss overlays
    const INTERACTIVE_LAYERS = ['clusters', 'unclustered-point', TRANSIT_CIRCLE, SAFE_CIRCLE, SAFE_PARTNER];
    const onMapClick = (e: mapboxgl.MapMouseEvent) => {
      // Only check interactive layers (not roads/labels/buildings)
      let hitInteractive = false;
      try {
        const existing = INTERACTIVE_LAYERS.filter((l) => m.getLayer(l));
        if (existing.length > 0) {
          hitInteractive = m.queryRenderedFeatures(e.point, { layers: existing }).length > 0;
        }
      } catch { /* layer not ready yet */ }
      if (hitInteractive) return;

      const store = useStore.getState();
      if (store.activeSheet === 'report') {
        store.setNewPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      } else {
        onMapTapRef.current?.();
      }
    };

    m.on('click', onMapClick);
    return () => { m.off('click', onMapClick); unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // Report pin preview marker — follows newPinCoords in real time
  useEffect(() => {
    if (!map.current || !newPinCoords) {
      previewMarkerRef.current?.remove();
      previewMarkerRef.current = null;
      return;
    }
    if (activeSheet !== 'report') {
      previewMarkerRef.current?.remove();
      previewMarkerRef.current = null;
      return;
    }

    // Coords valides — créer ou déplacer
    const lngLat: [number, number] = [newPinCoords.lng, newPinCoords.lat];

    if (!previewMarkerRef.current) {
      const el = document.createElement('div');
      el.style.cssText = 'width:36px;height:36px;position:relative;pointer-events:none;display:flex;align-items:center;justify-content:center;';
      el.innerHTML = `
        <svg width="28" height="36" viewBox="0 0 24 32" fill="#1E3A5F" stroke="#fff" stroke-width="1.2" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">
          <path d="M12 1C7.58 1 4 4.58 4 9c0 6.5 8 22 8 22s8-15.5 8-22c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
        </svg>`;
      previewMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map.current);
    } else {
      previewMarkerRef.current.setLngLat(lngLat);
    }
  }, [activeSheet, newPinCoords]);

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
        'line-color': '#3BB4C1',
        'line-width': 4,
        'line-opacity': 0.85,
        'line-dasharray': [1, 0],
      },
    }, 'clusters-halo');

    // Destination marker
    const last = activeRoute.coords[activeRoute.coords.length - 1];
    const el = document.createElement('div');
    el.style.cssText = `width:36px;height:36px;border-radius:50%;background:${PIN_COLORS.destination};border:3px solid ${PIN_COLORS.stroke};box-shadow:0 0 0 6px rgba(52,211,153,0.20),0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer`;
    el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(last)
      .addTo(m);

    // Fit route + user position — navigation-style view
    const loc = useStore.getState().userLocation;
    const allPts = [...activeRoute.coords];
    if (loc) allPts.push([loc.lng, loc.lat]);
    const lngs = allPts.map((c) => c[0]);
    const lats  = allPts.map((c) => c[1]);
    m.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 80, left: 60, right: 60, bottom: 80 + mapBottomPadding }, maxZoom: 16, duration: 1200 },
    );
  }, [activeRoute, mapReady, layersReady]);

  // Draw / clear pending route options (colored multi-route selection)
  const pendingRoutesDrawnRef = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    // Remove previous pending layers + sources (hitbox + visible)
    const HITBOX_LYRS = PENDING_LYRS.map(l => `${l}-hitbox`);
    HITBOX_LYRS.forEach((lyr) => { if (m.getLayer(lyr)) m.removeLayer(lyr); });
    PENDING_LYRS.forEach((lyr) => { if (m.getLayer(lyr)) m.removeLayer(lyr); });
    PENDING_SRCS.forEach((src) => { if (m.getSource(src)) m.removeSource(src); });

    // Active trip overrides — clear any leftover pending routes
    if (activeRoute) {
      setPendingRoutes(null);
      pendingRoutesDrawnRef.current = false;
      return;
    }

    if (!pendingRoutes || pendingRoutes.length === 0) {
      pendingRoutesDrawnRef.current = false;
      return;
    }

    pendingRoutes.forEach((route, i) => {
      m.addSource(PENDING_SRCS[i], {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.coords },
          properties: {},
        },
      });
      // Invisible hitbox layer (wide 24px target for easy tapping)
      const hitboxId = `${PENDING_LYRS[i]}-hitbox`;
      m.addLayer({
        id: hitboxId,
        type: 'line',
        source: PENDING_SRCS[i],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#000', 'line-width': 24, 'line-opacity': 0 },
      }, 'clusters-halo');

      // Visible route line on top
      m.addLayer({
        id: PENDING_LYRS[i],
        type: 'line',
        source: PENDING_SRCS[i],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': route.color,
          'line-width': i === selectedRouteIdx ? 5 : 3,
          'line-opacity': i === selectedRouteIdx ? 0.9 : 0.3,
        },
      }, 'clusters-halo');

      // Click handler on hitbox — select route + show QuickCard + collapse panel
      m.on('click', hitboxId, (e) => {
        e.originalEvent.stopPropagation();
        setSelectedRouteIdx(i);
        setTappedRouteIdx(i);
        window.dispatchEvent(new CustomEvent('route-tap-collapse'));
      });
      // Cursor pointer on hover
      m.on('mouseenter', hitboxId, () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', hitboxId, () => { m.getCanvas().style.cursor = ''; });
    });

    // Only fitBounds on first draw (when routes are fetched), not on re-renders from selection change
    if (!pendingRoutesDrawnRef.current) {
      pendingRoutesDrawnRef.current = true;
      const allCoords = pendingRoutes.flatMap((r) => r.coords);
      if (allCoords.length > 0) {
        const lngs = allCoords.map((c) => c[0]);
        const lats  = allCoords.map((c) => c[1]);
        m.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: { top: 60, left: 60, right: 60, bottom: 60 + mapBottomPadding }, maxZoom: 15, duration: 1200 },
        );
      }
    }
  }, [pendingRoutes, selectedRouteIdx, activeRoute, mapReady, layersReady]);

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
      }, 'clusters-halo');
    });

    // Fit bounds to show all segments
    const allCoords = transitSegments.flatMap((s) => s.coords);
    if (allCoords.length > 0) {
      const lngs = allCoords.map((c) => c[0]);
      const lats = allCoords.map((c) => c[1]);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 60, left: 60, right: 60, bottom: 60 + mapBottomPadding }, maxZoom: 15, duration: 1200 },
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
        'circle-radius': 16,
        'circle-color': PIN_COLORS.watchContact,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': PIN_COLORS.stroke,
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

  // Load and render personal location heatmap
  useEffect(() => {
    if (!userId || !mapReady || !layersReady) return;

    const m = map.current;
    if (!m) return;

    // Use cached data if available (e.g. after style switch)
    const cachedHeatmap = getHeatmapCache();
    if (cachedHeatmap) {
      if (m.getSource(HEAT_SRC)) {
        (m.getSource(HEAT_SRC) as mapboxgl.GeoJSONSource).setData(cachedHeatmap);
      } else {
        addHeatmapLayer(m, cachedHeatmap);
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
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: data.map((r) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: {},
          })),
        };
        setHeatmapCache(geojson);
        addHeatmapLayer(map.current, geojson);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mapReady, layersReady]);

  // Apply mapStyle to the actual Mapbox map — re-add cluster layers + transit after style loads
  useEffect(() => {
    if (!map.current || !mapReady) return;
    // Skip if style hasn't changed — handles first run where constructor already loaded the correct style
    if (prevMapStyleRef.current === mapStyle) return;
    prevMapStyleRef.current = mapStyle;
    clearTransitCache();
    clearPOICache();
    clearHeatmapCache();
    setLayersReady(false);
    map.current.once('style.load', () => {
      hideBuiltinPOIDots(map.current!);
      addClusterLayers(map.current!);
      const anyTransit = showBus || showMetroRER;
      if (anyTransit) {
        fetchParisTransitStations()
          .then(() => {
            if (!map.current) return;
            addTransitLayer(map.current);
            const kinds: string[] = [];
            if (showBus) kinds.push('bus');
            if (showMetroRER) { kinds.push('metro', 'rer', 'tram'); }
            const tf: mapboxgl.ExpressionSpecification = ['in', ['get', 'kind'], ['literal', kinds]];
            if (map.current.getLayer(TRANSIT_CIRCLE)) map.current.setFilter(TRANSIT_CIRCLE, tf);
            if (map.current.getLayer(TRANSIT_LABEL))  map.current.setFilter(TRANSIT_LABEL, tf);
          })
          .catch((err: unknown) => console.warn('[Breveil] Transit fetch failed:', err));
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
          .catch((err: unknown) => console.warn('[Breveil] POI fetch failed:', err));
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
      if (!pin.is_emergency) return false;
      const ageH = (now - new Date(pin.created_at).getTime()) / 3_600_000;
      return ageH < 24;
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

    // ── SOS trail polylines ──────────────────────────────────────────────────
    if (map.current.getLayer(SOS_TRAIL_LYR)) map.current.removeLayer(SOS_TRAIL_LYR);
    if (map.current.getSource(SOS_TRAIL_SRC)) map.current.removeSource(SOS_TRAIL_SRC);

    const trailFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    trailGroups.forEach((groupPins) => {
      // Skip resolved groups or groups with < 2 pins (no line to draw)
      if (groupPins.length < 2 || groupPins[0].resolved_at) return;
      // Sort oldest-first for correct route direction
      const sorted = [...groupPins].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      trailFeatures.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: sorted.map((p) => [p.lng, p.lat]),
        },
      });
    });

    if (trailFeatures.length > 0) {
      map.current.addSource(SOS_TRAIL_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: trailFeatures },
      });
      map.current.addLayer({
        id: SOS_TRAIL_LYR,
        type: 'line',
        source: SOS_TRAIL_SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-opacity': 0.7,
        },
      });
    }

    const TRAIL_LEVELS: [number, number, number, boolean][] = [
      [1.0, 38, 44, true],
      [0.55, 28, 34, false],
      [0.28, 20, 26, false],
    ];

    filteredEmergency.forEach((pin) => {
      const group = trailGroups.get(pin.user_id) ?? [];
      const idx = group.findIndex((p) => p.id === pin.id);
      const isResolved = !!pin.resolved_at;
      const level = TRAIL_LEVELS[idx];
      if (!level) return;
      if (isResolved && idx !== 0) return; // resolved: single dot, no trail
      const [trailOpacity, dotPx, wrapperPx, showRing] = level;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `width:${wrapperPx}px;height:${wrapperPx}px;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;opacity:${trailOpacity}`;

      if (showRing && !isResolved) {
        const ring = document.createElement('div');
        ring.className = 'emergency-ring';
        wrapper.appendChild(ring);
      }

      const bgColor = isResolved ? PIN_COLORS.emergencyResolved : PIN_COLORS.emergency;
      const shadowColor = isResolved ? '#9CA3AF88' : '#ef444488';
      const dot = document.createElement('div');
      dot.style.cssText = `width:${dotPx}px;height:${dotPx}px;border-radius:50%;background-color:${bgColor};border:3px solid ${theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.15)'};box-shadow:0 2px 8px ${shadowColor};z-index:1;position:relative;display:flex;align-items:center;justify-content:center`;
      const fontSize = idx === 0 ? 13 : 10;
      dot.innerHTML = `<span style="font-size:${fontSize}px;font-weight:800;color:${PIN_COLORS.stroke};letter-spacing:0.5px;line-height:1;user-select:none">SOS</span>`;

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

    // ── Shared filter logic ─────────────────────────────────────────────────
    function passesFilters(pin: Pin): boolean {
      if (pin.is_emergency) return false;
      if (getEffectiveOpacity(pin) <= 0) return false;
      // Severity
      if (mapFilters.severity !== 'all' && pin.severity !== mapFilters.severity) return false;
      // Age
      const ageMs = Date.now() - new Date(pin.created_at).getTime();
      if (mapFilters.age === '1h'    && ageMs > 3_600_000)            return false;
      if (mapFilters.age === '6h'    && ageMs > 6 * 3_600_000)      return false;
      if (mapFilters.age === 'today' && ageMs > 24 * 3_600_000)     return false;
      if (mapFilters.age === '7d'    && ageMs > 7 * 24 * 3_600_000) return false;
      // Urban context
      if (mapFilters.urban !== 'all' && pin.urban_context !== mapFilters.urban) return false;
      // Confirmed only
      if (mapFilters.confirmedOnly && !pin.last_confirmed_at) return false;
      // Category group filters
      const DANGER_CATS = ['assault','harassment','theft','following','aggression','stalking','verbal_abuse'];
      const WARNING_CATS = ['suspect','group','unsafe','suspicious','drunk'];
      const INFRA_CATS = ['lighting','blocked','closed','poor_lighting','dark_area','unsafe_road','obstacle','construction'];
      const POSITIVE_CATS = ['safe','help','presence'];
      if (!mapFilters.showDanger && DANGER_CATS.includes(pin.category)) return false;
      if (!mapFilters.showWarning && WARNING_CATS.includes(pin.category)) return false;
      if (!mapFilters.showInfra && INFRA_CATS.includes(pin.category)) return false;
      if (!mapFilters.showPositive && POSITIVE_CATS.includes(pin.category)) return false;
      // Time of day
      if (mapFilters.timeOfDay !== 'all') {
        const h = new Date(pin.created_at).getHours();
        if (mapFilters.timeOfDay === 'morning'   && (h < 6  || h >= 12)) return false;
        if (mapFilters.timeOfDay === 'afternoon'  && (h < 12 || h >= 18)) return false;
        if (mapFilters.timeOfDay === 'evening'    && (h < 18 || h >= 22)) return false;
        if (mapFilters.timeOfDay === 'night'      && (h >= 6 && h < 22))  return false;
      }
      return true;
    }

    // ── Regular pins via GeoJSON clustering (exclude transport) ──────────────
    const regularPins = pins.filter((pin) => passesFilters(pin) && !pin.is_transport);

    const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      // At zoom < 12 DB clusters are shown instead — clear individual pins from GL source
      source.setData(mapZoom < 12
        ? { type: 'FeatureCollection', features: [] }
        : buildGeoJSON(regularPins));
    }

    // Pin drop animation for newly arrived pins
    const allVisiblePins = pins.filter(passesFilters);
    const currentIds = new Set(allVisiblePins.map((p) => p.id));
    const prevIds = prevPinIdsRef.current;
    if (prevIds.size > 0) {
      const freshIds = new Set<string>();
      for (const pin of allVisiblePins) {
        if (!prevIds.has(pin.id)) freshIds.add(pin.id);
      }
      if (freshIds.size > 0) {
        setNewPinIds(freshIds);
        setTimeout(() => setNewPinIds(new Set()), 700);
      }
    }
    prevPinIdsRef.current = currentIds;

    // ── All visible pins — rendered as <MapPin> in JSX ────────────────
    setFilteredRegularPins(regularPins);
    setFilteredTransportPins(pins.filter((pin) => passesFilters(pin) && pin.is_transport));

    // Ghost trail cleanup (kept for legacy)
    ghostTrailRef.current.forEach((m) => m.remove());
    ghostTrailRef.current = [];
  }, [pins, mapFilters, mapReady, layersReady, theme, activeSheet, setSelectedPin, setActiveSheet, mapZoom]);

  // ── DB spatial cluster layer update (zoom < 12) ───────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady || !layersReady) return;
    const clusterSrc = map.current.getSource(DB_CLUSTER_SRC) as mapboxgl.GeoJSONSource | undefined;
    if (!clusterSrc) return;
    if (mapZoom < 12 && dbClusters.length > 0) {
      clusterSrc.setData({
        type: 'FeatureCollection',
        features: dbClusters.map((c) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
          properties: { count: c.count, dominant_group: c.dominant_group, cluster_id: c.cluster_id },
        })),
      });
    } else {
      clusterSrc.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [dbClusters, mapZoom, mapReady, layersReady]);

  // Show / hide Paris transit station dots (Bus / Metro-RER split)
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;

    const anyTransit = showBus || showMetroRER;

    if (!anyTransit) {
      if (m.getLayer(TRANSIT_LABEL))  m.removeLayer(TRANSIT_LABEL);
      if (m.getLayer(TRANSIT_CIRCLE)) m.removeLayer(TRANSIT_CIRCLE);
      if (m.getSource(TRANSIT_SRC))   m.removeSource(TRANSIT_SRC);
      return;
    }

    const kinds: string[] = [];
    if (showBus) kinds.push('bus');
    if (showMetroRER) { kinds.push('metro', 'rer', 'tram'); }
    const filter: mapboxgl.ExpressionSpecification = ['in', ['get', 'kind'], ['literal', kinds]];

    if (getTransitCache()) {
      addTransitLayer(m);
      if (m.getLayer(TRANSIT_CIRCLE)) m.setFilter(TRANSIT_CIRCLE, filter);
      if (m.getLayer(TRANSIT_LABEL))  m.setFilter(TRANSIT_LABEL, filter);
      return;
    }

    onTransitLoadingChange?.(true);
    fetchParisTransitStations()
      .then(() => {
        if (!map.current) return;
        addTransitLayer(map.current);
        if (map.current.getLayer(TRANSIT_CIRCLE)) map.current.setFilter(TRANSIT_CIRCLE, filter);
        if (map.current.getLayer(TRANSIT_LABEL))  map.current.setFilter(TRANSIT_LABEL, filter);
      })
      .catch((err: unknown) => console.warn('[Breveil] Transit fetch failed:', err))
      .finally(() => onTransitLoadingChange?.(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBus, showMetroRER, mapReady, layersReady]);

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

    if (getPOICache()) {
      addPOILayers(m);
      const f = buildPOIFilter({ pharmacy: showPharmacy, hospital: showHospital, police: showPolice });
      if (m.getLayer(POI_CIRCLE)) m.setFilter(POI_CIRCLE, f);
      if (m.getLayer(POI_LABEL))  m.setFilter(POI_LABEL, f);
      return;
    }

    onPoiLoadingChange?.(true);
    fetchParisPOIs()
      .then(() => {
        if (!map.current) return;
        addPOILayers(map.current);
        const f = buildPOIFilter({ pharmacy: showPharmacy, hospital: showHospital, police: showPolice });
        if (map.current.getLayer(POI_CIRCLE)) map.current.setFilter(POI_CIRCLE, f);
        if (map.current.getLayer(POI_LABEL))  map.current.setFilter(POI_LABEL, f);
      })
      .catch((err) => console.warn('[Breveil] POI fetch failed:', err))
      .finally(() => onPoiLoadingChange?.(false));
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

  // Toggle text labels on Mapbox symbol layers
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !layersReady) return;
    const vis = effectiveLabels ? 'visible' : 'none';
    for (const id of [TRANSIT_LABEL, POI_LABEL, SAFE_LABEL]) {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', vis);
    }
  }, [effectiveLabels, mapReady, layersReady]);

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
      }, 'clusters-halo');
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

    // Register safe-space emoji images + partner drop-pin images (once per style)
    if (!m.hasImage('safe-pharmacy')) {
      Object.entries(SAFE_SPACE_EMOJI).forEach(([type, emoji]) => {
        m.addImage(`safe-${type}`, makeSafePin(emoji));
      });
    }
    if (!m.hasImage('pin-premium')) {
      const mkPin = (color: string) => {
        const s = 48;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(s / 2, s * 0.38, s * 0.32, Math.PI, 0);
        ctx.quadraticCurveTo(s * 0.82, s * 0.55, s / 2, s * 0.92);
        ctx.quadraticCurveTo(s * 0.18, s * 0.55, s * 0.18, s * 0.38);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(s / 2, s * 0.38, s * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        return { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) };
      };
      m.addImage('pin-premium', mkPin('#f59e0b'));
      m.addImage('pin-basic', mkPin('#3b82f6'));
    }

    // Non-partner: emoji in #6BA68E circle
    m.addLayer({
      id: SAFE_CIRCLE,
      type: 'symbol',
      source: SAFE_SRC,
      filter: ['!', ['get', 'isPartner']],
      layout: {
        'icon-image': ['match', ['get', 'kind'],
          'pharmacy', 'safe-pharmacy',
          'hospital',  'safe-hospital',
          'police',    'safe-police',
          'cafe',      'safe-cafe',
          'shelter',   'safe-shelter',
          'safe-other',
        ],
        'icon-allow-overlap': true,
        'icon-size': 0.9,
      },
      paint: {
        'icon-opacity': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.0,
          12, 1.0,
        ],
      },
    }, 'clusters-halo');

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
      paint: {
        'icon-opacity': [
          'interpolate', ['linear'], ['zoom'],
          9,  0.0,
          11, 1.0,
        ],
      },
    }, 'clusters-halo');

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
    }, 'clusters-halo');

    const handleSafeClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) {
        const space = safeSpaces.find(s => s.id === id);
        if (space) setSelectedSafeSpace(space);
      }
    };
    const safeCircleEnter   = () => { m.getCanvas().style.cursor = 'pointer'; };
    const safeCircleLeave   = () => { m.getCanvas().style.cursor = ''; };
    const safePartnerEnter  = () => { m.getCanvas().style.cursor = 'pointer'; };
    const safePartnerLeave  = () => { m.getCanvas().style.cursor = ''; };

    m.on('click', SAFE_CIRCLE, handleSafeClick);
    m.on('click', SAFE_PARTNER, handleSafeClick);
    m.on('mouseenter', SAFE_CIRCLE, safeCircleEnter);
    m.on('mouseleave', SAFE_CIRCLE, safeCircleLeave);
    m.on('mouseenter', SAFE_PARTNER, safePartnerEnter);
    m.on('mouseleave', SAFE_PARTNER, safePartnerLeave);

    return () => {
      // cleanup: retire 6 listeners (click×2, mouseenter×2, mouseleave×2)
      m.off('click', SAFE_CIRCLE, handleSafeClick);
      m.off('click', SAFE_PARTNER, handleSafeClick);
      m.off('mouseenter', SAFE_CIRCLE, safeCircleEnter);
      m.off('mouseleave', SAFE_CIRCLE, safeCircleLeave);
      m.off('mouseenter', SAFE_PARTNER, safePartnerEnter);
      m.off('mouseleave', SAFE_PARTNER, safePartnerLeave);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSafeSpaces, safeSpaces, mapReady, layersReady]);

  // ── Stable callbacks for JSX (avoid re-creating on every render) ────────
  const handleTransportPinClick = useCallback((p: unknown) => {
    setSelectedPin(p as Pin);
    setActiveSheet('detail');
  }, [setSelectedPin, setActiveSheet]);

  const handleSafeSheetClose = useCallback(() => setSelectedSafeSpace(null), []);

  const handleCompassReset = useCallback(() => {
    map.current?.easeTo({ bearing: 0, duration: 400 });
  }, []);

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Compass button — visible when map is rotated, below GPS control */}
      <CompassButton bearing={bearing} isDark={isDark} onReset={handleCompassReset} />

      {/* Safety filter badge */}
      <SafetyFilterBadge filter={safetyFilter ?? null} isDark={isDark} onClear={onClearSafetyFilter ?? (() => {})} />

      {map.current && mapZoom >= 12 && filteredRegularPins.map((pin) => (
        <MapPin
          key={pin.id}
          map={map.current!}
          pin={pin}
          onClick={handleTransportPinClick}
          showLabels={effectiveLabels}
          opacity={safetyFilter ? (pinMatchesSafetyFilter(pin, safetyFilter) ? 1 : 0.25) : 1}
          isNew={newPinIds.has(pin.id)}
          highlighted={highlightedPinIds.has(pin.id)}
          zoom={mapZoom}
        />
      ))}

      {map.current && mapZoom >= 12 && filteredTransportPins.map((pin) => (
        <MapPin
          key={pin.id}
          map={map.current!}
          pin={pin}
          onClick={handleTransportPinClick}
          showLabels={effectiveLabels}
          opacity={safetyFilter ? (pinMatchesSafetyFilter(pin, safetyFilter) ? 1 : 0.25) : 1}
          isNew={newPinIds.has(pin.id)}
          zoom={mapZoom}
        />
      ))}

      {selectedSafeSpace && (
        <SafeSpaceDetailSheet
          safeSpace={selectedSafeSpace}
          userId={userId ?? ''}
          isOpen={!!selectedSafeSpace}
          onClose={handleSafeSheetClose}
          onNavigate={handleSafeNavigate}
        />
      )}

      {/* ── Trip-active progress bar ── */}
      {escorteView === 'trip-active' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg,${T.gradientStart},${T.semanticSuccess})`,
        }} />
      )}

      {/* ── Trip-active HUD ── */}
      {escorteView === 'trip-active' && activeEscorte && (
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          pointerEvents: 'auto',
        }}>
          {/* ETA pill */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(30,41,59,0.88)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100,
            padding: '8px 14px',
          }}>
            <Clock size={13} strokeWidth={1.5} color={T.semanticSuccess} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF' }}>
              {activeEscorte.eta_minutes} min
            </span>
            <div style={{ width: 1, height: 13, background: 'rgba(255,255,255,0.10)' }} />
            <span style={{ fontSize: 12, color: '#94A3B8' }}>1,2 km</span>
            <div style={{ flex: 1 }} />
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 100, padding: '2px 8px', fontSize: 10, color: '#94A3B8' }}>
              🚶 Pied
            </div>
          </div>
          {/* SOS button */}
          <button
            onClick={onTriggerSOS}
            style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <AlertTriangle size={16} strokeWidth={1.5} color='#EF4444' />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(MapView);
