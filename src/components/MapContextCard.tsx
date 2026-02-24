// src/components/MapContextCard.tsx — Contextual info card on the map

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { computeTrend } from '@/components/TrendSparkline';
import { haversineMeters } from '@/lib/utils';

type CardType = 'high_activity' | 'calm' | 'active_trip' | null;

export default function MapContextCard() {
  const { userLocation, pins, activeRoute } = useStore();
  const [dismissed, setDismissed] = useState(false);
  const [cardType, setCardType] = useState<CardType>(null);
  const [count, setCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute card type based on nearby pins (debounced)
  useEffect(() => {
    if (dismissed || !userLocation) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const radius = 500; // 500m radius
      const oneWeekAgo = Date.now() - 7 * 24 * 3600_000;
      const nearby = pins.filter((p) => {
        if (new Date(p.created_at).getTime() < oneWeekAgo) return false;
        return haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) <= radius;
      });

      if (activeRoute) {
        setCardType('active_trip');
        setCount(0);
      } else if (nearby.length >= 5) {
        setCardType('high_activity');
        setCount(nearby.length);
      } else if (nearby.length === 0) {
        setCardType('calm');
        setCount(0);
      } else {
        setCardType(null);
      }
    }, 2000);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [userLocation, pins, activeRoute, dismissed]);

  // Compute trend (7d vs previous 7d) near user
  const trend = userLocation ? computeTrend(pins, userLocation, 500) : 'flat';
  const trendMeta: Record<string, { arrow: string; label: string; color: string }> = {
    up:   { arrow: '↑', label: 'Rising',  color: '#ef4444' },
    down: { arrow: '↓', label: 'Falling', color: '#22c55e' },
    flat: { arrow: '→', label: 'Stable',  color: 'var(--text-muted)' },
  };
  const tm = trendMeta[trend];

  if (dismissed || !cardType) return null;

  const cards: Record<NonNullable<CardType>, { emoji: string; title: string; subtitle: string; color: string }> = {
    high_activity: {
      emoji: '⚠️',
      title: `High activity area`,
      subtitle: `${count} reports this week within 500m`,
      color: '#f59e0b',
    },
    calm: {
      emoji: '💚',
      title: 'Low activity area',
      subtitle: 'No recent reports nearby — stay aware',
      color: '#10b981',
    },
    active_trip: {
      emoji: '🛡️',
      title: 'Trip in progress',
      subtitle: 'Stay on your route for safety',
      color: 'var(--accent)',
    },
  };

  const card = cards[cardType];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-[170] rounded-2xl px-3.5 py-2.5 shadow-md flex items-center gap-3"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 95%, transparent)',
          border: `1px solid ${card.color}30`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-lg shrink-0">{card.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{card.title}</p>
            {cardType !== 'active_trip' && (
              <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tm.color}18`, color: tm.color }}>
                {tm.arrow} {tm.label}
              </span>
            )}
          </div>
          <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{card.subtitle}</p>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <X size={10} style={{ color: 'var(--text-muted)' }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
