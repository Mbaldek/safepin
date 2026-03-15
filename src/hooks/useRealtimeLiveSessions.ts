// src/hooks/useRealtimeLiveSessions.ts

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import type { LiveSession } from '@/types';

/**
 * Loads active live escort sessions on mount and subscribes to
 * realtime INSERT / UPDATE on `live_sessions`.
 */
export function useRealtimeLiveSessions() {
  const setLiveSessions = useStore((s) => s.setLiveSessions);
  const addLiveSession = useStore((s) => s.addLiveSession);
  const updateLiveSession = useStore((s) => s.updateLiveSession);

  useEffect(() => {
    // Load active sessions on mount
    supabase
      .from('live_sessions')
      .select('*')
      .is('ended_at', null)
      .then(({ data }) => { if (data) setLiveSessions(data as LiveSession[]); });

    const liveChannel = supabase
      .channel('live-sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_sessions' },
        (payload) => addLiveSession(payload.new as LiveSession))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions' },
        (payload) => updateLiveSession(payload.new as LiveSession))
      .subscribe();
    return () => { supabase.removeChannel(liveChannel); };
  }, [setLiveSessions, addLiveSession, updateLiveSession]);
}
