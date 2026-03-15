import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/stores/useStore'
import { haversineMetersRaw } from '@/lib/utils'
import type { Escorte, EscorteCircleMember, EscorteView, RouteMode } from '@/types'

// ── Isolated elapsed timer — does NOT cause parent re-renders ──
export function useEscorteElapsed(isActive: boolean, startedAt?: string) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isActive) { setElapsed(0); return }

    // Initialise from startedAt if available (handles remounts)
    if (startedAt) {
      const offset = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
      setElapsed(offset)
    } else {
      setElapsed(0)
    }

    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [isActive, startedAt])

  return elapsed
}

export type UseEscorteReturn = ReturnType<typeof useEscorte>

export function useEscorte(userId: string) {
  const [view, setView] = useState<EscorteView>('hub')
  const [activeEscorte, setActiveEscorte] = useState<Escorte | null>(null)
  const [circleMembers, setCircleMembers] = useState<EscorteCircleMember[]>([])
  const [juliaCd, setJuliaCd] = useState(30) // 30s countdown
  const [juliaActive, setJuliaActive] = useState(false)
  const [escorteError, setEscorteError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [incidentsAvoided, setIncidentsAvoided] = useState(0)
  const [distanceM, setDistanceM] = useState(0)
  const watchRef = useRef<number | null>(null)
  const juliaCdRef = useRef<NodeJS.Timeout | null>(null)
  const loadingRef = useRef(false)
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  const distanceAccRef = useRef(0)

  // ── START ESCORTE IMMEDIATE ──────────────────────
  const startEscorteImmediate = useCallback(async () => {
    if (!userId || loadingRef.current) return
    loadingRef.current = true
    setIsStarting(true)
    setEscorteError(null)
    try {
      // 1. INSERT escorte
      const { data: escorte, error: insertError } = await supabase
        .from('escortes')
        .insert({
          user_id: userId,
          mode: 'immediate',
          status: 'active',
          circle_notified: false,
        })
        .select()
        .single()

      if (insertError || !escorte) {
        const msg = insertError?.message ?? 'INSERT escorte failed'
        console.error('[startEscorteImmediate] INSERT error:', insertError)
        setEscorteError(msg)
        return
      }

      setActiveEscorte(escorte)

      // 2. notifyCircle — separate try/catch so escorte proceeds even if notify fails
      try {
        await notifyCircle(escorte.id)
      } catch (notifyErr) {
        console.error('[startEscorteImmediate] notifyCircle error:', notifyErr)
      }

      // 3. Transition — always happens even if notifyCircle failed
      setView('escorte-notifying')
      startGPSTracking(escorte.id)
    } finally {
      loadingRef.current = false
      setIsStarting(false)
    }
  }, [userId])

  // ── START TRIP ───────────────────────────────────
  const startTrip = useCallback(async (params: {
    destName: string
    destLat: number
    destLng: number
    destAddress: string
    routeMode: RouteMode
    etaMinutes: number
    withCircle: boolean
  }) => {
    if (!userId || loadingRef.current) return
    loadingRef.current = true
    try {
    const { data: escorte, error } = await supabase
      .from('escortes')
      .insert({
        user_id: userId,
        mode: 'trip',
        status: 'active',
        dest_name: params.destName,
        dest_lat: params.destLat,
        dest_lng: params.destLng,
        dest_address: params.destAddress,
        route_mode: params.routeMode,
        eta_minutes: params.etaMinutes,
        circle_notified: false,
      })
      .select()
      .single()

    if (error || !escorte) { console.error('[startTrip] INSERT error:', error); return }

    setActiveEscorte(escorte)
    if (params.withCircle) {
      try {
        await notifyCircle(escorte.id)
      } catch (notifyErr) {
        console.error('[startTrip] notifyCircle error:', notifyErr)
      }
    }
    setView('trip-active')
    startGPSTracking(escorte.id)
    } finally {
      loadingRef.current = false
    }
  }, [userId])

  // ── NOTIFY CIRCLE ────────────────────────────────
  const notifyCircle = useCallback(async (escorteId: string) => {
    // 1. Fetch trusted_contacts
    const { data: contacts, error: fetchError } = await supabase
      .from('trusted_contacts')
      .select('contact_id')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    if (!contacts?.length) {
      // No contacts — activate Julia immediately for demo
      setJuliaActive(true)
      return
    }

    // 2. Insert escorte_circle rows
    await supabase.from('escorte_circle').insert(
      contacts.map(c => ({
        escorte_id: escorteId,
        contact_id: c.contact_id,
        status: 'notified',
      }))
    )

    // 3. Mark circle_notified
    await supabase
      .from('escortes')
      .update({ circle_notified: true })
      .eq('id', escorteId)

    // 4. Envoyer notification push via edge function (si dispo)
    try {
      await supabase.functions.invoke('notify-circle', {
        body: { escorte_id: escorteId, user_id: userId }
      })
    } catch { /* edge function optionnelle pour demo */ }

    // 5. Start Julia countdown (2 min → si personne ne répond)
    setJuliaCd(30)
    setJuliaActive(false)
    juliaCdRef.current = setInterval(() => {
      setJuliaCd(s => {
        if (s <= 1) {
          clearInterval(juliaCdRef.current!)
          // Julia joins — update DB + set local state immediately
          setJuliaActive(true)
          if (escorteId) {
            Promise.resolve(
              supabase
                .from('escortes')
                .update({ julia_active: true })
                .eq('id', escorteId)
            ).catch(() => {})
            supabase.functions
              .invoke('julia-join', {
                body: { escorte_id: escorteId, user_id: userId },
              })
              .catch(() => {})
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [userId])

  // ── GPS TRACKING ─────────────────────────────────
  const startGPSTracking = useCallback((escorteId: string) => {
    if (!navigator.geolocation) return
    prevCoordsRef.current = null
    distanceAccRef.current = 0
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        useStore.getState().setUserLocation({ lat, lng })
        // Accumulate walked distance
        if (prevCoordsRef.current) {
          const d = haversineMetersRaw(prevCoordsRef.current.lat, prevCoordsRef.current.lng, lat, lng)
          if (d > 3 && d < 500) { // ignore GPS jitter (<3m) and teleports (>500m)
            distanceAccRef.current += d
            setDistanceM(distanceAccRef.current)
          }
        }
        prevCoordsRef.current = { lat, lng }
        await supabase
          .from('escortes')
          .update({
            last_lat: lat,
            last_lng: lng,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', escorteId)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [])

  // ── SUBSCRIBE CIRCLE REALTIME ────────────────────
  useEffect(() => {
    if (!activeEscorte) return

    const channel = supabase
      .channel(`escorte-circle-${activeEscorte.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escorte_circle',
          filter: `escorte_id=eq.${activeEscorte.id}`,
        },
        () => fetchCircleMembers(activeEscorte.id)
      )
      .subscribe()

    fetchCircleMembers(activeEscorte.id)

    return () => { supabase.removeChannel(channel) }
  }, [activeEscorte?.id])

  const fetchCircleMembers = async (escorteId: string) => {
    const { data } = await supabase
      .from('escorte_circle')
      .select('*, profiles!escorte_circle_contact_id_profiles_fkey(id, name, avatar_url)')
      .eq('escorte_id', escorteId)
    if (data) setCircleMembers(data)
  }

  // ── END ESCORTE ──────────────────────────────────
  const endEscorte = useCallback(async (arrived = false) => {
    if (!activeEscorte) return

    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (juliaCdRef.current) clearInterval(juliaCdRef.current)

    const now = new Date()
    await supabase
      .from('escortes')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
      })
      .eq('id', activeEscorte.id)

    // Sauvegarder dans trajets_recents si mode trip
    if (activeEscorte.mode === 'trip' && activeEscorte.dest_name) {
      const elapsedSec = Math.max(0, Math.floor((now.getTime() - new Date(activeEscorte.started_at).getTime()) / 1000))
      await supabase.from('trajets_recents').insert({
        user_id: userId,
        escorte_id: activeEscorte.id,
        dest_name: activeEscorte.dest_name,
        dest_address: activeEscorte.dest_address ?? null,
        dest_lat: activeEscorte.dest_lat ?? null,
        dest_lng: activeEscorte.dest_lng ?? null,
        duration_min: Math.round(elapsedSec / 60),
      })
    }

    setView(arrived ? 'arrived' : 'hub')
  }, [activeEscorte, userId])

  // ── SOS ──────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    if (!activeEscorte) return
    await supabase
      .from('escortes')
      .update({ status: 'sos' })
      .eq('id', activeEscorte.id)
    try {
      await supabase.functions.invoke('trigger-sos', {
        body: { escorte_id: activeEscorte.id, user_id: userId }
      })
    } catch { /* optionnel pour demo */ }
  }, [activeEscorte, userId])

  // ── CLEANUP ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      if (juliaCdRef.current) clearInterval(juliaCdRef.current)
    }
  }, [])

  const reset = useCallback(() => {
    setView('hub')
    setActiveEscorte(null)
    setCircleMembers([])
  }, [])

  return {
    view, setView,
    activeEscorte,
    circleMembers,
    juliaCd,
    juliaActive, setJuliaActive,
    escorteError,
    isStarting,
    incidentsAvoided, setIncidentsAvoided,
    distanceM, setDistanceM,
    startEscorteImmediate,
    startTrip,
    endEscorte,
    triggerSOS,
    reset,
  }
}
