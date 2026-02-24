// src/lib/usePresence.ts — Heartbeat-based presence tracking for Trusted Circle

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const ONLINE_THRESHOLD   = 5 * 60 * 1000; // <5 min = online
const RECENT_THRESHOLD   = 60 * 60 * 1000; // <1 hr = recently active

export type PresenceStatus = 'online' | 'recent' | 'offline';

export type ContactPresence = {
  status: PresenceStatus;
  lastSeen: Date | null;
  /** e.g. "3m ago", "2h ago" */
  label: string;
};

function getStatus(lastSeen: string | null): ContactPresence {
  if (!lastSeen) return { status: 'offline', lastSeen: null, label: '' };
  const d = new Date(lastSeen);
  const diff = Date.now() - d.getTime();
  if (diff < ONLINE_THRESHOLD)  return { status: 'online',  lastSeen: d, label: 'Online' };
  if (diff < RECENT_THRESHOLD)  return { status: 'recent',  lastSeen: d, label: fmtAgo(diff) };
  return { status: 'offline', lastSeen: d, label: fmtAgo(diff) };
}

function fmtAgo(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/**
 * Heartbeat: updates current user's `last_seen_at` every 2 minutes.
 */
export function usePresenceHeartbeat(userId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const beat = useCallback(async () => {
    if (!userId) return;
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // Beat immediately on mount
    beat();
    intervalRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [userId, beat]);
}

/**
 * Fetches presence for a list of contact user IDs.
 * Returns a map: contactId → ContactPresence.
 * Refreshes every 60s.
 */
export function useContactPresence(contactIds: string[]): Record<string, ContactPresence> {
  const [presenceMap, setPresenceMap] = useState<Record<string, ContactPresence>>({});

  const fetchPresence = useCallback(async () => {
    if (contactIds.length === 0) { setPresenceMap({}); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', contactIds);
    if (!data) return;
    const map: Record<string, ContactPresence> = {};
    for (const row of data) {
      map[row.id] = getStatus(row.last_seen_at);
    }
    setPresenceMap(map);
  }, [contactIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPresence();
    const iv = setInterval(fetchPresence, 60_000);
    return () => clearInterval(iv);
  }, [fetchPresence]);

  return presenceMap;
}
