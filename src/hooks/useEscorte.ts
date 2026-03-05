import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Escorte, EscorteCircleMember, EscorteView, RouteMode } from '@/types'

export function useEscorte(userId: string) {
  const [view, setView] = useState<EscorteView>('hub')
  const [activeEscorte, setActiveEscorte] = useState<Escorte | null>(null)
  const [circleMembers, setCircleMembers] = useState<EscorteCircleMember[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [juliaCd, setJuliaCd] = useState(120) // 2min countdown
  const watchRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const juliaCdRef = useRef<NodeJS.Timeout | null>(null)

  // ── START ESCORTE IMMEDIATE ──────────────────────
  const startEscorteImmediate = useCallback(async () => {
    if (!userId) return

    const { data: escorte, error } = await supabase
      .from('escortes')
      .insert({
        user_id: userId,
        mode: 'immediate',
        status: 'active',
        circle_notified: false,
      })
      .select()
      .single()

    if (error || !escorte) {
      console.error('startEscorteImmediate:', error)
      return
    }

    setActiveEscorte(escorte)
    await notifyCircle(escorte.id)
    setView('escorte-notifying')
    startGPSTracking(escorte.id)
    startElapsedTimer()
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
    if (!userId) return

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

    if (error || !escorte) { console.error('startTrip:', error); return }

    setActiveEscorte(escorte)
    if (params.withCircle) await notifyCircle(escorte.id)
    setView('trip-active')
    startGPSTracking(escorte.id)
    startElapsedTimer()
  }, [userId])

  // ── NOTIFY CIRCLE ────────────────────────────────
  const notifyCircle = useCallback(async (escorteId: string) => {
    // 1. Fetch trusted_contacts
    const { data: contacts } = await supabase
      .from('trusted_contacts')
      .select('contact_id')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    if (!contacts?.length) return

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
    setJuliaCd(120)
    juliaCdRef.current = setInterval(() => {
      setJuliaCd(s => {
        if (s <= 1) {
          clearInterval(juliaCdRef.current!)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [userId])

  // ── GPS TRACKING ─────────────────────────────────
  const startGPSTracking = useCallback((escorteId: string) => {
    if (!navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        await supabase
          .from('escortes')
          .update({
            last_lat: lat,
            last_lng: lng,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', escorteId)
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [])

  // ── ELAPSED TIMER ────────────────────────────────
  const startElapsedTimer = useCallback(() => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
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
      .select('*, profiles(id, name, avatar_url)')
      .eq('escorte_id', escorteId)
    if (data) setCircleMembers(data)
  }

  // ── END ESCORTE ──────────────────────────────────
  const endEscorte = useCallback(async (arrived = false) => {
    if (!activeEscorte) return

    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (juliaCdRef.current) clearInterval(juliaCdRef.current)

    await supabase
      .from('escortes')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', activeEscorte.id)

    // Sauvegarder dans trajets_recents si mode trip
    if (activeEscorte.mode === 'trip' && activeEscorte.dest_name) {
      await supabase.from('trajets_recents').insert({
        user_id: userId,
        escorte_id: activeEscorte.id,
        dest_name: activeEscorte.dest_name,
        dest_address: activeEscorte.dest_address ?? null,
        dest_lat: activeEscorte.dest_lat ?? null,
        dest_lng: activeEscorte.dest_lng ?? null,
        duration_min: Math.round(elapsed / 60),
      })
    }

    setView(arrived ? 'arrived' : 'hub')
  }, [activeEscorte, elapsed, userId])

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
      if (timerRef.current) clearInterval(timerRef.current)
      if (juliaCdRef.current) clearInterval(juliaCdRef.current)
    }
  }, [])

  return {
    view, setView,
    activeEscorte,
    circleMembers,
    elapsed,
    juliaCd,
    startEscorteImmediate,
    startTrip,
    endEscorte,
    triggerSOS,
  }
}
