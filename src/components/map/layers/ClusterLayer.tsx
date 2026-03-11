// src/components/map/layers/ClusterLayer.tsx

import mapboxgl from 'mapbox-gl';
import type { Pin } from '@/types';
import { CATEGORY_DETAILS } from '@/types';
import { getPinOpacity as getPinOpacityUtil } from '@/lib/pin-utils';

export const SOURCE_ID = 'pins-source';
export const DB_CLUSTER_SRC = 'pins-db-cluster-src';
export const DB_CLUSTER_CIRCLE = 'pins-db-cluster-circle';
export const DB_CLUSTER_HALO = 'pins-db-cluster-halo';
export const DB_CLUSTER_LABEL = 'pins-db-cluster-label';

const GROUP_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  warning: '#F59E0B',
  infra: '#64748B',
  positive: '#34D399',
};

const PIN_COLORS = {
  urgent: '#EF4444',
  warning: '#FBBF24',
  infra: '#60A5FA',
  positive: '#34D399',
  safeSpace: '#34D399',
  safePartner: '#F5C341',
  emergency: '#EF4444',
  emergencyResolved: '#9CA3AF',
  destination: '#34D399',
  transport: '#22D3EE',
  watchContact: '#3BB4C1',
  surface: '#1E293B',
  elevated: '#334155',
  stroke: '#FFFFFF',
};

function getEffectiveOpacity(pin: Pin): number {
  return getPinOpacityUtil(pin);
}

function getCategoryGroupId(pin: Pin): string {
  const details = CATEGORY_DETAILS[pin.category];
  return details?.group ?? 'infra';
}

function buildGeoJSON(regularPins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regularPins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: {
        id: pin.id,
        category: pin.category,
        categoryGroup: getCategoryGroupId(pin),
        confirmations: pin.confirmations ?? 1,
        opacity: getEffectiveOpacity(pin),
      },
    })),
  };
}

/** Category-based canvas pin. Draws circle with optional border + glow. */
function makeCategoryPin(
  color: string,
  displaySize: number,
  hasBorder: boolean,
  hasGlow: boolean,
): { width: number; height: number; data: Uint8Array } {
  // Canvas at 2× for HiDPI (pixelRatio:2 halves display size)
  const S = displaySize * 2;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2;
  const dotR = S * 0.30;

  // Glow shadow
  if (hasGlow) {
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 6, 0, Math.PI * 2);
    ctx.fillStyle = color + '44'; // 27% opacity glow
    ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 10, 0, Math.PI * 2);
    ctx.fillStyle = color + '22'; // 13% opacity outer glow
    ctx.fill();
  }

  // White outer ring (border)
  if (hasBorder) {
    ctx.beginPath(); ctx.arc(cx, cy, dotR + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
  }

  // White base ring
  ctx.beginPath(); ctx.arc(cx, cy, dotR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Colored dot
  ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();

  // Highlight reflection
  ctx.beginPath(); ctx.arc(cx - dotR * 0.18, cy - dotR * 0.18, dotR * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

  return { width: S, height: S, data: new Uint8Array(ctx.getImageData(0, 0, S, S).data) };
}

// Module-level handler refs
let _clusterClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let _clusterMouseEnter: (() => void) | null = null;
let _clusterMouseLeave: (() => void) | null = null;

export function addClusterLayers(m: mapboxgl.Map) {
  if (m.getSource(SOURCE_ID)) return;

  m.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40,
    clusterProperties: {
      urgent: ['+', ['case', ['==', ['get', 'categoryGroup'], 'urgent'], 1, 0]],
      warning: ['+', ['case', ['==', ['get', 'categoryGroup'], 'warning'], 1, 0]],
      infra: ['+', ['case', ['==', ['get', 'categoryGroup'], 'infra'], 1, 0]],
      positive: ['+', ['case', ['==', ['get', 'categoryGroup'], 'positive'], 1, 0]],
    },
  });

  // Cluster circle
  m.addLayer({
    id: 'clusters',
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': [
        'step', ['get', 'point_count'],
        18,
        10, 21,
        30, 24,
      ],
      'circle-color': [
        'case',
        ['>', ['get', 'urgent'], 0], '#F87171',
        ['>', ['get', 'warning'], 0], '#FBBF24',
        ['>', ['get', 'positive'], 0], '#34D399',
        '#94A3B8',
      ],
      'circle-opacity': 0.92,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.95,
      'circle-blur': 0,
    },
  });

  // Cluster halo — subtle outer ring for depth
  m.addLayer({
    id: 'clusters-halo',
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': [
        'step', ['get', 'point_count'],
        24,
        10, 27,
        30, 30,
      ],
      'circle-color': [
        'case',
        ['>', ['get', 'urgent'], 0], '#F87171',
        ['>', ['get', 'warning'], 0], '#FBBF24',
        ['>', ['get', 'positive'], 0], '#34D399',
        '#94A3B8',
      ],
      'circle-opacity': 0.15,
      'circle-stroke-width': 0,
    },
  }, 'clusters');

  // Cluster count label
  m.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
      'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
    },
    paint: { 'text-color': PIN_COLORS.stroke },
  });

  // Register category-group pin images: 4 groups × 4 tiers = 16 icons
  if (!m.hasImage('pin-urgent-sm')) {
    const tiers: [string, number, boolean, boolean][] = [
      ['sm', 14, false, false],  // 1 confirmation
      ['md', 18, false, false],  // 2-3 confirmations
      ['lg', 22, true, false],   // 4-9 confirmations (+ border)
      ['xl', 28, true, true],    // 10+ confirmations (+ border + glow)
    ];
    for (const [groupId, color] of Object.entries(GROUP_COLORS)) {
      for (const [tier, size, border, glow] of tiers) {
        m.addImage(`pin-${groupId}-${tier}`, makeCategoryPin(color, size, border, glow), { pixelRatio: 2 });
      }
    }
  }

  // DISABLED — unclustered pins now rendered as HTML markers via <MapPin> in JSX.
  // GeoJSON source kept for cluster layers only.

  // Remove previous cluster listeners before adding new ones
  if (_clusterClickHandler) m.off('click', 'clusters', _clusterClickHandler);
  if (_clusterMouseEnter) m.off('mouseenter', 'clusters', _clusterMouseEnter);
  if (_clusterMouseLeave) m.off('mouseleave', 'clusters', _clusterMouseLeave);

  // Cluster click → zoom in
  _clusterClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
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
  };

  // Cursor pointers
  _clusterMouseEnter = () => { m.getCanvas().style.cursor = 'pointer'; };
  _clusterMouseLeave = () => { m.getCanvas().style.cursor = ''; };

  m.on('click', 'clusters', _clusterClickHandler);
  m.on('mouseenter', 'clusters', _clusterMouseEnter);
  m.on('mouseleave', 'clusters', _clusterMouseLeave);

  // ── DB spatial cluster layers (zoom < 10) ──────────────────────────────────
  if (!m.getSource(DB_CLUSTER_SRC)) {
    m.addSource(DB_CLUSTER_SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Halo
    m.addLayer({
      id: DB_CLUSTER_HALO,
      type: 'circle',
      source: DB_CLUSTER_SRC,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 22, 20, 34, 100, 50],
        'circle-color': [
          'match', ['get', 'dominant_group'],
          'urgent', '#F87171',
          'warning', '#FBBF24',
          'infra', '#60A5FA',
          'positive', '#34D399',
          '#94A3B8',
        ],
        'circle-opacity': 0.18,
      },
    });

    // Main circle
    m.addLayer({
      id: DB_CLUSTER_CIRCLE,
      type: 'circle',
      source: DB_CLUSTER_SRC,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 16, 20, 26, 100, 40],
        'circle-color': [
          'match', ['get', 'dominant_group'],
          'urgent', '#F87171',
          'warning', '#FBBF24',
          'infra', '#60A5FA',
          'positive', '#34D399',
          '#94A3B8',
        ],
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.95,
      },
    });

    // Count label
    m.addLayer({
      id: DB_CLUSTER_LABEL,
      type: 'symbol',
      source: DB_CLUSTER_SRC,
      layout: {
        'text-field': ['get', 'count'],
        'text-size': 12,
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    });
  }
}

export function updateClusterData(m: mapboxgl.Map, regularPins: Pin[]) {
  const src = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (src) src.setData(buildGeoJSON(regularPins));
}

export function updateDBClusters(m: mapboxgl.Map, dbClusters: any[]) {
  const src = m.getSource(DB_CLUSTER_SRC) as mapboxgl.GeoJSONSource;
  if (src) {
    src.setData({
      type: 'FeatureCollection',
      features: dbClusters.map((cluster) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [cluster.lng, cluster.lat] },
        properties: {
          count: cluster.count,
          dominant_group: cluster.dominant_group,
        },
      })),
    });
  }
}

export function removeClusterLayers(m: mapboxgl.Map) {
  // Remove layers and sources
  const layers = ['cluster-count', 'clusters-halo', 'clusters', DB_CLUSTER_LABEL, DB_CLUSTER_CIRCLE, DB_CLUSTER_HALO];
  for (const layer of layers) {
    if (m.getLayer(layer)) m.removeLayer(layer);
  }
  if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
  if (m.getSource(DB_CLUSTER_SRC)) m.removeSource(DB_CLUSTER_SRC);

  // Clean up listeners
  if (_clusterClickHandler) m.off('click', 'clusters', _clusterClickHandler);
  if (_clusterMouseEnter) m.off('mouseenter', 'clusters', _clusterMouseEnter);
  if (_clusterMouseLeave) m.off('mouseleave', 'clusters', _clusterMouseLeave);
}