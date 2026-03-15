'use client'

import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Phone } from 'lucide-react'
import { useTheme } from '@/stores/useTheme'
import { useStore } from '@/stores/useStore'
import { useUiStore } from '@/stores/uiStore'
import { useCercle } from '@/hooks/useCercle'
import CercleChat from '@/components/CercleChat'
import CallBar from '@/components/CallBar'
import AddCircleContactModal from '@/components/community/AddCircleContactModal'
import type { CircleMember } from '@/types'
import { useAudioCall } from '@/stores/useAudioCall'
import { timeAgo } from '@/lib/utils'
import { avatarColor } from '@/lib/escorteHelpers'

interface CercleSheetProps {
  open: boolean
  onClose: () => void
}

// ── helpers ──────────────────────────────────────────────

const STATUS_DOT: Record<CircleMember['status'], string> = {
  online: '#34D399',
  trip: '#3BB4C1',
  offline: '#475569',
}

const STATUS_LABEL: Record<CircleMember['status'], string> = {
  online: 'En ligne',
  trip: 'En trajet',
  offline: 'Hors ligne',
}

// ── component ────────────────────────────────────────────
function CercleSheet({ open, onClose }: CercleSheetProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const userId = useStore((s) => s.userId) ?? ''
  const { openCommunityDM } = useUiStore()
  const { members, messages, sendMessage, loading, onlineCount } = useCercle(userId)

  const participantNames = members
    .filter(m => m.status === 'online')
    .map(m => m.name)
    .slice(0, 3)

  const [showChat, setShowChat] = useState(false)
  const [pulsingId, setPulsingId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const globalCallState = useAudioCall((s) => s.callState)
  const globalSource = useAudioCall((s) => s.source)
  const startCall = useAudioCall((s) => s.startCall)
  const endCallGlobal = useAudioCall((s) => s.endCall)
  const setCallSheetOpen = useAudioCall((s) => s.setCallSheetOpen)
  const setChatOpen = useAudioCall((s) => s.setChatOpen)
  const muted = useAudioCall((s) => s.muted)
  const seconds = useAudioCall((s) => s.seconds)
  const setMuted = useAudioCall((s) => s.setMuted)
  const callActive = globalSource === 'cercle' && globalCallState !== 'idle'

  // Signal FloatingCallPill that the cercle chat is mounted
  useEffect(() => {
    if (!showChat) return
    setChatOpen(true)
    return () => setChatOpen(false)
  }, [showChat, setChatOpen])

  // Reset chat state immediately when sheet closes (don't wait for AnimatePresence unmount)
  useEffect(() => {
    if (!open) {
      setChatOpen(false)
      setShowChat(false)
    }
  }, [open, setChatOpen])

  // tokens
  const t = useMemo(() => ({
    surfaceCard: isDark ? '#1E293B' : '#FFFFFF',
    surfaceElevated: isDark ? '#334155' : '#F8FAFC',
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    sheetBg: isDark ? 'rgba(13,20,40,0.97)' : 'rgba(255,255,255,0.98)',
    teal: '#3BB4C1',
    green: '#34D399',
    red: '#EF4444',
    chatStripBg: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)',
  }), [isDark])

  const available = useMemo(() => members.filter(m => m.status !== 'offline' && m.id !== userId), [members, userId])
  const offline = useMemo(() => members.filter(m => m.status === 'offline' && m.id !== userId), [members, userId])

  const hasUnread = messages.length > 0 // simplified for now

  const handlePing = useCallback((id: string) => {
    setPulsingId(id)
    setTimeout(() => setPulsingId(null), 1100)
  }, [])

  const handleDM = useCallback((member: CircleMember) => {
    onClose()
    openCommunityDM({ userId: member.id, userName: member.name })
  }, [onClose, openCommunityDM])

  // ── render ─────────────────────────────────────────────
  return (
    <>
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* overlay */}
          <motion.div
            key="cercle-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            }}
          />

          {/* sheet */}
          <motion.div
            key="cercle-sheet"
            className="sheet-glow sheet-highlight"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 36 }}
            style={{
              position: 'fixed',
              bottom: 64,
              left: 0,
              right: 0,
              height: '65%',
              background: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              zIndex: 250,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 1. DRAG HANDLE */}
            <div style={{ margin: '10px auto 4px', width: 36, height: 4, borderRadius: 2, background: t.border }} />

            {/* CallBar in hub when call active */}
            {!showChat && callActive && (
              <CallBar
                source="cercle"
                title="Mon Cercle"
                muted={muted}
                seconds={seconds}
                onMute={() => setMuted(!muted)}
                onEnd={() => endCallGlobal()}
              />
            )}

            {showChat ? (
              <CercleChat
                messages={messages}
                members={members}
                currentUserId={userId}
                loading={loading}
                onBack={() => { setShowChat(false); setChatOpen(false) }}
                onStartCall={() => {
                  if (!callActive) {
                    startCall({ roomName: `cercle-${userId}`, source: 'cercle', sourceId: userId, title: 'Appel groupe · Cercle', participantNames })
                  } else {
                    endCallGlobal()
                  }
                }}
                callActive={callActive}
                muted={muted}
                seconds={seconds}
                onMute={() => setMuted(!muted)}
                onEnd={() => endCallGlobal()}
                callState={callActive ? 'active' : 'idle'}
                sendMessage={sendMessage}
              />
            ) : (
              <>
                {/* 3. HEADER ROW */}
                <div style={{
                  padding: '0 16px 8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Mon Cercle</div>
                    <div style={{ fontSize: 11, color: t.green }}>
                      {loading ? '...' : `${onlineCount} disponibles \u00b7 ${members.length} membres`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* chat toggle */}
                    <button
                      onClick={() => setShowChat(true)}
                      style={{
                        width: 33, height: 33, borderRadius: '50%',
                        border: `1px solid ${t.border}`, background: 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', position: 'relative',
                      }}
                    >
                      <MessageCircle size={16} color={t.textSecondary} />
                      {hasUnread && (
                        <span style={{
                          position: 'absolute', top: 2, right: 2,
                          width: 7, height: 7, borderRadius: '50%',
                          background: t.teal,
                        }} />
                      )}
                    </button>

                    {/* audio call */}
                    <button
                      onClick={() => {
                        if (!callActive) {
                          startCall({ roomName: `cercle-${userId}`, source: 'cercle', sourceId: userId, title: 'Appel groupe · Cercle', participantNames })
                          setCallSheetOpen(true)
                          onClose()
                        } else {
                          endCallGlobal()
                        }
                      }}
                      style={{
                        width: 33, height: 33, borderRadius: '50%',
                        background: callActive ? 'rgba(59,180,193,0.22)' : t.teal,
                        border: callActive ? '1px solid rgba(59,180,193,0.45)' : 'none',
                        boxShadow: callActive ? '0 0 0 4px rgba(59,180,193,0.08)' : 'none',
                        animation: callActive ? 'bv-call-breath 3s ease-in-out infinite' : 'none',
                        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Phone size={16} color={callActive ? t.teal : '#FFFFFF'} />
                    </button>

                    {/* invite pill */}
                    <button
                      onClick={() => setShowInvite(true)}
                      style={{
                        background: t.teal, color: '#fff', border: 'none',
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                        padding: '6px 12px', cursor: 'pointer',
                      }}
                    >
                      + Inviter
                    </button>
                  </div>
                </div>

                {/* 4. DISCUSSION STRIP */}
                <div
                  onClick={() => setShowChat(true)}
                  style={{
                    margin: '0 14px',
                    background: t.chatStripBg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: t.textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        Discussion du cercle
                      </span>
                      {hasUnread && (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: t.teal, display: 'inline-block',
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: t.textTertiary }}>{'\u203A'}</span>
                  </div>
                  {messages.slice(-2).map(msg => (
                    <div key={msg.id} style={{ fontSize: 11, color: t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      <span style={{ fontWeight: 600, color: t.textPrimary }}>{msg.sender_name.split(' ')[0]}</span>
                      {' '}{msg.content}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div style={{ fontSize: 11, color: t.textTertiary, fontStyle: 'italic' }}>Aucun message</div>
                  )}
                </div>

                {/* 5. SEPARATOR */}
                <div style={{ margin: '12px 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: t.border }} />
                  <span style={{ fontSize: 10, color: t.textTertiary, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Membres</span>
                  <div style={{ flex: 1, height: 1, background: t.border }} />
                </div>

                {/* 6. MEMBERS SCROLL */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 8px' }}>
                  {/* available */}
                  {available.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Disponibles
                      </div>
                      {available.map((m, i) => (
                        <MemberCard
                          key={m.id}
                          member={m}
                          index={i}
                          pulsing={pulsingId === m.id}
                          tokens={t}
                          onPing={() => handlePing(m.id)}
                          onDM={() => handleDM(m)}
                        />
                      ))}
                    </>
                  )}

                  {/* offline */}
                  {offline.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>
                        Hors ligne
                      </div>
                      {offline.map((m, i) => (
                        <OfflineCard
                          key={m.id}
                          member={m}
                          index={i}
                          tokens={t}
                          onDM={() => handleDM(m)}
                        />
                      ))}
                    </>
                  )}

                  {!loading && members.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: t.textTertiary, fontSize: 12 }}>
                      Aucun membre dans ton cercle
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AddCircleContactModal
      isDark={isDark}
      open={showInvite}
      onClose={() => setShowInvite(false)}
    />
    </>
  )
}

// ── MemberCard (available) ───────────────────────────────
type Tokens = {
  surfaceCard: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  border: string
  teal: string
  green: string
  [k: string]: string
}

function MemberCard({ member: m, index, pulsing, tokens: t, onPing, onDM }: {
  member: CircleMember
  index: number
  pulsing: boolean
  tokens: Tokens
  onPing: () => void
  onDM: () => void
}) {
  const dot = STATUS_DOT[m.status]
  const bg = avatarColor(m.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        background: t.surfaceCard,
        border: `1px solid ${pulsing ? dot : t.border}`,
        borderRadius: 16,
        padding: '11px 13px',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: pulsing ? `0 0 0 3px ${dot}2e` : 'none',
      }}
    >
      {/* avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          boxShadow: `0 0 0 3px ${dot}3a`,
          overflow: 'hidden',
        }}>
          {m.avatar_url
            ? <img src={m.avatar_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : m.name.charAt(0).toUpperCase()
          }
        </div>
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 11, height: 11, borderRadius: '50%',
          background: dot,
          border: `2.5px solid ${t.surfaceCard}`,
        }} />
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{m.name}</span>
          {m.is_verified && <span style={{ color: t.green, fontSize: 11 }}>{'\u2713'}</span>}
        </div>
        {m.status === 'trip' && m.trip ? (
          <>
            <div style={{ fontSize: 11, color: t.teal, marginTop: 1 }}>
              {'\u2192'} {m.trip.destination} {'\u00b7'} ETA {m.trip.eta_minutes} min
            </div>
            <div style={{
              marginTop: 9, height: 3, borderRadius: 2,
              background: t.border, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min(m.trip.progress_pct, 100)}%`,
                background: 'linear-gradient(90deg, #3BB4C1, #22D3EE)',
              }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 1 }}>
            {STATUS_LABEL[m.status]}
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onPing}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1px solid ${t.border}`, background: 'transparent',
            cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\uD83D\uDC4B'}
        </button>
        <button
          onClick={onDM}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1px solid ${t.border}`, background: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MessageCircle size={13} color={t.textSecondary} />
        </button>
      </div>
    </motion.div>
  )
}

// ── OfflineCard (compact) ────────────────────────────────
function OfflineCard({ member: m, index, tokens: t, onDM }: {
  member: CircleMember
  index: number
  tokens: Tokens
  onDM: () => void
}) {
  const bg = avatarColor(m.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        opacity: 0.6,
        padding: '7px 11px',
        borderRadius: 12,
        background: isDarkBg(t.surfaceCard) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
      }}
    >
      {/* avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          overflow: 'hidden',
        }}>
          {m.avatar_url
            ? <img src={m.avatar_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : m.name.charAt(0).toUpperCase()
          }
        </div>
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 8, height: 8, borderRadius: '50%',
          background: STATUS_DOT.offline,
          border: `2px solid ${t.surfaceCard}`,
        }} />
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary }}>{m.name}</span>
        {m.last_seen && (
          <span style={{ fontSize: 10, color: t.textTertiary, marginLeft: 6 }}>
            {timeAgo(m.last_seen ?? '')}
          </span>
        )}
      </div>

      {/* DM */}
      <button
        onClick={onDM}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `1px solid ${t.border}`, background: 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MessageCircle size={12} color={t.textTertiary} />
      </button>
    </motion.div>
  )
}

export default memo(CercleSheet);

function isDarkBg(hex: string): boolean {
  return hex.toLowerCase().includes('1e') || hex.toLowerCase().includes('33')
}
