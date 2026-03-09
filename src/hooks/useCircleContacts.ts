'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { TripContact } from '@/types';

export function useCircleContacts(userId: string) {
  const [contacts, setContacts] = useState<TripContact[]>([]);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data: tc } = await supabase
        .from('trusted_contacts')
        .select('id, user_id, contact_id, is_watching')
        .or(`user_id.eq.${userId},contact_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (!tc?.length) {
        setContacts([]);
        return;
      }

      const otherIds = tc
        .map((c) =>
          (c.user_id as string) === userId
            ? (c.contact_id as string)
            : (c.user_id as string),
        )
        .filter((id) => id !== userId);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name, avatar_url')
        .in('id', otherIds);

      if (profiles) {
        setContacts(
          tc.map((c) => {
            const otherId =
              (c.user_id as string) === userId
                ? (c.contact_id as string)
                : (c.user_id as string);
            const p = profiles.find((pr) => pr.id === otherId);
            return {
              id: c.id as string,
              name:
                [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
                (p?.display_name as string) ||
                'Contact',
              avatar_url: (p?.avatar_url as string) || undefined,
              is_watching: (c.is_watching as boolean) ?? false,
              notified: false,
            };
          }),
        );
      }
    };

    load();
  }, [userId]);

  return { contacts };
}
