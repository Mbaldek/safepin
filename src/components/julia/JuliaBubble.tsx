'use client'

import { Sparkles } from 'lucide-react'

export interface JuliaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface JuliaBubbleProps {
  message: JuliaMessage
  isDark: boolean
}

const JULIA_ACCENT = '#A78BFA'
const TEAL = '#3BB4C1'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  if (diffMs < 60_000) return 'maintenant'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j`
}

export default function JuliaBubble({ message, isDark }: JuliaBubbleProps) {
  const isAssistant = message.role === 'assistant'
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textTertiary = isDark ? '#64748B' : '#94A3B8'

  const bubbleBg = isAssistant
    ? isDark
      ? 'rgba(167,139,250,0.18)'
      : 'rgba(167,139,250,0.12)'
    : isDark
      ? 'rgba(59,180,193,0.22)'
      : 'rgba(59,180,193,0.15)'

  const bubbleBorder = isAssistant
    ? 'rgba(167,139,250,0.20)'
    : 'rgba(59,180,193,0.20)'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isAssistant ? 'flex-start' : 'flex-end',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
        paddingLeft: isAssistant ? 0 : 40,
        paddingRight: isAssistant ? 40 : 0,
      }}
    >
      {/* Julia avatar */}
      {isAssistant && (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${JULIA_ACCENT}, #8B5CF6)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={12} color="#FFFFFF" />
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: isAssistant ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          background: bubbleBg,
          border: `1px solid ${bubbleBorder}`,
          color: textPrimary,
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
        <div
          style={{
            fontSize: 10,
            color: textTertiary,
            textAlign: isAssistant ? 'left' : 'right',
            marginTop: 4,
          }}
        >
          {relativeTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}
