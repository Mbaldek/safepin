// src/lib/useIsPro.ts — Hook to check if the current user has an active Pro subscription

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

const LS_KEY = 'breveil_is_pro';

export function useIsPro(): { isPro: boolean; plan: string | null; loading: boolean } {
  const userId = useStore((s) => s.userId);
  const [isPro, setIsPro] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem(LS_KEY) === null) {
      const legacy = localStorage.getItem('brume_is_pro');
      if (legacy !== null) { localStorage.setItem(LS_KEY, legacy); localStorage.removeItem('brume_is_pro'); }
    }
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'false'); } catch { return false; }
  });
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const active = data?.status === 'active' && (data.plan === 'pro' || data.plan === 'pro_annual');
        setIsPro(active);
        setPlan(data?.plan ?? null);
        try { localStorage.setItem(LS_KEY, JSON.stringify(active)); } catch {}
        setLoading(false);
      });
  }, [userId]);

  return { isPro, plan, loading };
}
