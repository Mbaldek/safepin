'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, MicOff, PhoneOff, Navigation, Footprints, Send, Share2, Square } from 'lucide-react'
import { tok, springConfig } from '@/lib/tokens'
import { formatElapsed, avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getColors } from './escorte-styles'
import { useAudioCall } from '@/stores/useAudioCall'
import { useStore } from '@/stores/useStore'
import { haversineMetersLngLat } from '@/lib/utils'
import { bToast } from '@/components/GlobalToast'
import type { TransitStep } from '@/lib/transit'
import type { WalkStep } from '@/lib/directions'

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
  const VIOLET = '#A78BFA'

  const b1 = d ? 'rgba(255,255,255,0.04)' : 'rgba(10,18,32,0.04)'
  const b2 = d ? 'rgba(255,255,255,0.08)' : 'rgba(10,18,32,0.08)'
  const selev = d ? '#1E293B' : '#F1F5F9'
  const teal12 = 'rgba(59,180,193,0.12)'
  const teal24 = 'rgba(59,180,193,0.24)'

  const vocalCount = escorte.circleMembers.filter(m => m.status === 'vocal').length
  const activeMembers = escorte.circleMembers.filter(m => m.status !== 'inactive')
  const isAudioLive = callState === 'active'

  // ── Navigation step tracking ──────────────────
  const activeTrip = useStore(s => s.activeTrip)
  const userLocation = useStore(s => s.userLocation)
  const transitSteps: TransitStep[] = activeTrip?.transitSteps ?? activeTrip?.route?.steps ?? []
  const walkSteps: WalkStep[] = activeTrip?.route?.walkSteps ?? []
  const hasTransit = transitSteps.length > 0
  const hasWalk = walkSteps.length > 0

  const [currentTransitIdx, setCurrentTransitIdx] = useState(0)
  const [currentWalkIdx, setCurrentWalkIdx] = useState(0)

  const currentTransitStep = transitSteps[currentTransitIdx] ?? null
  const nextTransitStep = transitSteps[currentTransitIdx + 1] ?? null
  const currentWalkStep = walkSteps[currentWalkIdx] ?? null
  const nextWalkStep = walkSteps[currentWalkIdx + 1] ?? null

  // Advance transit step when within 20m of step endpoint
  useEffect(() => {
    if (!userLocation || !transitSteps.length) return
    const step = transitSteps[currentTransitIdx]
    if (!step?.coords?.length) return
    const target = step.coords[step.coords.length - 1]
    const dist = haversineMetersLngLat([userLocation.lng, userLocation.lat], target)
    if (dist < 20) {
      setCurrentTransitIdx(i => Math.min(i + 1, transitSteps.length - 1))
    }
  }, [userLocation?.lat, userLocation?.lng, currentTransitIdx, transitSteps])

  // Advance walk step based on accumulated distance
  useEffect(() => {
    if (!walkSteps.length || !escorte.distanceM) return
    let acc = 0
    for (let i = 0; i < walkSteps.length; i++) {
      acc += walkSteps[i].distance
      if (escorte.distanceM < acc) {
        setCurrentWalkIdx(i)
        return
      }
    }
    setCurrentWalkIdx(walkSteps.length - 1)
  }, [escorte.distanceM, walkSteps])

  // Reset on new escorte
  useEffect(() => {
    setCurrentTransitIdx(0)
    setCurrentWalkIdx(0)
  }, [escorte.activeEscorte?.id])

  // Format distance for display
  const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`

  // Remaining distance to current walk step endpoint
  const walkStepRemaining = (() => {
    if (!currentWalkStep) return null
    let acc = 0
    for (let i = 0; i <= currentWalkIdx; i++) acc += walkSteps[i].distance
    const remaining = acc - escorte.distanceM
    return remaining > 0 ? remaining : 0
  })()

  // Current transit step: compute remaining stops
  const transitStopsRemaining = currentTransitStep?.stops ?? 0

  // Destination card data
  const destName = escorte.activeEscorte?.dest_name
  const destAddress = escorte.activeEscorte?.dest_address
  const etaMinutes = escorte.activeEscorte?.eta_minutes
  const progressPct = etaMinutes && etaMinutes > 0
    ? Math.min(100, Math.round((escorte.elapsed / 60 / etaMinutes) * 100))
    : 0
  const etaRemaining = etaMinutes
    ? Math.max(0, etaMinutes - Math.floor(escorte.elapsed / 60))
    : null
  const circumference = 2 * Math.PI * 14 // r=14
  const dashOffset = circumference - (progressPct / 100) * circumference

  return (
    <motion.div
      key="escorte-live"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}
    >
      {/* Destination card */}
      {destName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 16,
          border: `1px solid ${b2}`,
          background: d ? 'rgba(18,28,48,0.85)' : 'rgba(241,246,250,0.90)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Icon */}
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Send size={16} strokeWidth={2.2} color={VIOLET} />
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {destName}
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <motion.div
                animate={{ opacity: [1, 0.35, 1], scale: [1, 0.55, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }}
              />
              <span>{etaRemaining != null ? `~${etaRemaining} min restantes` : 'En cours'}</span>
              {escorte.distanceM > 0 && (
                <>
                  <span style={{ color: C.t3 }}>·</span>
                  <span style={{ color: C.t3 }}>{fmtDist(escorte.distanceM)}</span>
                </>
              )}
            </div>
          </div>
          {/* Circular progress */}
          <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke={b2} strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={TEAL} strokeWidth="3"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                transform="rotate(-90 18 18)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: TEAL }}>
              {progressPct}%
            </div>
          </div>
        </div>
      )}

      {/* HUD row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Timer + En marche */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
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
      </div>

      {/* ── Navigation step card ── */}
      {hasTransit && currentTransitStep && currentTransitStep.mode !== 'walking' && (
        <div style={{
          display: 'flex', alignItems: 'stretch', gap: 10, padding: '10px 12px', borderRadius: 14,
          background: d ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.05)',
          border: '1px solid rgba(167,139,250,0.18)',
        }}>
          {/* Progress bar vertical */}
          <div style={{ width: 3, borderRadius: 3, background: d ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.10)', position: 'relative', flexShrink: 0 }}>
            <motion.div
              initial={{ height: '0%' }}
              animate={{ height: `${Math.min(100, ((currentTransitIdx + 1) / transitSteps.length) * 100)}%` }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 3, background: VIOLET }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Line badge + headsign */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                background: currentTransitStep.lineColor ?? VIOLET,
                color: '#fff', letterSpacing: '0.03em',
              }}>
                {currentTransitStep.line ?? currentTransitStep.mode.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTransitStep.headsign ?? currentTransitStep.to}
              </div>
            </div>

            {/* Stops remaining */}
            {transitStopsRemaining > 0 && (
              <div style={{ fontSize: 11, color: C.t2, marginBottom: 3 }}>
                {transitStopsRemaining} arrêt{transitStopsRemaining > 1 ? 's' : ''} restant{transitStopsRemaining > 1 ? 's' : ''}
              </div>
            )}

            {/* Next stop */}
            <div style={{ fontSize: 10, color: VIOLET, fontWeight: 600 }}>
              Prochain arrêt · {currentTransitStep.to}
            </div>

            {/* Dot progress */}
            {currentTransitStep.stops && currentTransitStep.stops > 1 && (
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {Array.from({ length: Math.min(currentTransitStep.stops, 12) }).map((_, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: i < Math.ceil((currentTransitIdx / Math.max(transitSteps.length - 1, 1)) * currentTransitStep.stops!)
                      ? VIOLET
                      : (d ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.12)'),
                    transition: 'background 300ms',
                  }} />
                ))}
              </div>
            )}

            {/* Next transit step preview */}
            {nextTransitStep && (
              <div style={{ fontSize: 10, color: C.t3, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                Puis ·
                {nextTransitStep.mode === 'walking' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Footprints size={9} strokeWidth={2} color={C.t3} /> Marche vers {nextTransitStep.to}
                  </span>
                ) : (
                  <span style={{
                    padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                    background: nextTransitStep.lineColor ?? VIOLET, color: '#fff',
                  }}>
                    {nextTransitStep.line ?? nextTransitStep.mode.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Walk navigation step */}
      {((!hasTransit && hasWalk) || (hasTransit && currentTransitStep?.mode === 'walking')) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14,
          background: d ? 'rgba(59,180,193,0.06)' : 'rgba(59,180,193,0.05)',
          border: `1px solid ${teal24}`,
        }}>
          {/* Arrow icon */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: teal12, border: `1px solid ${teal24}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Navigation size={18} strokeWidth={2} color={TEAL} style={{ transform: 'rotate(45deg)' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tk.tp, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasTransit && currentTransitStep
                ? (currentTransitStep.to ?? 'Continuer')
                : (currentWalkStep?.name || 'Continuer')}
            </div>
            <div style={{ fontSize: 11, color: C.t2, marginTop: 1 }}>
              {hasTransit && currentTransitStep
                ? `Marche · ${fmtDist(currentTransitStep.duration * 1.3)}`
                : walkStepRemaining != null
                  ? `${fmtDist(walkStepRemaining)}${currentWalkStep?.name ? ` · ${currentWalkStep.name}` : ''}`
                  : fmtDist(escorte.distanceM)}
            </div>

            {/* Next step preview */}
            {!hasTransit && nextWalkStep && (
              <div style={{ fontSize: 10, color: C.t3, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Puis · {nextWalkStep.name || 'Continuer'}
              </div>
            )}
            {hasTransit && nextTransitStep && nextTransitStep.mode !== 'walking' && (
              <div style={{ fontSize: 10, color: C.t3, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                Puis ·
                <span style={{
                  padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                  background: nextTransitStep.lineColor ?? VIOLET, color: '#fff',
                }}>
                  {nextTransitStep.line ?? nextTransitStep.mode.toUpperCase()}
                </span>
                {nextTransitStep.headsign}
              </div>
            )}

            {/* Walk progress bar */}
            {hasWalk && !hasTransit && walkSteps.length > 1 && (
              <div style={{ marginTop: 5, height: 3, borderRadius: 3, background: d ? 'rgba(59,180,193,0.10)' : 'rgba(59,180,193,0.08)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, ((currentWalkIdx + 1) / walkSteps.length) * 100)}%` }}
                  style={{ height: '100%', borderRadius: 3, background: TEAL }}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' as const }}>
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
              const code = escorte.activeEscorte?.invite_code
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

      {/* Bottom actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 4px' }}>
        {/* Arrived CTA */}
        <button
          onClick={onStop}
          style={{
            flex: 1, height: 42, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #34D399, #2aaa82)',
            color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            fontFamily: 'inherit',
          }}
        >
          <Check size={14} strokeWidth={2.5} color="#FFFFFF" />
          Je suis arrivée
        </button>
        {/* Share */}
        <button
          onClick={async () => {
            const code = escorte.activeEscorte?.invite_code
            if (!code) return
            if (navigator.share) {
              try { await navigator.share({ text: `Rejoins ma marche sur Breveil : ${code}` }) } catch {}
            } else {
              await navigator.clipboard.writeText(code)
              bToast.success({ title: 'Code copié !' }, isDark)
            }
          }}
          title="Partager"
          style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: d ? 'rgba(18,28,48,0.85)' : 'rgba(241,246,250,0.90)',
            border: `1px solid ${b2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Share2 size={14} strokeWidth={2.2} color={C.t2} />
        </button>
        {/* Stop */}
        <button
          onClick={onStop}
          title="Arrêter"
          style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Square size={14} strokeWidth={2.2} color={RED} />
        </button>
      </div>

    </motion.div>
  )
}
