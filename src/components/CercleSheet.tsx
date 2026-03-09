'use client'

import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/stores/useTheme'
import { useStore } from '@/stores/useStore'
import { useUiStore } from '@/stores/uiStore'
import { useCercle } from '@/hooks/useCercle'
import CercleChat from '@/components/CercleChat'
import AddCircleContactModal from '@/components/community/AddCircleContactModal'
import type { CircleMember } from '@/types'
import dynamic from 'next/dynamic'
const AudioChannel = dynamic(() => import('@/components/escorte/AudioChannel'), { ssr: false })

interface CercleSheetProps {
  open: boolean
  onClose: () => void
}

// ── helpers ──────────────────────────────────────────────
const AVATAR_PALETTE = ['#A78BFA', '#34D399', '#F87171', '#F5C341', '#3BB4C1', '#F97316']

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) * 31
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

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
export default function CercleSheet({ open, onClose }: CercleSheetProps) {
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
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active' | 'muted' | 'error'>('idle')
  const callActive = callState !== 'idle' && callState !== 'error'

  // tokens
  const t = useMemo(() => ({
    surfaceCard: isDark ? '#1E293B' : '#FFFFFF',
    surfaceElevated: isDark ? '#334155' : '#F8FAFC',
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
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
    <style>{`
      @keyframes bv-call-breath {
        0%,100% { box-shadow: 0 0 0 0 rgba(59,180,193,0.2); }
        50% { box-shadow: 0 0 0 5px rgba(59,180,193,0.07); }
      }
      @keyframes bv-call-muted {
        0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.2); }
        50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.07); }
      }
      @keyframes bv-call-spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    <AnimatePresence>
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
              left: 0,
              right: 0,
              height: '65%',
              background: t.sheetBg,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 1. DRAG HANDLE */}
            <div style={{ margin: '10px auto 4px', width: 36, height: 4, borderRadius: 2, background: t.border }} />

            {callActive && (
              <div style={{ marginBottom: 12 }}>
                <AudioChannel
                  roomName={`cercle-${userId}`}
                  userId={userId}
                  isDark={isDark}
                  title="Appel groupe · Cercle"
                  participantNames={participantNames}
                  onEnd={() => setCallState('idle')}
                  onStateChange={(s) => {
                    if (s === 'active') setCallState('active')
                    if (s === 'error') setCallState('error')
                    if (s === 'ended') setCallState('idle')
                  }}
                />
              </div>
            )}

            {showChat ? (
              <CercleChat
                messages={messages}
                members={members}
                currentUserId={userId}
                loading={loading}
                onBack={() => setShowChat(false)}
                onStartCall={() => {
                  if (callState === 'idle' || callState === 'error') {
                    setCallState('connecting')
                  } else {
                    setCallState('idle')
                  }
                }}
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
                        cursor: 'pointer', position: 'relative', fontSize: 12,
                      }}
                    >
                      {'\uD83D\uDCAC'}
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
                        if (callState === 'idle' || callState === 'error') {
                          setCallState('connecting')
                        } else {
                          setCallState('idle')
                        }
                      }}
                      style={{
                        width: 33, height: 33, borderRadius: '50%',
                        background: callState === 'active' ? 'rgba(59,180,193,0.22)'
                          : callState === 'connecting' ? 'rgba(251,191,36,0.12)'
                          : callState === 'muted' ? 'rgba(239,68,68,0.12)'
                          : `${t.teal}1a`,
                        border: callState === 'active' ? '1px solid rgba(59,180,193,0.45)'
                          : callState === 'connecting' ? '1px solid rgba(251,191,36,0.35)'
                          : callState === 'muted' ? '1px solid rgba(239,68,68,0.35)'
                          : 'none',
                        boxShadow: callState === 'active' ? '0 0 0 4px rgba(59,180,193,0.08)'
                          : callState === 'muted' ? '0 0 0 4px rgba(239,68,68,0.08)'
                          : 'none',
                        animation: callState === 'active' ? 'bv-call-breath 3s ease-in-out infinite'
                          : callState === 'muted' ? 'bv-call-muted 2.5s ease-in-out infinite'
                          : 'none',
                        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      {'\uD83D\uDCDE'}
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
            width: 30, height: 30, borderRadius: '50%',
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
            width: 30, height: 30, borderRadius: '50%',
            border: `1px solid ${t.border}`, background: 'transparent',
            cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {'\uD83D\uDCAC'}
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
            {timeAgo(m.last_seen)}
          </span>
        )}
      </div>

      {/* DM */}
      <button
        onClick={onDM}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `1px solid ${t.border}`, background: 'transparent',
          cursor: 'pointer', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {'\uD83D\uDCAC'}
      </button>
    </motion.div>
  )
}

function isDarkBg(hex: string): boolean {
  return hex.toLowerCase().includes('1e') || hex.toLowerCase().includes('33')
}
