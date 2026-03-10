// src/components/map/layers/WatchContactsLayer.tsx

import mapboxgl from 'mapbox-gl';

export const WATCH_SRC = 'watch-contacts-src';
export const WATCH_CIRCLE = 'watch-contacts-circle';
export const WATCH_LABEL = 'watch-contacts-label';

export function addWatchContactsLayer(m: mapboxgl.Map, watchedLocations: any[]) {
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: watchedLocations.map((loc) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: {
        name: loc.name || 'Contact',
        id: loc.id,
      },
    })),
  };

  if (!m.getSource(WATCH_SRC)) {
    m.addSource(WATCH_SRC, { type: 'geojson', data: geojson });
  } else {
    (m.getSource(WATCH_SRC) as mapboxgl.GeoJSONSource).setData(geojson);
  }

  if (!m.getLayer(WATCH_CIRCLE)) {
    m.addLayer({
      id: WATCH_CIRCLE,
      type: 'circle',
      source: WATCH_SRC,
      paint: {
        'circle-radius': 8,
        'circle-color': '#3BB4C1',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    }, 'clusters-halo');
  }

  if (!m.getLayer(WATCH_LABEL)) {
    m.addLayer({
      id: WATCH_LABEL,
      type: 'symbol',
      source: WATCH_SRC,
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 10,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
      },
      paint: {
        'text-color': '#3BB4C1',
        'text-halo-color': '#fff',
        'text-halo-width': 1.5,
      },
    }, 'clusters-halo');
  }
}

export function removeWatchContactsLayer(m: mapboxgl.Map) {
  if (m.getLayer(WATCH_LABEL)) m.removeLayer(WATCH_LABEL);
  if (m.getLayer(WATCH_CIRCLE)) m.removeLayer(WATCH_CIRCLE);
  if (m.getSource(WATCH_SRC)) m.removeSource(WATCH_SRC);
}