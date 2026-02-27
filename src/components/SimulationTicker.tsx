// src/components/SimulationTicker.tsx
// Global simulation ticker — runs in layout so ticks continue across page navigations.
// Polls admin_params every 30s; when simulation_active=true, fires tick API calls.

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

const POLL_INTERVAL = 10_000; // check DB state every 10s
const TICK_INTERVAL = 30_000; // tick every 30s

export default function SimulationTicker() {
  const activeRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/simulation/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'tick' }),
      });
      const data = await res.json();
      if (data.actions?.length) {
        useStore.getState().bumpPinsVersion();
      }
    } catch { /* ticks are best-effort */ }
  }, []);

  useEffect(() => {
    // Poll admin_params for simulation_active
    const poll = async () => {
      const { data } = await supabase
        .from('admin_params')
        .select('value')
        .eq('key', 'simulation_active')
        .maybeSingle();

      const shouldBeActive = data?.value === 'true';

      if (shouldBeActive && !activeRef.current) {
        // Simulation just started — begin ticking
        activeRef.current = true;
        useStore.getState().setShowSimulated(true);
        tick();
        tickRef.current = setInterval(tick, TICK_INTERVAL);
      } else if (!shouldBeActive && activeRef.current) {
        // Simulation stopped
        activeRef.current = false;
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
      }
    };

    poll();
    const pollTimer = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(pollTimer);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [tick]);

  return null; // no UI
}
