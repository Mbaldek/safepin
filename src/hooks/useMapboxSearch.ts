import { useState, useCallback, useRef } from 'react'
import type { MapboxSuggestion } from '@/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export function useMapboxSearch() {
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const debounceRef                   = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((query: string, proximity?: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const prox = proximity
          ? `&proximity=${proximity[0]},${proximity[1]}`
          : '&proximity=2.3522,48.8566'  // Paris fallback
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=fr&language=fr&types=place,address,poi,locality,neighborhood&autocomplete=true${prox}&limit=5`
        const res  = await fetch(url)
        const json = await res.json()
        setSuggestions(json.features ?? [])
      } catch { setSuggestions([]) }
      finally  { setLoading(false) }
    }, 320)
  }, [])

  const clear = () => setSuggestions([])

  return { suggestions, loading, search, clear }
}
