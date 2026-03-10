// src/components/map/layers/PendingRoutesLayer.tsx

import mapboxgl from 'mapbox-gl';

export const PENDING_SRCS = ['pending-src-0', 'pending-src-1', 'pending-src-2'];
export const PENDING_LYRS = ['pending-line-0', 'pending-line-1', 'pending-line-2'];

export function addPendingRoutesLayer(m: mapboxgl.Map, pendingRoutes: any[]) {
  pendingRoutes.forEach((route, idx) => {
    if (idx >= PENDING_SRCS.length) return;

    const srcId = PENDING_SRCS[idx];
    const lyrId = PENDING_LYRS[idx];

    if (!m.getSource(srcId)) {
      m.addSource(srcId, { type: 'geojson', data: route.geojson });
    } else {
      (m.getSource(srcId) as mapboxgl.GeoJSONSource).setData(route.geojson);
    }

    if (!m.getLayer(lyrId)) {
      m.addLayer({
        id: lyrId,
        type: 'line',
        source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#F59E0B',
          'line-width': 4,
          'line-opacity': 0.7,
          'line-dasharray': [1, 1],
        },
      }, 'clusters-halo');
    }
  });
}

export function removePendingRoutesLayer(m: mapboxgl.Map) {
  PENDING_LYRS.forEach((lyrId) => {
    if (m.getLayer(lyrId)) m.removeLayer(lyrId);
  });
  PENDING_SRCS.forEach((srcId) => {
    if (m.getSource(srcId)) m.removeSource(srcId);
  });
}