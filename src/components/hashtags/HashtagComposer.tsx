'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, MapPin, X, Plus, TrendingUp } from 'lucide-react'
import { tok } from '@/lib/tokens'
import { SAFETY_TAG_COLORS, LIBRE_TAG } from '@/lib/hashtagTokens'
import { useHashtagSearch, upsertHashtag } from '@/hooks/useHashtags'
import { HashtagPill } from './HashtagPill'
import { supabase } from '@/lib/supabase'
import type { Hashtag } from '@/types'

const SAFETY_TAGS_LIST = [
  { tag: 'zonecalme',       display: '#ZoneCalme',       icon: 'Check', color: '#34D399' },
  { tag: 'trajetseul',      display: '#TrajetSolo',      icon: 'User',  color: '#A78BFA' },
  { tag: 'eclairageok',     display: '#EclairageOK',     icon: 'Sun',   color: '#34D399' },
  { tag: 'nuit',            display: '#RentréeNocturne', icon: 'Moon',  color: '#60A5FA' },
  { tag: 'harcèlement',     display: '#Harcèlement',     icon: 'Zap',   color: '#EF4444' },
  { tag: 'eclairagefaible', display: '#EclairageFaible', icon: 'Sun',   color: '#FBBF24' },
  { tag: 'soiree',          display: '#Soirée',          icon: 'Star',  color: '#F87171' },
]

interface Props {
  isDark:           boolean
  selectedTags:     Hashtag[]
  onTagsChange:     (tags: Hashtag[]) => void
  geoTag?:          string
  maxFree?:         number
  showSafetyChips?: boolean
}

export function HashtagComposer({
  isDark,
  selectedTags,
  onTagsChange,
  geoTag,
  maxFree = 5,
  showSafetyChips = true,
}: Props) {
  const tk = tok(isDark)
  const [input,        setInput]        = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { results: suggestions, search, clear } = useHashtagSearch()

  const freeTags   = selectedTags.filter(t => t.category === 'libre')
  const canAddFree = freeTags.length < maxFree

  const handleInput = (v: string) => {
    const clean = v.replace(/^#/, '')
    setInput(clean)
    if (clean.length >= 1) {
      search(clean)
      setShowDropdown(true)
    } else {
      clear()
      setShowDropdown(false)
    }
  }

  const handleAddSuggestion = (tag: Hashtag) => {
    if (selectedTags.find(t => t.id === tag.id)) return
    onTagsChange([...selectedTags, tag])
    setInput('')
    clear()
    setShowDropdown(false)
  }

  const handleCreateFree = async () => {
    if (!input.trim() || !canAddFree) return
    const tag = await upsertHashtag(input.trim(), 'libre')
    if (tag) {
      onTagsChange([...selectedTags, tag])
      setInput('')
      clear()
      setShowDropdown(false)
    }
  }

  const handleToggleSafety = async (raw: typeof SAFETY_TAGS_LIST[0]) => {
    const existing = selectedTags.find(t => t.tag === raw.tag)
    if (existing) {
      onTagsChange(selectedTags.filter(t => t.tag !== raw.tag))
      return
    }
    const { data } = await supabase
      .from('hashtags')
      .select('*')
      .eq('tag', raw.tag)
      .single()
    if (data) onTagsChange([...selectedTags, data as Hashtag])
  }

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Safety chips (liste fermée) */}
      {showSafetyChips && (
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
            letterSpacing: '.08em', color: tk.tt, marginBottom: 6,
          }}>
            Contexte safety
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
            {SAFETY_TAGS_LIST.map(raw => {
              const isSelected = !!selectedTags.find(t => t.tag === raw.tag)
              const meta = SAFETY_TAG_COLORS[raw.tag]
              return (
                <motion.button
                  key={raw.tag}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleToggleSafety(raw)}
                  style={{
                    display:     'inline-flex',
                    alignItems:  'center',
                    gap:         4,
                    padding:     '4px 10px',
                    borderRadius: 100,
                    fontSize:    11,
                    fontWeight:  600,
                    fontFamily:  'inherit',
                    cursor:      'pointer',
                    background:  isSelected ? meta?.color : (meta?.bg ?? 'transparent'),
                    color:       isSelected ? '#fff' : (meta?.color ?? raw.color),
                    border:      `1px solid ${meta?.border ?? raw.color + '40'}`,
                    transition:  'all 150ms',
                  }}
                >
                  {isSelected && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {raw.display}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lieu auto-détecté */}
      {geoTag && (
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         7,
          padding:     '7px 10px',
          background:  'rgba(59,180,193,0.06)',
          border:      '1px solid rgba(59,180,193,0.18)',
          borderRadius: 10,
        }}>
          <MapPin size={12} strokeWidth={1.5} color="#3BB4C1" />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#3BB4C1' }}>
            #{geoTag} détecté
          </span>
          <span style={{ fontSize: 10, color: tk.tt }}>Auto</span>
        </div>
      )}

      {/* Tags libres sélectionnés */}
      {freeTags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
          {freeTags.map(tag => (
            <motion.div
              key={tag.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                display:     'inline-flex',
                alignItems:  'center',
                gap:         4,
                padding:     '3px 9px',
                borderRadius: 100,
                fontSize:    11,
                fontWeight:  600,
                background:  LIBRE_TAG(isDark).bg,
                color:       LIBRE_TAG(isDark).color,
                border:      `1px solid ${LIBRE_TAG(isDark).border}`,
              }}
            >
              {tag.display}
              <button
                onClick={() => handleRemove(tag.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={10} strokeWidth={2.5} color={tk.tt} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input libre + autocomplete */}
      {canAddFree && (
        <div style={{ position: 'relative' }}>
          <div style={{
            background:   tk.card,
            border:       `1px solid ${showDropdown ? '#3BB4C1' : tk.bd}`,
            borderRadius: 11,
            padding:      '9px 12px',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            boxShadow:    showDropdown ? '0 0 0 3px rgba(59,180,193,0.10)' : 'none',
            transition:   'all 150ms',
          }}>
            <Hash size={14} strokeWidth={1.5} color={showDropdown ? '#3BB4C1' : tk.tt} />
            <input
              type="text"
              placeholder={`Ajouter un hashtag… (${freeTags.length}/${maxFree})`}
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleCreateFree() }
                if (e.key === 'Escape') { setInput(''); clear(); setShowDropdown(false) }
              }}
              onFocus={() => { if (input) setShowDropdown(true) }}
              style={{
                flex:       1,
                background: 'none',
                border:     'none',
                outline:    'none',
                fontSize:   13,
                color:      tk.tp,
                fontFamily: 'inherit',
              }}
            />
            {input && (
              <button
                onClick={() => { setInput(''); clear(); setShowDropdown(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={12} strokeWidth={2} color={tk.tt} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (suggestions.length > 0 || input.length >= 2) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  position:     'absolute',
                  top:          'calc(100% + 5px)',
                  left:         0,
                  right:        0,
                  background:   isDark ? '#243050' : '#FFFFFF',
                  border:       `1px solid ${tk.bdd}`,
                  borderRadius: 14,
                  overflow:     'hidden',
                  zIndex:       200,
                  boxShadow:    '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {suggestions.length > 0 && (
                  <div style={{
                    padding:       '6px 12px 4px',
                    fontSize:      9,
                    fontWeight:    700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.08em',
                    color:         tk.tt,
                    display:       'flex',
                    alignItems:    'center',
                    gap:           5,
                  }}>
                    <TrendingUp size={9} strokeWidth={2} />
                    Populaire dans ta zone
                  </div>
                )}

                {suggestions.map((tag, i) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddSuggestion(tag)}
                    style={{
                      width:        '100%',
                      background:   'none',
                      border:       'none',
                      borderBottom: i < suggestions.length - 1 ? `1px solid ${tk.bd}` : 'none',
                      padding:      '9px 14px',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          10,
                      cursor:       'pointer',
                      textAlign:    'left' as const,
                      fontFamily:   'inherit',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: `${SAFETY_TAG_COLORS[tag.tag]?.color ?? '#3BB4C1'}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Hash size={11} strokeWidth={1.5} color={SAFETY_TAG_COLORS[tag.tag]?.color ?? '#3BB4C1'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: SAFETY_TAG_COLORS[tag.tag]?.color ?? '#3BB4C1' }}>
                        {tag.display}
                      </div>
                      <div style={{ fontSize: 10, color: tk.tt }}>
                        {tag.uses_count > 0 ? `${tag.uses_count} posts` : 'nouveau'} · {tag.category}
                      </div>
                    </div>
                    {tag.uses_count > 100 && (
                      <span style={{
                        fontSize: 8, fontWeight: 700,
                        background: 'rgba(245,195,65,0.15)', color: '#F5C341',
                        padding: '1px 5px', borderRadius: 4,
                      }}>
                        TOP
                      </span>
                    )}
                  </button>
                ))}

                {input.trim().length >= 2 && !suggestions.find(s => s.tag === input.toLowerCase()) && (
                  <button
                    onClick={handleCreateFree}
                    style={{
                      width:      '100%', background: 'rgba(245,195,65,0.06)',
                      border:     'none', borderTop: `1px solid ${tk.bd}`,
                      padding:    '9px 14px',
                      display:    'flex', alignItems: 'center', gap: 10,
                      cursor:     'pointer', textAlign: 'left' as const, fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'rgba(245,195,65,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Plus size={12} strokeWidth={2} color="#F5C341" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F5C341' }}>
                        Créer #{input}
                      </div>
                      <div style={{ fontSize: 10, color: tk.tt }}>nouveau hashtag libre</div>
                    </div>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
