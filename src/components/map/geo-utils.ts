// src/components/map/geo-utils.ts

import mapboxgl from 'mapbox-gl';
import type { Pin } from '@/types';
import { OWN_LAYERS, SAFETY_FILTER_MAP } from './constants';
import { getEffectiveOpacity, getCategoryGroupId } from './pin-renderer';

export function buildGeoJSON(regularPins: Pin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regularPins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: {
        id: pin.id,
        category: pin.category,
        categoryGroup: getCategoryGroupId(pin),
        confirmations: pin.confirmations ?? 1,
        opacity: getEffectiveOpacity(pin),
      },
    })),
  };
}

export function pinMatchesSafetyFilter(pin: { category: string; is_emergency?: boolean }, filter: string): boolean {
  const key = filter.toLowerCase();
  const categories = SAFETY_FILTER_MAP[key];
  if (!categories) return false;
  if (categories.includes('__sos__')) return !!pin.is_emergency;
  return categories.includes(pin.category);
}

export function getColors(isDark: boolean) {
  return {
    accent: isDark ? '#3BB4C1' : '#C48A1E',
  };
}

/** Hide built-in Mapbox circle/dot layers from the base style.
 *  Keeps our own layers (OWN_LAYERS) and all text/line/fill layers. */
export function hideBuiltinPOIDots(m: mapboxgl.Map) {
  const style = m.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (OWN_LAYERS.has(layer.id)) continue;
    if (layer.type === 'circle') {
      m.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  }
}
