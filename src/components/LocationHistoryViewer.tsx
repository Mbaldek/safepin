// src/components/LocationHistoryViewer.tsx — Time-range location history viewer (Pro-only)

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import ProGate from '@/components/ProGate';
import { springTransition } from '@/lib/utils';

type TimeRange = '24h' | '7d' | '30d' | 'all';

const RANGES: { id: TimeRange; label: string; hours: number }[] = [
  { id: '24h', label: '24h', hours: 24 },
  { id: '7d',  label: '7 days', hours: 168 },
  { id: '30d', label: '30 days', hours: 720 },
  { id: 'all', label: 'All time', hours: 0 },
];

type HistoryPoint = {
  id: string;
  lat: number;
  lng: number;
  recorded_at: string;
};

export default function LocationHistoryViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [range, setRange] = useState<TimeRange>('7d');
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { setMapFlyTo } = useStore();

  useEffect(() => {
    setLoading(true);
    const rangeData = RANGES.find((r) => r.id === range)!;
    let query = supabase
      .from('location_history')
      .select('id, lat, lng, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(2000);

    if (rangeData.hours > 0) {
      const since = new Date(Date.now() - rangeData.hours * 3600_000).toISOString();
      query = query.gte('recorded_at', since);
    }

    query.then(({ data }) => {
      setPoints(data ?? []);
      setLoading(false);
    });
  }, [userId, range]);

  // Group points by date
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryPoint[]>();
    for (const pt of points) {
      const day = new Date(pt.recorded_at).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(pt);
    }
    return Array.from(map.entries());
  }, [points]);

  function flyTo(pt: HistoryPoint) {
    setMapFlyTo({ lat: pt.lat, lng: pt.lng, zoom: 16 });
    onClose();
  }

  return (
    <ProGate feature="Location History">
      <>
        <motion.div
          className="absolute inset-0 z-[300]"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <motion.div
          className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-[301] max-h-[72dvh] overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={springTransition}
        >
          <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
          <div className="p-5 pb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Location History</h3>
              <button onClick={onClose} className="p-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-card)' }}>
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Range selector */}
            <div className="flex gap-1.5 mb-4">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className="flex-1 py-1.5 rounded-xl text-[0.65rem] font-bold transition"
                  style={{
                    backgroundColor: range === r.id ? 'var(--accent)' : 'var(--bg-card)',
                    color: range === r.id ? '#fff' : 'var(--text-muted)',
                    border: range === r.id ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : points.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-center">
                <Clock size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No location data</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Location history is recorded when you use trip navigation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {points.length} location{points.length > 1 ? 's' : ''} recorded
                </p>
                {grouped.map(([day, pts]) => (
                  <div key={day}>
                    <p className="text-[0.6rem] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      {day}
                    </p>
                    <div className="flex flex-col gap-1">
                      {pts.slice(0, 10).map((pt) => (
                        <button
                          key={pt.id}
                          onClick={() => flyTo(pt)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition hover:opacity-80"
                          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        >
                          <span className="text-sm">📍</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                            </p>
                            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                              {new Date(pt.recorded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </button>
                      ))}
                      {pts.length > 10 && (
                        <p className="text-[0.6rem] text-center py-1" style={{ color: 'var(--text-muted)' }}>
                          +{pts.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </>
    </ProGate>
  );
}
