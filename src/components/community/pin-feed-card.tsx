'use client'

import { useState } from 'react'
import { ThumbsUp, Check, MapPin as MapPinIcon, Navigation } from 'lucide-react'
import { Pin } from '@/types'

interface PinFeedCardProps {
  pin: Pin
  isDark: boolean
  onClick?: () => void
  onLocate?: () => void
}

const SEV_CONFIG = {
  high: {
    getGrad: (d: boolean) => d
      ? 'linear-gradient(135deg,rgba(239,68,68,0.18),rgba(239,68,68,0.06))'
      : 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(255,255,255,0.98))',
    border: 'rgba(239,68,68,0.28)',
    glow: 'rgba(239,68,68,0.30)',
    iconBg: 'rgba(239,68,68,0.18)',
    chip: '#EF4444',
    label: 'DANGER',
  },
  med: {
    getGrad: (d: boolean) => d
      ? 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(251,191,36,0.06))'
      : 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(255,255,255,0.98))',
    border: 'rgba(251,191,36,0.28)',
    glow: 'rgba(251,191,36,0.30)',
    iconBg: 'rgba(251,191,36,0.18)',
    chip: '#D97706',
    label: 'ATTENTION',
  },
  low: {
    getGrad: (d: boolean) => d
      ? 'linear-gradient(135deg,rgba(52,211,153,0.18),rgba(52,211,153,0.06))'
      : 'linear-gradient(135deg,rgba(52,211,153,0.08),rgba(255,255,255,0.98))',
    border: 'rgba(52,211,153,0.28)',
    glow: 'rgba(52,211,153,0.30)',
    iconBg: 'rgba(52,211,153,0.18)',
    chip: '#059669',
    label: 'POSITIF',
  },
}

const CATEGORY_EMOJI: Record<string, string> = {
  harassment: '🚨',
  lighting: '💡',
  safe_space: '✅',
  lone_travel: '🌙',
  infrastructure: '⚠️',
  transport: '🚇',
  default: '📍',
}

export default function PinFeedCard({ pin, isDark, onClick, onLocate }: PinFeedCardProps) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [locateHovered, setLocateHovered] = useState(false)
  const [votes, setVotes] = useState(pin.confirmations ?? 0)
  const [voted, setVoted] = useState(false)

  const sev = pin.severity ?? 'med'
  const cfg = SEV_CONFIG[sev]

  const emoji = CATEGORY_EMOJI[pin.category ?? ''] ?? CATEGORY_EMOJI.default

  const textPrimary = isDark ? '#F1F5F9' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#475569'
  const textTertiary = isDark ? '#64748B' : '#94A3B8'
  const avatarBg = isDark ? '#334155' : '#E2E8F0'

  return (
    <div
      style={{
        background: cfg.getGrad(isDark),
        border: `1px solid ${hovered ? cfg.border : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)')}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
        transform: pressed
          ? 'scale(0.97)'
          : hovered
          ? 'translateY(-3px) scale(1.015)'
          : 'scale(1)',
        boxShadow: hovered
          ? `0 10px 36px ${cfg.glow}, 0 2px 8px rgba(0,0,0,0.15)`
          : '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      {/* Card body */}
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        {/* Emoji icon */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            flexShrink: 0,
            background: cfg.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            transition: 'transform 220ms',
            transform: hovered ? 'scale(1.12) rotate(-4deg)' : 'scale(1)',
          }}
        >
          {emoji}
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: textPrimary,
              marginBottom: 5,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pin.category_label ?? pin.category ?? 'Signalement'}
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.07em',
              background: cfg.chip,
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 20,
              display: 'inline-block',
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Right */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 3,
          }}
        >
          {pin.address && (
            <div
              style={{
                fontSize: 10,
                color: textSecondary,
                textAlign: 'right',
                maxWidth: 115,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pin.address}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {pin.username && (
              <>
                <div
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    background: avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 700,
                    color: textSecondary,
                  }}
                >
                  {pin.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 10, color: textSecondary }}>{pin.username}</span>
                <span style={{ fontSize: 10, color: textTertiary }}>·</span>
              </>
            )}
            {pin.created_at && (
              <span style={{ fontSize: 10, color: textTertiary, whiteSpace: 'nowrap' }}>
                {timeAgoFn(pin.created_at)}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setVoted(!voted)
              setVotes((v) => (voted ? v - 1 : v + 1))
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              background: voted
                ? 'rgba(59,180,193,0.15)'
                : isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
              color: voted ? '#3BB4C1' : textTertiary,
              transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
              transform: voted ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {voted ? <Check size={9} /> : <ThumbsUp size={9} />}
            <span>{votes}</span>
          </button>
        </div>
      </div>

      {/* Bottom bar — "Voir sur la carte" */}
      {onLocate && (
        <div
          onClick={(e) => { e.stopPropagation(); onLocate() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 14px',
            background: isDark
              ? 'rgba(59,180,193,0.08)'
              : 'rgba(59,180,193,0.06)',
            borderTop: `1px solid ${isDark
              ? 'rgba(59,180,193,0.15)'
              : 'rgba(59,180,193,0.10)'}`,
            cursor: 'pointer',
            transition: 'background 180ms',
          }}
          onMouseEnter={(e) => {
            setLocateHovered(true);
            (e.currentTarget as HTMLElement).style.background = isDark
              ? 'rgba(59,180,193,0.15)'
              : 'rgba(59,180,193,0.10)'
          }}
          onMouseLeave={(e) => {
            setLocateHovered(false);
            (e.currentTarget as HTMLElement).style.background = isDark
              ? 'rgba(59,180,193,0.08)'
              : 'rgba(59,180,193,0.06)'
          }}
        >
          <MapPinIcon size={11} style={{ color: '#3BB4C1', flexShrink: 0 }} />
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#3BB4C1',
            letterSpacing: '0.01em',
            transition: 'opacity 120ms',
          }}>
            {locateHovered ? 'Y aller →' : 'Voir sur la carte'}
          </span>
          <Navigation size={10} style={{ color: 'rgba(59,180,193,0.5)', marginLeft: 2, opacity: locateHovered ? 0 : 1, transition: 'opacity 120ms' }} />
        </div>
      )}
    </div>
  )
}

function timeAgoFn(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'à l\'instant'
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}
