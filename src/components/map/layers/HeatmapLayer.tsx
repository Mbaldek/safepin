import mapboxgl from 'mapbox-gl';

export const HEAT_SRC = 'heatmap-source';
export const HEAT_LYR = 'heatmap-layer';

export function addHeatmapLayer(m: mapboxgl.Map, geojson: GeoJSON.FeatureCollection): void {
  if (m.getSource(HEAT_SRC)) return;
  m.addSource(HEAT_SRC, { type: 'geojson', data: geojson });
  m.addLayer({
    id: HEAT_LYR,
    type: 'heatmap',
    source: HEAT_SRC,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 1.5],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 25],
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.3, '#FDE68A', 0.6, '#F59E0B', 1, '#EF4444'],
      'heatmap-opacity': 0.6,
    },
  });
}

export function removeHeatmapLayer(m: mapboxgl.Map): void {
  if (m.getLayer(HEAT_LYR)) m.removeLayer(HEAT_LYR);
  if (m.getSource(HEAT_SRC)) m.removeSource(HEAT_SRC);
}
