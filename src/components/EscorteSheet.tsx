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
import EscorteNotifyingView  from './escorte/EscorteNotifyingView'
import EscorteArrivedModal  from './escorte/EscorteArrivedModal'
import EscorteLiveView      from './escorte/EscorteLiveView'
import { fetchRoutesWithAvoidance, formatDuration, formatDistance } from '@/lib/directions'
import { scoreRoute, scoreTransitRoute, countCorridorIncidents, getStepAlerts } from '@/lib/route-scoring'
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
  const setShowWalkHistory = useStore((s) => s.setShowWalkHistory)

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
          const transitScored = routes.slice(0, 3).map((tr, i) => {
            const incidents = countCorridorIncidents(tr.coords, pins)
            return {
              id: `transit-${i}`,
              label: i === 0 ? 'Plus rapide' : i === 1 ? 'Équilibrée' : 'Moins de marche',
              color: ROUTE_COLORS[i] ?? '#94A3B8',
              coords: tr.coords,
              duration: tr.totalDuration,
              distance: 0,
              dangerScore: scoreTransitRoute(tr.steps, pins),
              steps: tr.steps,
              nearbyIncidents: incidents.count,
              nearbyPinIds: incidents.pinIds,
            }
          })
          const allTransitPinIds = new Set(transitScored.flatMap(r => r.nearbyPinIds))
          const opts: RouteOption[] = transitScored.map(r => {
            const myPinIds = new Set(r.nearbyPinIds)
            return { ...r, incidentsAvoided: [...allTransitPinIds].filter(id => !myPinIds.has(id)).length }
          })
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
          const scored = results.map(r => {
            const incidents = countCorridorIncidents(r.coords, pins)
            return {
              ...r,
              dangerScore: scoreRoute(r.coords, pins),
              nearbyIncidents: incidents.count,
              nearbyPinIds: incidents.pinIds,
            }
          })
          scored.sort((a, b) => a.dangerScore - b.dangerScore)
          const fastestIdx = scored.reduce((best, r, i) => r.duration < scored[best].duration ? i : best, 0)
          const allPinIds = new Set(scored.flatMap(r => r.nearbyPinIds))
          const opts: RouteOption[] = scored.map((r, i) => {
            const myPinIds = new Set(r.nearbyPinIds)
            return {
              id: `${routeMode}-${i}`,
              label: i === 0 ? 'Plus sûre' : (i === fastestIdx && fastestIdx !== 0) ? 'Plus rapide' : 'Équilibrée',
              color: ROUTE_COLORS[i] ?? '#94A3B8',
              coords: r.coords, duration: r.duration, distance: r.distance, dangerScore: r.dangerScore,
              nearbyIncidents: r.nearbyIncidents,
              nearbyPinIds: r.nearbyPinIds,
              incidentsAvoided: [...allPinIds].filter(id => !myPinIds.has(id)).length,
              walkSteps: r.walkSteps,
            }
          })
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
  // Auto-transition: notifying → live when first circle member responds
  useEffect(() => {
    if (
      escorte.view === 'escorte-notifying' &&
      escorte.circleMembers.some(m => m.status === 'following' || m.status === 'vocal')
    ) {
      escorte.setView('escorte-live')
    }
  }, [escorte.view, escorte.circleMembers, escorte.setView])

  const shouldHaveAudio =
    (escorte.view === 'escorte-notifying' || escorte.view === 'escorte-live' || escorte.view === 'trip-active') &&
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

    // Compute incidents avoided (max danger across routes minus selected route's danger)
    const selectedRoute = fetchedRoutes[selectedIdx] ?? fetchedRoutes[0]
    if (selectedRoute && fetchedRoutes.length > 0) {
      const maxDanger = Math.max(...fetchedRoutes.map(r => r.dangerScore))
      escorte.setIncidentsAvoided(Math.max(0, maxDanger - selectedRoute.dangerScore))
      escorte.setDistanceM(selectedRoute.distance || 0)
    }

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

      {/* CTA side-by-side */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 12 }}>
        {/* MAM */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => escorte.setView('escorte-intro')}
          style={{
            flex: 1, padding: '14px 10px', borderRadius: 14,
            background: d ? 'rgba(59,180,193,0.08)' : 'rgba(59,180,193,0.07)',
            border: `1px solid ${T.gradientStart}35`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(59,180,193,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={15} strokeWidth={1.5} color={T.gradientStart} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>Marche avec moi</div>
            <div style={{ fontSize: 9, color: tk.tt, marginTop: 2 }}>Cercle alerté · sans destination</div>
          </div>
        </motion.button>

        {/* DEST */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => escorte.setView('trip-form')}
          style={{
            flex: 1, padding: '14px 10px', borderRadius: 14,
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.20)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(167,139,250,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Navigation size={15} strokeWidth={1.5} color={'#A78BFA'} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>Trajet avec destination</div>
            <div style={{ fontSize: 9, color: tk.tt, marginTop: 2 }}>Itinéraire protégé · arrivée tracée</div>
          </div>
        </motion.button>

        {/* History pill */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowWalkHistory(true); onClose(); }}
          style={{
            width: 52, flexShrink: 0, borderRadius: 12,
            background: 'rgba(59,180,193,0.08)',
            border: '1px solid rgba(59,180,193,0.20)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,180,193,0.20) 0%, transparent 68%)', animation: 'histPulseGlow 2.6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(59,180,193,0.25)', animation: 'histPulseRing 2.6s ease-in-out infinite', animationDelay: '0.55s' }} />
          <History size={14} color={T.gradientStart} style={{ position: 'relative', zIndex: 2 }} />
          <span style={{ fontSize: 7, fontWeight: 700, color: T.gradientStart, textAlign: 'center', lineHeight: 1.2, position: 'relative', zIndex: 2, textTransform: 'uppercase' }}>
            Marches
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
      userId={userId}
      onBack={() => escorte.setView('hub')}
      onStart={escorte.startEscorteImmediate}
    />
  )

  // ── VIEW : NOTIFYING — inline view ────────────────
  const renderNotifying = () => (
    <EscorteNotifyingView
      isDark={isDark}
      escorte={escorte}
      onCancel={() => escorte.endEscorte()}
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
                            escorte.setView('trip-detail')
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
                            incidentsAvoided={route.incidentsAvoided}
                            nearbyIncidents={route.nearbyIncidents}
                            nearbyPinIds={route.nearbyPinIds}
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

  // ── VIEW : TRIP DETAIL — route detail before starting ───────
  const renderTripDetail = () => {
    const route = fetchedRoutes[selectedIdx] ?? fetchedRoutes[0]
    if (!route) return null
    const isTransit = routeMode === 'transit'
    const accentColor = isTransit ? '#3BB4C1' : '#34D399'
    const avoided = route.incidentsAvoided ?? 0
    const nearby = route.nearbyIncidents ?? 0
    const nearbyPins = pins.filter(p => route.nearbyPinIds?.includes(p.id))

    const SEV_C = { low: '#F59E0B', med: '#F97316', high: '#EF4444' } as const
    const CAT_L: Record<string, string> = {
      aggression: 'Agression', vol: 'Vol', harcelement: 'Harcèlement',
      accident: 'Accident', incivilite: 'Incivilité', alerte: 'Alerte', safe_space: 'Safe space',
    }
    const SEV_L: Record<string, string> = { low: 'Faible', med: 'Moyen', high: 'Élevé' }

    const timeAgo = (d: string) => {
      const min = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
      if (min < 1) return "à l'instant"
      if (min < 60) return `il y a ${min}min`
      const h = Math.floor(min / 60)
      if (h < 24) return `il y a ${h}h`
      return `il y a ${Math.floor(h / 24)}j`
    }

    return (
      <motion.div
        key="trip-detail"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        transition={springConfig}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      >
        {/* Mini bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(59,180,193,0.3), transparent)',
          }} />
          <button
            onClick={() => escorte.setView('trip-form')}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `1px solid ${C.borderS}`, background: C.el,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, cursor: 'pointer', color: C.t2,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>
              {isTransit ? 'Transit' : 'Route'} · {route.label}
            </div>
            <div style={{ fontSize: 10, color: C.t2 }}>
              {formatDuration(route.duration)}{route.distance ? ` · ${formatDistance(route.distance)}` : ''}
            </div>
          </div>
          <button
            onClick={handleStartTrip}
            style={{
              height: 32, padding: '0 12px', borderRadius: 9999, border: 'none',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              fontFamily: 'inherit', background: accentColor, color: 'white',
            }}
          >
            Démarrer →
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '14px 14px 20px',
          display: 'flex', flexDirection: 'column', gap: 10,
          scrollbarWidth: 'none' as const,
        }}>
          {/* Hero avoided */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 16,
            background: `${accentColor}12`, border: `1px solid ${accentColor}33`,
          }}>
            <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1, color: accentColor, flexShrink: 0 }}>
              {avoided}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tk.tp }}>incidents évités</div>
              <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>par rapport aux autres itinéraires</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 5,
                padding: '3px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                width: 'fit-content',
                background: `${accentColor}18`, border: `1px solid ${accentColor}33`, color: accentColor,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {route.label}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: tk.tp, letterSpacing: '-0.02em' }}>{formatDuration(route.duration)}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Durée</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: tk.tp, letterSpacing: '-0.02em' }}>
                {route.distance ? formatDistance(route.distance) : (isTransit ? `${route.steps?.length ?? 0} seg.` : '—')}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {route.distance ? 'km' : 'Segments'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: nearby > 0 ? '#FBBF24' : '#34D399', letterSpacing: '-0.02em' }}>{nearby}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>sur ce trajet</div>
            </div>
          </div>

          {/* Mode-specific content */}
          {isTransit && route.steps ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Détail du trajet</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {route.steps.map((step, i) => {
                  const isWalking = step.mode === 'walking'
                  const isLast = i === route.steps!.length - 1
                  const alerts = !isWalking ? getStepAlerts(step, pins) : null
                  const dotColor = isWalking ? '#34D399' : (step.lineColor || '#A78BFA')
                  const connColor = isWalking ? 'rgba(52,211,153,0.3)' : `${dotColor}66`
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', border: '2px solid white',
                          background: dotColor, boxShadow: `0 0 0 2px ${dotColor}`, marginTop: 3, flexShrink: 0,
                        }} />
                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, margin: '2px 0', background: connColor }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>
                          {i === 0 ? `Départ · ${step.from || 'Position'}` : isLast ? `Arrivée · ${step.to || 'Destination'}` : step.from || step.to || step.mode}
                        </div>
                        <div style={{ fontSize: 11, color: C.t2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            padding: '2px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: `${dotColor}18`, color: dotColor, border: `1px solid ${dotColor}33`,
                          }}>
                            {isWalking ? 'À pied' : step.line ? `${step.mode === 'rer' ? 'RER' : 'M'} ${step.line}` : step.mode.toUpperCase()}
                          </span>
                          {!isWalking && step.to && <span style={{ color: C.t2 }}>dir. {step.to}</span>}
                          <span style={{ fontSize: 10, color: C.t3 }}>
                            {isWalking ? `${formatTransitDuration(step.duration)} · ${Math.round((step.duration / 60) * 80)}m` : `${step.stops ?? '?'} arrêts · ${formatTransitDuration(step.duration)}`}
                          </span>
                        </div>
                        {alerts && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
                            padding: '4px 8px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                            background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.24)', color: '#FBBF24',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {alerts.count} incident{alerts.count > 1 ? 's' : ''} signalé{alerts.count > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Incidents évités list */}
              {nearbyPins.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {avoided > 0 ? 'Incidents évités' : 'Incidents à proximité'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {nearbyPins.slice(0, 5).map(pin => {
                      const sevColor = SEV_C[pin.severity as keyof typeof SEV_C] ?? '#F59E0B'
                      return (
                        <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: tk.tp }}>{CAT_L[pin.category] ?? pin.category}</div>
                            <div style={{ fontSize: 10, color: C.t3 }}>{pin.address ? `${pin.address} · ` : ''}{timeAgo(pin.created_at)}</div>
                          </div>
                          <div style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: `${sevColor}18`, color: sevColor,
                          }}>
                            {SEV_L[pin.severity] ?? pin.severity}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Walk steps / itinéraire */}
              {route.walkSteps && route.walkSteps.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Itinéraire</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {route.walkSteps.map((ws, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 7,
                          background: 'rgba(59,180,193,0.12)', border: '1px solid rgba(59,180,193,0.24)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3BB4C1" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tk.tp, flex: 1 }}>{ws.name}</div>
                        <div style={{ fontSize: 10, color: C.t3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {formatDistance(ws.distance)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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

  // ── VIEW : ESCORTE LIVE — inline view ─────────
  const renderLive = () => (
    <EscorteLiveView
      isDark={isDark}
      escorte={escorte}
      onEndCall={() => endCallGlobal()}
      onStop={() => escorte.endEscorte(false)}
    />
  )

  // ─────────────────────────────────────────────
  //  SHEET CONTAINER
  // ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0, height: sheetH }}
      exit={{ y: '100%' }}
      transition={springConfig}
      className="sheet-glow sheet-highlight"
      style={{
        position:            'absolute',
        bottom:              64,
        left:                0,
        right:               0,
        background:          d ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)',
        backdropFilter:      'blur(40px)',
        WebkitBackdropFilter:'blur(40px)',
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
          {escorte.view === 'escorte-live'    && renderLive()}
          {escorte.view === 'trip-form'        && renderTripForm()}
          {escorte.view === 'trip-detail'      && renderTripDetail()}
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
