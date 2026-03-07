'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CircleMember, CircleMessage } from '@/types'

const isDev = process.env.NODE_ENV === 'development'

export function useCercle(userId: string) {
  const [members, setMembers] = useState<CircleMember[]>([])
  const [messages, setMessages] = useState<CircleMessage[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── MEMBERS ────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!userId) return

    try {
      const { data: contacts, error } = await supabase
        .from('trusted_contacts')
        .select('id, user_id, contact_id, is_watching, status')
        .eq('user_id', userId)
        .eq('status', 'accepted')

      if (error) {
        if (isDev) console.error('[useCercle] fetchMembers', error)
        return
      }
      if (!contacts?.length) { setMembers([]); return }

      const contactIds = contacts.map((c: Record<string, unknown>) => c.contact_id as string).filter(Boolean)

      // Fetch profiles for all contacts
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, username, avatar_url, last_seen_at')
        .in('id', contactIds)

      const profileMap = new Map<string, Record<string, unknown>>()
      if (profiles) {
        for (const p of profiles) profileMap.set(p.id as string, p as Record<string, unknown>)
      }

      const { data: activeTrips } = await supabase
        .from('trips')
        .select('user_id, dest_address, eta_minutes')
        .in('user_id', contactIds)
        .eq('status', 'active')

      const tripMap = new Map<string, { destination: string; eta_minutes: number }>()
      if (activeTrips) {
        for (const t of activeTrips) {
          tripMap.set(t.user_id as string, {
            destination: (t.dest_address as string) ?? '',
            eta_minutes: (t.eta_minutes as number) ?? 0,
          })
        }
      }

      const now = Date.now()
      const FIVE_MIN = 5 * 60 * 1000

      const mapped: CircleMember[] = contacts.map((c: Record<string, unknown>) => {
        const pid = (c.contact_id as string) ?? ''
        const p = profileMap.get(pid) ?? null
        const lastSeen = (p?.last_seen_at as string | null) ?? null
        const isWatching = (c.is_watching as boolean) ?? false
        const trip = tripMap.get(pid)

        let status: CircleMember['status'] = 'offline'
        if (isWatching && trip) {
          status = 'trip'
        } else if (lastSeen && now - new Date(lastSeen).getTime() < FIVE_MIN) {
          status = 'online'
        }

        const memberName = (p?.display_name as string) || (p?.username as string) || (p?.name as string) || 'Membre'

        return {
          id: pid,
          name: memberName,
          avatar_url: (p?.avatar_url as string | null) ?? null,
          status,
          last_seen: lastSeen,
          is_verified: false,
          trip: status === 'trip' && trip
            ? { destination: trip.destination, eta_minutes: trip.eta_minutes, progress_pct: 0 }
            : null,
        }
      })

      setMembers(mapped)
    } catch (err) {
      if (isDev) console.error('[useCercle] fetchMembers', err)
    }
  }, [userId])

  // ── MESSAGES ───────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('circle_messages')
        .select('*, profiles!circle_messages_sender_id_fkey(name)')
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        if (isDev) console.error('[useCercle] fetchMessages', error)
        return
      }

      const mapped: CircleMessage[] = (data ?? []).map((m: Record<string, unknown>) => {
        const profile = m.profiles as Record<string, unknown> | null
        return {
          id: m.id as string,
          sender_id: m.sender_id as string,
          sender_name: (profile?.name as string) ?? '',
          content: m.content as string,
          type: m.type as CircleMessage['type'],
          media_url: (m.media_url as string | null) ?? null,
          created_at: m.created_at as string,
          is_safe_arrival: (m.is_safe_arrival as boolean) ?? false,
        }
      })

      setMessages(mapped)
    } catch (err) {
      if (isDev) console.error('[useCercle] fetchMessages', err)
    }
  }, [userId])

  // ── INIT + REALTIME ────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    setLoading(true)
    Promise.all([fetchMembers(), fetchMessages()]).finally(() => setLoading(false))

    const channel = supabase
      .channel(`circle-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_messages',
        },
        () => fetchMessages()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, fetchMembers, fetchMessages])

  // ── SEND MESSAGE ───────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, type: string = 'text') => {
      if (!userId || !content.trim()) return

      try {
        const { error } = await supabase.from('circle_messages').insert({
          sender_id: userId,
          content: content.trim(),
          type,
        })
        if (error && isDev) console.error('[useCercle] sendMessage', error)
      } catch (err) {
        if (isDev) console.error('[useCercle] sendMessage', err)
      }
    },
    [userId]
  )

  // ── ONLINE COUNT ───────────────────────────────────────
  const onlineCount = useMemo(
    () => members.filter((m) => m.status !== 'offline').length,
    [members]
  )

  return { members, messages, sendMessage, loading, onlineCount }
}
