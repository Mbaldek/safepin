import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Hashtag, ContentType } from '@/types'

// ── Fetch trending tags par zone géographique ──────────────────
export function useTrendingHashtags(lat?: number, lng?: number, radiusKm = 2) {
  const [trending, setTrending] = useState<(Hashtag & { count: number })[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetchTrending = useCallback(async () => {
    setLoading(true)
    try {
      const latDelta = radiusKm / 111
      const lngDelta = radiusKm / (111 * Math.cos((lat ?? 48.8566) * Math.PI / 180))

      const { data } = await supabase
        .from('content_hashtags')
        .select('hashtag_id, hashtags(id, tag, category, display, color, icon, uses_count)')
        .gte('lat', (lat ?? 48.8566) - latDelta)
        .lte('lat', (lat ?? 48.8566) + latDelta)
        .gte('lng', (lng ?? 2.3522) - lngDelta)
        .lte('lng', (lng ?? 2.3522) + lngDelta)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())

      if (!data) { setTrending([]); return }

      const counts: Record<string, { tag: Hashtag; count: number }> = {}
      data.forEach((row: Record<string, unknown>) => {
        const h = row.hashtags as unknown as Hashtag
        if (!h) return
        if (!counts[h.id]) counts[h.id] = { tag: h, count: 0 }
        counts[h.id].count++
      })

      const sorted = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(({ tag, count }) => ({ ...tag, count }))

      setTrending(sorted)
    } catch (e) {
      console.warn('useTrendingHashtags:', e)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, radiusKm])

  return { trending, loading, fetchTrending }
}

// ── Autocomplétion hashtags ────────────────────────────────────
export function useHashtagSearch() {
  const [results,  setResults]  = useState<Hashtag[]>([])
  const [loading,  setLoading]  = useState(false)
  const debounceRef             = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('hashtags')
          .select('*')
          .ilike('tag', `%${query.toLowerCase()}%`)
          .order('uses_count', { ascending: false })
          .limit(6)
        setResults(data ?? [])
      } catch { setResults([]) }
      finally  { setLoading(false) }
    }, 280)
  }, [])

  const clear = () => setResults([])
  return { results, loading, search, clear }
}

// ── Créer ou récupérer un hashtag ─────────────────────────────
export async function upsertHashtag(
  tag: string,
  category: 'libre' | 'lieu' = 'libre'
): Promise<Hashtag | null> {
  const normalized = tag.toLowerCase().trim()
  const display    = '#' + tag.charAt(0).toUpperCase() + tag.slice(1)

  const { data, error } = await supabase
    .from('hashtags')
    .upsert({ tag: normalized, category, display }, { onConflict: 'tag' })
    .select()
    .single()

  if (error) { console.warn('upsertHashtag:', error); return null }
  return data
}

// ── Attacher des hashtags à un contenu ────────────────────────
export async function attachHashtags(params: {
  tags:         Hashtag[]
  contentType:  ContentType
  contentId:    string
  userId:       string
  lat?:         number
  lng?:         number
}) {
  if (!params.tags.length) return

  const rows = params.tags.map(t => ({
    hashtag_id:   t.id,
    content_type: params.contentType,
    content_id:   params.contentId,
    user_id:      params.userId,
    lat:          params.lat ?? null,
    lng:          params.lng ?? null,
  }))

  const { error } = await supabase
    .from('content_hashtags')
    .insert(rows)

  if (error) console.warn('attachHashtags:', error)

  await Promise.all(
    params.tags.map(t =>
      supabase.rpc('increment_hashtag_count', { tag_id: t.id }).then(() => {})
    )
  )
}

// ── Fetch feed filtré par hashtag ──────────────────────────────
export function useHashtagFeed(hashtagId: string | null) {
  const [items,   setItems]   = useState<{
    type: ContentType
    content_id: string
    created_at: string
  }[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFeed = useCallback(async () => {
    if (!hashtagId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('content_hashtags')
        .select('content_type, content_id, created_at')
        .eq('hashtag_id', hashtagId)
        .order('created_at', { ascending: false })
        .limit(30)
      setItems(data?.map(d => ({
        type: d.content_type as ContentType,
        content_id: d.content_id,
        created_at: d.created_at,
      })) ?? [])
    } catch { setItems([]) }
    finally  { setLoading(false) }
  }, [hashtagId])

  return { items, loading, fetchFeed }
}
