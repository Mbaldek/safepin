'use client'

import { motion } from 'framer-motion'
import {
  ChevronLeft, Users, AlertTriangle, Mic, Zap,
} from 'lucide-react'
import { T, tok, springConfig } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getCardStyle, getBtnPrimary, getColors } from './escorte-styles'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onBack: () => void
  onStart: () => void
}

export default function EscorteIntroView({ isDark, escorte, onBack, onStart }: Props) {
  const d  = isDark
  const tk = tok(isDark)
  const C  = getColors(isDark)
  const cardSt    = getCardStyle(isDark)
  const btnPrimary = getBtnPrimary(C)

  return (
    <motion.div
      key="escorte-intro"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 18px 18px', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          width: 30, height: 30, borderRadius: '50%', background: tk.ih,
          border: `1px solid ${tk.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronLeft size={14} strokeWidth={2} color={tk.ts} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: tk.tp }}>Marche avec moi</div>
          <div style={{ fontSize: 11, color: tk.tt }}>Ton cercle alerte instantanement</div>
        </div>
      </div>

      {/* Cercle + CTA card */}
      <div style={{
        background: 'rgba(59,180,193,0.08)', border: '1px solid rgba(59,180,193,0.25)',
        borderRadius: 16, padding: '12px 14px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.gradientStart, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          TON CERCLE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {['Marie','Tom','Alex','Sara'].map((name, i) => {
                const col = avatarColor(name)
                return (
                  <div key={i} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${col}25`, border: `2px solid ${d ? T.surfaceElevated : '#fff'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: col,
                    marginLeft: i > 0 ? -9 : 0,
                  }}>
                    {name[0]}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 12, color: tk.ts }}>4 personnes</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{
              ...btnPrimary,
              width: 'auto', padding: '7px 14px',
              fontSize: 12, gap: 6, borderRadius: 12,
              opacity: escorte.isStarting ? 0.7 : 1,
              cursor: escorte.isStarting ? 'default' : 'pointer',
            }}
            onClick={onStart}
            disabled={escorte.isStarting}
          >
            <Users size={12} strokeWidth={2} />
            {escorte.isStarting ? 'Connexion...' : 'Informer mon cercle'}
          </motion.button>
        </div>
      </div>

      {escorte.escorteError && (
        <div style={{
          marginBottom: 10, padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.20)',
          borderRadius: 12, fontSize: 12,
          color: '#EF4444',
        }}>
          {escorte.escorteError}
        </div>
      )}

      {/* 3 niveaux */}
      {[
        {
          level: 'NIVEAU 1', color: T.accentGold, bg: 'rgba(245,195,65,0.10)',
          icon: <AlertTriangle size={14} strokeWidth={1.5} color={T.accentGold} />,
          title: 'Notification push',
          desc: 'Tout le cercle recoit une alerte. En 1 tap, ils te suivent sur la carte.',
          badge: null,
        },
        {
          level: 'NIVEAU 2', color: T.gradientStart, bg: 'rgba(59,180,193,0.10)',
          icon: <Mic size={14} strokeWidth={1.5} color={T.gradientStart} />,
          title: 'Canal audio prive',
          desc: 'Ils rejoignent une room audio. Vous parlez ensemble en direct.',
          badge: null,
        },
        {
          level: 'SI PERSONNE (2 min)', color: T.accentPurple, bg: 'rgba(167,139,250,0.10)',
          icon: <Zap size={14} strokeWidth={1.5} color={T.accentPurple} />,
          title: 'Julia te rejoint',
          desc: "L'IA Julia reste avec toi jusqu'a ton arrivee.",
          badge: 'BIENTOT',
        },
      ].map((item, i) => (
        <div key={i} style={{ ...cardSt, padding: '12px 14px', display: 'flex', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: item.bg, border: `1px solid ${item.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {item.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: item.color, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {item.level}
              </span>
              {item.badge && (
                <span style={{ fontSize: 8, fontWeight: 700, color: T.accentPurple, background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                  {item.badge}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.tp, marginBottom: 2 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: tk.ts, lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
