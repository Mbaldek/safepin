'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, X } from 'lucide-react'
import { Room, RoomEvent } from 'livekit-client'
import { useAudioCall } from '@/stores/useAudioCall'
import { useStore } from '@/stores/useStore'
import { useTheme } from '@/stores/useTheme'

const TEAL = '#3BB4C1'
const RED = '#EF4444'
const PILL_SPRING = { type: 'spring' as const, stiffness: 280, damping: 28, mass: 0.9 }

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function FloatingCallPill() {
  const isDark = useTheme((s) => s.theme) === 'dark'
  const userId = useStore((s) => s.userId) ?? ''

  const roomName = useAudioCall((s) => s.roomName)
  const title = useAudioCall((s) => s.title)
  const callState = useAudioCall((s) => s.callState)
  const muted = useAudioCall((s) => s.muted)
  const seconds = useAudioCall((s) => s.seconds)
  const endCall = useAudioCall((s) => s.endCall)
  const setCallState = useAudioCall((s) => s.setCallState)
  const setMuted = useAudioCall((s) => s.setMuted)
  const tick = useAudioCall((s) => s.tick)
  const toggleCallSheet = useAudioCall((s) => s.toggleCallSheet)
  const callSheetOpen = useAudioCall((s) => s.callSheetOpen)
  const chatOpen = useAudioCall((s) => s.chatOpen)

  const roomRef = useRef<Room | null>(null)
  const cancelledRef = useRef(false)
  const active = callState !== 'idle' && !callSheetOpen && !chatOpen

  // Timer
  useEffect(() => {
    if (callState !== 'active') return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [callState, tick])

  // Connect / disconnect LiveKit room
  useEffect(() => {
    if (!roomName || !userId) return

    cancelledRef.current = false
    const room = new Room({
      audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true },
      videoCaptureDefaults: { resolution: { width: 0, height: 0, frameRate: 0 } },
    })
    roomRef.current = room

    ;(async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, userId, displayName: null, canPublish: true }),
        })
        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
        const { token, url } = await res.json()
        if (cancelledRef.current) return
        if (!url || !token) throw new Error('Missing token or URL')
        await room.connect(url, token)
        if (cancelledRef.current) { room.disconnect(); return }
        await room.localParticipant.setMicrophoneEnabled(true)
        setCallState('active')
      } catch {
        if (!cancelledRef.current) setCallState('error')
      }
    })()

    room.on(RoomEvent.Disconnected, () => {
      if (cancelledRef.current) return
      endCall()
    })

    return () => {
      cancelledRef.current = true
      room.disconnect()
      roomRef.current = null
    }
  }, [roomName, userId])

  const handleToggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
  }, [muted, setMuted])

  const handleEnd = useCallback(() => {
    cancelledRef.current = true
    roomRef.current?.disconnect()
    endCall()
  }, [endCall])

  const bg = isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)'
  const borderColor = callState === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(59,180,193,0.25)'
  const glow = callState === 'error'
    ? '0 0 20px rgba(239,68,68,0.1)'
    : '0 0 20px rgba(59,180,193,0.1)'

  return (
    <AnimatePresence>
      {active && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <motion.div
            key="floating-call-pill"
            layoutId="active-call-pill"
            layout
            initial={{ opacity: 0, y: -12, scale: 0.92, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={PILL_SPRING}
            style={{
              width: 272,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px 7px 10px',
              borderRadius: 999,
              background: bg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 4px 16px rgba(0,0,0,${isDark ? '0.3' : '0.08'}), ${glow}`,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return
              toggleCallSheet()
            }}
          >
            {/* Error state */}
            {callState === 'error' ? (
              <>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94A3B8' : '#475569' }}>
                  Audio indisponible
                </span>
                <button
                  onClick={handleEnd}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)',
                    border: `1px solid ${RED}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                >
                  <X size={11} strokeWidth={2} color={RED} />
                </button>
              </>
            ) : (
              <>
                {/* Waveform */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 18, flexShrink: 0 }}>
                  {[0, 120, 240, 120, 0].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={(callState === 'active' && !muted) ? { height: ['3px', '14px', '3px'] } : { height: '3px' }}
                      transition={{ duration: 1.1, delay: delay / 1000, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        width: 2.5, borderRadius: 2,
                        background: (callState === 'active' && !muted) ? TEAL : '#94A3B8',
                        minHeight: 3,
                        opacity: muted ? 0.3 : 1,
                      }}
                    />
                  ))}
                </div>

                {/* Title + timer (stacked) */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A', lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 160,
                  }}>
                    {title}
                  </span>
                  {callState === 'active' && (
                    <span style={{
                      fontSize: 9, fontWeight: 500, color: TEAL,
                      fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
                    }}>
                      {formatTime(seconds)}
                    </span>
                  )}
                </div>

                {/* Mute */}
                <button
                  onClick={handleToggleMute}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: muted ? 'rgba(239,68,68,0.12)' : 'rgba(59,180,193,0.12)',
                    border: `1px solid ${muted ? RED + '40' : TEAL + '40'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                >
                  {muted
                    ? <MicOff size={11} strokeWidth={1.5} color={RED} />
                    : <Mic size={11} strokeWidth={1.5} color={TEAL} />
                  }
                </button>

                {/* End */}
                <button
                  onClick={handleEnd}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)',
                    border: `1px solid ${RED}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                >
                  <X size={11} strokeWidth={2} color={RED} />
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
