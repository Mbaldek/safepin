'use client'

import { motion } from 'framer-motion'
import { useTheme } from '@/stores/useTheme'

interface CallBarProps {
  source: 'dm' | 'group' | 'cercle'
  title: string
  muted: boolean
  seconds: number
  participantNames?: string[]
  onMute: () => void
  onEnd: () => void
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

// Keyframes moved to globals.css

const WAVE_DELAYS = [0, 140, 280, 420]

export default function CallBar({ source, title, muted, seconds, participantNames = [], onMute, onEnd }: CallBarProps) {
  const isDark = useTheme((s) => s.theme) === 'dark'

  const surfaceCard = isDark ? '#1E293B' : '#FFFFFF'
  const surfaceEl = isDark ? '#253347' : '#EEF2F7'
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textTertiary = isDark ? '#64748B' : '#94A3B8'

  // Background + border by source
  const bg =
    source === 'group'
      ? 'linear-gradient(90deg, rgba(167,139,250,0.15), rgba(167,139,250,0.04))'
      : source === 'cercle'
        ? 'linear-gradient(90deg, rgba(52,211,153,0.13), rgba(52,211,153,0.03))'
        : 'linear-gradient(90deg, rgba(59,180,193,0.15), rgba(59,180,193,0.04))'

  const borderBottom =
    source === 'group'
      ? '1px solid rgba(167,139,250,0.2)'
      : source === 'cercle'
        ? '1px solid rgba(52,211,153,0.18)'
        : '1px solid rgba(59,180,193,0.2)'

  // Accent color for waveform
  const accent =
    source === 'group' ? '#A78BFA'
      : source === 'cercle' ? '#34D399'
        : '#3BB4C1'

  // Avatar
  const renderAvatar = () => {
    const size = 32
    const base: React.CSSProperties = {
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, position: 'relative',
    }

    let gradient: string
    let content: React.ReactNode
    let textColor = '#FFFFFF'

    if (source === 'group') {
      gradient = 'linear-gradient(135deg, #A78BFA, #4A2C5A)'
      content = '🏠'
    } else if (source === 'cercle') {
      gradient = 'linear-gradient(135deg, #34D399, #1E6A4A)'
      textColor = '#0F172A'
      const initials = title.slice(0, 2).toUpperCase()
      content = initials
    } else {
      gradient = 'linear-gradient(135deg, #3BB4C1, #1E3A5F)'
      const initials = title.slice(0, 2).toUpperCase()
      content = initials
    }

    return (
      <div style={{ ...base, background: gradient, color: textColor }}>
        {content}
        <div style={{
          position: 'absolute', inset: -3, borderRadius: '50%',
          border: `2px solid ${accent}`,
          animation: 'call-bar-ring 2.2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      </div>
    )
  }

  // Status line
  const dotColor = muted ? '#FBBF24' : '#34D399'
  const statusText = muted
    ? 'Micro coupé'
    : source === 'group'
      ? `${participantNames.length + 1} en appel`
      : 'En appel'

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
          gap: 10,
          padding: '10px 14px',
          background: bg,
          borderBottom,
        }}
      >
        {renderAvatar()}

        {/* Info col */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Title */}
          <div style={{
            fontSize: 12, fontWeight: 600, color: textPrimary, lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* Dot */}
            <div style={{
              width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0,
              animation: 'call-bar-dot 1.8s ease-in-out infinite',
            }} />

            {/* Status text */}
            <span style={{ fontSize: 10, color: textTertiary, whiteSpace: 'nowrap' }}>
              {statusText}
            </span>

            {/* Timer */}
            <span style={{
              fontSize: 10, color: textTertiary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>
              {formatTimer(seconds)}
            </span>

            {/* Mini-avatars (group only) */}
            {source === 'group' && participantNames.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: 2 }}>
                {participantNames.slice(0, 4).map((name, i) => (
                  <div key={i} style={{
                    width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                    marginLeft: i === 0 ? 0 : -4,
                    border: `1.5px solid ${surfaceCard}`,
                    background: 'linear-gradient(135deg, #A78BFA, #4A2C5A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: '#FFFFFF',
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}

            {/* Cercle shield */}
            {source === 'cercle' && (
              <span style={{ fontSize: 9, color: '#34D399', lineHeight: 1 }}>🛡</span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {/* Waveform / Mic button */}
          <div
            onClick={onMute}
            style={{
              width: 30, height: 30, borderRadius: '50%', background: surfaceEl,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 2, cursor: 'pointer',
            }}
          >
            {WAVE_DELAYS.map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 2.5,
                  borderRadius: 2,
                  background: muted ? '#FBBF24' : accent,
                  opacity: muted ? 0.35 : 1,
                  height: muted ? 3 : undefined,
                  animation: muted ? 'none' : `call-bar-wave-${i} 0.85s ${delay}ms ease-in-out infinite`,
                  minHeight: 3,
                }}
              />
            ))}
          </div>

          {/* End button */}
          <div
            onClick={onEnd}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 14, lineHeight: 1,
            }}
          >
            📵
          </div>
        </div>
      </motion.div>
  )
}
