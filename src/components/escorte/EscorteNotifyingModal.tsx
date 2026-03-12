'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { T, springConfig } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onCancel: () => void
  onStart: () => void
}

export default function EscorteNotifyingModal({ escorte, onCancel, onStart }: Props) {
  const hasResponded = escorte.circleMembers.some(
    m => m.status === 'following' || m.status === 'vocal'
  )
  const activeCount = escorte.circleMembers.filter(
    m => m.status === 'following' || m.status === 'vocal'
  ).length

  return (
    <>
      {/* Scrim */}
      <motion.div
        key="notifying-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 299,
        }}
      />

      {/* Modal card */}
      <motion.div
        key="notifying-card"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={springConfig}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-50%',
          width: '88%',
          maxWidth: 340,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 20,
          boxShadow: T.shadowLg,
          padding: 0,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Gradient accent strip */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, #3BB4C1, #A78BFA)',
          borderRadius: '20px 20px 0 0',
        }} />

        <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1 — Icon + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={!hasResponded ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(59,180,193,0.15), rgba(167,139,250,0.15))',
                border: '1px solid rgba(59,180,193,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Users size={16} strokeWidth={1.5} color="#3BB4C1" />
            </motion.div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {hasResponded
                ? `${activeCount} contact${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`
                : 'Notification envoyée · En attente…'}
            </span>
          </div>

          {/* Row 2 — Circle member avatars */}
          {escorte.circleMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {escorte.circleMembers.slice(0, 5).map((m, i) => {
                const name = m.profiles?.name ?? '?'
                const col = avatarColor(name)
                return (
                  <div key={m.id} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${col}25`,
                    border: '2px solid var(--surface-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: col,
                    marginLeft: i > 0 ? -6 : 0,
                    flexShrink: 0,
                  }}>
                    {name[0]}
                  </div>
                )
              })}
            </div>
          )}

          {/* Row 3 — Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '10px',
                background: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                borderRadius: 99,
                fontFamily: 'inherit', fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={onStart}
              style={{
                flex: 2, padding: '10px 16px',
                background: 'linear-gradient(135deg, #3BB4C1, #A78BFA)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 99,
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {hasResponded ? 'Continuer →' : 'Démarrer →'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
