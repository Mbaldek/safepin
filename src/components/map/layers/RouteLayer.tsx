// src/components/map/layers/RouteLayer.tsx

import mapboxgl from 'mapbox-gl';

export const ROUTE_SRC = 'route-source';
export const ROUTE_LYR = 'route-line';

export function addRouteLayer(m: mapboxgl.Map, routeGeoJSON: GeoJSON.FeatureCollection | null) {
  if (!routeGeoJSON) return;

  if (!m.getSource(ROUTE_SRC)) {
    m.addSource(ROUTE_SRC, { type: 'geojson', data: routeGeoJSON });
  } else {
    (m.getSource(ROUTE_SRC) as mapboxgl.GeoJSONSource).setData(routeGeoJSON);
  }

  if (!m.getLayer(ROUTE_LYR)) {
    m.addLayer({
      id: ROUTE_LYR,
      type: 'line',
      source: ROUTE_SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#3BB4C1',
        'line-width': 6,
        'line-opacity': 0.8,
      },
    }, 'clusters-halo');
  }
}

export function removeRouteLayer(m: mapboxgl.Map) {
  if (m.getLayer(ROUTE_LYR)) m.removeLayer(ROUTE_LYR);
  if (m.getSource(ROUTE_SRC)) m.removeSource(ROUTE_SRC);
}