'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Send, Navigation, Search, Shield, Clock,
  ChevronLeft, ChevronRight, Check, AlertTriangle,
  Star, MapPin, Zap, Mic, X, MoreHorizontal, Briefcase, Sparkles,
  Footprints, Train, Bike, Car, Edit3, ArrowUpDown, History
} from 'lucide-react'
import { T, tok, springConfig, gentleSpring } from '@/lib/tokens'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { useFavoris }       from '@/hooks/useFavoris'
import { useRecents }       from '@/hooks/useRecents'
import { useDestinationSearch, formatSearchDistance } from '@/hooks/useDestinationSearch'
import type { SearchResult } from '@/hooks/useDestinationSearch'
import { FavoriButton }     from './escorte/FavoriButton'
import {
  formatElapsed, calcETA, calcDist, avatarColor
} from '@/lib/escorteHelpers'
import { fetchRoutesWithAvoidance, formatDuration, formatDistance } from '@/lib/directions'
import { scoreRoute } from '@/lib/route-scoring'
import RouteCard from '@/components/trip/RouteCard'
import type { RouteOption } from '@/stores/useStore'
import { fetchTransitRoute, formatTransitDuration } from '@/lib/transit'
import { useStore } from '@/stores/useStore'
import FavorisManager from './FavorisManager'
import { useToast } from '@/hooks/useToast'
import type { FavoriTrajet, MapboxSuggestion, RouteMode } from '@/types'
import { useAudioCall } from '@/stores/useAudioCall'

interface Props {
  userId:    string
  isDark:    boolean
  userLat?:  number
  userLng?:  number
  escorte:   UseEscorteReturn
  onClose:   () => void
}

export default function EscorteSheet({ userId, isDark, userLat, userLng, escorte, onClose }: Props) {
  const toast = useToast()
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
  const startCallGlobal = useAudioCall((s) => s.startCall)
  const endCallGlobal = useAudioCall((s) => s.endCall)
  const { favoris } = useFavoris(userId)
  const { recents } = useRecents(userId)
  const destSearch   = useDestinationSearch(userLat, userLng)
  const departSearch = useDestinationSearch(userLat, userLng)
  const { setPendingRoutes, setActiveRoute, setMapFlyTo, setDepartDragPin, departDragPin, pendingRoutes: storeRoutes, setTripPrefill, setSelectedRouteIdx } = useStore()
  const pins = useStore((s) => s.pins)
  const setShowWalkWithMe  = useStore((s) => s.setShowWalkWithMe)
  const setShowWalkHistory = useStore((s) => s.setShowWalkHistory)
  const setShowTripHistory = useStore((s) => s.setShowTripHistory)

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
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteOption[]>([])
  const [selectedIdx, setSelectedIdx]     = useState(0)

  // ── Consume tripPrefill from store (set when navigating from PinDetailSheet) ──
  useEffect(() => {
    const prefill = useStore.getState().tripPrefill
    if (prefill?.destCoords) {
      setSelectedDest({
        id: 'prefill',
        place_name: prefill.destination ?? '',
        text: prefill.destination ?? '',
        center: prefill.destCoords,
        place_type: ['place'],
      })
      setQuery(prefill.destination ?? '')
      setTripPrefill(null)
      escorte.setView('trip-form')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // ── Fetch multi-route + score when depart + dest + mode change ─
  useEffect(() => {
    if (!departCoords || !selectedDest) {
      setRouteInfo(null)
      setFetchedRoutes([])
      setPendingRoutes(null)
      return
    }

    const fetchId = ++routeFetchRef.current
    setLoadingRoute(true)

    const from = departCoords
    const to = selectedDest.center
    const ROUTE_COLORS = ['#34D399', '#F5C341', '#EF4444']

    ;(async () => {
      try {
        if (routeMode === 'transit') {
          const routes = await fetchTransitRoute(from, to)
          if (fetchId !== routeFetchRef.current) return
          if (!routes.length) { setRouteInfo(null); setFetchedRoutes([]); setPendingRoutes(null); setLoadingRoute(false); return }
          const opts: RouteOption[] = routes.slice(0, 3).map((tr, i) => ({
            id: `transit-${i}`,
            label: i === 0 ? 'Plus rapide' : i === 1 ? 'Équilibrée' : 'Moins de marche',
            color: ROUTE_COLORS[i] ?? '#94A3B8',
            coords: tr.coords,
            duration: tr.totalDuration,
            distance: 0,
            dangerScore: scoreRoute(tr.coords, pins),
          }))
          setFetchedRoutes(opts)
          setSelectedIdx(0)
          setSelectedRouteIdx(0)
          setRouteInfo({ duration: opts[0].duration, distance: 0 })
          setPendingRoutes(opts)
        } else {
          const results = await fetchRoutesWithAvoidance(from, to, routeMode, pins)
          if (fetchId !== routeFetchRef.current) return
          if (!results.length) { setRouteInfo(null); setFetchedRoutes([]); setPendingRoutes(null); setLoadingRoute(false); return }
          const scored = results.map(r => ({ ...r, dangerScore: scoreRoute(r.coords, pins) }))
          scored.sort((a, b) => a.dangerScore - b.dangerScore)
          const fastestIdx = scored.reduce((best, r, i) => r.duration < scored[best].duration ? i : best, 0)
          const opts: RouteOption[] = scored.map((r, i) => ({
            id: `${routeMode}-${i}`,
            label: i === 0 ? 'Plus sûre' : (i === fastestIdx && fastestIdx !== 0) ? 'Plus rapide' : 'Équilibrée',
            color: ROUTE_COLORS[i] ?? '#94A3B8',
            coords: r.coords, duration: r.duration, distance: r.distance, dangerScore: r.dangerScore,
          }))
          setFetchedRoutes(opts)
          setSelectedIdx(0)
          setSelectedRouteIdx(0)
          setRouteInfo({ duration: opts[0].duration, distance: opts[0].distance })
          setPendingRoutes(opts)
        }
      } catch {
        if (fetchId === routeFetchRef.current) { setRouteInfo(null); setFetchedRoutes([]); setPendingRoutes(null) }
      } finally {
        if (fetchId === routeFetchRef.current) setLoadingRoute(false)
      }
    })()
  }, [departCoords, selectedDest, routeMode, setPendingRoutes, pins])

  // ── Fly to destination when selected ─────────
  useEffect(() => {
    if (!selectedDest) return
    const [lng, lat] = selectedDest.center
    setMapFlyTo({ lat, lng, zoom: 14 })
  }, [selectedDest, setMapFlyTo])

  // ── Defensive cleanup: clear pending routes when trip goes active ──
  useEffect(() => {
    if (escorte.view === 'trip-active') {
      setPendingRoutes(null)
    }
  }, [escorte.view, setPendingRoutes])

  // ── Start/stop global audio call for escorte vocal ──
  const shouldHaveAudio =
    (escorte.view === 'escorte-notifying' || escorte.view === 'trip-active') &&
    !!escorte.activeEscorte &&
    escorte.circleMembers.some(m => m.status === 'vocal')

  useEffect(() => {
    if (shouldHaveAudio && escorte.activeEscorte) {
      startCallGlobal({
        roomName: `escorte-${escorte.activeEscorte.id}`,
        source: 'escorte',
        sourceId: escorte.activeEscorte.id,
        title: 'Canal audio actif',
        participantNames: escorte.circleMembers
          .filter(m => m.status === 'vocal' || m.status === 'following')
          .map(m => m.profiles?.name)
          .filter((n): n is string => Boolean(n))
          .slice(0, 2),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldHaveAudio])

  // ── Sheet height per view ──────────────────────
  const SHEET_HEIGHTS: Record<string, string> = {
    'hub':               '52vh',
    'escorte-intro':     '50vh',
    'escorte-notifying': '52vh',
    'escorte-live':      '72vh',
    'trip-form':         '50vh',
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
    const route = storeRoutes?.[selectedIdx] ?? storeRoutes?.[0]
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
          <div style={{ fontSize: 13, fontWeight: 700, color: tk.tp, marginBottom: 2 }}>
            Mon trajet
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

      {/* Keyframes for history pill pulse */}
      <style>{`
        @keyframes histPulseGlow {
          0%,100% { transform: scale(0.6); opacity: 0.55; }
          50%      { transform: scale(1.45); opacity: 0; }
        }
        @keyframes histPulseRing {
          0%,100% { transform: scale(0.65); opacity: 0.5; }
          50%      { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      {/* CTA 1 — Marche avec moi */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 8 }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowWalkWithMe(true)}
          style={{
            flex:           1,
            background:     d ? 'rgba(59,180,193,0.08)' : 'rgba(59,180,193,0.07)',
            border:         `1px solid ${T.gradientStart}35`,
            borderRadius:   T.radiusLg,
            padding:        '14px',
            display:        'flex',
            alignItems:     'center',
            gap:            12,
            cursor:         'pointer',
            textAlign:      'left',
          }}
        >
          <div className="escorte-ico-teal" style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'rgba(59,180,193,0.12)',
          }}>
            <Users size={20} strokeWidth={1.5} color={T.gradientStart} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tk.tp, marginBottom: 2 }}>
              Marche avec moi
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
        {/* History pill */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowTripHistory(false); setShowWalkHistory(true); onClose(); }}
          style={{
            width: 62, flexShrink: 0,
            borderRadius: 12,
            background: 'rgba(59,180,193,0.08)',
            border: '1px solid rgba(59,180,193,0.20)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,180,193,0.20) 0%, transparent 68%)', animation: 'histPulseGlow 2.6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(59,180,193,0.25)', animation: 'histPulseRing 2.6s ease-in-out infinite', animationDelay: '0.55s' }} />
          <History size={15} color={T.gradientStart} style={{ position: 'relative', zIndex: 2 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: T.gradientStart, textAlign: 'center', lineHeight: 1.3, position: 'relative', zIndex: 2, textTransform: 'uppercase' }}>
            Historique
          </span>
        </button>
      </div>

      {/* CTA 2 — Trajet destination */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 12 }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => escorte.setView('trip-form')}
          style={{
            flex: 1, background: 'rgba(167,139,250,0.07)', border: `1px solid rgba(167,139,250,0.20)`,
            borderRadius: T.radiusLg, padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div className="escorte-ico-violet" style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'rgba(167,139,250,0.12)',
          }}>
            <Navigation size={20} strokeWidth={1.5} color={'#A78BFA'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.tp, marginBottom: 2 }}>
              Trajet avec destination
            </div>
            <div style={{ fontSize: 11, color: tk.tt }}>Itineraire protege · arrivee tracee</div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} color={'#A78BFA'} />
        </motion.button>
        {/* History pill */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowWalkHistory(false); setShowTripHistory(true); onClose(); }}
          style={{
            width: 62, flexShrink: 0,
            borderRadius: 12,
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.20)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 68%)', animation: 'histPulseGlow 2.6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(167,139,250,0.25)', animation: 'histPulseRing 2.6s ease-in-out infinite', animationDelay: '0.55s' }} />
          <History size={15} color={'#A78BFA'} style={{ position: 'relative', zIndex: 2 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: '#A78BFA', textAlign: 'center', lineHeight: 1.3, position: 'relative', zIndex: 2, textTransform: 'uppercase' }}>
            Historique
          </span>
        </button>
      </div>

      <div style={{ height: 1, background: tk.bd, margin: '0 0 10px' }} />

      {/* Favoris row */}
      <button
        onClick={() => setShowFavoris(true)}
        style={{
          width: '100%', background: 'rgba(245,195,65,0.06)',
          border: '1px solid rgba(245,195,65,0.18)', borderRadius: 12,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
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

      {/* Recents */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tk.tt }}>
          Recents
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: T.gradientStart, cursor: 'pointer' }}>
          Voir tout
        </span>
      </div>

      {recents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: tk.tt }}>
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
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 6px', borderRadius: 10, marginBottom: 1, textAlign: 'left',
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: tk.ih, border: `1px solid ${tk.bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={11} strokeWidth={1.5} color={tk.tt} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: tk.tp }}>{r.dest_name}</div>
            <div style={{ fontSize: 9, color: tk.tt, marginTop: 1 }}>
              {new Date(r.used_at).toLocaleDateString('fr-FR', { weekday: 'short' })}
              {r.duration_min ? ` · ${r.duration_min} min` : ''}
            </div>
          </div>
          <ChevronRight size={11} strokeWidth={1.5} color={tk.tt} />
        </motion.button>
      ))}
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
          <div style={{ fontSize: 14, fontWeight: 600, color: tk.tp }}>Marche avec moi</div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{
              ...btnPrimary,
              width: 'auto', padding: '7px 14px',
              fontSize: 12, gap: 6, borderRadius: 12,
              opacity: escorte.isStarting ? 0.7 : 1,
              cursor: escorte.isStarting ? 'default' : 'pointer',
            }}
            onClick={escorte.startEscorteImmediate}
            disabled={escorte.isStarting}
          >
            <Users size={12} strokeWidth={2} />
            {escorte.isStarting ? 'Connexion...' : 'Informer mon cercle'}
          </motion.button>
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
      <>
        {/* Scrim */}
        <motion.div
          key="notifying-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 299,
          }}
        />

        {/* Modal card */}
        <motion.div
          key="notifying-card"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={springConfig}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            x: '-50%',
            y: '-50%',
            width: '88%',
            maxWidth: 340,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 20,
            boxShadow: T.shadowLg,
            padding: 0,
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Gradient accent strip */}
          <div style={{
            height: 4,
            background: 'linear-gradient(90deg, #3BB4C1, #A78BFA)',
            borderRadius: '20px 20px 0 0',
          }} />

          <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Row 1 — Icon + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.div
                animate={!hasResponded ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(59,180,193,0.15), rgba(167,139,250,0.15))',
                  border: '1px solid rgba(59,180,193,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Users size={16} strokeWidth={1.5} color="#3BB4C1" />
              </motion.div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                {hasResponded
                  ? `${activeCount} contact${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`
                  : 'Notification envoyée · En attente…'}
              </span>
            </div>

            {/* Row 2 — Circle member avatars */}
            {escorte.circleMembers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {escorte.circleMembers.slice(0, 5).map((m, i) => {
                  const name = m.profiles?.name ?? '?'
                  const col = avatarColor(name)
                  return (
                    <div key={m.id} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${col}25`,
                      border: '2px solid var(--surface-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: col,
                      marginLeft: i > 0 ? -6 : 0,
                      flexShrink: 0,
                    }}>
                      {name[0]}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Row 3 — Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => escorte.endEscorte()}
                style={{
                  flex: 1, padding: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  borderRadius: 99,
                  fontFamily: 'inherit', fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => escorte.setView('escorte-live')}
                style={{
                  flex: 2, padding: '10px 16px',
                  background: 'linear-gradient(135deg, #3BB4C1, #A78BFA)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 99,
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {hasResponded ? 'Continuer →' : 'Démarrer →'}
              </button>
            </div>
          </div>
        </motion.div>
      </>
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
            fontSize: 13,
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
              <div style={{ fontSize: 14, fontWeight: 600, color: tk.tp }}>Choisir le depart</div>
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
          flex:1, overflowY:'auto', padding:'9px 14px 16px',
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
            {selectedDest && (
              <button
                onClick={handleStartTrip}
                disabled={escorte.isStarting}
                style={{
                  background: C.btn, color: C.btnTxt,
                  padding:'8px 16px', borderRadius:99,
                  fontSize:14, fontWeight:600, border:'none',
                  cursor: escorte.isStarting ? 'default' : 'pointer',
                  opacity: escorte.isStarting ? 0.7 : 1,
                  fontFamily:'inherit', flexShrink:0,
                }}
              >
                {escorte.isStarting ? 'Démarrage…' : `${routeDurationLabel ?? 'Démarrer'} →`}
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
                  fontSize:16, fontFamily:'inherit', color: C.btn, outline:'none',
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

              {/* Itinéraires */}
              {fetchedRoutes.length > 0 && (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 0 2px' }}>
                    <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' as const, color: C.t3 }}>
                      Itinéraires
                    </span>
                  </div>
                  <div>
                    {fetchedRoutes.map((route, idx) => (
                      <div key={route.id}>
                        <button
                          onClick={() => {
                            setSelectedIdx(idx)
                            setSelectedRouteIdx(idx)
                            setRouteInfo({ duration: route.duration, distance: route.distance })
                          }}
                          style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left' as const }}
                        >
                          <RouteCard
                            color={route.color}
                            label={route.label}
                            duration={formatDuration(route.duration)}
                            distance={route.distance ? formatDistance(route.distance) : ''}
                            isSelected={selectedIdx === idx}
                            isDark={isDark}
                          />
                        </button>
                        {idx < fetchedRoutes.length - 1 && (
                          <div style={{ height:1, background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {loadingRoute && fetchedRoutes.length === 0 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:16, color: C.t3, fontSize:12 }}>
                  Recherche d&apos;itinéraires…
                </div>
              )}

              {/* Escorte toggle — walk et transit uniquement */}
              {(routeMode === 'walk' || routeMode === 'transit') && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Users size={12} strokeWidth={1.5} color="#3BB4C1" />
                    <span style={{ fontSize:11, fontWeight:600, color:'#3BB4C1' }}>
                      Veille cercle
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
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 299,
        }}
      />

      {/* Modal card */}
      <motion.div
        key="arrived"
        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, x: '-50%', y: '-50%' }}
        transition={gentleSpring}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          width: '88%', maxWidth: 360,
          borderRadius: 24,
          background: 'var(--surface-card)',
          zIndex: 300,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-default)',
          padding: '28px 24px 24px',
          textAlign: 'center',
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

        <div style={{ fontSize: 20, fontWeight: 300, color: tk.tp, marginBottom: 4 }}>Vous etes arrivee !</div>
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
              <div style={{ fontSize: 17, fontWeight: 600, color: s.color }}>{s.val}</div>
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
        <button style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: T.gradientStart, marginTop: 4 }} onClick={() => toast.info('Résumé du trajet bientôt disponible')}>
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
            <span style={{ fontSize: 13, fontWeight: 600, color: tk.tp, flex: 1 }}>Trajet en cours</span>
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
            Arreter
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, scrollbarWidth: 'none' }}>

        {/* Audio channel — now rendered globally by FloatingCallPill */}

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
