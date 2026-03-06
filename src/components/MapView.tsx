// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState, memo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '@/stores/useTheme';
import { Pin, CATEGORY_DETAILS } from '@/types';
import type { Escorte, EscorteView } from '@/types';
import { buildScoreGeoJSON } from '@/components/NeighborhoodScoreLayer';
import { T } from '@/lib/tokens';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SafeSpaceDetailSheet from './SafeSpaceDetailSheet';
import { MapPin } from './MapPin';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Prewarm WebGL dès le chargement du module
if (typeof window !== 'undefined') {
  mapboxgl.prewarm();
}

const SOURCE_ID    = 'pins-source';
const ROUTE_SRC    = 'route-source';
const ROUTE_LYR    = 'route-line';
const PENDING_SRCS = ['pending-src-0', 'pending-src-1', 'pending-src-2'];
const PENDING_LYRS = ['pending-line-0', 'pending-line-1', 'pending-line-2'];
const WATCH_SRC    = 'watch-contacts-src';
const WATCH_CIRCLE = 'watch-contacts-circle';
const WATCH_LABEL  = 'watch-contacts-label';
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
  custom:  'mapbox://styles/matlab244/cmm6okd7v005q01s49w19fac0',
  streets: 'mapbox://styles/mapbox/streets-v12',
  light:   'mapbox://styles/mapbox/light-v11',
  dark:    'mapbox://styles/mapbox/dark-v11',
};

/** Our custom layer IDs — never hide these. */
const OWN_LAYERS = new Set([
  SOURCE_ID, 'clusters', 'clusters-halo', 'cluster-count', 'unclustered-point',
  TRANSIT_CIRCLE, TRANSIT_LABEL,
  POI_CIRCLE, POI_LABEL,
  SAFE_CIRCLE, SAFE_LABEL, SAFE_PARTNER,
  HEAT_LYR, 'safety-scores-fill',
  WATCH_CIRCLE, WATCH_LABEL,
  ROUTE_LYR,
]);

// ── Module-level handler refs for proper cleanup ────────────────────────────
let _clusterClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let _unclusteredClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let _clusterMouseEnter: (() => void) | null = null;
let _clusterMouseLeave: (() => void) | null = null;
let _unclusteredMouseEnter: (() => void) | null = null;
let _unclusteredMouseLeave: (() => void) | null = null;

let _transitClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let _transitMouseEnter: (() => void) | null = null;
let _transitMouseLeave: (() => void) | null = null;

/** Hide built-in Mapbox circle/dot layers from the base style.
 *  Keeps our own layers (OWN_LAYERS) and all text/line/fill layers. */
function hideBuiltinPOIDots(m: mapboxgl.Map) {
  const style = m.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (OWN_LAYERS.has(layer.id)) continue;
    if (layer.type === 'circle') {
      m.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  assault: '#EF4444', harassment: '#EF4444', theft: '#EF4444', following: '#EF4444',
  suspect: '#F59E0B', group: '#F59E0B', unsafe: '#F59E0B',
  lighting: '#64748B', blocked: '#64748B', closed: '#64748B',
  safe: '#34D399', help: '#34D399', presence: '#34D399',
};

const PIN_COLORS = {
  urgent:   '#EF4444',
  warning:  '#FBBF24',
  infra:    '#60A5FA',
  positive: '#34D399',
  safeSpace:   '#34D399',
  safePartner: '#F5C341',
  emergency:   '#EF4444',
  emergencyResolved: '#9CA3AF',
  destination: '#34D399',
  transport:   '#22D3EE',
  watchContact: '#3BB4C1',
  surface:  '#1E293B',
  elevated: '#334155',
  stroke:   '#FFFFFF',
};

const DECAY_HOURS: Record<string, number> = {
  assault: 24, harassment: 24, theft: 24, following: 24,
  suspect: 12, group: 6, unsafe: 48,
  lighting: 168, blocked: 168, closed: 168,
  safe: 720, help: 168, presence: 720,
};

function getPinOpacity(createdAt: string, category: string): number {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const maxHours = DECAY_HOURS[category] || 24;
  return Math.max(1 - (hoursAgo / maxHours) * 0.7, 0.3);
}

function getPinColor(category: string): string {
  return CATEGORY_COLORS[category] || '#94A3B8';
}

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
    minzoom: 13,
    paint: {
      'circle-radius': ['match', ['get', 'kind'], 'metro', 7, 'rer', 7, 'bus', 4, 5],
      'circle-color':  ['match', ['get', 'kind'], 'metro', '#3b82f6', 'rer', '#8b5cf6', 'bus', '#f59e0b', '#10b981'],
      'circle-stroke-width': ['match', ['get', 'kind'], 'bus', 1.5, 2],
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.92,
    },
  }, 'clusters-halo');
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
  }, 'clusters-halo');

  // Remove previous transit listeners before adding new ones
  if (_transitClickHandler) m.off('click', TRANSIT_CIRCLE, _transitClickHandler);
  if (_transitMouseEnter)   m.off('mouseenter', TRANSIT_CIRCLE, _transitMouseEnter);
  if (_transitMouseLeave)   m.off('mouseleave', TRANSIT_CIRCLE, _transitMouseLeave);

  // Station click → popup with name + transport type
  _transitClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
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
  };
  _transitMouseEnter = () => { m.getCanvas().style.cursor = 'pointer'; };
  _transitMouseLeave = () => { m.getCanvas().style.cursor = ''; };

  m.on('click', TRANSIT_CIRCLE, _transitClickHandler);
  m.on('mouseenter', TRANSIT_CIRCLE, _transitMouseEnter);
  m.on('mouseleave', TRANSIT_CIRCLE, _transitMouseLeave);
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
    minzoom: 14,
    paint: {
      'circle-radius': 6,
      'circle-color': ['match', ['get', 'kind'], 'pharmacy', '#10b981', 'hospital', '#ef4444', 'police', '#3b82f6', '#6b7280'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.9,
    },
  }, 'clusters-halo');
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
  }, 'clusters-halo');
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
  }, 'clusters-halo');
}

// ── Custom pin image helpers ──────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  warning: '#F59E0B',
  infra: '#64748B',
  positive: '#34D399',
};

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

/** Safe space pin: emoji inside a #6BA68E semi-transparent circle. */
const SAFE_SPACE_EMOJI: Record<string, string> = {
  pharmacy: '💊', hospital: '🏥', police: '🚔', cafe: '☕', shelter: '🏠', other: '🛡️',
};
function makeSafePin(emoji: string): { width: number; height: number; data: Uint8Array } {
  const S = 28;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(107,166,142,0.2)'; ctx.fill();
  ctx.strokeStyle = 'rgba(107,166,142,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `${Math.round(S * 0.52)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S / 2, S / 2 + 1);
  return { width: S, height: S, data: new Uint8Array(ctx.getImageData(0, 0, S, S).data) };
}

/** Compute effective opacity for a pin, accounting for last_confirmed_at. */
function getEffectiveOpacity(pin: Pin): number {
  const effectiveTime = pin.last_confirmed_at
    ? new Date(Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())).toISOString()
    : pin.created_at;
  return getPinOpacity(effectiveTime, pin.category);
}

/** Get category group id for a pin. */
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

function addClusterLayers(m: mapboxgl.Map) {
  if (m.getSource(SOURCE_ID)) return;

  m.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40,
    clusterProperties: {
      urgent:   ['+', ['case', ['==', ['get', 'categoryGroup'], 'urgent'],  1, 0]],
      warning:  ['+', ['case', ['==', ['get', 'categoryGroup'], 'warning'], 1, 0]],
      infra:    ['+', ['case', ['==', ['get', 'categoryGroup'], 'infra'],   1, 0]],
      positive: ['+', ['case', ['==', ['get', 'categoryGroup'], 'positive'],1, 0]],
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
        5,  24,
        20, 30,
      ],
      'circle-color': [
        'case',
        ['>', ['get', 'urgent'],  0], PIN_COLORS.urgent,
        ['>', ['get', 'warning'], 0], PIN_COLORS.warning,
        ['>', ['get', 'positive'],0], PIN_COLORS.positive,
        '#64748B',
      ],
      'circle-opacity': 0.92,
      'circle-stroke-width': 3,
      'circle-stroke-color': PIN_COLORS.stroke,
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
        5,  30,
        20, 38,
      ],
      'circle-color': [
        'case',
        ['>', ['get', 'urgent'],  0], PIN_COLORS.urgent,
        ['>', ['get', 'warning'], 0], PIN_COLORS.warning,
        ['>', ['get', 'positive'],0], PIN_COLORS.positive,
        '#64748B',
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
      ['lg', 22, true,  false],  // 4-9 confirmations (+ border)
      ['xl', 28, true,  true],   // 10+ confirmations (+ border + glow)
    ];
    for (const [groupId, color] of Object.entries(GROUP_COLORS)) {
      for (const [tier, size, border, glow] of tiers) {
        m.addImage(`pin-${groupId}-${tier}`, makeCategoryPin(color, size, border, glow), { pixelRatio: 2 });
      }
    }
  }

  // Individual unclustered pins — icon based on categoryGroup + confirmation tier
  m.addLayer({
    id: 'unclustered-point',
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'case',
        // urgent
        ['all', ['==', ['get', 'categoryGroup'], 'urgent'], ['>=', ['get', 'confirmations'], 10]], 'pin-urgent-xl',
        ['all', ['==', ['get', 'categoryGroup'], 'urgent'], ['>=', ['get', 'confirmations'], 4]],  'pin-urgent-lg',
        ['all', ['==', ['get', 'categoryGroup'], 'urgent'], ['>=', ['get', 'confirmations'], 2]],  'pin-urgent-md',
        ['==', ['get', 'categoryGroup'], 'urgent'], 'pin-urgent-sm',
        // warning
        ['all', ['==', ['get', 'categoryGroup'], 'warning'], ['>=', ['get', 'confirmations'], 10]], 'pin-warning-xl',
        ['all', ['==', ['get', 'categoryGroup'], 'warning'], ['>=', ['get', 'confirmations'], 4]],  'pin-warning-lg',
        ['all', ['==', ['get', 'categoryGroup'], 'warning'], ['>=', ['get', 'confirmations'], 2]],  'pin-warning-md',
        ['==', ['get', 'categoryGroup'], 'warning'], 'pin-warning-sm',
        // infra
        ['all', ['==', ['get', 'categoryGroup'], 'infra'], ['>=', ['get', 'confirmations'], 10]], 'pin-infra-xl',
        ['all', ['==', ['get', 'categoryGroup'], 'infra'], ['>=', ['get', 'confirmations'], 4]],  'pin-infra-lg',
        ['all', ['==', ['get', 'categoryGroup'], 'infra'], ['>=', ['get', 'confirmations'], 2]],  'pin-infra-md',
        ['==', ['get', 'categoryGroup'], 'infra'], 'pin-infra-sm',
        // positive
        ['all', ['==', ['get', 'categoryGroup'], 'positive'], ['>=', ['get', 'confirmations'], 10]], 'pin-positive-xl',
        ['all', ['==', ['get', 'categoryGroup'], 'positive'], ['>=', ['get', 'confirmations'], 4]],  'pin-positive-lg',
        ['all', ['==', ['get', 'categoryGroup'], 'positive'], ['>=', ['get', 'confirmations'], 2]],  'pin-positive-md',
        ['==', ['get', 'categoryGroup'], 'positive'], 'pin-positive-sm',
        // fallback
        'pin-infra-sm',
      ],
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        8,  0.35,
        11, 0.55,
        14, 0.85,
        16, 1.0,
        18, 1.1,
      ],
      'symbol-sort-key': [
        'match', ['get', 'categoryGroup'],
        'urgent',  4,
        'warning', 3,
        'infra',   2,
        'positive',1,
        0,
      ],
    },
    paint: {
      'icon-opacity': [
        'interpolate', ['linear'], ['zoom'],
        8,  0.0,
        10, 0.6,
        12, 1.0,
        22, 1.0,
      ],
    },
  });

  // Remove previous cluster listeners before adding new ones
  if (_clusterClickHandler)     m.off('click', 'clusters', _clusterClickHandler);
  if (_unclusteredClickHandler) m.off('click', 'unclustered-point', _unclusteredClickHandler);
  if (_clusterMouseEnter)       m.off('mouseenter', 'clusters', _clusterMouseEnter);
  if (_clusterMouseLeave)       m.off('mouseleave', 'clusters', _clusterMouseLeave);
  if (_unclusteredMouseEnter)   m.off('mouseenter', 'unclustered-point', _unclusteredMouseEnter);
  if (_unclusteredMouseLeave)   m.off('mouseleave', 'unclustered-point', _unclusteredMouseLeave);

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

  // Individual pin click
  _unclusteredClickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
    const pinId = e.features?.[0]?.properties?.id;
    if (!pinId) return;
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === pinId);
    if (pin) { store.setSelectedPin(pin); store.setActiveSheet('detail'); }
  };

  // Cursor pointers
  _clusterMouseEnter     = () => { m.getCanvas().style.cursor = 'pointer'; };
  _clusterMouseLeave     = () => { m.getCanvas().style.cursor = ''; };
  _unclusteredMouseEnter = () => { m.getCanvas().style.cursor = 'pointer'; };
  _unclusteredMouseLeave = () => { m.getCanvas().style.cursor = ''; };

  m.on('click', 'clusters', _clusterClickHandler);
  m.on('click', 'unclustered-point', _unclusteredClickHandler);
  m.on('mouseenter', 'clusters', _clusterMouseEnter);
  m.on('mouseleave', 'clusters', _clusterMouseLeave);
  m.on('mouseenter', 'unclustered-point', _unclusteredMouseEnter);
  m.on('mouseleave', 'unclustered-point', _unclusteredMouseLeave);
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
};

function getColors(isDark: boolean) {
  return {
    accent: isDark ? '#3BB4C1' : '#C48A1E',
  };
}

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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const departDragMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    pins, mapFilters, setSelectedPin, activeSheet, setActiveSheet, mapFlyTo, setMapFlyTo,
    setUserLocation, activeRoute, pendingRoutes, transitSegments, watchedLocations, userId,
    safeSpaces, setSafeSpaces, showSafeSpaces, mapBottomPadding,
    setTripPrefill, setActiveTab, departDragPin, setDepartDragPin,
  } = useStore(useShallow((s) => ({
    pins: s.pins, mapFilters: s.mapFilters, setSelectedPin: s.setSelectedPin,
    activeSheet: s.activeSheet, setActiveSheet: s.setActiveSheet,
    mapFlyTo: s.mapFlyTo, setMapFlyTo: s.setMapFlyTo,
    setUserLocation: s.setUserLocation, activeRoute: s.activeRoute,
    pendingRoutes: s.pendingRoutes, transitSegments: s.transitSegments,
    watchedLocations: s.watchedLocations, userId: s.userId,
    safeSpaces: s.safeSpaces, setSafeSpaces: s.setSafeSpaces,
    showSafeSpaces: s.showSafeSpaces, mapBottomPadding: s.mapBottomPadding,
    setTripPrefill: s.setTripPrefill, setActiveTab: s.setActiveTab,
    departDragPin: s.departDragPin, setDepartDragPin: s.setDepartDragPin,
  })));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const c = getColors(isDark);
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [selectedSafeSpace, setSelectedSafeSpace] = useState<import('@/types').SafeSpace | null>(null);

  const handleSafeNavigate = useCallback((lat: number, lng: number, name: string) => {
    setTripPrefill({ destination: name, destCoords: [lng, lat] });
    setActiveTab('trip');
    setSelectedSafeSpace(null);
  }, [setTripPrefill, setActiveTab]);
  const [filteredTransportPins, setFilteredTransportPins] = useState<Pin[]>([]);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const zoomRef = useRef(13);
  const prevPinIdsRef = useRef<Set<string>>(new Set());
  const dropMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const ghostTrailRef = useRef<mapboxgl.Marker[]>([]);
  const prevMapStyleRef = useRef(mapStyle); // tracks last-applied style to skip redundant setStyle
  const LABEL_ZOOM_THRESHOLD = 13;
  const effectiveLabels = showPinLabels && labelsVisible;

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: STYLE_URLS.custom,
      center: [2.3522, 48.8566],
      zoom: 13,
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
    const handleLoad = () => {
      hideBuiltinPOIDots(map.current!);
      addClusterLayers(map.current!);
      setLayersReady(true);
      setMapReady(true);
    };
    const handleZoomEnd = () => {
      if (!map.current) return;
      const z = Math.round(map.current.getZoom());
      const prev = zoomRef.current;
      zoomRef.current = z;
      // Only trigger re-render when crossing the label threshold
      const crossed = (prev < LABEL_ZOOM_THRESHOLD) !== (z < LABEL_ZOOM_THRESHOLD);
      if (crossed) setLabelsVisible(z >= LABEL_ZOOM_THRESHOLD);
    };

    map.current.on('mousedown', handleMouseDown);
    map.current.on('mouseup',   cancelLong);
    map.current.on('mousemove', cancelLong);
    map.current.on('touchend',  cancelLong);
    map.current.on('contextmenu', handleContextMenu);
    map.current.on('load', handleLoad);
    map.current.on('zoomend', handleZoomEnd);

    return () => {
      // cleanup: retire 7 listeners (mousedown, mouseup, mousemove, touchend, contextmenu, load, zoomend)
      map.current?.off('mousedown', handleMouseDown);
      map.current?.off('mouseup',   cancelLong);
      map.current?.off('mousemove', cancelLong);
      map.current?.off('touchend',  cancelLong);
      map.current?.off('contextmenu', handleContextMenu);
      map.current?.off('load', handleLoad);
      map.current?.off('zoomend', handleZoomEnd);
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

  // Center-pin for incident reporting: pin stays at map center, coords update on moveend
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const onMoveEnd = () => {
      const store = useStore.getState();
      if (store.activeSheet !== 'report') return;
      const center = m.getCenter();
      store.setNewPinCoords({ lat: center.lat, lng: center.lng });
    };

    // Set initial coords when report opens without them
    const unsub = useStore.subscribe((state, prev) => {
      if (state.activeSheet === 'report' && prev.activeSheet !== 'report') {
        if (!state.newPinCoords) {
          const center = m.getCenter();
          state.setNewPinCoords({ lat: center.lat, lng: center.lng });
        }
      }
    });

    m.on('moveend', onMoveEnd);
    return () => { m.off('moveend', onMoveEnd); unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

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

    // Fly to fit route
    const lngs = activeRoute.coords.map((c) => c[0]);
    const lats  = activeRoute.coords.map((c) => c[1]);
    m.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 60, left: 60, right: 60, bottom: 60 + mapBottomPadding }, maxZoom: 15, duration: 1200 },
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
      }, 'clusters-halo');
    });

    // Fit bounds to show all routes
    const allCoords = pendingRoutes.flatMap((r) => r.coords);
    if (allCoords.length > 0) {
      const lngs = allCoords.map((c) => c[0]);
      const lats  = allCoords.map((c) => c[1]);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 60, left: 60, right: 60, bottom: 60 + mapBottomPadding }, maxZoom: 15, duration: 1200 },
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

  // Apply mapStyle to the actual Mapbox map — re-add cluster layers + transit after style loads
  useEffect(() => {
    if (!map.current || !mapReady) return;
    // Skip if style hasn't changed — handles first run where constructor already loaded the correct style
    if (prevMapStyleRef.current === mapStyle) return;
    prevMapStyleRef.current = mapStyle;
    transitCache = null; poiCache = null; heatmapGeoJSON = null;
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
    }

    // ── Regular pins via GeoJSON clustering (exclude transport) ──────────────
    const regularPins = pins.filter((pin) => passesFilters(pin) && !pin.is_transport);

    const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildGeoJSON(regularPins));
    }

    // Pin drop animation for newly arrived pins
    const allVisiblePins = pins.filter(passesFilters);
    const currentIds = new Set(allVisiblePins.map((p) => p.id));
    const prevIds = prevPinIdsRef.current;
    if (prevIds.size > 0 && map.current && activeSheet === 'none') {
      const m = map.current;
      for (const pin of allVisiblePins) {
        if (prevIds.has(pin.id)) continue;
        const dropColor = getPinColor(pin.category);
        const el = document.createElement('div');
        el.className = 'pin-drop';
        el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${dropColor};border:2.5px solid #fff;box-shadow:0 2px 6px ${dropColor}66;pointer-events:none;`;
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pin.lng, pin.lat])
          .addTo(m);
        dropMarkersRef.current.push(marker);
        setTimeout(() => { marker.remove(); }, 800);
      }
    }
    prevPinIdsRef.current = currentIds;

    // ── Transport pins — rendered as <MapPin> in JSX ────────────────
    setFilteredTransportPins(pins.filter((pin) => passesFilters(pin) && pin.is_transport));

    // Ghost trail cleanup (kept for legacy)
    ghostTrailRef.current.forEach((m) => m.remove());
    ghostTrailRef.current = [];
  }, [pins, mapFilters, mapReady, layersReady, theme, activeSheet, setSelectedPin, setActiveSheet]);

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

    if (transitCache) {
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

    if (poiCache) {
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

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {map.current && filteredTransportPins.map((pin) => (
        <MapPin
          key={pin.id}
          map={map.current!}
          pin={pin}
          onClick={handleTransportPinClick}
          showLabels={effectiveLabels}
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
