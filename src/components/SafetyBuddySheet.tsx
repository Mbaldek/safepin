// src/components/SafetyBuddySheet.tsx — Route-matching buddy system (Pro-only)

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, Calendar, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import ProGate from '@/components/ProGate';
import type { SavedRoute } from '@/types';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type BuddyMatch = {
  user_id: string;
  display_name: string | null;
  route_name: string;
  overlap_days: string[];
};

type Props = { userId: string; routeId?: string; onClose: () => void };

export default function SafetyBuddySheet({ userId, routeId, onClose }: Props) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(routeId ?? null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [timeStart, setTimeStart] = useState('07:00');
  const [timeEnd, setTimeEnd] = useState('09:00');
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'setup' | 'matches'>('setup');

  // Load user's saved routes
  useEffect(() => {
    supabase
      .from('saved_routes')
      .select('*')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .then(({ data }) => {
        setRoutes((data as SavedRoute[]) ?? []);
        if (!selectedRoute && data?.length) setSelectedRoute(data[0].id);
        setLoading(false);
      });
  }, [userId, selectedRoute]);

  // Load matches when on matches tab
  useEffect(() => {
    if (tab !== 'matches' || !selectedRoute) return;
    setLoading(true);
    supabase
      .from('safety_buddies')
      .select('user_id, route_id, day_of_week')
      .eq('route_id', selectedRoute)
      .eq('is_active', true)
      .neq('user_id', userId)
      .then(async ({ data }) => {
        if (!data?.length) { setMatches([]); setLoading(false); return; }
        const userIds = [...new Set(data.map((d) => d.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
        const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]));
        const route = routes.find((r) => r.id === selectedRoute);

        const matched: BuddyMatch[] = data.map((d) => ({
          user_id: d.user_id,
          display_name: nameMap[d.user_id] ?? null,
          route_name: route?.name ?? 'Route',
          overlap_days: (d.day_of_week as number[]).filter((day) => selectedDays.includes(day)).map((d) => DAYS[d - 1]),
        })).filter((m) => m.overlap_days.length > 0);

        setMatches(matched);
        setLoading(false);
      });
  }, [tab, selectedRoute, userId, selectedDays, routes]);

  async function handleSave() {
    if (!selectedRoute) return;
    setSaving(true);
    const { error } = await supabase.from('safety_buddies').upsert({
      user_id: userId,
      route_id: selectedRoute,
      day_of_week: selectedDays,
      time_start: timeStart,
      time_end: timeEnd,
      is_active: true,
    }, { onConflict: 'user_id,route_id' });

    setSaving(false);
    if (error) { toast.error('Failed to save buddy schedule'); return; }
    toast.success('Buddy schedule saved!');
    setTab('matches');
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <ProGate feature="Safety Buddies">
      <>
        <motion.div
          className="absolute inset-0 z-[300]"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-[301] max-h-[76dvh] overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={springTransition}
        >
          <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
          <div className="p-5 pb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Safety Buddies</h3>
              <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-4">
              {(['setup', 'matches'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                  style={{
                    backgroundColor: tab === t ? 'var(--accent)' : 'var(--bg-card)',
                    color: tab === t ? '#fff' : 'var(--text-muted)',
                  }}>
                  {t === 'setup' ? 'Schedule' : `Matches (${matches.length})`}
                </button>
              ))}
            </div>

            {tab === 'setup' ? (
              <div className="space-y-4">
                {/* Route picker */}
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Route</p>
                  <div className="flex flex-col gap-1.5">
                    {routes.map((r) => (
                      <button key={r.id} onClick={() => setSelectedRoute(r.id)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition"
                        style={{
                          backgroundColor: selectedRoute === r.id ? 'rgba(244,63,94,0.1)' : 'var(--bg-card)',
                          border: selectedRoute === r.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                          color: selectedRoute === r.id ? 'var(--accent)' : 'var(--text-primary)',
                        }}>
                        {r.name}
                      </button>
                    ))}
                    {routes.length === 0 && !loading && (
                      <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Save a route first to find buddies</p>
                    )}
                  </div>
                </div>

                {/* Day picker */}
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>Days</p>
                  <div className="flex gap-1">
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => toggleDay(i + 1)}
                        className="flex-1 py-1.5 rounded-lg text-[0.6rem] font-bold transition"
                        style={{
                          backgroundColor: selectedDays.includes(i + 1) ? 'var(--accent)' : 'var(--bg-card)',
                          color: selectedDays.includes(i + 1) ? '#fff' : 'var(--text-muted)',
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time range */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>From</p>
                    <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>To</p>
                    <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                <button onClick={handleSave} disabled={saving || !selectedRoute}
                  className="w-full py-3 rounded-xl text-sm font-black transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  {saving ? 'Saving…' : 'Save & Find Buddies'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {loading ? (
                  <p className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>Finding matches…</p>
                ) : matches.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Users size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No matches yet</p>
                    <p className="text-xs max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                      As more users save this route, you'll see potential walking buddies here
                    </p>
                  </div>
                ) : (
                  matches.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: '#fff' }}>
                        {(m.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.display_name ?? 'Brume User'}
                        </p>
                        <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                          {m.overlap_days.join(', ')}
                        </p>
                      </div>
                      <button className="p-2 rounded-xl transition hover:opacity-80" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </>
    </ProGate>
  );
}
