'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/stores/useTheme';

interface CallBarProps {
  source: 'dm' | 'group' | 'cercle';
  title: string;
  muted: boolean;
  seconds: number;
  participantNames?: string[];
  onMute: () => void;
  onEnd: () => void;
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const WAVE_DELAYS = [0, 140, 280, 420];

const BG: Record<CallBarProps['source'], { gradient: string; border: string; accent: string }> = {
  dm: {
    gradient: 'linear-gradient(90deg, rgba(59,180,193,0.15), rgba(59,180,193,0.04))',
    border: '1px solid rgba(59,180,193,0.2)',
    accent: '#3BB4C1',
  },
  group: {
    gradient: 'linear-gradient(90deg, rgba(167,139,250,0.15), rgba(167,139,250,0.04))',
    border: '1px solid rgba(167,139,250,0.2)',
    accent: '#A78BFA',
  },
  cercle: {
    gradient: 'linear-gradient(90deg, rgba(52,211,153,0.13), rgba(52,211,153,0.03))',
    border: '1px solid rgba(52,211,153,0.18)',
    accent: '#34D399',
  },
};

const AVATAR: Record<CallBarProps['source'], { gradient: string; color: string }> = {
  dm: { gradient: 'linear-gradient(135deg, #3BB4C1, #1E3A5F)', color: '#FFFFFF' },
  group: { gradient: 'linear-gradient(135deg, #A78BFA, #4A2C5A)', color: '#FFFFFF' },
  cercle: { gradient: 'linear-gradient(135deg, #34D399, #1E6A4A)', color: '#0F172A' },
};

export default function CallBar({
  source,
  title,
  muted,
  seconds,
  participantNames = [],
  onMute,
  onEnd,
}: CallBarProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';

  const surfaceCard = isDark ? '#1E293B' : '#FFFFFF';
  const surfaceEl = isDark ? '#253347' : '#EEF2F7';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textTertiary = isDark ? '#64748B' : '#94A3B8';

  const theme = BG[source];
  const avatar = AVATAR[source];
  const dotColor = muted ? '#FBBF24' : '#34D399';
  const isGroup = source === 'group';

  const statusText = muted
    ? 'Micro coupé'
    : isGroup
      ? `${participantNames.length > 0 ? participantNames.length : '?'} en appel`
      : 'En appel';

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={SPRING}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        background: theme.gradient,
        borderBottom: theme.border,
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0, marginRight: 10 }}>
        {/* Animated ring */}
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '50%',
            border: `2px solid ${theme.accent}`,
            animation: 'call-bar-ring 2.2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: avatar.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: avatar.color,
            position: 'relative',
          }}
        >
          {isGroup ? '🏠' : getInitials(title)}
        </div>
      </div>

      {/* Info col */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Line 1 — title */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: textPrimary,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>

        {/* Line 2 — status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Animated dot */}
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: dotColor,
              flexShrink: 0,
              animation: 'call-bar-dot 1.8s ease-in-out infinite',
            }}
          />

          {/* Status text */}
          <span style={{ fontSize: 10, color: textTertiary, whiteSpace: 'nowrap' }}>
            {statusText}
          </span>

          {/* Timer */}
          <span
            style={{
              fontSize: 10,
              color: textTertiary,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTimer(seconds)}
          </span>

          {/* Mini stacked avatars (group only) */}
          {isGroup && participantNames.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 2 }}>
              {participantNames.slice(0, 4).map((name, i) => (
                <div
                  key={i}
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginLeft: i === 0 ? 0 : -4,
                    border: `1.5px solid ${surfaceCard}`,
                    background: 'linear-gradient(135deg, #A78BFA, #4A2C5A)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 7,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    position: 'relative',
                    zIndex: participantNames.length - i,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Cercle shield badge */}
          {source === 'cercle' && (
            <span style={{ fontSize: 9, color: '#34D399', lineHeight: 1 }}>🛡</span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {/* Waveform / Mic button */}
        <button
          onClick={onMute}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: surfaceEl,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: 0,
          }}
        >
          {WAVE_DELAYS.map((delay, i) => (
            <div
              key={i}
              style={{
                width: 2.5,
                height: 3,
                minHeight: 3,
                borderRadius: 2,
                backgroundColor: muted ? '#FBBF24' : theme.accent,
                opacity: muted ? 0.35 : 1,
                animation: muted
                  ? 'none'
                  : `call-bar-wave-${i} 0.85s ${delay}ms ease-in-out infinite`,
              }}
            />
          ))}
        </button>

        {/* End button */}
        <button
          onClick={onEnd}
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          📵
        </button>
      </div>
    </motion.div>
  );
}
