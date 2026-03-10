import mapboxgl from 'mapbox-gl';

export const SAFE_SRC = 'safe-spaces-src';
export const SAFE_CIRCLE = 'safe-spaces-circle';
export const SAFE_PARTNER = 'safe-spaces-partner';
export const SAFE_LABEL = 'safe-spaces-label';

export function addSafeSpacesLayer(m: mapboxgl.Map): void {
  if (m.getSource(SAFE_SRC)) return;
  m.addSource(SAFE_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  m.addLayer({ id: SAFE_CIRCLE, type: 'circle', source: SAFE_SRC, filter: ['!', ['get', 'isPartner']], paint: { 'circle-radius': 6, 'circle-color': '#34D399', 'circle-opacity': 0.7 } });
  m.addLayer({ id: SAFE_PARTNER, type: 'circle', source: SAFE_SRC, filter: ['get', 'isPartner'], paint: { 'circle-radius': 8, 'circle-color': '#F5C341', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });
  m.addLayer({ id: SAFE_LABEL, type: 'symbol', source: SAFE_SRC, layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.4] }, paint: { 'text-color': '#34D399' }, minzoom: 14 });
}

export function removeSafeSpacesLayer(m: mapboxgl.Map): void {
  if (m.getLayer(SAFE_LABEL)) m.removeLayer(SAFE_LABEL);
  if (m.getLayer(SAFE_PARTNER)) m.removeLayer(SAFE_PARTNER);
  if (m.getLayer(SAFE_CIRCLE)) m.removeLayer(SAFE_CIRCLE);
  if (m.getSource(SAFE_SRC)) m.removeSource(SAFE_SRC);
}
