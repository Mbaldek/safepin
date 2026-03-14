'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, ChevronLeft, ChevronRight, Star, Bell, Phone } from 'lucide-react'
import { springConfig } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { supabase } from '@/lib/supabase'
import { bToast } from '@/components/GlobalToast'

interface Props {
  isDark: boolean
  escorte: UseEscorteReturn
  userId: string
  onBack: () => void
  onStart: () => void
}

type CircleContact = { id: string; name: string }

// Mockup-matched tokens
const mTk = (d: boolean) => ({
  teal: '#3BB4C1',
  teal12: 'rgba(59,180,193,0.12)',
  teal24: 'rgba(59,180,193,0.24)',
  green: '#34D399',
  green12: 'rgba(52,211,153,0.12)',
  green22: 'rgba(52,211,153,0.22)',
  green06: 'rgba(52,211,153,0.06)',
  green14: 'rgba(52,211,153,0.14)',
  green20: 'rgba(52,211,153,0.20)',
  amber: '#FBBF24',
  purple: '#A78BFA',
  t1: d ? '#FFF' : '#0A1220',
  t2: d ? '#94A3B8' : '#3A5068',
  t3: d ? '#4A5E72' : '#7A96AA',
  s2: d ? 'rgba(18,28,48,0.80)' : 'rgba(241,246,250,0.90)',
  s3: d ? '#1A2840' : '#EFF4F8',
  selev: d ? '#1E293B' : '#F1F5F9',
  b1: d ? 'rgba(255,255,255,0.04)' : 'rgba(10,18,32,0.04)',
  b2: d ? 'rgba(255,255,255,0.08)' : 'rgba(10,18,32,0.08)',
})

const LEVELS: {
  tag: string; color: string; bg: string; bd: string;
  iconType: 'bell' | 'phone' | 'star'; title: string; desc: string; soon?: boolean
}[] = [
  { tag: 'N1', color: '#FBBF24', bg: 'rgba(251,191,36,.10)', bd: 'rgba(251,191,36,.28)',
    iconType: 'bell', title: 'Notification push', desc: 'Tout le cercle reçoit une alerte et te suit sur la carte' },
  { tag: 'N2', color: '#3BB4C1', bg: 'rgba(59,180,193,.12)', bd: 'rgba(59,180,193,.24)',
    iconType: 'phone', title: 'Canal audio privé', desc: 'Ils rejoignent une room audio, vous parlez en direct' },
  { tag: 'N3', color: '#A78BFA', bg: 'rgba(167,139,250,.1)', bd: 'rgba(167,139,250,.2)',
    iconType: 'star', title: 'Julia intervient', desc: "Julia t\u2019accompagne si ton cercle ne répond pas sous 30 secondes" },
]

export default function EscorteIntroView({ isDark, escorte, userId, onBack, onStart }: Props) {
  const d = isDark
  const t = mTk(d)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [contacts, setContacts] = useState<CircleContact[]>([])

  // Fetch circle contacts for avatar display
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('contact_id, profiles(display_name)')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .limit(10)
      if (data) {
        setContacts(data.map((c) => {
          const p = c.profiles as { display_name: string } | { display_name: string }[] | null
          const name = Array.isArray(p) ? p[0]?.display_name : p?.display_name
          return { id: c.contact_id as string, name: name ?? 'Anonyme' }
        }))
      }
    })()
  }, [userId])

  // Join session by code
  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoining(true)
    const { data, error } = await supabase
      .from('walk_sessions')
      .update({ companion_id: userId, status: 'active', started_at: new Date().toISOString() })
      .eq('invite_code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .select().single()
    setJoining(false)
    if (error || !data) {
      bToast.danger({ title: 'Code invalide ou session expirée' }, isDark)
      return
    }
    bToast.success({ title: 'Session rejointe !' }, isDark)
  }

  const visibleAvatars = contacts.slice(0, 3)
  const overflow = contacts.length > 3 ? contacts.length - 3 : 0

  const levelIcon = (type: string, color: string) => {
    if (type === 'bell') return <Bell size={13} strokeWidth={2} color={color} />
    if (type === 'phone') return <Phone size={13} strokeWidth={2} color={color} />
    return <Star size={13} strokeWidth={2} color={color} />
  }

  return (
    <motion.div
      key="escorte-intro"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 14px 20px', display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden' }}
    >
      <style>{`@keyframes escorte-shimmer{0%,100%{left:-60%}50%{left:120%}}`}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: t.green12, border: `1px solid ${t.green22}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 12px ${t.green12}`,
          }}>
            <Users size={14} strokeWidth={2.2} color={t.green} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.t1, letterSpacing: '-0.02em' }}>
            Marche avec moi
          </span>
        </div>
        <button onClick={onBack} style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `1px solid ${t.b2}`, background: t.b1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: t.t3,
        }}>
          <ChevronLeft size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Action row — start escort ── */}
      <motion.div
        whileTap={{ scale: 0.99 }}
        onClick={escorte.isStarting ? undefined : onStart}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 14,
          background: t.green06,
          border: `1px solid ${t.green20}`,
          cursor: escorte.isStarting ? 'default' : 'pointer',
          opacity: escorte.isStarting ? 0.7 : 1,
          boxShadow: `0 4px 16px rgba(52,211,153,0.07),inset 0 1px 0 ${t.green06}`,
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
          background: `linear-gradient(90deg,transparent,${t.green06},transparent)`,
          animation: 'escorte-shimmer 5s ease-in-out infinite 1s', pointerEvents: 'none',
        }} />
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: t.green14, border: `1px solid ${t.green22}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Users size={14} strokeWidth={2.2} color={t.green} />
        </div>

        {/* Avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex' }}>
            {visibleAvatars.length > 0 ? (
              <>
                {visibleAvatars.map((c, i) => {
                  const col = avatarColor(c.name)
                  return (
                    <div key={c.id} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `1.5px solid ${d ? 'rgba(8,17,30,0.7)' : 'rgba(255,255,255,0.8)'}`,
                      background: `linear-gradient(135deg, ${col}, ${d ? '#1E3A5F' : '#C0D0E0'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0,
                      marginLeft: i > 0 ? -6 : 0,
                    }}>
                      {c.name[0]?.toUpperCase() ?? '?'}
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${d ? 'rgba(8,17,30,0.7)' : 'rgba(255,255,255,0.8)'}`,
                    background: t.s3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: t.t2, flexShrink: 0,
                    marginLeft: -6,
                  }}>
                    +{overflow}
                  </div>
                )}
              </>
            ) : (
              <span style={{ fontSize: 11, color: t.t3 }}>Chargement…</span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.green, marginLeft: 9, whiteSpace: 'nowrap' }}>
            {escorte.isStarting ? 'Connexion…' : 'Démarrer'}
          </span>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: t.green12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ChevronRight size={10} strokeWidth={2.5} color={t.green} />
        </div>
      </motion.div>

      {/* ── Error ── */}
      {escorte.escorteError && (
        <div style={{
          padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.20)', borderRadius: 12,
          fontSize: 12, color: '#EF4444',
        }}>
          {escorte.escorteError}
        </div>
      )}

      {/* ── Separator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: t.b2 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: t.t3, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
          ou rejoindre
        </span>
        <div style={{ flex: 1, height: 1, background: t.b2 }} />
      </div>

      {/* ── Code row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="Code (ex. A3F)"
          style={{
            width: 128, height: 34, padding: '0 10px', borderRadius: 10,
            border: `1px solid ${t.b2}`, background: t.s2, color: t.t1,
            fontFamily: 'inherit', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            outline: 'none',
          }}
        />
        <button
          onClick={handleJoin}
          disabled={joining || !joinCode.trim()}
          style={{
            width: 34, height: 34, borderRadius: 10, border: 'none',
            background: t.teal, color: 'white',
            cursor: joining || !joinCode.trim() ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            opacity: joining || !joinCode.trim() ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(59,180,193,0.28),0 0 18px rgba(59,180,193,0.12)',
          }}
        >
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 10, color: t.t3, flex: 1 }}>8 caractères max</span>
      </div>

      {/* ── Niveaux N1 / N2 / N3 ── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Marcher avec moi, c&apos;est quoi ?
      </div>
      {LEVELS.map((lvl) => (
        <div key={lvl.tag} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 11px', borderRadius: 12,
          background: t.selev, border: `1px solid ${t.b1}`,
          opacity: lvl.soon ? 0.55 : 1,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: lvl.bg, border: `1px solid ${lvl.bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {levelIcon(lvl.iconType, lvl.color)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: lvl.color, marginRight: 4 }}>{lvl.tag}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>{lvl.title}</span>
              {lvl.soon && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, marginLeft: 4,
                  background: t.teal12, color: t.teal, border: `1px solid ${t.teal24}`,
                }}>Bientôt</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: t.t2, marginTop: 2 }}>{lvl.desc}</div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
