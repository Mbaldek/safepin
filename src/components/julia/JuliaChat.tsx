'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Send } from 'lucide-react'
import { useIsDark } from '@/hooks/useIsDark'
import { useJuliaChat } from '@/hooks/useJuliaChat'
import { useStore } from '@/stores/useStore'
import JuliaHeader from './JuliaHeader'
import JuliaContextChips from './JuliaContextChips'
import JuliaBubble from './JuliaBubble'
import JuliaStreamingBubble from './JuliaStreamingBubble'
import JuliaQuickActions from './JuliaQuickActions'
import { springConfig } from '@/lib/tokens'

interface JuliaChatProps {
  userId: string
  onClose: () => void
}

const JULIA_ACCENT = '#A78BFA'

export default function JuliaChat({ userId, onClose }: JuliaChatProps) {
  const isDark = useIsDark()
  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    loadHistory,
    newConversation,
  } = useJuliaChat()

  const userLocation = useStore((s) => s.userLocation)
  const pins = useStore((s) => s.pins)
  const activeTrip = useStore((s) => s.activeTrip)

  const [inputText, setInputText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, streamingContent])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed || isStreaming) return
    sendMessage(trimmed)
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [inputText, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt)
    },
    [sendMessage],
  )

  // Computed context
  const nearbyPinCount = pins.length

  // Theme tokens
  const surfaceBg = isDark ? '#0F172A' : '#F8FAFC'
  const messagesBg = isDark ? 'rgba(9,15,28,0.6)' : 'rgba(240,244,248,0.8)'
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A'
  const textSecondary = isDark ? '#94A3B8' : '#475569'
  const textTertiary = isDark ? '#64748B' : '#94A3B8'
  const inputBg = isDark ? '#1E293B' : '#FFFFFF'
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)'
  const errorColor = '#EF4444'

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springConfig}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        background: surfaceBg,
      }}
    >
      {/* Header */}
      <JuliaHeader isDark={isDark} onClose={onClose} onNewChat={newConversation} />

      {/* Context chips */}
      <JuliaContextChips
        location={userLocation}
        nearbyPinCount={nearbyPinCount}
        activeTrip={activeTrip}
        isDark={isDark}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          background: messagesBg,
        }}
      >
        {/* Welcome screen when no messages */}
        {messages.length === 0 && !isStreaming && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
              padding: '0 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${JULIA_ACCENT}, #8B5CF6)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 32px rgba(167,139,250,0.3)',
              }}
            >
              <Sparkles size={28} color="#FFFFFF" />
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, lineHeight: 1.3 }}>
              Bonjour, je suis Julia
            </div>
            <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5, maxWidth: 280 }}>
              Votre assistante s&eacute;curit&eacute; personnelle. Je peux analyser votre environnement,
              planifier des trajets s&ucirc;rs et vous donner des conseils en temps r&eacute;el.
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <JuliaBubble key={msg.id} message={msg} isDark={isDark} />
        ))}

        {/* Streaming bubble */}
        {isStreaming && <JuliaStreamingBubble content={streamingContent} isDark={isDark} />}
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            fontSize: 11,
            color: errorColor,
            background: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.08)',
            textAlign: 'center',
          }}
        >
          Erreur : {error}
        </div>
      )}

      {/* Quick actions */}
      {!isStreaming && <JuliaQuickActions onSelect={handleQuickAction} isDark={isDark} />}

      {/* Input bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          padding: '10px 12px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          borderTop: `1px solid ${inputBorder}`,
          background: isDark ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Demandez \u00e0 Julia..."
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: `1px solid ${inputBorder}`,
            borderRadius: 20,
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.4,
            color: textPrimary,
            background: inputBg,
            outline: 'none',
            maxHeight: 120,
            overflow: 'auto',
            fontFamily: 'inherit',
            opacity: isStreaming ? 0.5 : 1,
          }}
        />

        <button
          onClick={handleSend}
          disabled={isStreaming || !inputText.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background:
              isStreaming || !inputText.trim()
                ? isDark
                  ? 'rgba(167,139,250,0.2)'
                  : 'rgba(167,139,250,0.15)'
                : `linear-gradient(135deg, ${JULIA_ACCENT}, #8B5CF6)`,
            color: '#FFFFFF',
            cursor: isStreaming || !inputText.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s ease, opacity 0.2s ease',
            opacity: isStreaming || !inputText.trim() ? 0.5 : 1,
          }}
          aria-label="Envoyer"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  )
}
