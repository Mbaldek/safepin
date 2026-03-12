'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, Sparkles } from 'lucide-react'
import { T, tok } from '@/lib/tokens'
import { formatElapsed, avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onEndCall: () => void
  onStop: () => void
}

export default function EscorteLiveOverlay({ isDark, escorte, onEndCall, onStop }: Props) {
  const tk = tok(isDark)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Audio channel banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute', top: 16, left: 16, right: 16,
          background: tk.glass, backdropFilter: 'blur(16px)',
          border: `1px solid ${T.gradientStart}30`, borderRadius: T.radiusXl,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: T.semanticSuccess, flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.gradientStart }}>Canal audio actif</div>
          <div style={{ fontSize: 10, color: tk.ts }}>
            {escorte.circleMembers.filter(m => m.status !== 'inactive').map(m => m.profiles?.name).slice(0,2).join(' · ')} vous ecoutent
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={13} strokeWidth={1.5} color={T.semanticSuccess} />
          </div>
          <button onClick={onEndCall} style={{ width: 28, height: 28, borderRadius: 8, background: T.semanticDangerSoft, border: `1px solid ${T.semanticDanger}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={13} strokeWidth={2} color={T.semanticDanger} />
          </button>
        </div>
      </motion.div>

      {/* Julia banner (escorte-live) */}
      <AnimatePresence>
        {escorte.juliaActive && (
          <motion.div
            key="julia-live"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute', top: 80, left: 16, right: 16,
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 14, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              pointerEvents: 'auto',
            }}
          >
            <Sparkles size={16} color="#A78BFA" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#A78BFA', flex: 1 }}>
              Julia vous accompagne · canal actif
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700,
              background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
              padding: '2px 6px', borderRadius: 4,
            }}>
              IA
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom live card */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'absolute', bottom: 72, left: 12, right: 12,
          background: tk.glass, backdropFilter: 'blur(20px)',
          border: `1px solid ${tk.bd}`, borderRadius: 20,
          padding: '14px 16px', pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: T.gradientStart }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: tk.tp, flex: 1 }}>Trajet en cours</span>
          <span style={{ fontSize: 10, color: tk.tt, fontVariantNumeric: 'tabular-nums' }}>
            {formatElapsed(escorte.elapsed)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
          {escorte.circleMembers.map(m => {
            const name = m.profiles?.name ?? '?'
            const col  = avatarColor(name)
            const isActive = m.status !== 'inactive'
            const bgColor  = m.status === 'following' ? T.semanticSuccessSoft : m.status === 'vocal' ? 'rgba(59,180,193,0.08)' : tk.ih
            const bdColor  = m.status === 'following' ? `${T.semanticSuccess}35` : m.status === 'vocal' ? `${T.gradientStart}35` : tk.bd
            return (
              <div key={m.id} style={{
                flex: 1, background: bgColor, border: `1px solid ${bdColor}`,
                borderRadius: 10, padding: '7px 8px',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: isActive ? 1 : 0.45,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: `${col}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: col, flexShrink: 0,
                }}>{name[0]}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: tk.tp }}>{name}</div>
                  <div style={{ fontSize: 9, color: m.status === 'following' ? T.semanticSuccess : m.status === 'vocal' ? T.gradientStart : tk.tt }}>
                    {m.status === 'following' ? '● Suit' : m.status === 'vocal' ? '🎙' : 'Hors ligne'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onStop}
          style={{
            width: '100%', padding: '10px', background: T.semanticDangerSoft,
            border: `1px solid ${T.semanticDanger}30`, borderRadius: 14,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: T.semanticDanger, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          Arreter
        </button>
      </motion.div>
    </div>
  )
}
