'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, X } from 'lucide-react'
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type LocalParticipant,
} from 'livekit-client'
import { T, tok } from '@/lib/tokens'
import type { EscorteCircleMember } from '@/types'

interface Props {
  escorteId: string
  userId: string
  isDark: boolean
  circleMembers: EscorteCircleMember[]
  onEnd: () => void
}

export default function AudioChannel({ escorteId, userId, isDark, circleMembers, onEnd }: Props) {
  const d = isDark
  const tk = tok(isDark)
  const roomRef = useRef<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(false)
  const [muted, setMuted] = useState(false)

  // Connect to LiveKit room
  useEffect(() => {
    let cancelled = false
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
          body: JSON.stringify({
            roomName: `escorte-${escorteId}`,
            userId,
            displayName: null,
            canPublish: true,
          }),
        })

        if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
        const { token, url } = await res.json()
        if (cancelled) return
        if (!url || !token) throw new Error('Missing token or URL')

        await room.connect(url, token)
        if (cancelled) { room.disconnect(); return }

        // Publish audio only
        await room.localParticipant.setMicrophoneEnabled(true)
        setConnected(true)
      } catch (err) {
        void err
        if (!cancelled) setError(true)
      }
    })()

    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setConnected(false)
    })

    return () => {
      cancelled = true
      room.disconnect()
      roomRef.current = null
    }
  }, [escorteId, userId])

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
  }, [muted])

  // Handle end
  const handleEnd = useCallback(() => {
    roomRef.current?.disconnect()
    onEnd()
  }, [onEnd])

  // Vocal contact names
  const vocalNames = circleMembers
    .filter(m => m.status === 'vocal' || m.status === 'following')
    .map(m => m.profiles?.name)
    .filter(Boolean)
    .slice(0, 2)

  const bg = d ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)'
  const border = '1px solid rgba(59,180,193,0.30)'

  // Error fallback
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0.5, y: 0 }}
        style={{
          background: bg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border,
          borderRadius: 16,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: tk.ts, flex: 1 }}>
          Audio indisponible
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        background: bg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border,
        borderRadius: 16,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Pulsing green dot */}
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? T.semanticSuccess : '#94A3B8',
          flexShrink: 0,
        }}
      />

      {/* Label + names */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.gradientStart }}>
          Canal audio actif
        </div>
        {vocalNames.length > 0 && (
          <div style={{ fontSize: 10, color: tk.ts, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vocalNames.join(' · ')} vous écoutent
          </div>
        )}
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: muted ? 'rgba(239,68,68,0.10)' : 'rgba(59,180,193,0.12)',
          border: `1px solid ${muted ? T.semanticDanger + '35' : T.gradientStart + '35'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        {muted
          ? <MicOff size={13} strokeWidth={1.5} color={T.semanticDanger} />
          : <Mic size={13} strokeWidth={1.5} color={T.gradientStart} />
        }
      </button>

      {/* End button */}
      <button
        onClick={handleEnd}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(239,68,68,0.10)',
          border: `1px solid ${T.semanticDanger}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <X size={13} strokeWidth={2} color={T.semanticDanger} />
      </button>
    </motion.div>
  )
}
