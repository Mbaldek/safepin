// src/components/TripQuickResponse.tsx — Floating card for circle members to
// respond when a trusted contact starts a trip.

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

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
        className="absolute top-2 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] rounded-2xl z-[199] p-4"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-content-center text-sm"
            style={{ backgroundColor: 'var(--accent)', color: '#1B2541' }}
          >
            {emoji}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {travelerName} est en route
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
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
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: 'var(--accent)' }}>
            Envoyé !
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
