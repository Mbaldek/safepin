// src/components/SessionBriefingCard.tsx — Floating briefing card shown on map load

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { MapPin, Navigation, X } from 'lucide-react';
import { haversineMeters } from '@/lib/utils';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

const DISMISS_MS = 8_000;
const LS_KEY = 'brume_last_session_ts';
const NEARBY_RADIUS_M = 1000;

type BriefingData = {
  newPins: number;
  hasSos: boolean;
  sosPin?: { lat: number; lng: number; id: string };
};

export default function SessionBriefingCard({ onDismiss }: { onDismiss: () => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { userLocation, pins, setShowIncidentsList } = useStore();
  const [data, setData] = useState<BriefingData | null>(null);
  const [progress, setProgress] = useState(100);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Compute briefing data
  useEffect(() => {
    const lastTs = localStorage.getItem(LS_KEY);
    const since = lastTs ? new Date(lastTs) : new Date(Date.now() - 24 * 3600_000);
    localStorage.setItem(LS_KEY, new Date().toISOString());

    const loc = userLocation;
    if (!loc) {
      setData({ newPins: 0, hasSos: false });
      return;
    }

    const recentPins = pins.filter((p) => {
      if (new Date(p.created_at) <= since) return false;
      return haversineMeters(loc, { lat: p.lat, lng: p.lng }) <= NEARBY_RADIUS_M;
    });

    const activeSos = recentPins.find((p) => p.is_emergency && !p.resolved_at);

    setData({
      newPins: recentPins.length,
      hasSos: !!activeSos,
      sosPin: activeSos ? { lat: activeSos.lat, lng: activeSos.lng, id: activeSos.id } : undefined,
    });
  }, [userLocation, pins]);

  // Auto-dismiss countdown
  useEffect(() => {
    const interval = 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (interval / DISMISS_MS) * 100;
        if (next <= 0) {
          clearInterval(timer);
          dismissRef.current();
          return 0;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, []);

  // No actionable info — dismiss silently via effect (not during render)
  useEffect(() => {
    if (data && !data.hasSos && data.newPins === 0) {
      dismissRef.current();
    }
  }, [data]);

  if (!data) return null;

  // SOS briefing
  if (data.hasSos && data.sosPin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-[180] rounded-2xl p-3.5 shadow-lg"
        style={{ backgroundColor: '#ef4444', color: '#fff' }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg animate-pulse">🆘</span>
            <div>
              <p className="text-sm font-black">SOS alert nearby</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Someone may need help in your area</p>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <X size={12} />
          </button>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${data.sosPin.lat},${data.sosPin.lng}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition hover:opacity-90"
          style={{ backgroundColor: '#fff', color: '#ef4444' }}
        >
          <Navigation size={12} /> Navigate
        </a>
        <ProgressBar progress={progress} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.8)" />
      </motion.div>
    );
  }

  // New pins briefing
  if (data.newPins > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-[180] rounded-2xl p-3.5 shadow-lg"
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-sm font-black" style={{ color: C.textPrimary }}>
                {data.newPins} report{data.newPins > 1 ? 's' : ''} nearby
              </p>
            </div>
          </div>
          <button onClick={onDismiss} className="p-1 rounded-full" style={{ backgroundColor: C.elevated }}>
            <X size={12} style={{ color: C.textSecondary }} />
          </button>
        </div>
        <button
          onClick={() => { setShowIncidentsList(true); onDismiss(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition hover:opacity-90"
          style={{ backgroundColor: FIXED.accentCyan, color: '#fff' }}
        >
          <MapPin size={12} /> View reports
        </button>
        <ProgressBar progress={progress} color={C.border} fill={FIXED.accentCyan} />
      </motion.div>
    );
  }

  return null;
}

function ProgressBar({ progress, color, fill }: { progress: number; color: string; fill: string }) {
  return (
    <div className="mt-2.5 rounded-full overflow-hidden" style={{ height: '2px', backgroundColor: color }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${progress}%`, backgroundColor: fill, transition: 'width 100ms linear' }}
      />
    </div>
  );
}
