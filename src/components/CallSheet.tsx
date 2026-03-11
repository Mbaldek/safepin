'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, ChevronDown, UserPlus, Volume2, PhoneOff } from 'lucide-react'
import { useAudioCall } from '@/stores/useAudioCall'
import { useIsDark } from '@/hooks/useIsDark'
import { avatarColor } from '@/lib/escorteHelpers'
import { bToast } from '@/components/GlobalToast'

// ─── Design tokens ──────────────────────────────────────────────────────────
const TEAL = '#3BB4C1'
const TEAL_D = 'rgba(59,180,193,0.14)'
const TEAL_G = 'rgba(59,180,193,0.26)'
const RED = '#EF4444'
const RED_D = 'rgba(239,68,68,0.14)'
const GREEN = '#34D399'

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function getColors(isDark: boolean) {
  return {
    glass: isDark ? 'rgba(10,18,30,0.97)' : 'rgba(255,255,255,0.98)',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    el: isDark ? '#28384d' : '#F1F5F9',
    txt: isDark ? '#F1F5F9' : '#0F172A',
    txts: isDark ? '#94A3B8' : '#475569',
    txtt: isDark ? '#475569' : '#94A3B8',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
    borderM: isDark ? 'rgba(255,255,255,0.11)' : 'rgba(15,23,42,0.10)',
    borderH: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.18)',
  }
}

const springSheet = { type: 'spring' as const, stiffness: 300, damping: 30 }

// Keyframes moved to globals.css

export default function CallSheet() {
  const isDark = useIsDark()
  const C = getColors(isDark)

  const source = useAudioCall((s) => s.source)
  const participantNames = useAudioCall((s) => s.participantNames)
  const callState = useAudioCall((s) => s.callState)
  const muted = useAudioCall((s) => s.muted)
  const seconds = useAudioCall((s) => s.seconds)
  const callSheetOpen = useAudioCall((s) => s.callSheetOpen)
  const setMuted = useAudioCall((s) => s.setMuted)
  const endCall = useAudioCall((s) => s.endCall)
  const setCallSheetOpen = useAudioCall((s) => s.setCallSheetOpen)

  const [confirmingEnd, setConfirmingEnd] = useState(false)

  const active = callState !== 'idle'
  const isDM = source === 'dm'
  const isConnecting = callState === 'connecting'

  const handleToggleMute = useCallback(() => {
    setMuted(!muted)
  }, [muted, setMuted])

  const handleCollapse = useCallback(() => {
    setCallSheetOpen(false)
  }, [setCallSheetOpen])

  const handleConfirmEnd = useCallback(() => {
    endCall()
  }, [endCall])

  const sourceLabel = source === 'cercle' ? 'Cercle'
    : source === 'group' ? 'Groupe'
    : source === 'walk' ? 'Marche'
    : source === 'escorte' ? 'Escorte'
    : source === 'dm' ? participantNames[0] ?? 'DM'
    : ''

  // ─── Subcomponents ──────────────────────────────────────────────────────────

  const renderHeader = () => (
    <div style={{ padding: '9px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block',
            boxShadow: `0 0 0 3px rgba(52,211,153,0.18)`,
            animation: 'call-sheet-live-dot 2s ease-in-out infinite',
          }} />
          {isDM ? sourceLabel : `${sourceLabel} · En appel`}
        </div>
        <div style={{ fontSize: 10.5, color: isDM ? TEAL : C.txts, marginTop: 1 }}>
          {isConnecting ? 'Connexion...'
            : isDM ? 'En appel · 1:1'
            : `${participantNames.length + 1} participants`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {isDM && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, padding: '0 4px' }}>
            {[4, 7, 10, 12].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, borderRadius: 1, background: TEAL }} />
            ))}
          </div>
        )}
        <div
          onClick={handleCollapse}
          style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: 'none', background: C.el,
          }}
        >
          <ChevronDown size={10} strokeWidth={2.5} color={C.txts} />
        </div>
      </div>
    </div>
  )

  const renderParticipants = () => {
    const others = participantNames
    return (
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* You */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 6px', borderRadius: 11,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white', position: 'relative',
            background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
          }}>
            V
            {!muted && (
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                border: `2px solid ${TEAL}`,
                animation: 'call-sheet-ring-pulse 1s ease-in-out infinite',
              }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.txt }}>
              Vous
            </div>
            <div style={{ fontSize: 10.5, color: muted ? C.txtt : TEAL, marginTop: 1 }}>
              {isConnecting ? 'Connexion...' : muted ? '🔇 muté' : '● parle...'}
            </div>
          </div>
          {muted
            ? <MicOff size={15} strokeWidth={2} color={C.txtt} />
            : <Mic size={15} strokeWidth={2} color={TEAL} />
          }
        </div>

        {/* Others */}
        {others.map((name, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 6px', borderRadius: 11,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white',
              background: avatarColor(name),
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.txt }}>{name}</div>
              <div style={{ fontSize: 10.5, color: C.txts, marginTop: 1 }}>écoute</div>
            </div>
            <MicOff size={15} strokeWidth={2} color={C.txtt} />
          </div>
        ))}
      </div>
    )
  }

  const renderInviteRow = () => (
    <>
      <div style={{ height: 1, background: C.border, margin: '4px 14px' }} />
      <div
        onClick={() => bToast.info({ title: 'Fonctionnalité bientôt disponible' }, isDark)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 16px', cursor: 'pointer', opacity: 0.9,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(59,180,193,0.08)',
          border: '1.5px dashed rgba(59,180,193,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserPlus size={13} strokeWidth={2.2} color={TEAL} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEAL }}>Inviter dans l&apos;appel</div>
          <div style={{ fontSize: 11, color: C.txts, marginTop: 1 }}>Partager le lien · Ajouter du cercle</div>
        </div>
      </div>
      <div style={{ height: 1, background: C.border, margin: '4px 14px' }} />
    </>
  )

  const renderDMHero = () => {
    const name = participantNames[0] ?? 'Contact'
    return (
      <div style={{ padding: '20px 14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: 'white',
          background: 'linear-gradient(135deg,#3BB4C1,#1E3A5F)',
          position: 'relative',
        }}>
          {name.charAt(0).toUpperCase()}
          {!muted && (
            <div style={{
              position: 'absolute', inset: -3, borderRadius: '50%',
              border: `2.5px solid ${TEAL}`,
              animation: 'call-sheet-ring-pulse 1.4s ease-in-out infinite',
            }} />
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.txt, letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: muted ? C.txtt : TEAL, display: 'flex', alignItems: 'center', gap: 5 }}>
          {!muted && (
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
              {[4, 7, 10, 12].map((h, i) => (
                <span key={i} style={{ display: 'block', width: 3, height: h, borderRadius: 1, background: TEAL }} />
              ))}
            </span>
          )}
          {isConnecting ? 'Connexion...' : muted ? '🔇 Micro coupé' : 'En appel'}
        </div>
      </div>
    )
  }

  const renderMicZone = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <motion.div
        whileTap={{ scale: 0.92 }}
        onClick={handleToggleMute}
        style={{
          width: 68, height: 68, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer',
          transition: 'opacity 0.25s',
          ...((!muted && !isConnecting) ? {
            background: 'radial-gradient(circle,rgba(59,180,193,0.22) 0%,rgba(59,180,193,0.04) 70%)',
          } : {}),
        }}
      >
        {/* Ripple ring when active */}
        {!muted && !isConnecting && (
          <div style={{
            position: 'absolute', inset: -7, borderRadius: '50%',
            background: 'rgba(59,180,193,0.07)',
            animation: 'call-sheet-mic-ripple 2s ease-in-out infinite',
          }} />
        )}
        {/* Spinner ring when connecting */}
        {isConnecting && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: TEAL,
            borderRightColor: 'rgba(59,180,193,0.25)',
            animation: 'call-sheet-spinner 1s linear infinite',
          }} />
        )}
        {/* Inner circle */}
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isConnecting ? C.el : muted ? 'rgba(239,68,68,0.85)' : TEAL,
          boxShadow: isConnecting ? 'none' : muted ? '0 4px 14px rgba(239,68,68,0.28)' : `0 4px 14px rgba(59,180,193,0.38)`,
          transition: 'background 0.2s, box-shadow 0.2s',
        }}>
          {muted
            ? <MicOff size={20} strokeWidth={2} color="white" />
            : <Mic size={20} strokeWidth={2} color="white" />
          }
        </div>
      </motion.div>
      <div style={{ fontSize: 11, fontWeight: 600, color: confirmingEnd ? RED : C.txts, textAlign: 'center', transition: 'color 0.2s' }}>
        {confirmingEnd
          ? (isDM ? "Terminer l'appel ?" : "Quitter l'appel ?")
          : isConnecting ? 'Connexion en cours...'
          : muted ? 'Micro coupé — appuyer pour réactiver'
          : 'Appuyer pour couper le micro'
        }
      </div>
    </div>
  )

  const renderActionRow = () => (
    <AnimatePresence mode="wait">
      {!confirmingEnd ? (
        <motion.div
          key="actions"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 44, padding: '4px 0 20px' }}
        >
          {/* Speaker */}
          <div
            onClick={() => bToast.info({ title: 'Fonctionnalité bientôt disponible' }, isDark)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.el, border: `1px solid ${C.border}`,
            }}>
              <Volume2 size={18} strokeWidth={2} color={C.txts} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: C.txts }}>Haut-parleur</span>
          </div>
          {/* Quit */}
          <div
            onClick={() => setConfirmingEnd(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.12)', border: `1.5px solid ${RED}`,
              animation: 'call-sheet-call-pulse 2s ease-in-out infinite',
            }}>
              <PhoneOff size={18} strokeWidth={2} color={RED} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: RED }}>Quitter</span>
          </div>
          {/* Duration */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(59,180,193,0.10)', border: `1.5px solid ${TEAL}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{formatTime(seconds)}</span>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: TEAL }}>Durée</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '4px 16px 20px' }}
        >
          <button
            onClick={() => setConfirmingEnd(false)}
            style={{
              padding: '0 28px', height: 40, borderRadius: 999, boxSizing: 'border-box' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              background: 'transparent', border: `1.5px solid ${C.borderM}`, color: C.txt,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => { handleConfirmEnd(); setConfirmingEnd(false) }}
            style={{
              padding: '0 28px', height: 40, borderRadius: 999, boxSizing: 'border-box' as const,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              background: RED, border: 'none', color: 'white',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(239,68,68,0.30)',
            }}
          >
            {isDM ? 'Terminer' : 'Quitter'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )


  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {active && callSheetOpen && (
          <>
            {/* Backdrop — tap to collapse */}
            <motion.div
              key="call-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleCollapse}
              style={{ position: 'fixed', inset: 0, zIndex: 699, background: 'transparent' }}
            />
            <motion.div
              key="call-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0, right: 0,
              zIndex: 700,
              borderRadius: '20px 20px 0 0',
              background: C.glass,
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              borderTop: `1px solid ${C.borderM}`,
              overflow: 'hidden',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 9 }}>
              <div style={{ width: 30, height: 3, borderRadius: 99, background: C.borderH }} />
            </div>

            {renderHeader()}

            {/* Content area */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
              {isDM ? renderDMHero() : (
                <>
                  {renderParticipants()}
                  {renderInviteRow()}
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                {renderMicZone()}
                {renderActionRow()}
              </div>
            </div>

          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
