// src/components/ContextBanner.tsx
// Rolling contextual banner — replaces static LocationChip

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { haversineMeters } from '@/lib/utils';

type BannerMsg = {
  key: string;
  icon: string;
  text: string;
  action?: () => void;
  dismiss?: () => void;
};

export default function ContextBanner() {
  const { userLocation, pins, isSharingLocation, setIsSharingLocation, setShowWalkWithMe } = useStore();
  const [msgIndex, setMsgIndex] = useState(0);

  // Build the rotating messages
  const messages = useMemo<BannerMsg[]>(() => {
    const arr: BannerMsg[] = [];

    if (userLocation) {
      const now = Date.now();
      const count = pins.filter((p) => {
        if (p.resolved_at) return false;
        if ((now - new Date(p.created_at).getTime()) / 3_600_000 > 24) return false;
        return haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) < 1000;
      }).length;
      if (count > 0) arr.push({ key: 'inc', icon: '⚠️', text: `${count} incident${count > 1 ? 's' : ''} nearby` });
    }

    if (isSharingLocation) {
      arr.push({
        key: 'share',
        icon: '📡',
        text: 'Partage actif',
        action: () => setShowWalkWithMe(true),
        dismiss: () => setIsSharingLocation(false),
      });
    }

    const h = new Date().getHours();
    arr.push({ key: 'time', icon: h < 18 ? '☀️' : '🌙', text: h < 18 ? 'Bonne journée' : 'Restez prudent' });

    return arr;
  }, [userLocation, pins, isSharingLocation, setShowWalkWithMe, setIsSharingLocation]);

  // Cycle through messages every 6 s; reset index when list changes length
  useEffect(() => { setMsgIndex(0); }, [messages.length]);
  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 6000);
    return () => clearInterval(t);
  }, [messages.length]);

  if (!userLocation) return null;

  const msg = messages[msgIndex % Math.max(messages.length, 1)];
  if (!msg) return null;

  return (
    <div
      className="absolute top-[64px] left-1/2 -translate-x-1/2 z-40 rounded-3xl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: msg.action ? 'pointer' : 'default',
      }}
      onClick={msg.action}
    >
      <span className="text-xs">{msg.icon}</span>
      <span
        className="text-xs font-bold truncate max-w-[180px]"
        style={{ color: msg.key === 'share' ? 'var(--safe)' : 'var(--text-primary)' }}
      >
        {msg.text}
      </span>
      {msg.dismiss && (
        <button
          className="text-xs opacity-50 ml-1 leading-none"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); msg.dismiss!(); }}
        >
          ×
        </button>
      )}
    </div>
  );
}
