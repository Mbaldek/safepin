// src/lib/geocode.ts — Shared Mapbox geocoding utilities

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Forward geocode: address string → [lng, lat] coordinates.
 */
export async function geocodeForward(
  query: string,
  proximity?: { lat: number; lng: number } | null,
): Promise<[number, number] | null> {
  try {
    const prox = proximity ? `&proximity=${proximity.lng},${proximity.lat}` : '';
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?access_token=${TOKEN}&limit=1&language=fr,en${prox}&autocomplete=true&types=poi,address,place,locality,neighborhood`,
    );
    const d = await res.json();
    return d.features?.[0]?.geometry?.coordinates ?? null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode: [lng, lat] → human-readable address string.
 */
export async function geocodeReverse(
  lng: number,
  lat: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${TOKEN}&limit=1&language=fr,en`,
    );
    const d = await res.json();
    return d.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}
