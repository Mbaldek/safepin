// src/hooks/useRealtimeDmBadge.ts

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

/**
 * Subscribes to realtime DM conversation updates and keeps the
 * unread DM badge count in sync.
 */
export function useRealtimeDmBadge() {
  const userId = useStore((s) => s.userId);
  const setUnreadDmCount = useStore((s) => s.setUnreadDmCount);

  useEffect(() => {
    if (!userId) return;
    async function fetchUnread() {
      const { data } = await supabase
        .from('dm_conversations')
        .select('id, user1_id, user2_id, last_message_at, user1_last_read_at, user2_last_read_at, last_message_sender_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (!data) return;
      let count = 0;
      for (const c of data) {
        if (!c.last_message_at || c.last_message_sender_id === userId) continue;
        const readAt = c.user1_id === userId ? c.user1_last_read_at : c.user2_last_read_at;
        if (!readAt || new Date(c.last_message_at) > new Date(readAt)) count++;
      }
      setUnreadDmCount(count);
    }
    fetchUnread();

    // Realtime: instant badge update when a DM conversation is updated
    const channel = supabase
      .channel('dm_badge_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
        (payload) => {
          const row = payload.new as any;
          if (row.user1_id !== userId && row.user2_id !== userId) return;
          if (row.last_message_sender_id === userId) return; // I sent it
          const readAt = row.user1_id === userId ? row.user1_last_read_at : row.user2_last_read_at;
          if (!readAt || new Date(row.last_message_at) > new Date(readAt)) {
            fetchUnread();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setUnreadDmCount]);
}
