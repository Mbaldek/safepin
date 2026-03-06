import { useState, useCallback, useRef } from 'react'

export type SearchResult = {
  id:       string
  name:     string
  address:  string
  lat:      number
  lng:      number
  type:     'poi' | 'address' | 'place'
  icon:     string
  distance: number | null
}

// ── Infer icon from OSM Photon tags ──

function inferIcon(properties: Record<string, string>): string {
  const osm_key   = properties.osm_key   ?? ''
  const osm_value = properties.osm_value ?? ''
  const name      = (properties.name ?? '').toLowerCase()

  if (osm_key === 'amenity') {
    if (['restaurant','fast_food','food_court','bistro'].includes(osm_value)) return '\u{1F37D}\uFE0F'
    if (['cafe','coffee'].includes(osm_value) || name.includes('café') || name.includes('coffee')) return '\u2615'
    if (['bar','pub','nightclub'].includes(osm_value)) return '\u{1F37A}'
    if (['pharmacy','chemist'].includes(osm_value)) return '\u{1F48A}'
    if (['hospital','clinic','doctors'].includes(osm_value)) return '\u{1F3E5}'
    if (['school','university','college'].includes(osm_value)) return '\u{1F393}'
    if (['bank','atm'].includes(osm_value)) return '\u{1F3E6}'
    if (['police'].includes(osm_value)) return '\u{1F46E}'
    if (['place_of_worship'].includes(osm_value)) return '\u26EA'
    if (['cinema','theatre'].includes(osm_value)) return '\u{1F3AC}'
    if (['library'].includes(osm_value)) return '\u{1F4DA}'
    if (['gym','sports_centre'].includes(osm_value)) return '\u{1F3CB}\uFE0F'
    if (['parking'].includes(osm_value)) return '\u{1F17F}\uFE0F'
    if (['fuel','charging_station'].includes(osm_value)) return '\u26FD'
    return '\u{1F4CD}'
  }
  if (osm_key === 'shop') {
    if (['supermarket','convenience','grocery'].includes(osm_value)) return '\u{1F6D2}'
    if (['bakery'].includes(osm_value)) return '\u{1F956}'
    if (['clothes','fashion'].includes(osm_value)) return '\u{1F457}'
    if (['beauty','hairdresser'].includes(osm_value)) return '\u{1F487}'
    if (['electronics'].includes(osm_value)) return '\u{1F4F1}'
    if (['florist'].includes(osm_value)) return '\u{1F490}'
    return '\u{1F3EA}'
  }
  if (osm_key === 'tourism') {
    if (['museum','gallery'].includes(osm_value)) return '\u{1F3DB}\uFE0F'
    if (['hotel','hostel'].includes(osm_value)) return '\u{1F3E8}'
    if (['attraction','viewpoint'].includes(osm_value)) return '\u2B50'
    return '\u{1F5FA}\uFE0F'
  }
  if (osm_key === 'leisure') {
    if (['park','garden'].includes(osm_value)) return '\u{1F333}'
    if (['fitness_centre','sports_centre'].includes(osm_value)) return '\u{1F3CB}\uFE0F'
    return '\u{1F33F}'
  }
  if (osm_key === 'public_transport' || osm_key === 'railway') return '\u{1F687}'
  if (osm_key === 'highway' && osm_value === 'bus_stop') return '\u{1F68C}'
  return '\u{1F4CD}'
}

// ── Haversine distance (meters) ──

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Format distance ──

export function formatSearchDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1)} km`
}

// ── Photon search (POI + OSM addresses) ──

async function searchPhoton(
  query: string,
  userLat: number,
  userLng: number,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('lat', String(userLat))
  url.searchParams.set('lon', String(userLng))
  url.searchParams.set('limit', '6')
  url.searchParams.set('lang', 'fr')
  url.searchParams.set('bbox', '-5.5,41.0,10.0,51.5')

  const r = await fetch(url.toString(), { signal })
  if (!r.ok) return []
  const data = await r.json()

  return (data.features ?? []).map((f: any, i: number) => {
    const p = f.properties
    const [lng, lat] = f.geometry.coordinates
    const dist = haversineMeters(userLat, userLng, lat, lng)

    const parts = [
      p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street,
      p.postcode,
      p.city ?? p.town ?? p.village,
    ].filter(Boolean)
    const address = parts.join(', ')

    return {
      id:       `photon-${i}-${p.osm_id}`,
      name:     p.name ?? p.street ?? address,
      address:  address || p.name || '',
      lat,
      lng,
      type:     (p.osm_key === 'highway' || !p.name) ? 'address' as const : 'poi' as const,
      icon:     inferIcon(p),
      distance: dist,
    }
  })
}

// ── Mapbox Geocoding (precise addresses) ──

async function searchMapbox(
  query: string,
  userLat: number,
  userLng: number,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return []

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('language', 'fr')
  url.searchParams.set('country', 'fr')
  url.searchParams.set('types', 'address,poi,place,neighborhood')
  url.searchParams.set('proximity', `${userLng},${userLat}`)
  url.searchParams.set('limit', '4')

  const r = await fetch(url.toString(), { signal })
  if (!r.ok) return []
  const data = await r.json()

  return (data.features ?? []).map((f: any) => {
    const [lng, lat] = f.center
    const dist = haversineMeters(userLat, userLng, lat, lng)
    const placeType = f.place_type?.[0] ?? 'address'

    return {
      id:       `mapbox-${f.id}`,
      name:     f.text ?? f.place_name,
      address:  f.place_name ?? '',
      lat,
      lng,
      type:     placeType === 'poi' ? 'poi' as const : 'address' as const,
      icon:     placeType === 'poi' ? '\u{1F4CD}' : '\u{1F3E0}',
      distance: dist,
    }
  })
}

// ── Merge + deduplicate ──

function mergeAndDedupe(
  photon: SearchResult[],
  mapbox: SearchResult[],
): SearchResult[] {
  const all = [...photon, ...mapbox]
  const seen = new Set<string>()
  const unique: SearchResult[] = []

  for (const r of all) {
    const key = r.name.toLowerCase().replace(/\s+/g, '').slice(0, 20)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(r)
    }
  }

  return unique.sort((a, b) => {
    if (a.type === 'poi' && b.type !== 'poi') return -1
    if (b.type === 'poi' && a.type !== 'poi') return 1
    return (a.distance ?? 99999) - (b.distance ?? 99999)
  }).slice(0, 7)
}

// ── Main hook ──

export function useDestinationSearch(userLat?: number, userLng?: number) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef   = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string) => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      const { signal } = abortRef.current

      setLoading(true)

      const lat = userLat ?? 48.8566
      const lng = userLng ?? 2.3522

      try {
        const [photonRes, mapboxRes] = await Promise.allSettled([
          searchPhoton(query, lat, lng, signal),
          searchMapbox(query, lat, lng, signal),
        ])

        if (signal.aborted) return

        const photon = photonRes.status === 'fulfilled' ? photonRes.value : []
        const mapbox = mapboxRes.status === 'fulfilled' ? mapboxRes.value : []

        setResults(mergeAndDedupe(photon, mapbox))
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setResults([])
      } finally {
        if (!abortRef.current?.signal.aborted) setLoading(false)
      }
    }, 280)
  }, [userLat, userLng])

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
    setResults([])
    setLoading(false)
  }, [])

  return { search, clear, results, loading }
}
