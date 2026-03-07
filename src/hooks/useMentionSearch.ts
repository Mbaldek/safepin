import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type MentionProfile = {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

// ── Autocomplete profile search for @mentions ────────────────
export function useMentionSearch() {
  const [results, setResults] = useState<MentionProfile[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const q = `%${query.trim()}%`
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .or(`display_name.ilike.${q},username.ilike.${q}`)
          .limit(6)
        setResults(data ?? [])
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 280)
  }, [])

  const clear = () => setResults([])
  return { results, loading, search, clear }
}

// ── Insert mentions + send notifications ─────────────────────
export async function insertMentions(params: {
  contentType: 'story' | 'post' | 'incident'
  contentId: string
  mentionerId: string
  mentionerName: string
  mentionedUsers: MentionProfile[]
}) {
  if (!params.mentionedUsers.length) return

  // 1. Insert content_mentions rows
  const rows = params.mentionedUsers.map(u => ({
    content_type: params.contentType,
    content_id: params.contentId,
    mentioner_id: params.mentionerId,
    mentioned_user_id: u.id,
  }))

  await supabase.from('content_mentions').insert(rows)

  // 2. Notify each mentioned user
  const notifs = params.mentionedUsers.map(u => ({
    user_id: u.id,
    type: 'mention' as const,
    payload: {
      senderId: params.mentionerId,
      senderName: params.mentionerName,
      contentType: params.contentType,
      contentId: params.contentId,
    },
  }))

  await supabase.from('notifications').insert(notifs)
}
