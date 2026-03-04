// src/components/ContextBanner.tsx
// Rolling contextual banner — replaces static LocationChip

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { haversineMeters } from '@/lib/utils';

function getColors(isDark: boolean) {
  return isDark ? {
    card: '#1E293B',
    t1: '#FFFFFF', t2: '#94A3B8',
    border: 'rgba(255,255,255,0.08)',
  } : {
    card: '#FFFFFF',
    t1: '#0F172A', t2: '#475569',
    border: 'rgba(15,23,42,0.07)',
  };
}

const F = { cyan: '#3BB4C1', success: '#34D399' };

type BannerMsg = {
  key: string;
  icon: string;
  text: string;
  action?: () => void;
  dismiss?: () => void;
};

type Props = {
  onIncidentTap?: () => void;
};

export default function ContextBanner({ onIncidentTap }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
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
      if (count > 0) arr.push({
        key: 'inc',
        icon: '⚠️',
        text: `${count} incident${count > 1 ? 's' : ''} à proximité`,
        action: onIncidentTap,
      });
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
  }, [userLocation, pins, isSharingLocation, setShowWalkWithMe, setIsSharingLocation, onIncidentTap]);

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
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: msg.action ? 'pointer' : 'default',
      }}
      onClick={msg.action}
    >
      <span className="text-xs">{msg.icon}</span>
      <span
        className="text-xs font-bold truncate"
        style={{
          maxWidth: 180,
          color: msg.key === 'share' ? F.success : C.t1,
        }}
      >
        {msg.text}
      </span>
      {msg.dismiss && (
        <button
          className="text-xs opacity-50 ml-1 leading-none"
          style={{ color: C.t2 }}
          onClick={(e) => { e.stopPropagation(); msg.dismiss!(); }}
        >
          ×
        </button>
      )}
    </div>
  );
}
