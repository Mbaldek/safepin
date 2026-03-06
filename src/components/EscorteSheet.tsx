'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Send, Navigation, Search, Shield, Clock,
  ChevronLeft, ChevronRight, Check, AlertTriangle,
  Star, MapPin, Zap, Mic, X, MoreHorizontal, Briefcase, Sparkles,
  Footprints, Train, Bike, Car, Loader2, Edit3, ArrowUpDown
} from 'lucide-react'
import { T, tok, springConfig, gentleSpring } from '@/lib/tokens'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
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
  escorte:   UseEscorteReturn
  onClose:   () => void
}

export default function EscorteSheet({ userId, isDark, userLat, userLng, escorte, onClose }: Props) {
  const d  = isDark
  const tk = tok(isDark)
  const C = {
    t1:      isDark ? '#FFFFFF'                : '#0F172A',
    t2:      isDark ? '#94A3B8'               : '#475569',
    t3:      isDark ? '#64748B'               : '#94A3B8',
    bg:      isDark ? 'rgba(15,23,42,0.93)'   : 'rgba(255,255,255,0.96)',
    card:    isDark ? '#1E293B'               : '#FFFFFF',
    el:      isDark ? '#243050'               : '#F1F5F9',
    border:  isDark ? 'rgba(255,255,255,0.08)': 'rgba(15,23,42,0.08)',
    borderS: isDark ? 'rgba(255,255,255,0.15)': 'rgba(15,23,42,0.16)',
    handle:  isDark ? 'rgba(255,255,255,0.13)': 'rgba(15,23,42,0.13)',
    btn:     isDark ? '#FFFFFF'               : '#0F172A',
    btnTxt:  isDark ? '#0F172A'               : '#FFFFFF',
  }

  // ── Hooks ──────────────────────────────────────
  const { favoris } = useFavoris(userId)
  const { recents } = useRecents(userId)
  const destSearch   = useDestinationSearch(userLat, userLng)
  const departSearch = useDestinationSearch(userLat, userLng)
  const { setPendingRoutes, setActiveRoute, setMapFlyTo, setDepartDragPin, departDragPin, pendingRoutes: storeRoutes } = useStore()

  // ── Local state ────────────────────────────────
  const [query,       setQuery]       = useState('')
  const [selectedDest, setSelectedDest] = useState<MapboxSuggestion | null>(null)
  const [routeMode,   setRouteMode]   = useState<RouteMode>('walk')
  const [withCircle,  setWithCircle]  = useState(true)
  const [showFavoris, setShowFavoris] = useState(false)

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

  // ── Sheet height per view ──────────────────────
  const SHEET_HEIGHTS: Record<string, string> = {
    'hub':               '52vh',
    'escorte-intro':     '60vh',
    'escorte-notifying': '52vh',
    'escorte-live':      '72vh',
    'trip-form':         '46vh',
    'trip-active':       '0px',
    'arrived':           '0px',
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

    // Promote pending route → active route so MapView draws it + fitBounds
    const route = storeRoutes?.[0]
    if (route) {
      setActiveRoute({ coords: route.coords, destination: selectedDest.text })
    }
    setPendingRoutes(null)

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
    background:     C.btn,
    color:          C.btnTxt,
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

      {/* Cercle + CTA card */}
      <div style={{
        background: 'rgba(59,180,193,0.08)', border: '1px solid rgba(59,180,193,0.25)',
        borderRadius: 16, padding: '12px 14px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.gradientStart, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          TON CERCLE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <button
            style={{
              ...btnPrimary,
              width: 'auto', padding: '9px 16px',
              opacity: escorte.isStarting ? 0.7 : 1,
              cursor: escorte.isStarting ? 'default' : 'pointer',
            }}
            onClick={escorte.startEscorteImmediate}
            disabled={escorte.isStarting}
          >
            <Users size={13} strokeWidth={2} />
            {escorte.isStarting ? 'Connexion...' : 'Notifier mon cercle'}
          </button>
        </div>
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

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {/* Handle */}
        <div style={{
          width:28, height:4, borderRadius:2, margin:'8px auto 0', flexShrink:0,
          background: C.handle,
        }} />

        {/* Julia banner */}
        <div style={{
          margin:'10px 14px 0', padding:'7px 12px', borderRadius:12, flexShrink:0,
          background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.20)',
          display:'flex', alignItems:'center', gap:7,
        }}>
          <Sparkles size={11} strokeWidth={1.5} color="#A78BFA" />
          <span style={{ fontSize:12, fontWeight:600, color:'#A78BFA', flex:1 }}>
            {escorte.juliaActive
              ? 'Julia vous accompagne · canal actif'
              : `Julia rejoint dans ${formatCountdown(escorte.juliaCd)}`}
          </span>
          <span style={{
            fontSize:8, fontWeight:800, color:'#A78BFA',
            background:'rgba(167,139,250,0.15)', padding:'1px 5px', borderRadius:3,
          }}>IA</span>
        </div>

        {/* Centre */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:8, padding:'0 20px',
        }}>
          <div style={{
            width:56, height:56, borderRadius:'50%',
            background:'rgba(59,180,193,0.10)', border:'1px solid rgba(59,180,193,0.20)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Users size={22} strokeWidth={1.5} color="#3BB4C1" />
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color: C.btn, marginBottom:3 }}>
              {hasResponded
                ? `${activeCount} contact${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`
                : 'Notification envoyée'}
            </div>
            <div style={{ fontSize:12, color: C.t2 }}>
              {hasResponded ? "Ton cercle t'accompagne" : 'En attente de réponse'}
            </div>
          </div>
          {!escorte.juliaActive && escorte.juliaCd > 0 && (
            <div style={{
              padding:'4px 14px', borderRadius:100,
              background:'rgba(245,195,65,0.10)', border:'1px solid rgba(245,195,65,0.25)',
              fontSize:12, fontWeight:600, color:'#F5C341',
            }}>
              Julia rejoint dans {formatCountdown(escorte.juliaCd)}
            </div>
          )}

          {/* Contact list */}
          {escorte.circleMembers.length > 0 && (
            <div style={{ ...cardSt, borderRadius: T.radiusLg, overflow: 'hidden', width: '100%' }}>
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
        </div>

        {/* Actions */}
        <div style={{ padding:'12px 14px 14px', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <button
            onClick={() => escorte.setView('escorte-live')}
            style={{
              width:'100%', padding:'12px', borderRadius:28,
              background: C.btn,
              color: C.btnTxt,
              fontFamily:'inherit', fontSize:13, fontWeight:800,
              border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            }}
          >
            <Check size={12} strokeWidth={2.5} />
            {hasResponded ? 'Continuer' : 'Démarrer sans attendre'}
          </button>
          <button
            onClick={() => escorte.endEscorte()}
            style={{
              background:'none', border:'none', cursor:'pointer', padding:'4px',
              fontSize:12, color: C.t3, fontFamily:'inherit',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
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
        style={{ display:'flex', flexDirection:'column', height:'100%' }}
      >
        {/* Handle */}
        <div style={{
          width:28, height:4, borderRadius:2, margin:'8px auto 0', flexShrink:0,
          background: C.handle,
        }} />

        <div style={{
          flex:1, overflowY:'auto', padding:'9px 14px 12px',
          display:'flex', flexDirection:'column', gap:8,
          scrollbarWidth:'none',
        }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button
              onClick={handleBackToHub}
              style={{
                width:26, height:26, borderRadius:'50%', flexShrink:0,
                background: C.el,
                border:`1px solid ${C.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
              }}
            >
              <ChevronLeft size={10} strokeWidth={2.5} color={C.t2} />
            </button>
            <span style={{ fontSize:13, fontWeight:700, color: C.btn, flex:1 }}>
              Trajet avec destination
            </span>
            {selectedDest && routeDurationLabel && (
              <button
                onClick={handleStartTrip}
                disabled={escorte.isStarting}
                style={{
                  background: C.btn, color: C.btnTxt,
                  padding:'8px 14px', borderRadius:99,
                  fontSize:13, fontWeight:700, border:'none',
                  cursor: escorte.isStarting ? 'default' : 'pointer',
                  opacity: escorte.isStarting ? 0.7 : 1,
                  fontFamily:'inherit', flexShrink:0,
                }}
              >
                {routeDurationLabel} ➤
              </button>
            )}
          </div>

          {/* Card départ → destination */}
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background: C.el,
            border:`1px solid ${C.border}`,
            borderRadius:12, padding:'9px 11px',
          }}>
            {/* Connecteur */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#34D399' }} />
              <div style={{ width:1, height:14, background: C.border }} />
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#EF4444' }} />
            </div>
            {/* Adresses */}
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
              <div
                onClick={handleOpenDepartPicker}
                style={{ fontSize:11, fontWeight:500, color: C.t2, cursor:'pointer',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
              >
                {departAddress ?? 'Ma position actuelle'}
              </div>
              <div
                onClick={() => document.getElementById('dest-input')?.focus()}
                style={{ fontSize:12, fontWeight:600, cursor:'pointer',
                  color: selectedDest ? (C.btn) : (C.t3),
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
              >
                {selectedDest?.text ?? 'Rechercher une destination…'}
              </div>
            </div>
            {/* Swap */}
            {selectedDest && (
              <div
                onClick={handleSwapDepartDest}
                style={{
                  width:24, height:24, borderRadius:'50%', flexShrink:0, cursor:'pointer',
                  background: C.card,
                  border:`1px solid ${C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >
                <ArrowUpDown size={10} strokeWidth={2} color={C.t2} />
              </div>
            )}
          </div>

          {/* Input recherche — seulement si pas de destination */}
          {!selectedDest && (
            <div style={{ position:'relative' }}>
              <Search size={13} strokeWidth={1.5} color={C.t3}
                style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              <input
                id="dest-input"
                autoFocus
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Restaurant, adresse, lieu…"
                style={{
                  width:'100%', background: C.card,
                  border:'1px solid rgba(59,180,193,0.35)',
                  boxShadow:'0 0 0 3px rgba(59,180,193,0.08)',
                  borderRadius:10, padding:'9px 12px 9px 34px',
                  fontSize:12, fontFamily:'inherit', color: C.btn, outline:'none',
                }}
              />
              {/* Résultats */}
              {destSearch.results.length > 0 && (
                <div style={{
                  position:'absolute', top:'100%', left:0, right:0, zIndex:50, marginTop:4,
                  background: C.card,
                  border:`1px solid ${C.border}`,
                  borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  {destSearch.results.slice(0,5).map((r, i) => (
                    <div
                      key={r.id}
                      onClick={() => handleResultSelect(r)}
                      style={{
                        display:'flex', alignItems:'center', gap:9, padding:'9px 12px',
                        cursor:'pointer',
                        borderBottom: i < Math.min(destSearch.results.length,5)-1
                          ? `1px solid ${C.border}` : 'none',
                      }}
                    >
                      <div style={{
                        width:30, height:30, borderRadius:9, flexShrink:0, fontSize:14,
                        background: r.type === 'poi' ? 'rgba(59,180,193,0.10)' : (C.el),
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {r.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color: C.btn,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize:10, color: C.t3,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Favoris accès rapide */}
          {!selectedDest && favoris.length > 0 && (
            <div>
              <div style={{ fontSize:8, fontWeight:800, textTransform:'uppercase',
                letterSpacing:'0.08em', color: C.t3, marginBottom:6 }}>Accès rapide</div>
              <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
                {favoris.slice(0,4).map(f => (
                  <FavoriButton key={f.id} favori={f} isDark={d} onClick={handleFavoriSelect} />
                ))}
              </div>
            </div>
          )}

          {/* Transport + CTA — seulement si destination choisie */}
          {selectedDest && (
            <>
              {/* Modes de transport */}
              <div style={{ display:'flex', gap:5 }}>
                {([
                  { key: 'walk',    label: 'À pied',      color: '#34D399' },
                  { key: 'transit', label: 'Transports',   color: '#3BB4C1' },
                  { key: 'bike',    label: 'Vélo',         color: '#F5C341' },
                  { key: 'car',     label: 'Voiture',      color: '#94A3B8' },
                ] as const).map(mode => {
                  const on = routeMode === mode.key
                  return (
                    <button
                      key={mode.key}
                      onClick={() => setRouteMode(mode.key as RouteMode)}
                      style={{
                        flex:1, padding:'7px 4px', borderRadius:9, cursor:'pointer',
                        fontFamily:'inherit', border:`1.5px solid ${on ? mode.color : 'transparent'}`,
                        background: on ? `${mode.color}18` : (C.el),
                        display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                        transition:'all 150ms',
                      }}
                    >
                      <span style={{ fontSize:9, fontWeight:700,
                        color: on ? mode.color : (C.t2) }}>{mode.label}</span>
                      {on && routeDurationLabel && (
                        <span style={{ fontSize:7, color: C.t3 }}>
                          ~{routeDurationLabel}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Escorte toggle — walk et transit uniquement */}
              {(routeMode === 'walk' || routeMode === 'transit') && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Users size={12} strokeWidth={1.5} color="#3BB4C1" />
                    <span style={{ fontSize:11, fontWeight:600, color:'#3BB4C1' }}>
                      Escorte cercle
                    </span>
                  </div>
                  <div
                    onClick={() => setWithCircle(!withCircle)}
                    style={{
                      width:34, height:20, borderRadius:100, cursor:'pointer',
                      background: withCircle ? '#3BB4C1' : (C.el),
                      border:`1px solid ${withCircle ? '#3BB4C1' : C.borderS}`,
                      display:'flex', alignItems:'center',
                      padding:2, transition:'all 200ms',
                    }}
                  >
                    <div style={{
                      width:16, height:16, borderRadius:'50%', background:'#fff',
                      marginLeft: withCircle ? 'auto' : 0,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                      transition:'margin 200ms',
                    }} />
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleStartTrip}
                disabled={escorte.isStarting}
                style={{
                  width:'100%', padding:'11px', borderRadius:28,
                  background: C.btn,
                  color: C.btnTxt,
                  fontFamily:'inherit', fontSize:13, fontWeight:800,
                  border:'none', cursor: escorte.isStarting ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  opacity: escorte.isStarting ? 0.7 : 1,
                }}
              >
                {escorte.isStarting ? (
                  <>
                    <Loader2 size={12} strokeWidth={2} style={{ animation:'spin 0.6s linear infinite' }} />
                    Démarrage…
                  </>
                ) : (
                  <>
                    <Navigation size={12} strokeWidth={2.5} />
                    Démarrer · {routeDurationLabel ?? '—'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  // ── VIEW : TRIP ACTIVE — delegated to TripHUD on map ──
  const renderTripActive = () => null

  // ── VIEW : ARRIVED ─────────────────────────────
  const renderArrived = () => (
    <>
      {/* Scrim */}
      <motion.div
        key="arrived-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          zIndex: 299,
        }}
      />

      {/* Modal card */}
      <motion.div
        key="arrived"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={gentleSpring}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '88%', maxWidth: 360,
          maxHeight: '80vh', overflowY: 'auto',
          borderRadius: 28,
          background: tk.card,
          zIndex: 300,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: `1px solid ${tk.bd}`,
          padding: '28px 22px 22px',
          textAlign: 'center',
          scrollbarWidth: 'none',
        }}
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
        <button style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: T.gradientStart, marginTop: 4 }} onClick={() => toast('Résumé du trajet bientôt disponible')}>
          Voir le resume du trajet
        </button>
      </motion.div>
    </>
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
            background: tk.glass, backdropFilter: 'blur(16px)',
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
            <div style={{ fontSize: 10, color: tk.ts }}>
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
            position: 'absolute', bottom: 72, left: 12, right: 12,
            background: tk.glass, backdropFilter: 'blur(20px)',
            border: `1px solid ${tk.bd}`, borderRadius: 20,
            padding: '14px 16px', pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: T.gradientStart }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: tk.tp, flex: 1 }}>Escorte active</span>
            <span style={{ fontSize: 10, color: tk.tt, fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(escorte.elapsed)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
            {escorte.circleMembers.map(m => {
              const name = m.profiles?.name ?? '?'
              const col  = avatarColor(name)
              const isActive = m.status !== 'inactive'
              const bgColor  = m.status === 'following' ? T.semanticSuccessSoft : m.status === 'vocal' ? 'rgba(59,180,193,0.08)' : tk.ih
              const bdColor  = m.status === 'following' ? `${T.semanticSuccess}35` : m.status === 'vocal' ? `${T.gradientStart}35` : tk.bd
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
                    <div style={{ fontSize: 10, fontWeight: 600, color: tk.tp }}>{name}</div>
                    <div style={{ fontSize: 9, color: m.status === 'following' ? T.semanticSuccess : m.status === 'vocal' ? T.gradientStart : tk.tt }}>
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
