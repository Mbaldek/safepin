'use client'

import { motion } from 'framer-motion'
import { Check, Shield } from 'lucide-react'
import { T, tok, gentleSpring } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getColors } from './escorte-styles'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onClose: () => void
  onShowSummary: () => void
}

export default function EscorteArrivedModal({ isDark, escorte, onClose, onShowSummary }: Props) {
  const d  = isDark
  const tk = tok(isDark)
  const C  = getColors(isDark)

  const distKm = (escorte.distanceM / 1000).toFixed(1)

  return (
    <>
      {/* Scrim */}
      <motion.div
        key="arrived-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 299,
        }}
      />

      {/* Modal card */}
      <motion.div
        key="arrived"
        className="sheet-glow sheet-highlight"
        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, x: '-50%', y: '-50%' }}
        transition={gentleSpring}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          width: '88%', maxWidth: 360,
          borderRadius: 24,
          background: isDark ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)',
          zIndex: 300,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-default)',
          padding: '28px 24px 24px',
          textAlign: 'center',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: T.semanticSuccessSoft, border: `2px solid ${T.semanticSuccess}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Check size={28} strokeWidth={2.5} color={T.semanticSuccess} />
        </motion.div>

        <div style={{ fontSize: 20, fontWeight: 300, color: tk.tp, marginBottom: 4 }}>Vous êtes arrivée !</div>
        <div style={{ fontSize: 13, color: tk.ts, marginBottom: 4 }}>
          {escorte.activeEscorte?.dest_name ?? 'Destination'}
        </div>
        <div style={{ fontSize: 11, color: tk.tt, marginBottom: 16 }}>
          Trajet enregistré · {Math.round(escorte.elapsed / 60)} min · {distKm} km
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { val: String(Math.round(escorte.elapsed / 60)), unit: 'min',    color: tk.tp, accent: false },
            { val: distKm,                                    unit: 'km',     color: tk.tp, accent: false },
            { val: String(escorte.incidentsAvoided),           unit: 'évités', color: T.semanticSuccess, accent: true },
          ].map((s, i) => (
            <div key={i} style={{
              background: s.accent ? T.semanticSuccessSoft : (d ? T.surfaceCard : T.surfaceBaseL),
              border: `1px solid ${s.accent ? `${T.semanticSuccess}30` : tk.bd}`,
              borderRadius: T.radiusLg, padding: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {s.accent && <Shield size={16} color={T.semanticSuccess} />}
                <span style={{ fontSize: 17, fontWeight: 600, color: s.color }}>{s.val}</span>
              </div>
              <div style={{ fontSize: 10, color: tk.tt }}>{s.unit}</div>
            </div>
          ))}
        </div>

        {/* Cercle merci */}
        {escorte.circleMembers.filter(m => m.status !== 'inactive').length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center',
            marginBottom: 14, padding: '8px 14px',
            background: T.semanticSuccessSoft, border: `1px solid ${T.semanticSuccess}25`,
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex' }}>
              {escorte.circleMembers.filter(m => m.status !== 'inactive').slice(0, 2).map((m, i) => {
                const name = m.profiles?.name ?? '?'
                const col = avatarColor(name)
                return (
                  <div key={m.id} style={{
                    width: 22, height: 22, borderRadius: '50%', background: `${col}25`,
                    border: `1.5px solid ${d ? T.surfaceCard : '#fff'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: col, marginLeft: i > 0 ? -8 : 0,
                  }}>
                    {name[0]}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 11, color: T.semanticSuccess }}>
              {escorte.circleMembers.filter(m => m.status !== 'inactive').map(m => m.profiles?.name).slice(0,2).join(' et ')} t&apos;ont accompagnée
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: 28,
              background: '#3BB4C1',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Retour à la carte
          </button>
        </div>
        <button style={{ width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: T.gradientStart, marginTop: 4 }} onClick={onShowSummary}>
          Voir le résumé du trajet
        </button>
      </motion.div>
    </>
  )
}
