// src/components/SafetyBuddySheet.tsx — Route-matching buddy system (Pro-only)
// NOT WIRED YET — cleaned up, ready to be connected.

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/stores/useTheme';
import { toast } from 'sonner';
import ProGate from '@/components/ProGate';
import type { SavedRoute } from '@/types';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', sheet: '#1A2540', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)',
    overlay: 'rgba(0,0,0,0.5)',
  } : {
    bg: '#F8FAFC', sheet: '#FFFFFF', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)',
    overlay: 'rgba(0,0,0,0.3)',
  };
}

const F = {
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)',
  gold: '#F5C341',
};

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type BuddyMatch = {
  user_id: string;
  display_name: string | null;
  route_name: string;
  overlap_days: string[];
};

type Props = { userId: string; routeId?: string; onClose: () => void };

export default function SafetyBuddySheet({ userId, routeId, onClose }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(routeId ?? null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeStart, setTimeStart] = useState('07:00');
  const [timeEnd, setTimeEnd] = useState('09:00');
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'setup' | 'matches'>('setup');

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
    if (error) { toast.error('Impossible de sauvegarder'); return; }
    toast.success('Planning buddy sauvegardé !');
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
          className="absolute inset-0"
          style={{ zIndex: 300, backgroundColor: C.overlay }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] rounded-t-2xl overflow-y-auto"
          style={{ zIndex: 301, maxWidth: 440, maxHeight: '76dvh', backgroundColor: C.elevated }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={springTransition}
        >
          <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: C.border }} />
          <div className="p-5 pb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: C.t1 }}>Safety Buddies</h3>
              <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: C.card }}>
                <X size={14} style={{ color: C.t2 }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-4">
              {(['setup', 'matches'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                  style={{
                    backgroundColor: tab === t ? F.cyan : C.card,
                    color: tab === t ? '#fff' : C.t2,
                  }}>
                  {t === 'setup' ? 'Planning' : `Matches (${matches.length})`}
                </button>
              ))}
            </div>

            {tab === 'setup' ? (
              <div className="space-y-4">
                {/* Route picker */}
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: C.t2 }}>Trajet</p>
                  <div className="flex flex-col gap-1.5">
                    {routes.map((r) => (
                      <button key={r.id} onClick={() => setSelectedRoute(r.id)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition"
                        style={{
                          backgroundColor: selectedRoute === r.id ? F.cyanSoft : C.card,
                          border: `1.5px solid ${selectedRoute === r.id ? F.cyan : C.border}`,
                          color: selectedRoute === r.id ? F.cyan : C.t1,
                        }}>
                        {r.name}
                      </button>
                    ))}
                    {routes.length === 0 && !loading && (
                      <p className="text-xs text-center py-4" style={{ color: C.t2 }}>Sauvegardez un trajet d&apos;abord</p>
                    )}
                  </div>
                </div>

                {/* Day picker */}
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: C.t2 }}>Jours</p>
                  <div className="flex gap-1">
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => toggleDay(i + 1)}
                        className="flex-1 py-1.5 rounded-lg text-[0.6rem] font-bold transition"
                        style={{
                          backgroundColor: selectedDays.includes(i + 1) ? F.cyan : C.card,
                          color: selectedDays.includes(i + 1) ? '#fff' : C.t2,
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time range */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: C.t2 }}>De</p>
                    <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.t1 }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1" style={{ color: C.t2 }}>À</p>
                    <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.t1 }} />
                  </div>
                </div>

                <button onClick={handleSave} disabled={saving || !selectedRoute}
                  className="w-full py-3 rounded-xl text-sm font-black transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: F.cyan, color: '#fff' }}>
                  {saving ? 'Sauvegarde…' : 'Sauvegarder & Chercher'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {loading ? (
                  <p className="text-center py-8 text-xs" style={{ color: C.t2 }}>Recherche en cours…</p>
                ) : matches.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Users size={28} style={{ color: C.t2, opacity: 0.3 }} />
                    <p className="text-sm font-bold" style={{ color: C.t2 }}>Aucun match</p>
                    <p className="text-xs" style={{ maxWidth: 200, color: C.t2 }}>
                      Plus d&apos;utilisateurs sauvegarderont ce trajet, vous verrez des buddies ici
                    </p>
                  </div>
                ) : (
                  matches.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                        style={{ background: `linear-gradient(135deg, ${F.gold}, #B8923E)`, color: '#fff' }}>
                        {(m.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: C.t1 }}>
                          {m.display_name ?? 'Utilisateur Breveil'}
                        </p>
                        <p className="text-[0.6rem]" style={{ color: C.t2 }}>
                          {m.overlap_days.join(', ')}
                        </p>
                      </div>
                      <button className="p-2 rounded-xl transition hover:opacity-80" style={{ backgroundColor: F.cyan, color: '#fff' }}>
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
