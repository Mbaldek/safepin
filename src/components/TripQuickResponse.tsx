// src/components/TripQuickResponse.tsx — Floating card for circle members to
// respond when a trusted contact starts a trip.
// NOT WIRED YET — cleaned up, ready to be connected.

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8',
    border: 'rgba(255,255,255,0.08)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569',
    border: 'rgba(15,23,42,0.07)',
  };
}

const F = { cyan: '#3BB4C1' };

type Props = {
  tripId: string;
  travelerName: string;
  destination: string;
  mode: string;
  onDismiss: () => void;
};

const MODE_EMOJI: Record<string, string> = {
  walk: '🚶', bike: '🚲', drive: '🚗', transit: '🚇',
};

const QUICK_OPTIONS = [
  { label: 'Je suis dispo !', emoji: '💪' },
  { label: 'Je surveille', emoji: '👀' },
  { label: 'Bon courage', emoji: '❤️' },
];

export default function TripQuickResponse({ tripId, travelerName, destination, mode, onDismiss }: Props) {
  const userId = useStore((s) => s.userId);
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const [sent, setSent] = useState(false);

  async function respond(content: string) {
    if (!userId || sent) return;
    setSent(true);
    await supabase.from('trip_messages').insert({
      trip_id: tripId,
      sender_id: userId,
      type: 'quick',
      content,
    });
    setTimeout(onDismiss, 1200);
  }

  const emoji = MODE_EMOJI[mode] ?? '📍';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="absolute top-2 left-1/2 -translate-x-1/2 w-[92%] rounded-2xl p-4"
        style={{
          maxWidth: 400,
          zIndex: 199,
          backgroundColor: C.card,
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:opacity-70"
          style={{ color: C.t2 }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: F.cyan, color: C.bg }}
          >
            {emoji}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.t1 }}>
              {travelerName} est en route
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: C.t2 }}>
              <MapPin size={10} /> {destination}
            </p>
          </div>
        </div>

        {/* Quick response buttons */}
        {!sent ? (
          <div className="flex gap-2">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => respond(`${opt.emoji} ${opt.label}`)}
                className="flex-1 text-xs py-2 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: C.elevated,
                  border: `1px solid ${C.border}`,
                  color: C.t1,
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: F.cyan }}>
            Envoyé !
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
