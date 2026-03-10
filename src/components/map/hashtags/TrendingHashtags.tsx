'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { tok } from '@/lib/tokens'
import { SAFETY_TAG_COLORS, LIEU_TAG } from '@/lib/hashtagTokens'
import { useTrendingHashtags } from '@/hooks/useHashtags'
import type { Hashtag } from '@/types'

interface Props {
  isDark:     boolean
  lat?:       number
  lng?:       number
  onTagPress: (tag: Hashtag) => void
}

export function TrendingHashtags({ isDark, lat, lng, onTagPress }: Props) {
  const tk = tok(isDark)
  const { trending, loading, fetchTrending } = useTrendingHashtags(lat, lng)

  useEffect(() => { fetchTrending() }, [fetchTrending])

  if (loading || trending.length === 0) return null

  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tk.bd}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={13} strokeWidth={1.5} color={tk.tt} />
          <span style={{ fontSize: 11, fontWeight: 700, color: tk.tt }}>Dans ton quartier</span>
        </div>
        <span style={{ fontSize: 10, color: tk.tt }}>7 jours · 2 km</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {trending.slice(0, 5).map((tag, i) => {
          const meta = SAFETY_TAG_COLORS[tag.tag] ?? LIEU_TAG
          const maxCount = trending[0]?.count ?? 1
          const pct = Math.round((tag.count / maxCount) * 100)

          return (
            <motion.button
              key={tag.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTagPress(tag)}
              style={{
                display:     'flex', alignItems: 'center', gap: 10,
                padding:     '8px 10px', borderRadius: 12,
                background:  tk.card, border: `1px solid ${tk.bd}`,
                cursor:      'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: `${meta.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>
                  #{String(i + 1)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginBottom: 3 }}>
                  {tag.display}
                </div>
                <div style={{
                  height: 3, background: tk.bd, borderRadius: 2, overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    style={{ height: '100%', background: meta.color, borderRadius: 2 }}
                  />
                </div>
                <div style={{ fontSize: 9, color: tk.tt, marginTop: 2 }}>
                  {tag.count} posts
                  {tag.tag === 'harcèlement' && tag.count > 5 && (
                    <span style={{ color: '#EF4444', marginLeft: 4 }}>zone active</span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
