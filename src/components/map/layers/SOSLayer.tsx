// src/components/map/layers/SOSLayer.tsx

import mapboxgl from 'mapbox-gl';

export const SOS_TRAIL_SRC = 'sos-trail-source';
export const SOS_TRAIL_LYR = 'sos-trail-line';

export function addSOSTrailLayer(m: mapboxgl.Map, trailGeoJSON: GeoJSON.FeatureCollection | null) {
  if (!trailGeoJSON) return;

  if (!m.getSource(SOS_TRAIL_SRC)) {
    m.addSource(SOS_TRAIL_SRC, { type: 'geojson', data: trailGeoJSON });
  } else {
    (m.getSource(SOS_TRAIL_SRC) as mapboxgl.GeoJSONSource).setData(trailGeoJSON);
  }

  if (!m.getLayer(SOS_TRAIL_LYR)) {
    m.addLayer({
      id: SOS_TRAIL_LYR,
      type: 'line',
      source: SOS_TRAIL_SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#EF4444',
        'line-width': 4,
        'line-opacity': 0.9,
        'line-dasharray': [2, 2],
      },
    }, 'clusters-halo');
  }
}

export function removeSOSTrailLayer(m: mapboxgl.Map) {
  if (m.getLayer(SOS_TRAIL_LYR)) m.removeLayer(SOS_TRAIL_LYR);
  if (m.getSource(SOS_TRAIL_SRC)) m.removeSource(SOS_TRAIL_SRC);
}