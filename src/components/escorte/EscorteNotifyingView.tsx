'use client'

import { motion } from 'framer-motion'
import { Phone, Copy, Share2 } from 'lucide-react'
import { tok, springConfig } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getColors } from './escorte-styles'
import { bToast } from '@/components/GlobalToast'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onCancel: () => void
  onStart: () => void
}

export default function EscorteNotifyingView({ isDark, escorte, onCancel, onStart }: Props) {
  const d = isDark
  const tk = tok(isDark)
  const C = getColors(isDark)

  const TEAL = '#3BB4C1'
  const GREEN = '#34D399'
  const AMBER = '#FBBF24'

  const hasResponded = escorte.circleMembers.some(
    m => m.status === 'following' || m.status === 'vocal'
  )
  const activeCount = escorte.circleMembers.filter(
    m => m.status === 'following' || m.status === 'vocal'
  ).length

  const inviteCode = (escorte.activeEscorte as any)?.invite_code ?? 'K0623R'

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteCode)
    bToast.success({ title: 'Code copié' }, isDark)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Marche avec moi', text: `Rejoins ma marche avec le code : ${inviteCode}` })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }

  const b1 = d ? 'rgba(255,255,255,0.04)' : 'rgba(10,18,32,0.04)'
  const b2 = d ? 'rgba(255,255,255,0.08)' : 'rgba(10,18,32,0.08)'
  const selev = d ? '#1E293B' : '#F1F5F9'
  const teal12 = 'rgba(59,180,193,0.12)'
  const teal24 = 'rgba(59,180,193,0.24)'

  return (
    <motion.div
      key="escorte-notifying"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}
    >
      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 12, color: C.t2,
      }}>
        <motion.div
          animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER }}
        />
        {hasResponded
          ? `${activeCount} contact${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`
          : 'Notification envoyée · en attente'}
      </div>

      {/* Participants */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
          Participants
        </div>
        {/* Host */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10,
          background: selev, border: `1px solid ${b1}`, marginBottom: 5,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `linear-gradient(135deg, ${TEAL}, #1E3A5F)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
          }}>V</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>Toi (hôte)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: GREEN, marginTop: 1 }}>
              <motion.div
                animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }}
              />
              En ligne
            </div>
          </div>
        </div>

        {/* Waiting circle members */}
        {escorte.circleMembers.map(m => {
          const name = m.profiles?.name ?? '?'
          const col = avatarColor(name)
          const isActive = m.status === 'following' || m.status === 'vocal'
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10,
              background: isActive ? selev : (d ? 'rgba(18,28,48,0.80)' : 'rgba(241,246,250,0.90)'),
              border: isActive ? `1px solid ${b1}` : `1.5px dashed ${b2}`,
              marginBottom: 5,
            }}>
              {isActive ? (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${col}, ${d ? '#1E3A5F' : '#C0D0E0'})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>{name[0]}</div>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid rgba(251,191,36,0.2)`, borderTopColor: AMBER,
                    marginLeft: 6, marginRight: 6,
                  }}
                />
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: tk.tp }}>{name}</div>
                <div style={{ fontSize: 10, color: isActive ? GREEN : C.t3, fontWeight: 600, marginTop: 1 }}>
                  {m.status === 'vocal' ? '🎙 Vocal' : m.status === 'following' ? '● Suit' : 'En attente…'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Audio compact */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 12,
        background: teal12, border: `1px solid ${teal24}`,
        boxShadow: '0 4px 14px rgba(59,180,193,0.07),inset 0 1px 0 rgba(59,180,193,0.06)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: 'rgba(59,180,193,.14)', border: '1px solid rgba(59,180,193,.24)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Phone size={13} strokeWidth={2.2} color={TEAL} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, display: 'flex', alignItems: 'center', gap: 6 }}>
            Canal audio ouvert
            <motion.div
              animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL }}
            />
          </div>
          <div style={{ fontSize: 10, color: C.t2, marginTop: 1 }}>Ton cercle peut rejoindre dès maintenant</div>
        </div>
      </div>

      {/* Code display */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 11,
        background: d ? 'rgba(18,28,48,0.80)' : 'rgba(241,246,250,0.90)',
        border: `1.5px dashed ${teal24}`, cursor: 'pointer',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>Code d&apos;invitation</div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.2em', color: tk.tp, fontVariantNumeric: 'tabular-nums' }}>{inviteCode}</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={handleCopy} style={{
            width: 26, height: 26, borderRadius: 7, border: `1px solid ${teal24}`,
            background: teal12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Copy size={11} strokeWidth={2.5} color={TEAL} />
          </button>
          <button onClick={handleShare} style={{
            width: 26, height: 26, borderRadius: 7, border: `1px solid ${teal24}`,
            background: teal12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Share2 size={11} strokeWidth={2.5} color={TEAL} />
          </button>
        </div>
      </div>

      {/* Cancel */}
      <button onClick={onCancel} style={{
        width: '100%', padding: 8, borderRadius: 9,
        background: 'transparent', border: `1px solid ${b2}`,
        color: C.t3, fontSize: 11, fontWeight: 500, cursor: 'pointer',
        textAlign: 'center', fontFamily: 'inherit',
      }}>
        Annuler la session
      </button>
    </motion.div>
  )
}
