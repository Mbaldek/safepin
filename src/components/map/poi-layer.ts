// src/components/map/poi-layer.ts

import mapboxgl from 'mapbox-gl';
import { PARIS_BBOX, POI_SRC, POI_CIRCLE, POI_LABEL } from './constants';

// Module-level cache so it survives style switches
let poiCache: GeoJSON.FeatureCollection | null = null;

export function getPOICache(): GeoJSON.FeatureCollection | null {
  return poiCache;
}

export function clearPOICache(): void {
  poiCache = null;
}

export async function fetchParisPOIs(): Promise<void> {
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

export function addPOILayers(m: mapboxgl.Map) {
  if (!poiCache || m.getSource(POI_SRC)) return;
  m.addSource(POI_SRC, { type: 'geojson', data: poiCache });
  m.addLayer({
    id: POI_CIRCLE,
    type: 'circle',
    source: POI_SRC,
    minzoom: 12,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 15, 7],
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
    minzoom: 13,
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

export function buildPOIFilter(show: { pharmacy: boolean; hospital: boolean; police: boolean }): mapboxgl.FilterSpecification {
  const conds: mapboxgl.FilterSpecification[] = [];
  if (show.pharmacy) conds.push(['==', ['get', 'kind'], 'pharmacy']);
  if (show.hospital) conds.push(['==', ['get', 'kind'], 'hospital']);
  if (show.police)   conds.push(['==', ['get', 'kind'], 'police']);
  if (conds.length === 0) return ['==', ['get', 'kind'], '__none__'];
  return ['any', ...conds] as mapboxgl.FilterSpecification;
}
