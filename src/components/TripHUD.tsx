// src/components/TripHUD.tsx
// Compact floating overlay visible on the map during an ACTIVE trip.
// Shows destination, ETA, progress bar, and quick-action buttons.

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Shield, Check, AlertTriangle } from 'lucide-react';
import { useStore, TripSession } from '@/stores/useStore';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type Props = {
  trip: TripSession;
  onImSafe: () => void;
  onOpenTrip: () => void;
  nudge?: string | null;
};

export default function TripHUD({ trip, onImSafe, onOpenTrip, nudge }: Props) {
  const { isSharingLocation, setIsSharingLocation } = useStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(trip.startedAt).getTime();
  const etaMs = new Date(trip.estimatedArrival).getTime();
  const totalMs = etaMs - startMs;
  const elapsed = now - startMs;
  const remaining = Math.max(0, etaMs - now);
  const progress = totalMs > 0 ? Math.min(1, elapsed / totalMs) : 0;
  const critical = remaining < 5 * 60_000 && remaining > 0;

  const etaStr = new Date(trip.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-20 left-3 right-3 z-100 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
      onClick={onOpenTrip}
    >
      {/* Nudge banner */}
      {nudge && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold"
          style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
          <AlertTriangle size={13} strokeWidth={2.5} />
          {nudge}
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        {/* Top row: destination + ETA */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🛡️</span>
            <span className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>
              En route to {trip.destination.label}
            </span>
          </div>
          <span className="text-xs font-bold shrink-0 ml-2" style={{ color: critical ? '#ef4444' : 'var(--text-muted)' }}>
            ETA {etaStr}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: critical ? '#ef4444' : 'var(--accent)',
              }}
            />
          </div>
          <span className="text-[0.6rem] font-bold tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
            {formatCountdown(remaining)}
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsSharingLocation(!isSharingLocation)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.65rem] font-bold transition active:scale-95"
            style={{
              backgroundColor: isSharingLocation ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
              color: isSharingLocation ? '#6366f1' : 'var(--text-muted)',
              border: isSharingLocation ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
            }}
          >
            <Radio size={11} strokeWidth={2.5} />
            Share
          </button>
          <button
            onClick={() => {
              const store = useStore.getState();
              store.setShowSafeSpaces(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.65rem] font-bold transition active:scale-95"
            style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <Shield size={11} strokeWidth={2.5} />
            Safe spot
          </button>
          <button
            onClick={onImSafe}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.65rem] font-black transition active:scale-95"
            style={{ backgroundColor: '#22c55e', color: '#fff' }}
          >
            <Check size={11} strokeWidth={3} />
            I'm Safe
          </button>
        </div>
      </div>
    </motion.div>
  );
}
