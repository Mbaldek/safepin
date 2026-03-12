// src/components/map/transit-layer.ts

import mapboxgl from 'mapbox-gl';
import { PARIS_BBOX, TRANSIT_SRC, TRANSIT_CIRCLE, TRANSIT_LABEL, KIND_EMOJI } from './constants';

// Module-level cache so it survives style switches
let transitCache: GeoJSON.FeatureCollection | null = null;

// Module-level layer event handler refs
let _transitClickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
let _transitMouseEnter: (() => void) | null = null;
let _transitMouseLeave: (() => void) | null = null;

export function getTransitCache(): GeoJSON.FeatureCollection | null {
  return transitCache;
}

export function clearTransitCache(): void {
  transitCache = null;
}

// Single Overpass request for transit stations + bus stops
export async function fetchParisTransitStations(): Promise<void> {
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

export function addTransitLayer(m: mapboxgl.Map) {
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
