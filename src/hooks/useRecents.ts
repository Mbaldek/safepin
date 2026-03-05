import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { TrajetRecent } from '@/types'

export function useRecents(userId: string) {
  const [recents, setRecents] = useState<TrajetRecent[]>([])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('trajets_recents')
      .select('*')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecents(data ?? []))
  }, [userId])

  return { recents }
}
