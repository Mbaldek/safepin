'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Navigation, Search, Clock,
  ChevronLeft, ChevronRight, Check,
  Star, MapPin, X,
  ArrowUpDown, History
} from 'lucide-react'
import { T, tok, springConfig } from '@/lib/tokens'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { useFavoris }       from '@/hooks/useFavoris'
import { useRecents }       from '@/hooks/useRecents'
import { useDestinationSearch, formatSearchDistance } from '@/hooks/useDestinationSearch'
import type { SearchResult } from '@/hooks/useDestinationSearch'
import { FavoriButton }     from './escorte/FavoriButton'
import { calcETA, calcDist } from '@/lib/escorteHelpers'
import { getColors, getCardStyle, getBtnPrimary, SHEET_HEIGHTS } from './escorte/escorte-styles'
import EscorteIntroView     from './escorte/EscorteIntroView'
import EscorteNotifyingModal from './escorte/EscorteNotifyingModal'
import EscorteArrivedModal  from './escorte/EscorteArrivedModal'
import EscorteLiveOverlay   from './escorte/EscorteLiveOverlay'
import { fetchRoutesWithAvoidance, formatDuration, formatDistance } from '@/lib/directions'
import { scoreRoute, scoreTransitRoute } from '@/lib/route-scoring'
import RouteCard from '@/components/trip/RouteCard'
import type { RouteOption, RouteSegment } from '@/stores/useStore'
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
  const C = getColors(isDark)

  // ── Hooks ──────────────────────────────────────
  const startCallGlobal = useAudioCall((s) => s.startCall)
  const endCallGlobal = useAudioCall((s) => s.endCall)
  const { favoris } = useFavoris(userId)
  const { recents } = useRecents(userId)
  const destSearch   = useDestinationSearch(userLat, userLng)
  const departSearch = useDestinationSearch(userLat, userLng)
  const { setPendingRoutes, setActiveRoute, setMapFlyTo, setDepartDragPin, departDragPin, pendingRoutes: storeRoutes, setTripPrefill, setSelectedRouteIdx, setTransitSegments } = useStore()
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
            dangerScore: scoreTransitRoute(tr.steps, pins),
            steps: tr.steps,
          }))
          setFetchedRoutes(opts)
          setSelectedIdx(0)
          setSelectedRouteIdx(0)
          setRouteInfo({ duration: opts[0].duration, distance: 0 })
          setPendingRoutes(opts)
          if (opts[0].steps) {
            setTransitSegments(opts[0].steps.map(s => ({
              coords: s.coords,
              color: s.mode === 'walking' ? '#94A3B8' : (s.lineColor || '#3BB4C1'),
              dashed: s.mode === 'walking',
            })))
          }
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
  const cardSt = getCardStyle(isDark)
  const btnPrimary = getBtnPrimary(C)

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

  // ── VIEW : ESCORTE INTRO — extracted ───────────
  const renderEscorteIntro = () => (
    <EscorteIntroView
      isDark={isDark}
      escorte={escorte}
      onBack={() => escorte.setView('hub')}
      onStart={escorte.startEscorteImmediate}
    />
  )

  // ── VIEW : NOTIFYING — extracted ────────────────
  const renderNotifying = () => (
    <EscorteNotifyingModal
      isDark={isDark}
      escorte={escorte}
      onCancel={() => escorte.endEscorte()}
      onStart={() => escorte.setView('escorte-live')}
    />
  )

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
                            if (route.steps) {
                              const segs: RouteSegment[] = route.steps.map(s => ({
                                coords: s.coords,
                                color: s.mode === 'walking' ? '#94A3B8' : (s.lineColor || '#3BB4C1'),
                                dashed: s.mode === 'walking',
                              }))
                              setTransitSegments(segs)
                            } else {
                              setTransitSegments(null)
                            }
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
                            steps={route.steps}
                            pins={pins}
                            onStepLocationTap={(lat, lng) => setMapFlyTo({ lat, lng, zoom: 16 })}
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

  // ── VIEW : ARRIVED — extracted ─────────────────
  const renderArrived = () => (
    <EscorteArrivedModal
      isDark={isDark}
      escorte={escorte}
      onClose={() => { escorte.setView('hub'); onClose() }}
      onShowSummary={() => toast.info('Résumé du trajet bientôt disponible')}
    />
  )

  // ─────────────────────────────────────────────
  //  RENDER ESCORTE LIVE (overlay plein ecran) — extracted
  // ─────────────────────────────────────────────
  if (escorte.view === 'escorte-live') {
    return (
      <EscorteLiveOverlay
        isDark={isDark}
        escorte={escorte}
        onEndCall={() => escorte.endEscorte(false)}
        onStop={() => escorte.endEscorte(false)}
      />
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
