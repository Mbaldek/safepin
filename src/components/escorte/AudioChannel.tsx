'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, X } from 'lucide-react'
import { Room, RoomEvent } from 'livekit-client'
import { T, tok } from '@/lib/tokens'

interface Props {
  roomName: string
  userId: string
  isDark: boolean
  title?: string
  participantNames?: string[]
  onEnd: () => void
  onStateChange?: (state: 'connecting' | 'active' | 'error' | 'ended') => void
}

export default function AudioChannel({
  roomName,
  userId,
  isDark,
  title = 'Canal audio actif',
  participantNames = [],
  onEnd,
  onStateChange,
}: Props) {
  const tk = tok(isDark)
  const roomRef = useRef<Room | null>(null)
  const cancelledRef = useRef(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(false)
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)

  // Timer
  useEffect(() => {
    if (!connected) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [connected])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // Connect
  useEffect(() => {
    cancelledRef.current = false
    const room = new Room({
      audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true },
      videoCaptureDefaults: { resolution: { width: 0, height: 0, frameRate: 0 } },
    })
    roomRef.current = room

    ;(async () => {
      try {
        onStateChange?.('connecting')
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            userId,
            displayName: null,
            canPublish: true,
          }),
        })
        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
        const { token, url } = await res.json()
        if (cancelledRef.current) return
        if (!url || !token) throw new Error('Missing token or URL')
        await room.connect(url, token)
        if (cancelledRef.current) { room.disconnect(); return }
        await room.localParticipant.setMicrophoneEnabled(true)
        setConnected(true)
        onStateChange?.('active')
      } catch {
        if (!cancelledRef.current) {
          setError(true)
          onStateChange?.('error')
        }
      }
    })()

    room.on(RoomEvent.Disconnected, () => {
      if (cancelledRef.current) return
      setConnected(false)
      onStateChange?.('ended')
      onEnd()
    })

    return () => {
      cancelledRef.current = true
      room.disconnect()
      roomRef.current = null
    }
  }, [roomName, userId])

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
  }, [muted])

  const handleEnd = useCallback(() => {
    cancelledRef.current = true
    roomRef.current?.disconnect()
    onStateChange?.('ended')
    onEnd()
  }, [onEnd, onStateChange])

  const bg = isDark ? 'rgba(15,23,42,0.90)' : 'rgba(255,255,255,0.94)'
  const border = '1px solid rgba(59,180,193,0.28)'
  const shadow = '0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(59,180,193,0.08)'

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 0.6, y: 0 }}
        style={{
          background: bg, backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', border,
          borderRadius: 16, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: tk.ts, flex: 1 }}>
          Audio indisponible
        </span>
        <button
          onClick={onEnd}
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: isDark ? '#94A3B8' : '#475569',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Fermer
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        background: bg, backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)', border,
        borderRadius: 18, padding: '11px 13px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: shadow, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20, flexShrink: 0 }}>
        {[0, 150, 300, 150, 0].map((delay, i) => (
          <motion.div
            key={i}
            animate={connected ? { height: ['4px', '16px', '4px'] } : { height: '4px' }}
            transition={{ duration: 1.1, delay: delay / 1000, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 3, borderRadius: 2,
              background: connected ? T.gradientStart : '#94A3B8',
              minHeight: 4,
            }}
          />
        ))}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.gradientStart, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {participantNames.length > 0 && (
            <span style={{ fontSize: 10, color: tk.ts, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
              {participantNames.slice(0, 2).join(' · ')}
            </span>
          )}
          {connected && (
            <span style={{ fontSize: 10, fontWeight: 600, color: T.gradientStart, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {formatTime(seconds)}
            </span>
          )}
        </div>
      </div>

      {/* Mute */}
      <button
        onClick={toggleMute}
        style={{
          width: 30, height: 30, borderRadius: 50,
          background: muted ? 'rgba(239,68,68,0.12)' : 'rgba(59,180,193,0.12)',
          border: `1px solid ${muted ? T.semanticDanger + '40' : T.gradientStart + '40'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
        }}
      >
        {muted
          ? <MicOff size={13} strokeWidth={1.5} color={T.semanticDanger} />
          : <Mic size={13} strokeWidth={1.5} color={T.gradientStart} />
        }
      </button>

      {/* End */}
      <button
        onClick={handleEnd}
        style={{
          width: 30, height: 30, borderRadius: 50,
          background: 'rgba(239,68,68,0.12)',
          border: `1px solid ${T.semanticDanger}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
        }}
      >
        <X size={13} strokeWidth={2} color={T.semanticDanger} />
      </button>
    </motion.div>
  )
}
