import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { FavoriTrajet } from '@/types'

export function useFavoris(userId: string) {
  const [favoris, setFavoris]   = useState<FavoriTrajet[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('favoris_trajets')
      .select('*')
      .eq('user_id', userId)
      .order('position')
      .then(({ data }) => {
        setFavoris(data ?? [])
        setLoading(false)
      })
  }, [userId])

  const addFavori = async (f: Omit<FavoriTrajet, 'id' | 'user_id' | 'created_at' | 'position'>) => {
    const { data } = await supabase
      .from('favoris_trajets')
      .insert({ ...f, user_id: userId, position: favoris.length })
      .select().single()
    if (data) setFavoris(prev => [...prev, data])
  }

  const deleteFavori = async (id: string) => {
    await supabase.from('favoris_trajets').delete().eq('id', id)
    setFavoris(prev => prev.filter(f => f.id !== id))
  }

  return { favoris, loading, addFavori, deleteFavori }
}
