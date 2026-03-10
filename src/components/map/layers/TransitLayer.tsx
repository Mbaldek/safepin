import mapboxgl from 'mapbox-gl';

export const TRANSIT_SRC = 'transit-source';
export const TRANSIT_CIRCLE = 'transit-circle';
export const TRANSIT_LABEL = 'transit-label';

let _data: GeoJSON.FeatureCollection | null = null;

export async function fetchParisTransitStations(): Promise<void> {
  if (_data) return;
  const query = `[out:json][timeout:15];(node["railway"="station"](48.78,2.20,48.94,2.50);node["railway"="halt"](48.78,2.20,48.94,2.50););out body;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  const json = await res.json();
  _data = {
    type: 'FeatureCollection',
    features: (json.elements ?? []).map((el: { lat: number; lon: number; tags?: Record<string, string> }) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [el.lon, el.lat] },
      properties: { name: el.tags?.name ?? '', kind: el.tags?.station === 'subway' ? 'metro' : el.tags?.railway === 'halt' ? 'rer' : 'bus' },
    })),
  };
}

export function addTransitLayer(m: mapboxgl.Map): void {
  if (m.getSource(TRANSIT_SRC)) return;
  m.addSource(TRANSIT_SRC, { type: 'geojson', data: _data ?? { type: 'FeatureCollection', features: [] } });
  m.addLayer({ id: TRANSIT_CIRCLE, type: 'circle', source: TRANSIT_SRC, paint: { 'circle-radius': 4, 'circle-color': '#6366F1', 'circle-opacity': 0.7 } });
  m.addLayer({ id: TRANSIT_LABEL, type: 'symbol', source: TRANSIT_SRC, layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.2] }, paint: { 'text-color': '#6366F1' }, minzoom: 14 });
}

export function removeTransitLayer(m: mapboxgl.Map): void {
  if (m.getLayer(TRANSIT_LABEL)) m.removeLayer(TRANSIT_LABEL);
  if (m.getLayer(TRANSIT_CIRCLE)) m.removeLayer(TRANSIT_CIRCLE);
  if (m.getSource(TRANSIT_SRC)) m.removeSource(TRANSIT_SRC);
}
