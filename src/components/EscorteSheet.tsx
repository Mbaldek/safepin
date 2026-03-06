'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Send, Home, Navigation, Search, Shield, Clock,
  ChevronLeft, ChevronRight, Check, AlertTriangle, Share2,
  Star, MapPin, Zap, Mic, X, MoreHorizontal, Briefcase, Sparkles,
  Footprints, Train, Bike, Car, Loader2, Edit3, ArrowUpDown
} from 'lucide-react'
import { T, tok, springConfig, gentleSpring } from '@/lib/tokens'
import { useEscorte }       from '@/hooks/useEscorte'
import { useFavoris }       from '@/hooks/useFavoris'
import { useRecents }       from '@/hooks/useRecents'
import { useDestinationSearch, formatSearchDistance } from '@/hooks/useDestinationSearch'
import type { SearchResult } from '@/hooks/useDestinationSearch'
import { ContactRow }       from './escorte/ContactRow'
import { FavoriButton }     from './escorte/FavoriButton'
import {
  formatElapsed, formatCountdown, calcETA, calcDist, avatarColor
} from '@/lib/escorteHelpers'
import { fetchDirections, formatDuration, formatDistance } from '@/lib/directions'
import { fetchTransitRoute, formatTransitDuration } from '@/lib/transit'
import { useStore } from '@/stores/useStore'
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
  const destSearch   = useDestinationSearch(userLat, userLng)
  const departSearch = useDestinationSearch(userLat, userLng)
  const { setPendingRoutes, setMapFlyTo, setDepartDragPin, departDragPin } = useStore()

  // ── Local state ────────────────────────────────
  const [query,       setQuery]       = useState('')
  const [selectedDest, setSelectedDest] = useState<MapboxSuggestion | null>(null)
  const [routeMode,   setRouteMode]   = useState<RouteMode>('walk')
  const [withCircle,  setWithCircle]  = useState(true)
  const [showFavoris, setShowFavoris] = useState(false)
  const [sosSent, setSosSent] = useState(false)

  // ── Depart state ─────────────────────────────
  const [departAddress, setDepartAddress] = useState<string | null>(null)
  const [departCoords,  setDepartCoords]  = useState<[number, number] | null>(null)
  const [editingDepart, setEditingDepart] = useState(false)
  const [departQuery,   setDepartQuery]   = useState('')

  // ── Route preview state ──────────────────────
  const [routeInfo, setRouteInfo]         = useState<{ duration: number; distance: number } | null>(null)
  const [loadingRoute, setLoadingRoute]   = useState(false)
  const routeFetchRef = useRef(0)

  // ── Reverse geocode user position ────────────
  useEffect(() => {
    if (!userLng || !userLat) return
    setDepartCoords([userLng, userLat])
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLng},${userLat}.json` +
      `?access_token=${token}&language=fr&types=address&limit=1`
    )
      .then(r => r.json())
      .then(data => {
        const place = data.features?.[0]
        if (place) {
          const full: string = place.place_name_fr ?? place.place_name ?? ''
          const short = full.split(',').slice(0, 2).join(',').trim()
          setDepartAddress(short || full)
        }
      })
      .catch(() => {})
  }, [userLat, userLng])

  // ── Fetch route when depart + dest + mode change ─
  useEffect(() => {
    if (!departCoords || !selectedDest) {
      setRouteInfo(null)
      setPendingRoutes(null)
      return
    }

    const fetchId = ++routeFetchRef.current
    setLoadingRoute(true)

    const from = departCoords
    const to = selectedDest.center

    ;(async () => {
      try {
        if (routeMode === 'transit') {
          const routes = await fetchTransitRoute(from, to)
          if (fetchId !== routeFetchRef.current) return
          if (routes.length > 0) {
            const best = routes[0]
            setRouteInfo({ duration: best.totalDuration, distance: 0 })
            setPendingRoutes([{
              id: 'transit-0',
              label: 'Transit',
              color: '#A78BFA',
              coords: best.coords,
              duration: best.totalDuration,
              distance: 0,
              dangerScore: 0,
            }])
          } else {
            setRouteInfo(null)
            setPendingRoutes(null)
          }
        } else {
          const result = await fetchDirections(from, to, routeMode)
          if (fetchId !== routeFetchRef.current) return
          if (result) {
            setRouteInfo({ duration: result.duration, distance: result.distance })
            const color = routeMode === 'walk' ? '#3BB4C1' : routeMode === 'bike' ? '#34D399' : '#F5C341'
            setPendingRoutes([{
              id: `${routeMode}-0`,
              label: routeMode,
              color,
              coords: result.coords,
              duration: result.duration,
              distance: result.distance,
              dangerScore: 0,
            }])
          } else {
            setRouteInfo(null)
            setPendingRoutes(null)
          }
        }
      } catch {
        if (fetchId === routeFetchRef.current) {
          setRouteInfo(null)
          setPendingRoutes(null)
        }
      } finally {
        if (fetchId === routeFetchRef.current) setLoadingRoute(false)
      }
    })()
  }, [departCoords, selectedDest, routeMode, setPendingRoutes])

  // ── Fly to destination when selected ─────────
  useEffect(() => {
    if (!selectedDest) return
    const [lng, lat] = selectedDest.center
    setMapFlyTo({ lat, lng, zoom: 14 })
  }, [selectedDest, setMapFlyTo])

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
  const SHEET_HEIGHTS: Record<string, string> = {
    'hub':               '52vh',
    'escorte-intro':     '60vh',
    'escorte-notifying': '72vh',
    'escorte-live':      '72vh',
    'trip-form':         '68vh',
    'trip-active':       '64vh',
    'arrived':           '72vh',
  }

  const sheetH = SHEET_HEIGHTS[escorte.view] ?? '60vh'

  // ── Search handler ─────────────────────────────
  const handleSearch = (v: string) => {
    setQuery(v)
    setSelectedDest(null)
    destSearch.search(v)
  }

  const handleResultSelect = (r: SearchResult) => {
    setSelectedDest({
      id:         r.id,
      place_name: r.address,
      text:       r.name,
      center:     [r.lng, r.lat],
      place_type: [r.type],
    })
    setQuery(r.name)
    destSearch.clear()
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

  // ── Depart search handlers ───────────────────
  const handleDepartSearch = (v: string) => {
    setDepartQuery(v)
    departSearch.search(v)
  }

  const handleDepartResultSelect = (r: SearchResult) => {
    setDepartCoords([r.lng, r.lat])
    setDepartAddress(r.name)
    setDepartQuery('')
    departSearch.clear()
  }

  // ── Back to hub — cleanup routes ─────────────
  const handleBackToHub = () => {
    escorte.setView('hub')
    setSelectedDest(null)
    setQuery('')
    setRouteInfo(null)
    setPendingRoutes(null)
    setEditingDepart(false)
    setDepartDragPin(null)
    setDepartQuery('')
  }

  // ── Swap departure ↔ destination ───────────────
  const handleSwapDepartDest = () => {
    if (!selectedDest || !departCoords) return
    const prevDepartAddr = departAddress
    const prevDepartCoords = departCoords
    setDepartCoords(selectedDest.center)
    setDepartAddress(selectedDest.text)
    setSelectedDest({
      id:         'swap',
      place_name: prevDepartAddr || 'Ma position actuelle',
      text:       prevDepartAddr || 'Ma position actuelle',
      center:     prevDepartCoords,
      place_type: ['swap'],
    })
    setQuery(prevDepartAddr || 'Ma position actuelle')
  }

  // ── Open / close departure picker ────────────
  const handleOpenDepartPicker = () => {
    setEditingDepart(true)
    if (departCoords) setDepartDragPin(departCoords)
  }

  const handleCloseDepartPicker = () => {
    setEditingDepart(false)
    setDepartDragPin(null)
    setDepartQuery('')
    departSearch.clear()
  }

  const handleResetToCurrentPosition = () => {
    if (userLng && userLat) {
      setDepartCoords([userLng, userLat])
      setDepartDragPin([userLng, userLat])
    }
    // re-resolve address from GPS
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (userLng && userLat && token) {
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLng},${userLat}.json` +
        `?access_token=${token}&language=fr&types=address&limit=1`
      )
        .then(r => r.json())
        .then(data => {
          const place = data.features?.[0]
          if (place) {
            const full: string = place.place_name_fr ?? place.place_name ?? ''
            const short = full.split(',').slice(0, 2).join(',').trim()
            setDepartAddress(short || full)
          }
        })
    }
  }

  // ── Watch draggable pin position changes → reverse geocode ──
  useEffect(() => {
    if (!departDragPin || !editingDepart) return
    // Only update if coords differ from current departCoords
    const [lng, lat] = departDragPin
    if (departCoords && departCoords[0] === lng && departCoords[1] === lat) return
    setDepartCoords([lng, lat])
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${token}&language=fr&types=address&limit=1`
    )
      .then(r => r.json())
      .then(data => {
        const place = data.features?.[0]
        if (place) {
          const full: string = place.place_name_fr ?? place.place_name ?? ''
          const short = full.split(',').slice(0, 2).join(',').trim()
          setDepartAddress(short || full)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departDragPin])

  // ── Trip launch ────────────────────────────────
  const handleStartTrip = async () => {
    if (!selectedDest || !departCoords) return
    const [lng, lat] = selectedDest.center
    const distKm = departCoords
      ? calcDist(departCoords[1], departCoords[0], lat, lng)
      : 1.5
    const etaMin = routeInfo ? Math.round(routeInfo.duration / 60) : calcETA(distKm)
    setPendingRoutes(null) // clear preview, useEscorte will set activeRoute
    await escorte.startTrip({
      destName:    selectedDest.text,
      destLat:     lat,
      destLng:     lng,
      destAddress: selectedDest.place_name,
      routeMode,
      etaMinutes:  etaMin,
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

      {escorte.escorteError && (
        <div style={{
          marginBottom: 10, padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.20)',
          borderRadius: 12, fontSize: 12,
          color: '#EF4444',
        }}>
          {escorte.escorteError}
        </div>
      )}

      <button
        style={{
          ...btnPrimary,
          opacity: escorte.isStarting ? 0.7 : 1,
          cursor: escorte.isStarting ? 'default' : 'pointer',
        }}
        onClick={escorte.startEscorteImmediate}
        disabled={escorte.isStarting}
      >
        <Users size={15} strokeWidth={2} />
        {escorte.isStarting ? 'Connexion...' : 'Notifier mon cercle'}
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
  const renderResultList = (
    results: SearchResult[],
    onSelect: (r: SearchResult) => void,
  ) => (
    <div style={{ ...cardSt, overflow: 'hidden', marginBottom: 8 }}>
      {results.map((r, i) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          style={{
            width: '100%', background: 'none', border: 'none',
            borderBottom: i < results.length - 1 ? `1px solid ${tk.bd}` : 'none',
            padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: r.type === 'poi'
              ? (d ? 'rgba(59,180,193,0.10)' : 'rgba(59,180,193,0.08)')
              : tk.ih,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {r.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: tk.tt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{r.address}</div>
          </div>
          {r.distance !== null && (
            <span style={{ fontSize: 10, fontWeight: 600, color: tk.tt, flexShrink: 0 }}>
              {formatSearchDistance(r.distance)}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  const renderTripForm = () => {
    // ── STATE B: Departure picker ──
    if (editingDepart) {
      return (
        <motion.div
          key="depart-picker"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={springConfig}
          style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={handleCloseDepartPicker} style={{
              width: 30, height: 30, borderRadius: '50%', background: tk.ih,
              border: `1px solid ${tk.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <ChevronLeft size={14} strokeWidth={2} color={tk.ts} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: tk.tp }}>Choisir le depart</div>
              <div style={{ fontSize: 11, color: tk.tt }}>Deplace le pin ou recherche</div>
            </div>
          </div>

          {/* Ma position actuelle — card */}
          <button
            onClick={handleResetToCurrentPosition}
            style={{
              ...cardSt, width: '100%', padding: '12px 14px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              border: `1px solid ${T.semanticSuccess}40`,
              background: `${T.semanticSuccess}08`,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${T.semanticSuccess}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MapPin size={15} strokeWidth={1.5} color={T.semanticSuccess} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.semanticSuccess }}>Ma position actuelle</div>
              <div style={{
                fontSize: 11, color: tk.tt, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {departAddress || 'Position GPS'}
              </div>
            </div>
            <Check size={14} strokeWidth={2} color={T.semanticSuccess} />
          </button>

          {/* Separator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: tk.bd }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: tk.tt, textTransform: 'uppercase', letterSpacing: '.06em' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: tk.bd }} />
          </div>

          {/* Address search */}
          <div style={{
            ...cardSt, padding: '10px 12px', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Search size={14} strokeWidth={1.5} color={tk.tt} />
            <input
              type="text"
              placeholder="Rechercher une adresse..."
              value={departQuery}
              onChange={e => handleDepartSearch(e.target.value)}
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: tk.ts, fontFamily: 'inherit',
              }}
            />
            {departQuery && (
              <button onClick={() => { setDepartQuery(''); departSearch.clear() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={13} strokeWidth={2} color={tk.tt} />
              </button>
            )}
          </div>

          {/* Search results */}
          {departSearch.results.length > 0 && renderResultList(departSearch.results, (r) => {
            handleDepartResultSelect(r)
            setDepartDragPin([r.lng, r.lat])
          })}

          {/* Current resolved address preview */}
          {departAddress && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10,
              background: `${T.gradientStart}08`,
              border: `1px solid ${T.gradientStart}20`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.semanticSuccess, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: tk.tt }}>Depart selectionne</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {departAddress}
                </div>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <motion.button
            style={{ ...btnPrimary, marginTop: 16 }}
            onClick={handleCloseDepartPicker}
            whileTap={{ scale: 0.98 }}
          >
            <Check size={14} strokeWidth={2} />
            Confirmer le depart
          </motion.button>
        </motion.div>
      )
    }

    // ── STATE A + C: Main trip form ──
    const routeDurationLabel = routeInfo
      ? (routeMode === 'transit'
          ? formatTransitDuration(routeInfo.duration)
          : formatDuration(routeInfo.duration))
      : null

    return (
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
          <button onClick={handleBackToHub} style={{
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

        {/* ── Departure + Connector + Destination ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {/* Left rail: dots + connector + swap */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, width: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.semanticSuccess, flexShrink: 0 }} />
            <div style={{ width: 2, flex: 1, background: `${T.gradientStart}30`, minHeight: 8 }} />
            <button
              onClick={handleSwapDepartDest}
              disabled={!selectedDest}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: selectedDest ? `${T.gradientStart}12` : tk.ih,
                border: `1px solid ${selectedDest ? `${T.gradientStart}30` : tk.bd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: selectedDest ? 'pointer' : 'default', padding: 0, flexShrink: 0,
              }}
            >
              <ArrowUpDown size={10} strokeWidth={2} color={selectedDest ? T.gradientStart : tk.tt} />
            </button>
            <div style={{ width: 2, flex: 1, background: `${T.gradientStart}30`, minHeight: 8 }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.gradientStart, flexShrink: 0 }} />
          </div>

          {/* Right side: departure card + destination card */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Departure card */}
            <button onClick={handleOpenDepartPicker} style={{
              ...cardSt, padding: '10px 13px', width: '100%',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: tk.tt, marginBottom: 1 }}>Depart</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {departAddress || 'Ma position actuelle'}
                </div>
              </div>
              <Edit3 size={12} strokeWidth={1.5} color={tk.tt} />
            </button>

            {/* Destination search */}
            <div style={{
              ...cardSt, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative',
              border: selectedDest ? `1px solid ${T.gradientStart}45` : `1px solid ${tk.bd}`,
              boxShadow: selectedDest ? `0 0 0 3px ${T.gradientStart}12` : 'none',
            }}>
              <Search size={15} strokeWidth={1.5} color={selectedDest ? T.gradientStart : tk.tt} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="Adresse, lieu, gare..."
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  style={{
                    width: '100%', background: 'none', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: selectedDest ? 500 : 400,
                    color: selectedDest ? T.gradientStart : tk.ts, fontFamily: 'inherit',
                  }}
                />
                {selectedDest && !query.includes(selectedDest.text) && (
                  <div style={{ fontSize: 10, color: tk.tt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {selectedDest.place_name}
                  </div>
                )}
              </div>
              {query && (
                <button onClick={() => { setQuery(''); setSelectedDest(null); destSearch.clear() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={13} strokeWidth={2} color={tk.tt} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions dropdown */}
        {destSearch.loading && destSearch.results.length === 0 && (
          <div style={{ padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={12} strokeWidth={1.5} color={T.gradientStart} style={{ animation: 'spin 0.6s linear infinite' }} />
            <span style={{ fontSize: 12, color: tk.tt }}>Recherche en cours...</span>
          </div>
        )}
        {destSearch.results.length > 0 && renderResultList(destSearch.results, handleResultSelect)}

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

        {/* Route estimation */}
        {(loadingRoute || routeInfo) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 10, padding: '6px 0',
          }}>
            {loadingRoute ? (
              <Loader2 size={13} strokeWidth={1.5} color={T.gradientStart} style={{ animation: 'spin 1s linear infinite' }} />
            ) : routeInfo ? (
              <>
                <Clock size={12} strokeWidth={1.5} color={T.gradientStart} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.gradientStart }}>
                  ~{routeDurationLabel}
                </span>
                {routeInfo.distance > 0 && (
                  <span style={{ fontSize: 12, color: tk.tt }}>
                    · {formatDistance(routeInfo.distance)}
                  </span>
                )}
              </>
            ) : null}
          </div>
        )}

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
          {selectedDest && routeDurationLabel
            ? `Demarrer · ${routeDurationLabel}`
            : 'Demarrer le trajet'}
        </motion.button>
      </motion.div>
    )
  }

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
        bottom:              0,
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, scrollbarWidth: 'none' }}>
        {/* Julia banner — in scroll flow so it never steals fixed space */}
        <AnimatePresence>
          {escorte.juliaActive &&
           (escorte.view === 'escorte-notifying' || escorte.view === 'trip-active') && (
            <motion.div
              key="julia-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                margin: '8px 16px 0',
                background: 'rgba(167,139,250,0.10)',
                border: '1px solid rgba(167,139,250,0.25)',
                borderRadius: 14,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio channel banner — in scroll flow */}
        <AnimatePresence>
          {(escorte.view === 'escorte-notifying' || escorte.view === 'trip-active') &&
           escorte.activeEscorte &&
           escorte.circleMembers.some(m => m.status === 'vocal') && (
            <div style={{ margin: '6px 16px 0' }}>
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
            onSelect={(f) => { setShowFavoris(false); handleFavoriSelect(f) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
