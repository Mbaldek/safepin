'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Send, Home, Navigation, Search, Shield, Clock,
  ChevronLeft, ChevronRight, Check, AlertTriangle, Share2,
  Star, MapPin, Zap, Mic, X, MoreHorizontal, Briefcase, Sparkles,
  Footprints, Train, Bike, Car
} from 'lucide-react'
import { T, tok, springConfig, gentleSpring } from '@/lib/tokens'
import { useEscorte }       from '@/hooks/useEscorte'
import { useFavoris }       from '@/hooks/useFavoris'
import { useRecents }       from '@/hooks/useRecents'
import { useMapboxSearch }  from '@/hooks/useMapboxSearch'
import { ContactRow }       from './escorte/ContactRow'
import { FavoriButton }     from './escorte/FavoriButton'
import {
  formatElapsed, formatCountdown, calcETA, calcDist, avatarColor
} from '@/lib/escorteHelpers'
import FavorisManager from './FavorisManager'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import type { FavoriTrajet, MapboxSuggestion, RouteMode } from '@/types'

const AudioChannel = dynamic(() => import('./escorte/AudioChannel'), { ssr: false })

interface Props {
  userId:    string
  isDark:    boolean
  userLat?:  number
  userLng?:  number
  onClose:   () => void
}

export default function EscorteSheet({ userId, isDark, userLat, userLng, onClose }: Props) {
  const d  = isDark
  const tk = tok(isDark)

  // ── Hooks ──────────────────────────────────────
  const escorte    = useEscorte(userId)
  const { favoris } = useFavoris(userId)
  const { recents } = useRecents(userId)
  const mapbox      = useMapboxSearch()

  // ── Local state ────────────────────────────────
  const [query,       setQuery]       = useState('')
  const [selectedDest, setSelectedDest] = useState<MapboxSuggestion | null>(null)
  const [routeMode,   setRouteMode]   = useState<RouteMode>('walk')
  const [withCircle,  setWithCircle]  = useState(true)
  const [showFavoris, setShowFavoris] = useState(false)
  const [sosSent, setSosSent] = useState(false)

  // ── Share position link ────────────────────────
  const handleShare = useCallback(async () => {
    if (!escorte.activeEscorte) return
    const url = `https://breveil.app/track/${escorte.activeEscorte.id}`
    if (navigator.share) {
      await navigator.share({
        title: 'Je suis en route',
        text: 'Suis ma position en direct',
        url,
      }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Lien copié !')
    }
  }, [escorte.activeEscorte])

  // ── SOS with visual feedback ───────────────────
  const handleSOS = useCallback(async () => {
    if (sosSent) return
    setSosSent(true)
    await escorte.triggerSOS()
    setTimeout(() => setSosSent(false), 3000)
  }, [escorte, sosSent])

  // ── Sheet height per view ──────────────────────
  const sheetHeights: Record<string, string> = {
    'hub':              '68%',
    'escorte-intro':    '80%',
    'escorte-notifying':'72%',
    'escorte-live':     '0%',
    'trip-form':        '82%',
    'trip-active':      '52%',
    'arrived':          '62%',
  }

  const sheetH = sheetHeights[escorte.view] ?? '60%'

  // ── Search handler ─────────────────────────────
  const handleSearch = (v: string) => {
    setQuery(v)
    setSelectedDest(null)
    mapbox.search(v, userLng && userLat ? [userLng, userLat] : undefined)
  }

  const handleSuggestionSelect = (s: MapboxSuggestion) => {
    setSelectedDest(s)
    setQuery(s.place_name)
    mapbox.clear()
  }

  const handleFavoriSelect = (f: FavoriTrajet) => {
    setSelectedDest({
      id:          f.id,
      place_name:  f.dest_address,
      text:        f.name,
      center:      [f.dest_lng, f.dest_lat],
      place_type:  ['favorite'],
    })
    setQuery(f.name)
    escorte.setView('trip-form')
  }

  // ── Trip launch ────────────────────────────────
  const handleStartTrip = async () => {
    if (!selectedDest) return
    const [lng, lat] = selectedDest.center
    const distKm = userLat && userLng
      ? calcDist(userLat, userLng, lat, lng)
      : 1.5
    await escorte.startTrip({
      destName:    selectedDest.text,
      destLat:     lat,
      destLng:     lng,
      destAddress: selectedDest.place_name,
      routeMode,
      etaMinutes:  calcETA(distKm),
      withCircle,
    })
  }

  // ── Shared styles ──────────────────────────────
  const cardSt = {
    background:   d ? T.surfaceCard : T.surfaceCardL,
    border:       `1px solid ${tk.bd}`,
    borderRadius: T.radiusLg,
  }
  const btnPrimary = {
    width:          '100%',
    padding:        '15px 20px',
    background:     d ? '#FFFFFF' : '#0F172A',
    color:          d ? '#0F172A' : '#FFFFFF',
    fontFamily:     'inherit',
    fontSize:       '15px',
    fontWeight:     600,
    border:         'none',
    borderRadius:   T.radius2xl,
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '8px',
  } as React.CSSProperties

  // ─────────────────────────────────────────────
  //  RENDER VIEWS
  // ─────────────────────────────────────────────

  // ── VIEW : HUB ────────────────────────────────
  const renderHub = () => (
    <motion.div
      key="hub"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: tk.tp, marginBottom: 2 }}>
            Mon escorte
          </div>
          <div style={{ fontSize: 12, color: tk.tt, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} strokeWidth={1.5} color={tk.tt} />
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Paris
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: tk.ih, border: `1px solid ${tk.bd}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={12} strokeWidth={2.5} color={tk.tt} />
        </button>
      </div>

      {/* CTA 1 — Escorte immediate */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => escorte.setView('escorte-intro')}
        style={{
          width:          '100%',
          background:     d ? 'rgba(59,180,193,0.08)' : 'rgba(59,180,193,0.07)',
          border:         `1px solid ${T.gradientStart}35`,
          borderRadius:   T.radiusLg,
          padding:        '14px',
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          cursor:         'pointer',
          marginBottom:   8,
          textAlign:      'left',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: 'rgba(59,180,193,0.14)', border: `1px solid ${T.gradientStart}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={20} strokeWidth={1.5} color={T.gradientStart} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tk.tp, marginBottom: 2 }}>
            Escorte immediate
          </div>
          <div style={{ fontSize: 11, color: tk.tt }}>Ton cercle alerte · sans destination</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
          background: 'rgba(59,180,193,0.10)', border: `1px solid ${T.gradientStart}30`,
          borderRadius: 100, padding: '4px 8px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.gradientStart }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: T.gradientStart }}>1 TAP</span>
        </div>
      </motion.button>

      {/* CTA 2 — Trajet destination */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => escorte.setView('trip-form')}
        style={{
          width: '100%', background: tk.ih, border: `1px solid ${tk.bd}`,
          borderRadius: T.radiusLg, padding: '14px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', marginBottom: 12, textAlign: 'left',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: tk.ih, border: `1px solid ${tk.bdd}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Navigation size={20} strokeWidth={1.5} color={tk.ts} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: tk.tp, marginBottom: 2 }}>
            Trajet avec destination
          </div>
          <div style={{ fontSize: 11, color: tk.tt }}>Itineraire escorte · arrivee tracee</div>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} color={tk.tt} />
      </motion.button>

      <div style={{ height: 1, background: tk.bd, margin: '0 0 10px' }} />

      {/* Recents */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tk.tt }}>
          Recents
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: T.gradientStart, cursor: 'pointer' }}>
          Voir tout
        </span>
      </div>

      {recents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: tk.tt }}>
          Aucun trajet recent
        </div>
      ) : recents.slice(0, 3).map(r => (
        <motion.button
          key={r.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (r.dest_lat && r.dest_lng) {
              setSelectedDest({
                id:         r.id,
                place_name: r.dest_address ?? r.dest_name,
                text:       r.dest_name,
                center:     [r.dest_lng, r.dest_lat],
                place_type: ['recent'],
              })
              setQuery(r.dest_name)
              escorte.setView('trip-form')
            }
          }}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 8px', borderRadius: 12, marginBottom: 2, textAlign: 'left',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: tk.ih, border: `1px solid ${tk.bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={13} strokeWidth={1.5} color={tk.tt} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: tk.tp }}>{r.dest_name}</div>
            <div style={{ fontSize: 10, color: tk.tt, marginTop: 1 }}>
              {new Date(r.used_at).toLocaleDateString('fr-FR', { weekday: 'short' })}
              {r.duration_min ? ` · ${r.duration_min} min` : ''}
            </div>
          </div>
          <ChevronRight size={12} strokeWidth={1.5} color={tk.tt} />
        </motion.button>
      ))}

      {/* Favoris row */}
      <div style={{ height: 1, background: tk.bd, margin: '8px 0' }} />
      <button
        onClick={() => setShowFavoris(true)}
        style={{
          width: '100%', background: 'rgba(245,195,65,0.06)',
          border: '1px solid rgba(245,195,65,0.18)', borderRadius: 12,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <Star size={14} strokeWidth={1.5} color={T.accentGold} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.accentGold, textAlign: 'left' }}>
          Mes favoris
        </span>
        {favoris.length > 0 && (
          <span style={{ background: 'rgba(245,195,65,0.15)', color: T.accentGold, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>
            {favoris.length}
          </span>
        )}
        <ChevronRight size={12} strokeWidth={1.5} color={T.accentGold} />
      </button>
    </motion.div>
  )

  // ── VIEW : ESCORTE INTRO ───────────────────────
  const renderEscorteIntro = () => (
    <motion.div
      key="escorte-intro"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => escorte.setView('hub')} style={{
          width: 30, height: 30, borderRadius: '50%', background: tk.ih,
          border: `1px solid ${tk.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronLeft size={14} strokeWidth={2} color={tk.ts} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tk.tp }}>Escorte immediate</div>
          <div style={{ fontSize: 11, color: tk.tt }}>Ton cercle alerte instantanement</div>
        </div>
      </div>

      {/* 3 niveaux */}
      {[
        {
          level: 'NIVEAU 1', color: T.accentGold, bg: 'rgba(245,195,65,0.10)',
          icon: <AlertTriangle size={14} strokeWidth={1.5} color={T.accentGold} />,
          title: 'Notification push',
          desc: 'Tout le cercle recoit une alerte. En 1 tap, ils te suivent sur la carte.',
          badge: null,
        },
        {
          level: 'NIVEAU 2', color: T.gradientStart, bg: 'rgba(59,180,193,0.10)',
          icon: <Mic size={14} strokeWidth={1.5} color={T.gradientStart} />,
          title: 'Canal audio prive',
          desc: 'Ils rejoignent une room audio. Vous parlez ensemble en direct.',
          badge: null,
        },
        {
          level: 'SI PERSONNE (2 min)', color: T.accentPurple, bg: 'rgba(167,139,250,0.10)',
          icon: <Zap size={14} strokeWidth={1.5} color={T.accentPurple} />,
          title: 'Julia te rejoint',
          desc: "L'IA Julia reste avec toi jusqu'a ton arrivee.",
          badge: 'BIENTOT',
        },
      ].map((item, i) => (
        <div key={i} style={{ ...cardSt, padding: '12px 14px', display: 'flex', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: item.bg, border: `1px solid ${item.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: item.color, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {item.level}
              </span>
              {item.badge && (
                <span style={{ fontSize: 8, fontWeight: 700, color: T.accentPurple, background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                  {item.badge}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.tp, marginBottom: 2 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: tk.ts, lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        </div>
      ))}

      {/* Circle preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '0 2px' }}>
        <span style={{ fontSize: 12, color: tk.ts, flexShrink: 0 }}>Ton cercle :</span>
        <div style={{ display: 'flex' }}>
          {['Marie','Tom','Alex','Sara'].map((name, i) => {
            const col = avatarColor(name)
            return (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${col}25`, border: `2px solid ${d ? T.surfaceElevated : '#fff'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: col,
                marginLeft: i > 0 ? -9 : 0,
              }}>
                {name[0]}
              </div>
            )
          })}
        </div>
        <span style={{ fontSize: 12, color: tk.ts }}>4 personnes</span>
      </div>

      <button style={btnPrimary} onClick={escorte.startEscorteImmediate}>
        <Users size={15} strokeWidth={2} />
        Notifier mon cercle
      </button>
    </motion.div>
  )

  // ── VIEW : NOTIFYING ──────────────────────────
  const renderNotifying = () => {
    const hasResponded = escorte.circleMembers.some(
      m => m.status === 'following' || m.status === 'vocal'
    )
    const activeCount = escorte.circleMembers.filter(
      m => m.status === 'following' || m.status === 'vocal'
    ).length
    const juliaSoon = escorte.juliaCd < 30

    return (
      <motion.div
        key="notifying"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={springConfig}
        style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
      >
        {/* Pulsing icon */}
        <div style={{ position: 'relative', height: 76, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
          {[1,2].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.6+i*0.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              style={{
                position: 'absolute', width: 64, height: 64, borderRadius: '50%',
                background: T.gradientStart, opacity: 0.15,
              }}
            />
          ))}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', position: 'relative', zIndex: 1,
            background: 'rgba(59,180,193,0.12)', border: `1px solid ${T.gradientStart}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={28} strokeWidth={1.5} color={T.gradientStart} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tk.tp, marginBottom: 4 }}>
            {hasResponded ? `${activeCount} contact${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}` : 'Notification envoyee'}
          </div>
          <div style={{ fontSize: 12, color: tk.ts }}>
            {hasResponded ? "Ton cercle t'accompagne" : 'En attente de reponse'}
          </div>
        </div>

        {/* Julia countdown */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{
            background:   juliaSoon ? 'rgba(167,139,250,0.12)' : 'rgba(245,195,65,0.10)',
            border:       `1px solid ${juliaSoon ? T.accentPurple : T.accentGold}35`,
            borderRadius: 100, padding: '5px 12px',
            fontSize: 11, fontWeight: 500,
            color: juliaSoon ? T.accentPurple : T.accentGold,
          }}>
            {escorte.juliaCd > 0
              ? `Julia rejoint dans ${formatCountdown(escorte.juliaCd)}`
              : 'Julia est dans le canal'}
          </div>
        </div>

        {/* Contacts list */}
        {escorte.circleMembers.length > 0 && (
          <div style={{ ...cardSt, borderRadius: T.radiusLg, overflow: 'hidden', marginBottom: 12 }}>
            {escorte.circleMembers.map((m, i) => (
              <ContactRow
                key={m.id}
                member={m}
                isDark={d}
                showBorder={i < escorte.circleMembers.length - 1}
              />
            ))}
          </div>
        )}

        <button style={btnPrimary} onClick={() => escorte.setView('escorte-live')}>
          <Check size={15} strokeWidth={2.5} />
          {hasResponded ? 'Continuer' : 'Demarrer sans attendre'}
        </button>

        <button
          onClick={() => { escorte.endEscorte(); }}
          style={{ width: '100%', padding: '11px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: tk.tt, marginTop: 4 }}
        >
          Annuler
        </button>
      </motion.div>
    )
  }

  // ── VIEW : TRIP FORM ──────────────────────────
  const renderTripForm = () => (
    <motion.div
      key="trip-form"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => { escorte.setView('hub'); setSelectedDest(null); setQuery('') }} style={{
          width: 30, height: 30, borderRadius: '50%', background: tk.ih,
          border: `1px solid ${tk.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronLeft size={14} strokeWidth={2} color={tk.ts} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tk.tp }}>Trajet avec destination</div>
          <div style={{ fontSize: 11, color: tk.tt }}>Escorte par ton cercle</div>
        </div>
      </div>

      {/* Depart */}
      <div style={{
        ...cardSt, padding: '10px 12px', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.semanticSuccess, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: tk.ts }}>Ma position actuelle</span>
      </div>

      {/* Search */}
      <div style={{
        ...cardSt, padding: '10px 12px', marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
        border: selectedDest ? `1px solid ${T.gradientStart}45` : `1px solid ${tk.bd}`,
        boxShadow: selectedDest ? `0 0 0 3px ${T.gradientStart}12` : 'none',
      }}>
        <Search size={15} strokeWidth={1.5} color={selectedDest ? T.gradientStart : tk.tt} />
        <input
          type="text"
          placeholder="Rechercher une destination..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, fontWeight: selectedDest ? 500 : 400,
            color: selectedDest ? T.gradientStart : tk.ts, fontFamily: 'inherit',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setSelectedDest(null); mapbox.clear() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={13} strokeWidth={2} color={tk.tt} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {mapbox.suggestions.length > 0 && (
        <div style={{ ...cardSt, overflow: 'hidden', marginBottom: 8 }}>
          {mapbox.suggestions.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleSuggestionSelect(s)}
              style={{
                width: '100%', background: 'none', border: 'none',
                borderBottom: i < mapbox.suggestions.length - 1 ? `1px solid ${tk.bd}` : 'none',
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <MapPin size={13} strokeWidth={1.5} color={tk.tt} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.text}</div>
                <div style={{ fontSize: 10, color: tk.tt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.place_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Favoris grid */}
      {favoris.length > 0 && !query && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tk.tt, marginBottom: 8 }}>
            Acces rapide
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {favoris.map(f => (
              <FavoriButton key={f.id} favori={f} isDark={d} onClick={handleFavoriSelect} />
            ))}
          </div>
        </div>
      )}

      {/* Transport mode */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tk.tt, marginBottom: 7 }}>
          Mode de transport
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {([
            { key: 'walk',    Icon: Footprints, label: 'A pied',   color: T.gradientStart   },
            { key: 'transit', Icon: Train,      label: 'Transport', color: T.accentPurple    },
            { key: 'bike',    Icon: Bike,       label: 'Velo',      color: T.semanticSuccess },
            { key: 'car',     Icon: Car,        label: 'Voiture',   color: T.accentGold      },
          ] as const).map(mode => {
            const active = routeMode === mode.key
            return (
              <button
                key={mode.key}
                onClick={() => setRouteMode(mode.key as RouteMode)}
                style={{
                  padding: '10px 6px', borderRadius: 10,
                  background: active ? `${mode.color}12` : tk.ih,
                  border: `1px solid ${active ? `${mode.color}40` : tk.bd}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <mode.Icon size={16} strokeWidth={1.5} color={active ? mode.color : tk.tt} />
                <span style={{ fontSize: 10, fontWeight: 500, color: active ? mode.color : tk.ts }}>{mode.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Escorte toggle — hidden for bike/car */}
      {(routeMode === 'walk' || routeMode === 'transit') && (
        <div style={{
          background: `rgba(59,180,193,${withCircle ? '0.07' : '0.03'})`,
          border: `1px solid ${T.gradientStart}${withCircle ? '28' : '15'}`,
          borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        }}>
          <Users size={14} strokeWidth={1.5} color={withCircle ? T.gradientStart : tk.tt} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: withCircle ? T.gradientStart : tk.ts }}>
            Activer l'escorte cercle
          </span>
          <button
            onClick={() => setWithCircle(!withCircle)}
            style={{
              width: 38, height: 21, borderRadius: 100,
              background: withCircle ? T.gradientStart : tk.ih,
              border: `1px solid ${withCircle ? 'transparent' : tk.bdd}`,
              padding: '0 2px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              flexShrink: 0, transition: 'background 200ms',
            }}
          >
            <motion.div
              animate={{ x: withCircle ? 17 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ width: 17, height: 17, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </button>
        </div>
      )}

      <motion.button
        style={{
          ...btnPrimary,
          opacity:    selectedDest ? 1 : 0.45,
          cursor:     selectedDest ? 'pointer' : 'default',
          background: selectedDest ? (d ? '#FFFFFF' : '#0F172A') : tk.ih,
          color:      selectedDest ? (d ? '#0F172A' : '#FFFFFF') : tk.tt,
        }}
        onClick={selectedDest ? handleStartTrip : undefined}
        whileTap={selectedDest ? { scale: 0.98 } : {}}
      >
        <Navigation size={14} strokeWidth={2} />
        Demarrer le trajet
      </motion.button>
    </motion.div>
  )

  // ── VIEW : TRIP ACTIVE ─────────────────────────
  const renderTripActive = () => {
    const ae = escorte.activeEscorte
    return (
      <motion.div
        key="trip-active"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={springConfig}
        style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
      >
        {/* Destination row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 0 12px', borderBottom: `1px solid ${tk.bd}`, marginBottom: 10,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Home size={18} strokeWidth={1.5} color={T.semanticSuccess} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: tk.tp }}>{ae?.dest_name ?? 'Destination'}</div>
            <div style={{ fontSize: 10, color: tk.ts, marginTop: 2 }}>
              ~{ae?.eta_minutes ?? '?'} min restantes
            </div>
          </div>
          <div style={{
            background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}35`,
            borderRadius: 100, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: T.semanticSuccess, whiteSpace: 'nowrap',
          }}>
            {ae?.eta_minutes ?? '?'} min
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: tk.bd, borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '35%' }}
            style={{ height: '100%', background: `linear-gradient(90deg,${T.gradientStart},${T.semanticSuccess})`, borderRadius: 2 }}
          />
        </div>

        {/* Context tags */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: '2 incidents', color: T.semanticDanger, bg: T.semanticDangerSoft },
            { label: '3 proches',   color: T.gradientStart,  bg: 'rgba(59,180,193,0.08)' },
            { label: 'Zone calme',  color: T.semanticSuccess, bg: T.semanticSuccessSoft },
          ].map(t => (
            <span key={t.label} style={{
              background: t.bg, border: `1px solid ${t.color}35`,
              color: t.color, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
            }}>
              {t.label}
            </span>
          ))}
        </div>

        {/* Circle suiveurs */}
        {escorte.circleMembers.filter(m => m.status !== 'inactive').length > 0 && (
          <div style={{
            ...cardSt, padding: '8px 12px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <div style={{ display: 'flex' }}>
              {escorte.circleMembers.filter(m => m.status !== 'inactive').slice(0, 3).map((m, i) => {
                const name = m.profiles?.name ?? '?'
                const col  = avatarColor(name)
                return (
                  <div key={m.id} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `${col}25`, border: `1.5px solid ${d ? T.surfaceCard : '#fff'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: col, marginLeft: i > 0 ? -8 : 0,
                  }}>
                    {name[0]}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 11, color: tk.ts }}>
              {escorte.circleMembers.filter(m => m.status !== 'inactive').map(m => m.profiles?.name).join(', ')} te suivent
            </span>
          </div>
        )}

        {/* Elapsed + actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
          <button
            onClick={handleShare}
            style={{
              ...cardSt, padding: '11px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', border: `1px solid ${tk.bd}`, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: tk.ts,
            }}
          >
            <Share2 size={14} strokeWidth={1.5} /> Partager
          </button>
          <button
            onClick={handleSOS}
            style={{
              background: sosSent ? 'rgba(239,68,68,0.20)' : T.semanticDangerSoft,
              border: `1px solid ${T.semanticDanger}35`,
              borderRadius: T.radiusLg, padding: '11px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              cursor: sosSent ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: T.semanticDanger,
              transition: 'background 0.3s',
            }}
          >
            {sosSent
              ? <><Check size={14} strokeWidth={2.5} /> SOS envoyé</>
              : <><AlertTriangle size={14} strokeWidth={1.5} /> SOS</>
            }
          </button>
        </div>

        <button
          style={btnPrimary}
          onClick={() => escorte.endEscorte(true)}
        >
          <Check size={15} strokeWidth={2.5} />
          Je suis arrivee
        </button>

        <button
          onClick={() => escorte.endEscorte(false)}
          style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: tk.tt, marginTop: 4 }}
        >
          Terminer le trajet
        </button>
      </motion.div>
    )
  }

  // ── VIEW : ARRIVED ─────────────────────────────
  const renderArrived = () => (
    <motion.div
      key="arrived"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={gentleSpring}
      style={{ padding: '16px 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none', textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: T.semanticSuccessSoft, border: `2px solid ${T.semanticSuccess}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}
      >
        <Check size={28} strokeWidth={2.5} color={T.semanticSuccess} />
      </motion.div>

      <div style={{ fontSize: 24, fontWeight: 300, color: tk.tp, marginBottom: 4 }}>Vous etes arrivee !</div>
      <div style={{ fontSize: 13, color: tk.ts, marginBottom: 4 }}>
        {escorte.activeEscorte?.dest_name ?? 'Destination'}
      </div>
      <div style={{ fontSize: 11, color: tk.tt, marginBottom: 16 }}>
        Trajet enregistre · {Math.round(escorte.elapsed / 60)} min
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { val: Math.round(escorte.elapsed / 60), unit: 'min',   color: tk.tp },
          { val: '1,2',                            unit: 'km',    color: tk.tp },
          { val: '6,8',                            unit: 'score', color: T.accentGold },
        ].map((s, i) => (
          <div key={i} style={{
            background: i === 2 ? 'rgba(245,195,65,0.08)' : (d ? T.surfaceCard : T.surfaceBaseL),
            border: `1px solid ${i === 2 ? 'rgba(245,195,65,0.18)' : tk.bd}`,
            borderRadius: T.radiusLg, padding: '10px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: tk.tt }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Cercle merci */}
      {escorte.circleMembers.filter(m => m.status !== 'inactive').length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center',
          marginBottom: 14, padding: '8px 14px',
          background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}25`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'flex' }}>
            {escorte.circleMembers.filter(m => m.status !== 'inactive').slice(0, 2).map((m, i) => {
              const name = m.profiles?.name ?? '?'
              const col = avatarColor(name)
              return (
                <div key={m.id} style={{
                  width: 22, height: 22, borderRadius: '50%', background: `${col}25`,
                  border: `1.5px solid ${d ? T.surfaceCard : '#fff'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: col, marginLeft: i > 0 ? -8 : 0,
                }}>
                  {name[0]}
                </div>
              )
            })}
          </div>
          <span style={{ fontSize: 11, color: T.semanticSuccess }}>
            {escorte.circleMembers.filter(m => m.status !== 'inactive').map(m => m.profiles?.name).slice(0,2).join(' et ')} t'ont accompagnee
          </span>
        </div>
      )}

      <button style={btnPrimary} onClick={() => { escorte.setView('hub'); onClose() }}>
        <MapPin size={14} strokeWidth={2} />
        Retour a la carte
      </button>
      <button style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: T.gradientStart, marginTop: 4 }}>
        Voir le resume du trajet
      </button>
    </motion.div>
  )

  // ─────────────────────────────────────────────
  //  RENDER ESCORTE LIVE (overlay plein ecran)
  // ─────────────────────────────────────────────
  if (escorte.view === 'escorte-live') {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Audio channel banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', top: 16, left: 16, right: 16,
            background: T.surfaceGlass, backdropFilter: 'blur(16px)',
            border: `1px solid ${T.gradientStart}30`, borderRadius: T.radiusXl,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto',
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: T.semanticSuccess, flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.gradientStart }}>Canal audio actif</div>
            <div style={{ fontSize: 10, color: T.textSecondary }}>
              {escorte.circleMembers.filter(m => m.status !== 'inactive').map(m => m.profiles?.name).slice(0,2).join(' · ')} vous ecoutent
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={13} strokeWidth={1.5} color={T.semanticSuccess} />
            </div>
            <button onClick={() => escorte.endEscorte(false)} style={{ width: 28, height: 28, borderRadius: 8, background: T.semanticDangerSoft, border: `1px solid ${T.semanticDanger}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={13} strokeWidth={2} color={T.semanticDanger} />
            </button>
          </div>
        </motion.div>

        {/* Julia banner (escorte-live) */}
        <AnimatePresence>
          {escorte.juliaActive && (
            <motion.div
              key="julia-live"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                position: 'absolute', top: 80, left: 16, right: 16,
                background: 'rgba(167,139,250,0.10)',
                border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: 14, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                pointerEvents: 'auto',
              }}
            >
              <Sparkles size={16} color="#A78BFA" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA', flex: 1 }}>
                Julia vous accompagne · canal actif
              </span>
              <span style={{
                fontSize: 8, fontWeight: 700,
                background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
                padding: '2px 6px', borderRadius: 4,
              }}>
                IA
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom live card */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'absolute', bottom: 82, left: 12, right: 12,
            background: T.surfaceGlass, backdropFilter: 'blur(20px)',
            border: `1px solid ${T.borderSubtle}`, borderRadius: 20,
            padding: '14px 16px', pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: T.gradientStart }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, flex: 1 }}>Escorte active</span>
            <span style={{ fontSize: 10, color: T.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(escorte.elapsed)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
            {escorte.circleMembers.map(m => {
              const name = m.profiles?.name ?? '?'
              const col  = avatarColor(name)
              const isActive = m.status !== 'inactive'
              const bgColor  = m.status === 'following' ? T.semanticSuccessSoft : m.status === 'vocal' ? 'rgba(59,180,193,0.08)' : T.interactiveHover
              const bdColor  = m.status === 'following' ? `${T.semanticSuccess}35` : m.status === 'vocal' ? `${T.gradientStart}35` : T.borderSubtle
              return (
                <div key={m.id} style={{
                  flex: 1, background: bgColor, border: `1px solid ${bdColor}`,
                  borderRadius: 10, padding: '7px 8px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: isActive ? 1 : 0.45,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: `${col}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: col, flexShrink: 0,
                  }}>{name[0]}</div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.textPrimary }}>{name}</div>
                    <div style={{ fontSize: 9, color: m.status === 'following' ? T.semanticSuccess : m.status === 'vocal' ? T.gradientStart : T.textTertiary }}>
                      {m.status === 'following' ? '● Suit' : m.status === 'vocal' ? '🎙' : 'Hors ligne'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => escorte.endEscorte(false)}
            style={{
              width: '100%', padding: '10px', background: T.semanticDangerSoft,
              border: `1px solid ${T.semanticDanger}30`, borderRadius: 14,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: T.semanticDanger, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            Arreter l'escorte
          </button>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  SHEET CONTAINER
  // ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0, height: sheetH }}
      exit={{ y: '100%' }}
      transition={springConfig}
      style={{
        position:            'absolute',
        bottom:              64,
        left:                0,
        right:               0,
        background:          d ? T.surfaceElevated : '#FFFFFF',
        borderTopLeftRadius:  T.radiusXl,
        borderTopRightRadius: T.radiusXl,
        border:              `1px solid ${tk.bd}`,
        borderBottom:        'none',
        boxShadow:           T.shadowLg,
        display:             'flex',
        flexDirection:       'column',
        overflow:            'hidden',
      }}
    >
      {/* Handle */}
      <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: d ? T.borderStrong : 'rgba(15,23,42,0.16)' }} />
      </div>

      {/* Julia banner */}
      <AnimatePresence>
        {escorte.juliaActive &&
         (escorte.view === 'escorte-notifying' || escorte.view === 'trip-active') && (
          <motion.div
            key="julia-banner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              margin: '8px 16px 0',
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="#A78BFA" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA', flex: 1 }}>
              Julia vous accompagne · canal actif
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700,
              background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
              padding: '2px 6px', borderRadius: 4,
            }}>
              IA
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio channel banner */}
      <AnimatePresence>
        {(escorte.view === 'escorte-notifying' || escorte.view === 'trip-active') &&
         escorte.activeEscorte &&
         escorte.circleMembers.some(m => m.status === 'vocal') && (
          <div style={{ margin: '6px 16px 0', flexShrink: 0 }}>
            <AudioChannel
              escorteId={escorte.activeEscorte.id}
              userId={userId}
              isDark={d}
              circleMembers={escorte.circleMembers}
              onEnd={() => escorte.endEscorte(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {escorte.view === 'hub'              && renderHub()}
          {escorte.view === 'escorte-intro'    && renderEscorteIntro()}
          {escorte.view === 'escorte-notifying'&& renderNotifying()}
          {escorte.view === 'trip-form'        && renderTripForm()}
          {escorte.view === 'trip-active'      && renderTripActive()}
          {escorte.view === 'arrived'          && renderArrived()}
        </AnimatePresence>
      </div>

      {/* Favoris Manager overlay */}
      <AnimatePresence>
        {showFavoris && (
          <FavorisManager
            userId={userId}
            isDark={d}
            onClose={() => setShowFavoris(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
