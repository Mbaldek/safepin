'use client'

import { Sparkles, Plus, X } from 'lucide-react'

interface JuliaHeaderProps {
  isDark: boolean
  onClose: () => void
  onNewChat: () => void
}

const JULIA_ACCENT = '#A78BFA'

export default function JuliaHeader({ isDark, onClose, onNewChat }: JuliaHeaderProps) {
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textTertiary = isDark ? '#64748B' : '#94A3B8'
  const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)'
  const glassBg = isDark ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)'

  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        borderBottom: `1px solid ${borderColor}`,
        background: glassBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: textPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-label="Fermer"
      >
        <X size={18} />
      </button>

      {/* Julia avatar + title */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${JULIA_ACCENT}, #8B5CF6)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, lineHeight: 1.2 }}>
            Julia
          </div>
          <div style={{ fontSize: 11, color: JULIA_ACCENT, fontWeight: 500, lineHeight: 1.2 }}>
            Assistante IA
          </div>
        </div>
      </div>

      {/* New chat button */}
      <button
        onClick={onNewChat}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.10)',
          border: `1px solid rgba(167,139,250,0.25)`,
          cursor: 'pointer',
          color: JULIA_ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-label="Nouvelle conversation"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
