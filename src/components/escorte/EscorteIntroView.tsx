'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, X, ChevronRight, Star, Bell, Phone } from 'lucide-react'
import { tok, springConfig } from '@/lib/tokens'
import { avatarColor } from '@/lib/escorteHelpers'
import type { UseEscorteReturn } from '@/hooks/useEscorte'
import { getColors } from './escorte-styles'
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

export default function EscorteIntroView({ isDark, escorte, userId, onBack, onStart }: Props) {
  const d = isDark
  const tk = tok(isDark)
  const C = getColors(isDark)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [contacts, setContacts] = useState<CircleContact[]>([])

  // Fetch circle contacts for avatar display
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('contact_id, profiles!trusted_contacts_contact_id_fkey(display_name)')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .limit(10)
      if (data) {
        setContacts(data.map((c: any) => ({
          id: c.contact_id,
          name: c.profiles?.display_name ?? 'Anonyme',
        })))
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

  const GREEN = '#34D399'
  const TEAL = '#3BB4C1'
  const PURPLE = '#A78BFA'

  const s2 = d ? '#1A2840' : '#F1F6FA'
  const s3 = d ? '#223050' : '#E8EFF5'
  const b1 = d ? 'rgba(255,255,255,0.05)' : 'rgba(13,22,38,0.05)'
  const b2 = d ? 'rgba(255,255,255,0.09)' : 'rgba(13,22,38,0.09)'

  // Show first 3 avatars, rest as "+N"
  const visibleAvatars = contacts.slice(0, 3)
  const overflow = contacts.length > 3 ? contacts.length - 3 : 0

  return (
    <motion.div
      key="escorte-intro"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={springConfig}
      style={{ padding: '0 16px 16px', height: '100%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 0 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(52,211,153,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={14} strokeWidth={2.2} color={GREEN} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: tk.tp, letterSpacing: '-0.01em' }}>
            Marche avec moi
          </span>
        </div>
        <button onClick={onBack} style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `1px solid ${b2}`, background: s2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: C.t3,
        }}>
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Action row — start escort ── */}
      <motion.div
        whileTap={{ scale: 0.99 }}
        onClick={onStart}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 13,
          background: 'rgba(52,211,153,0.07)',
          border: '1px solid rgba(52,211,153,0.18)',
          cursor: escorte.isStarting ? 'default' : 'pointer',
          opacity: escorte.isStarting ? 0.7 : 1,
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: 'rgba(52,211,153,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Users size={14} strokeWidth={2.2} color={GREEN} />
        </div>
        {/* Circle avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex' }}>
            {visibleAvatars.length > 0 ? (
              <>
                {visibleAvatars.map((c, i) => {
                  const col = avatarColor(c.name)
                  return (
                    <div key={c.id} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `1.5px solid ${d ? '#131F30' : '#FFFFFF'}`,
                      background: `linear-gradient(135deg, ${col}, ${d ? '#1E3A5F' : '#C0D0E0'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0,
                      marginLeft: i > 0 ? -7 : 0,
                    }}>
                      {c.name[0]?.toUpperCase() ?? '?'}
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${d ? '#131F30' : '#FFFFFF'}`,
                    background: s3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: C.t2, flexShrink: 0,
                    marginLeft: -7,
                  }}>
                    +{overflow}
                  </div>
                )}
              </>
            ) : (
              // Fallback when no contacts loaded yet
              <span style={{ fontSize: 11, color: C.t3 }}>Chargement…</span>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: GREEN, marginLeft: 8, whiteSpace: 'nowrap' }}>
            {escorte.isStarting ? 'Connexion…' : 'Démarrer'}
          </span>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(52,211,153,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ChevronRight size={10} strokeWidth={2.5} color={GREEN} />
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
        <div style={{ flex: 1, height: 1, background: b2 }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          ou rejoindre
        </span>
        <div style={{ flex: 1, height: 1, background: b2 }} />
      </div>

      {/* ── Code row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="Code (ex. A3F9)"
          style={{
            width: 130, height: 34, padding: '0 10px', borderRadius: 9,
            border: `1px solid ${b2}`, background: s2, color: tk.tp,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            outline: 'none',
          }}
        />
        <button
          onClick={handleJoin}
          disabled={joining || !joinCode.trim()}
          style={{
            width: 34, height: 34, borderRadius: 9, border: 'none',
            background: TEAL, color: 'white', cursor: joining ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            opacity: joining || !joinCode.trim() ? 0.5 : 1,
          }}
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 11, color: C.t3, flex: 1 }}>8 caractères max</span>
      </div>

      {/* ── Niveaux N1 / N2 / N3 ── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Marcher avec moi, c&apos;est quoi ?
      </div>
      {([
        { tag: 'N1', color: '#FBBF24', bg: 'rgba(251,191,36,.10)', bd: 'rgba(251,191,36,.28)',
          icon: <Bell size={13} strokeWidth={2} color="#FBBF24" />,
          title: 'Notification push', desc: 'Tout le cercle reçoit une alerte et te suit sur la carte' },
        { tag: 'N2', color: TEAL, bg: 'rgba(59,180,193,.12)', bd: 'rgba(59,180,193,.24)',
          icon: <Phone size={13} strokeWidth={2} color={TEAL} />,
          title: 'Canal audio privé', desc: 'Ils rejoignent une room audio, vous parlez en direct' },
        { tag: 'N3', color: PURPLE, bg: 'rgba(167,139,250,.1)', bd: 'rgba(167,139,250,.2)',
          icon: <Star size={13} strokeWidth={2} color={PURPLE} />,
          title: 'Julia intervient', desc: "L\u2019IA alerte les secours si aucune réponse sous 30 min", soon: true },
      ] as { tag: string; color: string; bg: string; bd: string; icon: React.ReactNode; title: string; desc: string; soon?: boolean }[]).map((lvl) => (
        <div key={lvl.tag} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 11px', borderRadius: 12,
          background: d ? '#1E293B' : '#F1F5F9',
          border: `1px solid ${b1}`,
          opacity: lvl.soon ? 0.55 : 1,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: lvl.bg, border: `1px solid ${lvl.bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {lvl.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: lvl.color, marginRight: 4 }}>{lvl.tag}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: tk.tp }}>{lvl.title}</span>
              {lvl.soon && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, marginLeft: 4,
                  background: 'rgba(59,180,193,0.12)', color: TEAL, border: '1px solid rgba(59,180,193,0.24)',
                }}>Bientôt</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>{lvl.desc}</div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
