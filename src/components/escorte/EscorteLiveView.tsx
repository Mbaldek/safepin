'use client'

import { motion } from 'framer-motion'
import { Check, Phone, MicOff, PhoneOff } from 'lucide-react'
import { tok, springConfig } from '@/lib/tokens'
import { formatElapsed, avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getColors } from './escorte-styles'
import { useAudioCall } from '@/stores/useAudioCall'
import { bToast } from '@/components/GlobalToast'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  onEndCall: () => void
  onStop: () => void
}

const WAVE_DELAYS = [0, 0.12, 0.24, 0.36, 0.48]

export default function EscorteLiveView({ isDark, escorte, onEndCall, onStop }: Props) {
  const d = isDark
  const tk = tok(isDark)
  const C = getColors(isDark)

  const callState = useAudioCall(s => s.callState)
  const muted = useAudioCall(s => s.muted)
  const callSeconds = useAudioCall(s => s.seconds)
  const setMuted = useAudioCall(s => s.setMuted)

  const TEAL = '#3BB4C1'
  const GREEN = '#34D399'
  const RED = '#EF4444'

  const b1 = d ? 'rgba(255,255,255,0.04)' : 'rgba(10,18,32,0.04)'
  const b2 = d ? 'rgba(255,255,255,0.08)' : 'rgba(10,18,32,0.08)'
  const selev = d ? '#1E293B' : '#F1F5F9'
  const teal12 = 'rgba(59,180,193,0.12)'
  const teal24 = 'rgba(59,180,193,0.24)'

  const vocalCount = escorte.circleMembers.filter(m => m.status === 'vocal').length
  const activeMembers = escorte.circleMembers.filter(m => m.status !== 'inactive')
  const isAudioLive = callState === 'active'

  return (
    <motion.div
      key="escorte-live"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}
    >
      {/* HUD row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderRadius: 16, border: `1px solid ${b2}`,
        background: d ? 'rgba(18,28,48,0.80)' : 'rgba(241,246,250,0.90)',
        backdropFilter: 'blur(20px)',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: tk.tp, lineHeight: 1 }}>
            {formatElapsed(escorte.elapsed)}
          </div>
          <div style={{ fontSize: 9, color: C.t2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <motion.div
              animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: RED }}
            />
            <span style={{ color: RED, fontWeight: 700 }}>REC</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 20,
          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)',
          color: GREEN, fontSize: 10, fontWeight: 700,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }}
          />
          En marche
        </div>
      </div>

      {/* Protection active */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
          Protection active
        </div>

        {/* Cercle notifié */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 10,
          background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.15)', marginBottom: 4,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={10} strokeWidth={2.2} color={GREEN} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: tk.tp, flex: 1 }}>
            Cercle notifié · {escorte.circleMembers.length} contact{escorte.circleMembers.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>Actif</div>
        </div>

        {/* Canal audio */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 10,
          background: teal12, border: `1px solid ${teal24}`, marginBottom: 4,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: teal12, border: `1px solid ${teal24}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={10} strokeWidth={2.2} color={TEAL} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: tk.tp, flex: 1 }}>
            Canal audio · {isAudioLive ? `${vocalCount + 1} personnes` : 'en attente'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>{isAudioLive ? '● Live' : '…'}</div>
        </div>

        {/* Julia veille */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 10,
          border: `1px solid ${b1}`, opacity: escorte.juliaActive ? 1 : 0.3,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: C.t2 }}>…</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: tk.tp, flex: 1 }}>
            Julia {escorte.juliaActive ? '· active' : '(si pas de réponse)'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: escorte.juliaActive ? '#A78BFA' : C.t3 }}>
            {escorte.juliaActive ? 'Actif' : 'Veille'}
          </div>
        </div>
      </div>

      {/* Audio bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 12,
        background: `linear-gradient(135deg, rgba(59,180,193,.1), rgba(59,180,193,.05))`,
        border: `1px solid ${teal24}`,
      }}>
        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
          {[6, 14, 20, 12, 8].map((h, i) => (
            <motion.div
              key={i}
              animate={isAudioLive && !muted ? { scaleY: [0.3, 1, 0.3] } : { scaleY: 0.3 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: WAVE_DELAYS[i] }}
              style={{ width: 2.5, height: h, borderRadius: 2, background: TEAL, transformOrigin: 'center' }}
            />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>
            Canal audio · {vocalCount + 1} participant{vocalCount > 0 ? 's' : ''}
          </div>
          <div style={{ fontSize: 10, color: C.t2, display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ color: TEAL }}>{isAudioLive ? formatElapsed(callSeconds) : '--:--'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => setMuted(!muted)}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: muted ? 'rgba(239,68,68,0.08)' : (d ? 'rgba(255,255,255,0.04)' : 'rgba(10,18,32,0.04)'),
              border: `1px solid ${muted ? 'rgba(239,68,68,.2)' : b2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <MicOff size={11} strokeWidth={2} color={muted ? RED : C.t2} />
          </button>
          <button
            onClick={onEndCall}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <PhoneOff size={11} strokeWidth={2.2} color={RED} />
          </button>
        </div>
      </div>

      {/* Participants */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
          Participants
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' as any }}>
          {/* You */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 8px', borderRadius: 10, background: selev, border: `1px solid ${b1}`,
            minWidth: 50, flexShrink: 0,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${TEAL}, #1E3A5F)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', position: 'relative' }}>
              V
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: GREEN, border: `2px solid ${selev}` }} />
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.t2 }}>Vous</div>
          </div>

          {/* Circle members */}
          {activeMembers.map(m => {
            const name = m.profiles?.name ?? '?'
            const col = avatarColor(name)
            return (
              <div key={m.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 8px', borderRadius: 10, background: selev, border: `1px solid ${b1}`,
                minWidth: 50, flexShrink: 0,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${col}, ${d ? '#1E3A5F' : '#C0D0E0'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', position: 'relative' }}>
                  {name[0]}
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: GREEN, border: `2px solid ${selev}` }} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: C.t2 }}>{name.split(' ')[0]}</div>
              </div>
            )
          })}

          {/* Invite card */}
          <div
            onClick={async () => {
              const code = (escorte.activeEscorte as any)?.invite_code
              if (!code) return
              if (navigator.share) {
                try { await navigator.share({ text: `Rejoins ma marche sur Breveil : ${code}` }) } catch {}
              } else {
                await navigator.clipboard.writeText(code)
                bToast.success({ title: 'Code copié !' }, isDark)
              }
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 8px', borderRadius: 10, background: selev,
              border: `1.5px dashed ${b2}`, minWidth: 50, flexShrink: 0, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: teal12, border: `1.5px dashed ${teal24}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: TEAL, fontSize: 18,
            }}>+</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: TEAL }}>Inviter</div>
          </div>
        </div>
      </div>

      {/* End button */}
      <button onClick={onStop} style={{
        width: '100%', padding: 9, borderRadius: 10,
        background: 'transparent', border: `1px solid ${b2}`,
        color: C.t3, fontSize: 11, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        fontFamily: 'inherit',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        Terminer la marche
      </button>
    </motion.div>
  )
}
