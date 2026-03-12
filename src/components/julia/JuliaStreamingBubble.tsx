'use client'

import { Sparkles } from 'lucide-react'

interface JuliaStreamingBubbleProps {
  content: string
  isDark: boolean
}

const JULIA_ACCENT = '#A78BFA'

export default function JuliaStreamingBubble({ content, isDark }: JuliaStreamingBubbleProps) {
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const bubbleBg = isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.12)'

  return (
    <>
      {/* Keyframes for cursor blink */}
      <style>{`
        @keyframes julia-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          gap: 8,
          marginBottom: 8,
          paddingRight: 40,
        }}
      >
        {/* Julia avatar */}
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

        {/* Streaming bubble */}
        <div
          style={{
            maxWidth: '80%',
            padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background: bubbleBg,
            border: '1px solid rgba(167,139,250,0.20)',
            color: textPrimary,
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content || '\u200B'}
          {/* Blinking violet cursor */}
          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 14,
              marginLeft: 2,
              borderRadius: 2,
              background: JULIA_ACCENT,
              verticalAlign: 'text-bottom',
              animation: 'julia-cursor-blink 1s step-end infinite',
            }}
          />
        </div>
      </div>
    </>
  )
}
