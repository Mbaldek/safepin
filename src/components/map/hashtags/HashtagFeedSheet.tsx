'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { tok, springConfig } from '@/lib/tokens'
import { getTagStyle } from '@/lib/hashtagTokens'
import { useHashtagFeed } from '@/hooks/useHashtags'
import type { Hashtag, ContentType } from '@/types'

type Tab = 'all' | ContentType

interface Props {
  hashtag:         Hashtag | null
  isDark:          boolean
  onClose:         () => void
  renderPost?:     (id: string) => React.ReactNode
  renderIncident?: (id: string) => React.ReactNode
  renderStory?:    (id: string) => React.ReactNode
}

export function HashtagFeedSheet({
  hashtag, isDark, onClose,
  renderPost, renderIncident, renderStory,
}: Props) {
  const tk = tok(isDark)
  const [tab, setTab] = useState<Tab>('all')
  const { items, loading, fetchFeed } = useHashtagFeed(hashtag?.id ?? null)

  useEffect(() => {
    if (hashtag) { fetchFeed(); setTab('all') }
  }, [hashtag?.id, fetchFeed])

  if (!hashtag) return null

  const style = getTagStyle(hashtag.tag, hashtag.category, isDark)

  const filtered = tab === 'all' ? items : items.filter(i => i.type === tab)

  const counts = {
    story:    items.filter(i => i.type === 'story').length,
    post:     items.filter(i => i.type === 'post').length,
    incident: items.filter(i => i.type === 'incident').length,
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'all',      label: 'Tout',      count: items.length    },
    { key: 'incident', label: 'Incidents', count: counts.incident },
    { key: 'post',     label: 'Posts',     count: counts.post     },
    { key: 'story',    label: 'Stories',   count: counts.story    },
  ]

  return (
    <motion.div
      className="sheet-glow sheet-highlight"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springConfig}
      style={{
        position:             'fixed',
        bottom:               72,
        left:                 0,
        right:                0,
        height:               '72%',
        background:           isDark ? 'rgba(51,65,85,0.88)' : 'rgba(255,255,255,0.92)',
        borderTopLeftRadius:  24,
        borderTopRightRadius: 24,
        border:               `1px solid ${tk.bd}`,
        borderBottom:         'none',
        boxShadow:            '0 -8px 32px rgba(0,0,0,0.3)',
        display:              'flex',
        flexDirection:        'column',
        overflow:             'hidden',
        zIndex:               300,
        backdropFilter:       'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
    >
      {/* Handle */}
      <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: tk.bdd }} />
      </div>

      {/* Header */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            display:     'inline-flex', alignItems: 'center', gap: 5,
            padding:     '6px 14px', borderRadius: 100,
            fontSize:    15, fontWeight: 700,
            background:  style.bg,
            color:       style.color,
            border:      `1px solid ${style.border}`,
          }}>
            {hashtag.display}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: tk.tp }}>
              {items.length} résultat{items.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 10, color: tk.tt }}>7 derniers jours · ta zone</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: tk.ih, border: `1px solid ${tk.bd}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={13} strokeWidth={2.5} color={tk.tt} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          {TABS.map(t => {
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding:     '5px 10px', borderRadius: 100,
                  fontSize:    10, fontWeight: 700,
                  fontFamily:  'inherit', cursor: 'pointer',
                  background:  isActive ? style.color : tk.ih,
                  color:       isActive ? '#fff' : tk.ts,
                  border:      `1px solid ${isActive ? style.color : tk.bd}`,
                  display:     'flex', alignItems: 'center', gap: 4,
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, minWidth: 14, height: 14,
                    borderRadius: 100, background: isActive ? 'rgba(255,255,255,0.25)' : tk.ia,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? '#fff' : tk.tt, padding: '0 3px',
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feed */}
      <div style={{
        flex: 1, overflowY: 'auto' as const, scrollbarWidth: 'none' as const,
        padding: '0 16px 16px',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: tk.tt, fontSize: 12 }}>
            Chargement…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 13, color: tk.ts }}>Aucun contenu pour ce tag</div>
            <div style={{ fontSize: 11, color: tk.tt, marginTop: 4 }}>dans ta zone · 7 jours</div>
          </div>
        )}

        {!loading && filtered.map((item) => (
          <div key={item.content_id} style={{ marginBottom: 8 }}>
            {item.type === 'incident' && renderIncident?.(item.content_id)}
            {item.type === 'post'     && renderPost?.(item.content_id)}
            {item.type === 'story'    && renderStory?.(item.content_id)}
            {!renderIncident && !renderPost && !renderStory && (
              <div style={{
                background: tk.card, border: `1px solid ${tk.bd}`,
                borderRadius: 12, padding: '10px 12px',
                fontSize: 11, color: tk.ts,
              }}>
                {item.type} · {item.content_id.slice(0, 8)}…
                <div style={{ fontSize: 9, color: tk.tt, marginTop: 2 }}>
                  {new Date(item.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
