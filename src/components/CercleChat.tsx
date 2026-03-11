'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChatTextBar from '@/components/chat/ChatTextBar'
import CallBar from '@/components/CallBar'
import { Phone } from 'lucide-react'
import { useTheme } from '@/stores/useTheme'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import type { CircleMember, CircleMessage } from '@/types'
import { avatarColor } from '@/lib/escorteHelpers'

interface CercleChatProps {
  messages: CircleMessage[]
  members: CircleMember[]
  currentUserId: string
  loading?: boolean
  onBack: () => void
  onStartCall: () => void
  callState?: 'idle' | 'connecting' | 'active' | 'muted' | 'error'
  sendMessage: (content: string, type?: string, media_url?: string) => void
  callActive?: boolean
  muted?: boolean
  seconds?: number
  onMute?: () => void
  onEnd?: () => void
}

export default function CercleChat({
  messages,
  members,
  currentUserId,
  loading,
  onBack,
  onStartCall,
  callState = 'idle',
  sendMessage,
  callActive,
  muted: mutedProp,
  seconds: secondsProp,
  onMute,
  onEnd,
}: CercleChatProps) {
  const toast = useToast()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [message, setMessage] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const t = useMemo(() => ({
    surfaceCard: isDark ? '#1E293B' : '#FFFFFF',
    surfaceElevated: isDark ? '#334155' : '#F8FAFC',
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
    teal: '#3BB4C1',
    green: '#34D399',
    messagesBg: isDark ? 'rgba(9,15,28,0.6)' : 'rgba(240,244,248,0.8)',
  }), [isDark])

  const onlineCount = useMemo(
    () => members.filter(m => m.status !== 'offline').length,
    [members],
  )

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleFilePick = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop lourd (max 10 Mo)')
      return
    }
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
  }, [])

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
  }, [pendingPreview])

  const handleSend = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed && !pendingFile) return

    let mediaUrl: string | undefined
    if (pendingFile) {
      setUploading(true)
      const ext = pendingFile.name.split('.').pop() || 'bin'
      const path = `cercle/${currentUserId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, pendingFile)
      setUploading(false)
      if (error) { toast.error("Erreur d'upload"); return }
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      mediaUrl = pub.publicUrl
      clearPending()
    }

    const type = mediaUrl ? (pendingFile?.type.startsWith('video') ? 'video' : 'image') : 'text'
    sendMessage(trimmed || '', type, mediaUrl)
    setMessage('')
  }, [message, sendMessage, pendingFile, currentUserId, clearPending])

  // helper: check if message is grouped with previous
  const isGrouped = useCallback((idx: number): boolean => {
    if (idx === 0) return false
    const prev = messages[idx - 1]
    const curr = messages[idx]
    if (prev.sender_id !== curr.sender_id) return false
    return Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000
  }, [messages])

  // stacked avatars — first 3 members
  const stackedMembers = members.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* 1. HEADER */}
      <div style={{
        flexShrink: 0,
        padding: '4px 12px 10px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* back */}
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: 13, color: t.textPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\u2190'}
        </button>

        {/* stacked avatars */}
        <div style={{ position: 'relative', width: 46, height: 26, flexShrink: 0 }}>
          {stackedMembers.map((m, i) => (
            <div
              key={m.id}
              style={{
                position: 'absolute',
                left: i * 11,
                top: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: avatarColor(m.name),
                border: `2px solid ${t.surfaceCard}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                zIndex: 3 - i,
              }}
            >
              {m.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        {/* title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>Mon Cercle</div>
          <div style={{ fontSize: 10, color: t.green }}>{onlineCount} actives</div>
        </div>

        {/* call */}
        <button
          onClick={onStartCall}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: callState === 'active' ? 'rgba(59,180,193,0.22)'
              : callState === 'connecting' ? 'rgba(251,191,36,0.12)'
              : callState === 'muted' ? 'rgba(239,68,68,0.12)'
              : 'none',
            border: callState === 'active' ? '1px solid rgba(59,180,193,0.45)'
              : callState === 'connecting' ? '1px solid rgba(251,191,36,0.35)'
              : callState === 'muted' ? '1px solid rgba(239,68,68,0.35)'
              : `1px solid rgba(59,180,193,0.35)`,
            boxShadow: callState === 'active' ? '0 0 0 4px rgba(59,180,193,0.08)'
              : callState === 'muted' ? '0 0 0 4px rgba(239,68,68,0.08)'
              : 'none',
            animation: callState === 'active' ? 'bv-chat-call-breath 3s ease-in-out infinite'
              : callState === 'muted' ? 'bv-chat-call-muted 2.5s ease-in-out infinite'
              : 'none',
            transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            cursor: 'pointer',
            color: callState === 'muted' ? '#EF4444' : callState !== 'idle' ? t.teal : t.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: callState === 'idle' ? 0.9 : 1,
          }}
        >
          <Phone size={16} />
        </button>

        {/* more */}
        <button
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: 13, color: t.textTertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\u22EE'}
        </button>
      </div>

      {/* CALL BAR */}
      {callActive && onMute && onEnd && (
        <CallBar
          source="cercle"
          title="Mon Cercle"
          muted={mutedProp ?? false}
          seconds={secondsProp ?? 0}
          onMute={onMute}
          onEnd={onEnd}
        />
      )}

      {/* 2. MESSAGES AREA */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 12px',
        background: t.messagesBg,
      }}>
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: t.textTertiary, fontSize: 11,
          }}>
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, padding: '0 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, opacity: 0.5 }}>{'\uD83D\uDCAC'}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Aucun message</div>
            <div style={{ fontSize: 11, color: t.textTertiary, lineHeight: 1.4 }}>
              Envoie un premier message à ton cercle de confiance
            </div>
          </div>
        ) : null}
        {messages.map((msg, idx) => {
          const own = msg.sender_id === currentUserId
          const grouped = isGrouped(idx)
          const senderColor = avatarColor(msg.sender_name)
          const safeArrival = msg.is_safe_arrival

          return (
            <div
              key={msg.id}
              style={{
                marginTop: grouped ? 1 : 8,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
              }}
            >
              {/* sender label */}
              {!own && !grouped && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: senderColor,
                  marginBottom: 2,
                  paddingLeft: 8,
                }}>
                  {msg.sender_name}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, justifyContent: own ? 'flex-end' : 'flex-start' }}>
                {/* avatar or spacer for other */}
                {!own && !grouped && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: senderColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    flexShrink: 0, alignSelf: 'flex-end',
                  }}>
                    {msg.sender_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {!own && grouped && (
                  <div style={{ width: 29, flexShrink: 0 }} />
                )}

                {/* bubble */}
                <div style={{
                  maxWidth: '75%',
                  padding: '7px 11px',
                  fontSize: 11,
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                  ...(safeArrival ? {
                    background: 'rgba(52,211,153,0.14)',
                    border: '1px solid rgba(52,211,153,0.28)',
                    color: t.textPrimary,
                    borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  } : own ? {
                    background: t.teal,
                    color: '#fff',
                    borderRadius: '14px 14px 4px 14px',
                  } : {
                    background: t.surfaceCard,
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    borderRadius: '14px 14px 14px 4px',
                  }),
                }}>
                  {msg.media_url && (
                    /\.(mp4|mov|webm)(\?|$)/i.test(msg.media_url) ? (
                      <video src={msg.media_url} controls playsInline style={{ maxWidth: 220, borderRadius: 10, display: 'block', marginBottom: msg.content ? 4 : 0 }} />
                    ) : (
                      <img src={msg.media_url} alt="" style={{ maxWidth: 220, borderRadius: 10, display: 'block', marginBottom: msg.content ? 4 : 0 }} />
                    )
                  )}
                  {safeArrival && '\u2705 '}{msg.content}
                  <div style={{
                    fontSize: 9.5,
                    color: own && !safeArrival ? 'rgba(255,255,255,0.5)' : t.textTertiary,
                    textAlign: 'right',
                    marginTop: 2,
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 3. INPUT BAR */}
      <ChatTextBar
        isDark={isDark}
        value={message}
        onChange={setMessage}
        onSend={handleSend}
        onFilePick={handleFilePick}
        pendingPreview={pendingPreview}
        pendingFileName={pendingFile?.name ?? null}
        pendingIsVideo={pendingFile?.type.startsWith('video')}
        onClearPending={clearPending}
        uploading={uploading}
      />
    </div>
  )
}
