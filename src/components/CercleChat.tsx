'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/stores/useTheme'
import type { CircleMember, CircleMessage } from '@/types'

interface CercleChatProps {
  messages: CircleMessage[]
  members: CircleMember[]
  currentUserId: string
  loading?: boolean
  onBack: () => void
  onStartCall: () => void
  sendMessage: (content: string) => void
}

const AVATAR_PALETTE = ['#A78BFA', '#34D399', '#F87171', '#F5C341', '#3BB4C1', '#F97316']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) * 31
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

export default function CercleChat({
  messages,
  members,
  currentUserId,
  loading,
  onBack,
  onStartCall,
  sendMessage,
}: CercleChatProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSend = useCallback(() => {
    const trimmed = message.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
  }, [])

  // helper: check if message is grouped with previous
  const isGrouped = useCallback((idx: number): boolean => {
    if (idx === 0) return false
    const prev = messages[idx - 1]
    const curr = messages[idx]
    if (prev.sender_id !== curr.sender_id) return false
    return Math.abs(new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) < 60000
  }, [messages])

  const hasTrimmed = message.trim().length > 0

  // stacked avatars — first 3 members
  const stackedMembers = members.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            cursor: 'pointer', fontSize: 16, color: t.textPrimary,
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
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary }}>Mon Cercle</div>
          <div style={{ fontSize: 10, color: t.green }}>{onlineCount} actives</div>
        </div>

        {/* call */}
        <button
          onClick={onStartCall}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent',
            border: `1px solid ${t.teal}`,
            cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\uD83D\uDCDE'}
        </button>

        {/* more */}
        <button
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: 16, color: t.textTertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\u22EE'}
        </button>
      </div>

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
            height: '100%', color: t.textTertiary, fontSize: 12,
          }}>
            Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, padding: '0 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, opacity: 0.5 }}>{'\uD83D\uDCAC'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>Aucun message</div>
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
                alignItems: own ? 'flex-end' : 'flex-start',
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

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
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
                  fontSize: 12.5,
                  lineHeight: 1.45,
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
      <div style={{
        flexShrink: 0,
        padding: '8px 10px 14px',
        borderTop: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
      }}>
        {/* emoji placeholder */}
        <button style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {'\uD83D\uDE0A'}
        </button>

        {/* textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          placeholder="Message\u2026"
          style={{
            flex: 1,
            background: t.surfaceElevated,
            borderRadius: 18,
            padding: '8px 13px',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            color: t.textPrimary,
            resize: 'none',
            lineHeight: 1.4,
            maxHeight: 100,
          }}
        />

        {/* send / mic */}
        <button
          onClick={handleSend}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
            transition: 'background 0.15s',
            ...(hasTrimmed ? {
              background: t.teal,
              color: '#fff',
            } : {
              background: t.surfaceElevated,
              color: t.textTertiary,
            }),
          }}
        >
          {hasTrimmed ? '\u27A4' : '\uD83C\uDF99'}
        </button>
      </div>
    </div>
  )
}
