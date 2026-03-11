'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { TripContact } from '@/types';

export function useCircleContacts(userId: string) {
  const [contacts, setContacts] = useState<TripContact[]>([]);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data, error } = await supabase.rpc('circle_members_enriched', {
        p_user_id: userId,
      });

      if (error || !data?.length) {
        setContacts([]);
        return;
      }

      // Deduplicate by member_id
      const seen = new Set<string>();
      const mapped: TripContact[] = [];
      for (const row of data as Array<{
        contact_row_id: string;
        member_id: string;
        member_name: string;
        avatar_url: string | null;
        is_watching: boolean;
      }>) {
        if (seen.has(row.member_id)) continue;
        seen.add(row.member_id);
        mapped.push({
          id: row.contact_row_id,
          name: row.member_name,
          avatar_url: row.avatar_url ?? undefined,
          is_watching: row.is_watching,
          notified: false,
        });
      }
      setContacts(mapped);
    };

    load();
  }, [userId]);

  return { contacts };
}
