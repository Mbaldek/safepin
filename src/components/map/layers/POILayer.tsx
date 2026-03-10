import mapboxgl from 'mapbox-gl';

export const POI_SRC = 'poi-source';
export const POI_CIRCLE = 'poi-circle';
export const POI_LABEL = 'poi-label';

let _data: GeoJSON.FeatureCollection | null = null;

export async function fetchParisPOIs(): Promise<void> {
  if (_data) return;
  const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](48.78,2.20,48.94,2.50);node["amenity"="hospital"](48.78,2.20,48.94,2.50);node["amenity"="police"](48.78,2.20,48.94,2.50););out body;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  const json = await res.json();
  _data = {
    type: 'FeatureCollection',
    features: (json.elements ?? []).map((el: { lat: number; lon: number; tags?: Record<string, string> }) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [el.lon, el.lat] },
      properties: { name: el.tags?.name ?? '', kind: el.tags?.amenity ?? 'pharmacy' },
    })),
  };
}

export function addPOILayers(m: mapboxgl.Map): void {
  if (m.getSource(POI_SRC)) return;
  m.addSource(POI_SRC, { type: 'geojson', data: _data ?? { type: 'FeatureCollection', features: [] } });
  m.addLayer({ id: POI_CIRCLE, type: 'circle', source: POI_SRC, paint: { 'circle-radius': 5, 'circle-color': ['match', ['get', 'kind'], 'pharmacy', '#10B981', 'hospital', '#EF4444', 'police', '#3B82F6', '#94A3B8'], 'circle-opacity': 0.8 } });
  m.addLayer({ id: POI_LABEL, type: 'symbol', source: POI_SRC, layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.2] }, paint: { 'text-color': '#475569' }, minzoom: 14 });
}

export function removePOILayers(m: mapboxgl.Map): void {
  if (m.getLayer(POI_LABEL)) m.removeLayer(POI_LABEL);
  if (m.getLayer(POI_CIRCLE)) m.removeLayer(POI_CIRCLE);
  if (m.getSource(POI_SRC)) m.removeSource(POI_SRC);
}

export function buildPOIFilter(show: { pharmacy: boolean; hospital: boolean; police: boolean }): mapboxgl.FilterSpecification {
  const conds: mapboxgl.FilterSpecification[] = [];
  if (show.pharmacy) conds.push(['==', ['get', 'kind'], 'pharmacy']);
  if (show.hospital) conds.push(['==', ['get', 'kind'], 'hospital']);
  if (show.police) conds.push(['==', ['get', 'kind'], 'police']);
  if (conds.length === 0) return ['literal', false] as unknown as mapboxgl.FilterSpecification;
  return ['any', ...conds] as unknown as mapboxgl.FilterSpecification;
}
