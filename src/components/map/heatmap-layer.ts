// src/components/map/heatmap-layer.ts

import mapboxgl from 'mapbox-gl';
import { HEAT_SRC, HEAT_LYR } from './constants';

// Module-level cache so it survives style switches
let heatmapGeoJSON: GeoJSON.FeatureCollection | null = null;

export function getHeatmapCache(): GeoJSON.FeatureCollection | null {
  return heatmapGeoJSON;
}

export function setHeatmapCache(data: GeoJSON.FeatureCollection | null): void {
  heatmapGeoJSON = data;
}

export function clearHeatmapCache(): void {
  heatmapGeoJSON = null;
}

export function addHeatmapLayer(m: mapboxgl.Map, geojson: GeoJSON.FeatureCollection) {
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
