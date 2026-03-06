'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Plus, Search, Home, Briefcase, Coffee, Star, MapPin, Trash2,
} from 'lucide-react'
import { T, tok, springConfig } from '@/lib/tokens'
import { useFavoris } from '@/hooks/useFavoris'
import { useMapboxSearch } from '@/hooks/useMapboxSearch'
import { FAVORI_ICONS } from '@/lib/escorteHelpers'
import type { MapboxSuggestion } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  Home, Briefcase, Coffee, Star, MapPin,
}

const ICON_KEYS = Object.keys(FAVORI_ICONS) as (keyof typeof FAVORI_ICONS)[]

interface Props {
  userId: string
  isDark: boolean
  onClose: () => void
  onSelect?: (f: import('@/types').FavoriTrajet) => void
}

export default function FavorisManager({ userId, isDark, onClose, onSelect }: Props) {
  const d  = isDark
  const tk = tok(isDark)

  const { favoris, loading, addFavori, deleteFavori } = useFavoris(userId)
  const mapbox = useMapboxSearch()

  // Add form state
  const [adding, setAdding]       = useState(false)
  const [name, setName]           = useState('')
  const [icon, setIcon]           = useState('home')
  const [query, setQuery]         = useState('')
  const [selected, setSelected]   = useState<MapboxSuggestion | null>(null)

  const resetForm = () => {
    setName('')
    setIcon('home')
    setQuery('')
    setSelected(null)
    mapbox.clear()
    setAdding(false)
  }

  const handleAdd = async () => {
    if (!name.trim() || !selected) return
    const iconDef = FAVORI_ICONS[icon] || FAVORI_ICONS.default
    await addFavori({
      name: name.trim(),
      icon,
      dest_lat: selected.center[1],
      dest_lng: selected.center[0],
      dest_address: selected.place_name,
      color: iconDef.color,
    })
    resetForm()
  }

  const handleSearchChange = (val: string) => {
    setQuery(val)
    setSelected(null)
    mapbox.search(val)
  }

  const handleSelectSuggestion = (s: MapboxSuggestion) => {
    setSelected(s)
    setQuery(s.place_name)
    mapbox.clear()
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springConfig}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        background: d ? T.surfaceBase : T.surfaceBaseL,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: `1px solid ${tk.bd}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: d ? '#334155' : '#F1F5F9',
            border: `1px solid ${d ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={14} strokeWidth={2} color={d ? '#94A3B8' : '#64748B'} />
        </button>
        <h2 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: d ? T.textPrimary : T.textPrimaryL,
        }}>
          Mes favoris
        </h2>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: tk.ts, fontSize: 13 }}>
            Chargement...
          </div>
        ) : favoris.length === 0 && !adding ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <MapPin size={32} color={tk.ts} strokeWidth={1.5} />
            <p style={{ color: tk.ts, fontSize: 13, marginTop: 8 }}>
              Aucun favori enregistre
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {favoris.map((f) => {
                const iconDef = FAVORI_ICONS[f.icon] || FAVORI_ICONS.default
                const IconComp = ICON_MAP[iconDef.icon] || MapPin
                return (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      border: `1px solid ${tk.bd}`,
                      borderRadius: T.radiusMd,
                      cursor: onSelect ? 'pointer' : undefined,
                    }}
                    onClick={() => onSelect?.(f)}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: iconDef.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconComp size={18} strokeWidth={1.5} color={iconDef.color} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: d ? T.textPrimary : T.textPrimaryL,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.name}
                      </div>
                      <div style={{
                        fontSize: 11, color: tk.ts, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.dest_address}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFavori(f.id) }}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: T.semanticDangerSoft,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.5} color={T.semanticDanger} />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: 16, overflow: 'hidden' }}
            >
              <div style={{
                padding: 16,
                background: d ? T.surfaceCard : T.surfaceCardL,
                border: `1px solid ${tk.bd}`,
                borderRadius: T.radiusMd,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Name */}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du favori"
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: d ? T.surfaceBase : '#F1F5F9',
                    border: `1px solid ${tk.bd}`,
                    borderRadius: 10, color: d ? T.textPrimary : T.textPrimaryL,
                    fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  }}
                />

                {/* Icon picker */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {ICON_KEYS.map((key) => {
                    const def = FAVORI_ICONS[key]
                    const Ic = ICON_MAP[def.icon] || MapPin
                    const active = icon === key
                    return (
                      <button
                        key={key}
                        onClick={() => setIcon(key)}
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: active ? `${def.color}20` : (d ? T.surfaceBase : '#F1F5F9'),
                          border: active ? `2px solid ${def.color}` : `1px solid ${tk.bd}`,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Ic size={18} strokeWidth={1.5} color={active ? def.color : tk.ts} />
                      </button>
                    )
                  })}
                </div>

                {/* Address search */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px',
                    background: d ? T.surfaceBase : '#F1F5F9',
                    border: `1px solid ${tk.bd}`,
                    borderRadius: 10,
                  }}>
                    <Search size={14} strokeWidth={1.5} color={tk.ts} />
                    <input
                      value={query}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Rechercher une adresse"
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        color: d ? T.textPrimary : T.textPrimaryL,
                        fontSize: 13, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  </div>

                  {/* Suggestions */}
                  {mapbox.suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      zIndex: 10, marginTop: 4,
                      background: d ? T.surfaceElevated : '#FFFFFF',
                      border: `1px solid ${tk.bd}`,
                      borderRadius: 10, overflow: 'hidden',
                      boxShadow: T.shadowLg,
                    }}>
                      {mapbox.suggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSuggestion(s)}
                          style={{
                            width: '100%', padding: '10px 12px',
                            background: 'transparent', border: 'none',
                            borderBottom: `1px solid ${tk.bd}`,
                            cursor: 'pointer', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <MapPin size={13} strokeWidth={1.5} color={tk.ts} />
                          <span style={{
                            fontSize: 12, color: d ? T.textPrimary : T.textPrimaryL,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {s.place_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected address indicator */}
                {selected && (
                  <div style={{
                    fontSize: 11, color: T.semanticSuccess,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <MapPin size={12} strokeWidth={1.5} />
                    {selected.place_name}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={resetForm}
                    style={{
                      flex: 1, padding: '10px',
                      background: 'transparent',
                      border: `1px solid ${tk.bd}`,
                      borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      color: d ? T.textSecondary : T.textSecondaryL,
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!name.trim() || !selected}
                    style={{
                      flex: 1, padding: '10px',
                      background: (!name.trim() || !selected) ? (d ? T.interactiveHover : '#E2E8F0') : T.gradientStart,
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                      color: (!name.trim() || !selected) ? tk.ts : '#FFFFFF',
                      opacity: (!name.trim() || !selected) ? 0.5 : 1,
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Add button */}
      {!adding && (
        <div style={{
          padding: '12px 20px 20px',
          borderTop: `1px solid ${tk.bd}`,
          flexShrink: 0,
        }}>
          <button
            onClick={() => setAdding(true)}
            style={{
              width: '100%', padding: '12px',
              background: `${T.gradientStart}15`,
              border: `1px solid ${T.gradientStart}30`,
              borderRadius: 14, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              color: T.gradientStart,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Plus size={18} strokeWidth={1.5} />
            Ajouter un favori
          </button>
        </div>
      )}
    </motion.div>
  )
}
