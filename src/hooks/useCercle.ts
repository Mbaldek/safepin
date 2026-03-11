'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CircleMember, CircleMessage } from '@/types'

const isDev = process.env.NODE_ENV === 'development'
const FIVE_MIN = 5 * 60 * 1000

export function useCercle(userId: string) {
  const [members, setMembers] = useState<CircleMember[]>([])
  const [messages, setMessages] = useState<CircleMessage[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const membersRef = useRef<CircleMember[]>([])
  const memberIdsRef = useRef<Set<string>>(new Set())

  // ── MEMBERS (single RPC) ─────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase.rpc('circle_members_enriched', {
        p_user_id: userId,
      })

      if (error) {
        if (isDev) console.error('[useCercle] circle_members_enriched', error)
        return
      }
      if (!data?.length) { setMembers([]); memberIdsRef.current = new Set(); return }

      const now = Date.now()
      const mapped: CircleMember[] = (data as Array<{
        contact_row_id: string
        member_id: string
        member_name: string
        avatar_url: string | null
        last_seen_at: string | null
        is_watching: boolean
        contact_relation: string | null
        trip_destination: string | null
        trip_eta_minutes: number | null
      }>).map((row) => {
        const hasTrip = row.is_watching && row.trip_destination
        let status: CircleMember['status'] = 'offline'
        if (hasTrip) {
          status = 'trip'
        } else if (row.last_seen_at && now - new Date(row.last_seen_at).getTime() < FIVE_MIN) {
          status = 'online'
        }

        return {
          id: row.member_id,
          name: row.member_name,
          avatar_url: row.avatar_url,
          status,
          last_seen: row.last_seen_at,
          is_verified: false,
          trip: status === 'trip' && row.trip_destination
            ? { destination: row.trip_destination, eta_minutes: row.trip_eta_minutes ?? 0, progress_pct: 0 }
            : null,
        }
      })

      // Deduplicate by member_id (in case of bidirectional rows)
      const seen = new Set<string>()
      const deduped: CircleMember[] = []
      for (const m of mapped) {
        if (!seen.has(m.id)) { seen.add(m.id); deduped.push(m) }
      }

      setMembers(deduped)
      membersRef.current = deduped
      memberIdsRef.current = new Set(deduped.map(m => m.id))
    } catch (err) {
      if (isDev) console.error('[useCercle] fetchMembers', err)
    }
  }, [userId])

  // ── MESSAGES (scoped to circle members) ──────────────────
  const fetchMessages = useCallback(async () => {
    if (!userId) return

    try {
      // Get member IDs first (may already be loaded)
      let circleIds = Array.from(memberIdsRef.current)
      if (circleIds.length === 0) {
        // Fallback: quick fetch of contact IDs only
        const { data: contacts } = await supabase
          .from('trusted_contacts')
          .select('user_id, contact_id')
          .or(`user_id.eq.${userId},contact_id.eq.${userId}`)
          .eq('status', 'accepted')
        if (contacts) {
          circleIds = contacts.map(c => c.user_id === userId ? c.contact_id : c.user_id).filter(Boolean)
        }
      }

      // Include self in allowed senders
      const allowedSenders = [...new Set([userId, ...circleIds])]

      const { data, error } = await supabase
        .from('circle_messages')
        .select('*, profiles!circle_messages_sender_id_fkey(name, display_name)')
        .in('sender_id', allowedSenders)
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
          sender_name: (profile?.display_name as string) || (profile?.name as string) || '',
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

  // ── INIT + REALTIME ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    setLoading(true)
    // Fetch members first so memberIdsRef is populated for messages
    fetchMembers()
      .then(() => fetchMessages())
      .finally(() => setLoading(false))

    const channel = supabase
      .channel(`circle-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_messages',
        },
        (payload) => {
          const m = payload.new as Record<string, unknown>
          const senderId = m.sender_id as string

          // Only show messages from circle members or self
          if (senderId !== userId && !memberIdsRef.current.has(senderId)) return

          const memberName = membersRef.current.find(x => x.id === senderId)?.name ?? ''
          const newMsg: CircleMessage = {
            id: m.id as string,
            sender_id: senderId,
            sender_name: memberName,
            content: m.content as string,
            type: m.type as CircleMessage['type'],
            media_url: (m.media_url as string | null) ?? null,
            created_at: m.created_at as string,
            is_safe_arrival: (m.is_safe_arrival as boolean) ?? false,
          }
          setMessages(prev => {
            const withoutTemp = prev.filter(x => !x.id.startsWith('temp-') || x.sender_id !== senderId)
            if (withoutTemp.some(x => x.id === newMsg.id)) return prev
            return [...withoutTemp, newMsg]
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, fetchMembers, fetchMessages])

  // ── SEND MESSAGE ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, type: string = 'text', media_url?: string) => {
      if (!userId || (!content.trim() && !media_url)) return

      const tempId = `temp-${Date.now()}`
      const optimistic: CircleMessage = {
        id: tempId,
        sender_id: userId,
        sender_name: '',
        content: content.trim(),
        type: type as CircleMessage['type'],
        media_url: media_url ?? null,
        created_at: new Date().toISOString(),
        is_safe_arrival: false,
      }
      setMessages(prev => [...prev, optimistic])

      try {
        const { error } = await supabase.from('circle_messages').insert({
          sender_id: userId,
          content: content.trim(),
          type,
          ...(media_url ? { media_url } : {}),
        })
        if (error) {
          setMessages(prev => prev.filter(m => m.id !== tempId))
          if (isDev) console.error('[useCercle] sendMessage', error)
        }
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        if (isDev) console.error('[useCercle] sendMessage', err)
      }
    },
    [userId]
  )

  // ── ONLINE COUNT ─────────────────────────────────────────
  const onlineCount = useMemo(
    () => members.filter((m) => m.status !== 'offline').length,
    [members]
  )

  return { members, messages, sendMessage, loading, onlineCount }
}
