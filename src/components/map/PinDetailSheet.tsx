'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Check, CheckCircle2, MapPin, Users,
  AlertTriangle, Wrench, Share2, ThumbsDown,
  MessageCircle, MoreHorizontal, ClipboardCheck,
  RefreshCw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTheme } from '@/stores/useTheme'
import { useStore } from '@/stores/useStore'
import { useUiStore } from '@/stores/uiStore'
import { usePullToDismiss } from '@/hooks/usePullToDismiss'
import { supabase } from '@/lib/supabase'
import { CATEGORY_DETAILS } from '@/types'
import type { Pin } from '@/types'
import { T } from '@/lib/tokens'
import { toast } from 'sonner'
import { ConfirmIncidentModal } from '@/components/ConfirmIncidentModal'
import { HashtagPill } from '@/components/hashtags'
import type { Hashtag } from '@/types'

// ─── Category config ─────────────────────────────
const CAT: Record<string, {
  color: string
  colorSoft: string
  colorBorder: string
  label: string
  Icon: LucideIcon
  gradientEnd: string
}> = {
  urgent: {
    color: T.semanticDanger, colorSoft: T.semanticDangerSoft,
    colorBorder: 'rgba(239,68,68,0.25)', label: 'Urgent',
    Icon: Users, gradientEnd: 'rgba(239,68,68,0)',
  },
  warning: {
    color: T.semanticWarning, colorSoft: T.semanticWarningSoft,
    colorBorder: 'rgba(251,191,36,0.25)', label: 'Vigilance',
    Icon: AlertTriangle, gradientEnd: 'rgba(251,191,36,0)',
  },
  infra: {
    color: T.semanticInfo, colorSoft: T.semanticInfoSoft,
    colorBorder: 'rgba(96,165,250,0.25)', label: 'Infrastructure',
    Icon: Wrench, gradientEnd: 'rgba(96,165,250,0)',
  },
  positive: {
    color: T.semanticSuccess, colorSoft: T.semanticSuccessSoft,
    colorBorder: 'rgba(52,211,153,0.25)', label: 'Positif',
    Icon: CheckCircle2, gradientEnd: 'rgba(52,211,153,0)',
  },
}

// ─── Helpers ─────────────────────────────────────
function getCategoryGroup(category: string): string {
  return CATEGORY_DETAILS[category]?.group ?? 'warning'
}

function getTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins}min`
  if (hrs < 24) return `Il y a ${hrs}h`
  if (days === 1) return 'Hier'
  return `Il y a ${days}j`
}

const AVATAR_COLORS = ['#3BB4C1', '#7C3AED', '#DC2626', '#16A34A', '#D97706', '#0891B2']
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]


const THRESHOLD = 5

function getReliability(count: number) {
  if (count >= 20) return { label: 'Très fiable', color: T.semanticSuccess }
  if (count >= 10) return { label: 'Fiable', color: T.semanticSuccess }
  if (count >= 5)  return { label: 'En cours', color: T.semanticWarning }
  return { label: 'Non vérifié', color: T.textTertiary }
}

// ─── Props ───────────────────────────────────────
interface PinDetailSheetProps {
  pin: Pin | null
  isOpen: boolean
  onClose: () => void
  onContact: (pinId: string) => void
  userId: string
  userLat: number
  userLng: number
  onNavigateTo?: (lat: number, lng: number, name: string) => void
}

// ─── Component ───────────────────────────────────
function PinDetailSheet({
  pin,
  isOpen,
  onClose,
  onContact,
  userId,
  userLat,
  userLng,
  onNavigateTo,
}: PinDetailSheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark'
  const d = isDark
  const { updatePin, pins, setSelectedPin, setActiveSheet } = useStore()
  const { openCommunityDM } = useUiStore()

  const [confirmCount, setConfirmCount] = useState(0)
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [recentConfirmers, setRecentConfirmers] = useState<{ name: string }[]>([])
  const [resolving, setResolving] = useState(false)
  const [showFalseReportConfirm, setShowFalseReportConfirm] = useState(false)
  const [pinHashtags, setPinHashtags] = useState<Hashtag[]>([])
  const pull = usePullToDismiss({ onDismiss: onClose })

  useEffect(() => {
    if (!pin) return
    setConfirmCount(pin.confirmations ?? 0)
    setIsResolved(!!pin.resolved_at)
    setAlreadyConfirmed(false)
    setShowFalseReportConfirm(false)

    const load = async () => {
      // Check if user already confirmed
      if (userId) {
        const { data: ev } = await supabase
          .from('pin_evidence')
          .select('id')
          .eq('pin_id', pin.id)
          .eq('user_id', userId)
          .eq('activity', 'confirmation')
          .maybeSingle()
        if (ev) setAlreadyConfirmed(true)
      }

      // Fetch recent confirmers
      const { data: confs } = await supabase
        .from('pin_evidence')
        .select('user_id, profiles:user_id(name)')
        .eq('pin_id', pin.id)
        .eq('activity', 'confirmation')
        .order('created_at', { ascending: false })
        .limit(4)
      if (confs) {
        setRecentConfirmers(
          confs.map((c: Record<string, unknown>) => ({
            name: (c.profiles as { name?: string } | null)?.name ?? '?',
          }))
        )
      }

      // Fetch hashtags for this pin
      const { data: chRows } = await supabase
        .from('content_hashtags')
        .select('hashtags(id, tag, category, display, color, icon, uses_count, created_at)')
        .eq('content_type', 'incident')
        .eq('content_id', pin.id)
      if (chRows) {
        const tags = chRows
          .map((r: Record<string, unknown>) => r.hashtags as unknown as Hashtag)
          .filter(Boolean)
        setPinHashtags(tags)
      } else {
        setPinHashtags([])
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.id, userId])

  // ─── Handlers ──────────────────────────────────
  const handleResolve = async () => {
    if (!pin || !userId) return
    setResolving(true)
    if (!isResolved) {
      const { data, error } = await supabase.rpc('resolve_pin', { p_pin_id: pin.id })
      if (error) { toast.error('Erreur'); setResolving(false); return }
      if (data) updatePin(data)
      setIsResolved(true)
      toast.success('Marqué comme résolu')
      // Notify nearby users of resolution
      fetch('/api/notify-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: { id: pin.id, lat: pin.lat, lng: pin.lng, category: pin.category, severity: pin.severity, user_id: pin.user_id, is_emergency: pin.is_emergency },
          event_type: 'resolved',
        }),
      }).catch(() => {})
    } else {
      const { error } = await supabase
        .from('pins')
        .update({ resolved_at: null })
        .eq('id', pin.id)
      if (error) { toast.error('Erreur'); setResolving(false); return }
      updatePin({ ...pin, resolved_at: null })
      setIsResolved(false)
      toast.success('Rouvert')
    }
    setResolving(false)
  }

  const handleFalseReport = async () => {
    if (!pin || !userId) return
    const { data, error } = await supabase.rpc('flag_pin', { p_pin_id: pin.id, p_reason: 'false_report' })
    if (error) { toast.error('Erreur'); return }
    if (data) updatePin(data)
    toast('Signalement envoyé')
    setShowFalseReportConfirm(false)
  }

  const handleShare = async () => {
    if (!pin) return
    const catDetails = CATEGORY_DETAILS[pin.category]
    const text = `Incident signalé sur Breveil : ${catDetails?.label ?? pin.category} — ${pin.address ?? ''}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Breveil', text, url: window.location.href }) } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Lien copié')
    }
  }

// ─── Derived ───────────────────────────────────
  if (!pin) return null

  const group = getCategoryGroup(pin.category)
  const cat = CAT[group] ?? CAT.warning
  const catDetails = CATEGORY_DETAILS[pin.category]
  const CatIcon = cat.Icon
  const reliability = getReliability(confirmCount)
  const progressPct = Math.min(100, Math.round((confirmCount / THRESHOLD) * 100))
  const progressColor = confirmCount >= THRESHOLD
    ? `linear-gradient(90deg,${T.semanticSuccess},${T.accentCyan})`
    : `linear-gradient(90deg,${T.semanticWarning},#F59E0B)`

  return (
    <>
      <AnimatePresence>
        {isOpen && pin && (
          <motion.div
            key="pin-detail-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500,
              padding: '20px 16px',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                pointerEvents: 'all',
              }}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              style={{
                position: 'relative',
                zIndex: 501,
                width: '100%',
                maxWidth: 480,
                maxHeight: '85vh',
                borderRadius: 24,
                background: d ? T.surfaceElevated : '#FFFFFF',
                border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                boxShadow: T.shadowLg,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
            {/* ① HANDLE */}
            <div style={{
              width: 36, height: 4,
              background: d ? T.borderStrong : 'rgba(15,23,42,0.18)',
              borderRadius: T.radiusFull,
              margin: '12px auto 0',
              flexShrink: 0,
            }} />

            {/* ② ACCENT BAR */}
            <div style={{
              height: 3, flexShrink: 0, width: '100%',
              background: `linear-gradient(90deg,${cat.color},${cat.gradientEnd})`,
            }} />

            {/* ③ SCROLL AREA */}
            <div ref={pull.scrollRef as React.RefObject<HTMLDivElement>} style={{
              flex: 1, overflowY: 'auto',
              scrollbarWidth: 'none',
            }}>

              {/* ── HEADER ────────────────────────── */}
              <div style={{
                padding: '14px 18px 12px',
                borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon wrap */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 13,
                    background: cat.colorSoft,
                    border: `1px solid ${cat.colorBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CatIcon size={22} color={cat.color} strokeWidth={1.5} />
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 19, fontWeight: 600,
                      color: d ? T.textPrimary : T.textPrimaryL,
                      lineHeight: 1.2, marginBottom: 4,
                    }}>
                      {catDetails?.label ?? pin.category}
                    </div>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 11, color: d ? T.textSecondary : T.textSecondaryL,
                      }}>
                        <MapPin size={10} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={1.5} />
                        {pin.address ?? 'Position signalée'}
                      </span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: d ? T.textTertiary : T.textTertiaryL }} />
                      <span style={{ fontSize: 11, color: d ? T.textSecondary : T.textSecondaryL }}>
                        {getTimeAgo(pin.created_at)}
                      </span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: d ? T.textTertiary : T.textTertiaryL }} />
                      <span style={{
                        background: cat.colorSoft,
                        border: `1px solid ${cat.colorBorder}`,
                        color: cat.color,
                        fontSize: 9, fontWeight: 700,
                        padding: '2px 9px', borderRadius: T.radiusFull,
                      }}>
                        {cat.label}
                      </span>
                      {pinHashtags.map(tag => (
                        <HashtagPill key={tag.id} hashtag={tag} isDark={d} size="xs" />
                      ))}
                    </div>
                  </div>

                  {/* Close btn */}
                  <button onClick={onClose} style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: d ? T.interactiveHover : T.interactiveHoverL,
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                    <X size={12} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* ── CONFIRMATION STATUS ────────────── */}
              <div style={{
                padding: '10px 18px',
                borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              }}>
                {/* Progress bar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    flex: 1, height: 5,
                    background: d ? T.borderSubtle : T.borderSubtleL,
                    borderRadius: 3, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progressPct}%`, height: '100%',
                      background: progressColor,
                      borderRadius: 3,
                      transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color: confirmCount >= THRESHOLD ? T.semanticSuccess : T.semanticWarning,
                  }}>
                    {confirmCount} confirmation{confirmCount > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Sub text */}
                <div style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL, marginBottom: 6 }}>
                  {confirmCount < THRESHOLD ? (
                    `Seuil de fiabilité : ${THRESHOLD} confirmations`
                  ) : (
                    <>
                      <span style={{ color: T.semanticSuccess, fontWeight: 600 }}>Incident fiable</span>
                      {' · Validé par la communauté'}
                    </>
                  )}
                </div>

                {/* Avatars row */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {recentConfirmers.slice(0, 4).map((c, i) => (
                      <div key={i} style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: avatarColor(c.name),
                        border: `1.5px solid ${d ? T.surfaceElevated : '#FFFFFF'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 7, fontWeight: 700, color: '#fff',
                        marginLeft: i > 0 ? -7 : 0,
                        position: 'relative', zIndex: 4 - i,
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {confirmCount > 4 && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: d ? T.interactiveHover : T.interactiveHoverL,
                        border: `1.5px solid ${d ? T.surfaceElevated : '#FFFFFF'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 7, color: d ? T.textTertiary : T.textTertiaryL,
                        marginLeft: -7,
                      }}>
                        +{confirmCount - 4}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, color: d ? T.textSecondary : T.textSecondaryL,
                    marginLeft: 8,
                  }}>
                    {recentConfirmers[0] ? (
                      <>
                        <strong style={{ color: d ? T.textPrimary : T.textPrimaryL }}>
                          {recentConfirmers[0].name}
                        </strong>
                        {confirmCount > 1 ? ` et ${confirmCount - 1} autre${confirmCount > 2 ? 's' : ''} ont confirmé` : ' a confirmé'}
                      </>
                    ) : (
                      'Sois le premier à confirmer'
                    )}
                  </span>
                </div>
              </div>

              {/* ── CTA ZONE ──────────────────────── */}
              <div style={{
                padding: '12px 18px 10px',
                borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              }}>
                {!alreadyConfirmed && !isResolved && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    style={{
                      background: d ? '#FFFFFF' : '#0F172A',
                      color: d ? '#0F172A' : '#FFFFFF',
                      borderRadius: 32, padding: '15px 20px',
                      fontSize: 15, fontWeight: 600,
                      border: 'none', width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: 'pointer', fontFamily: 'inherit',
                      position: 'relative', zIndex: 1, pointerEvents: 'auto',
                      transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = T.shadowMd
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <Check size={15} strokeWidth={2.5} />
                    {"J'ai vu cet incident · Confirmer"}
                  </button>
                )}
                {alreadyConfirmed && !isResolved && (
                  <div style={{
                    background: T.semanticSuccessSoft,
                    border: '1px solid rgba(52,211,153,0.25)',
                    color: T.semanticSuccess,
                    borderRadius: 32, padding: '15px 20px',
                    fontSize: 15, fontWeight: 600, width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <Check size={15} strokeWidth={2.5} />
                    Tu as confirmé cet incident
                  </div>
                )}
                {isResolved && (
                  <div style={{
                    background: T.semanticSuccessSoft,
                    border: '1px solid rgba(52,211,153,0.22)',
                    color: T.semanticSuccess,
                    borderRadius: 32, padding: '15px 20px',
                    fontSize: 15, fontWeight: 600, width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <CheckCircle2 size={15} strokeWidth={1.5} />
                    Incident résolu
                  </div>
                )}
              </div>

              {/* ── SECONDARY ACTIONS GRID ─────────── */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                padding: '10px 18px',
                borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
              }}>
                {/* Resolve / Reopen */}
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  style={{
                    background: !isResolved
                      ? (d ? T.semanticSuccessSoft : 'rgba(52,211,153,0.07)')
                      : (d ? T.interactiveHover : T.interactiveHoverL),
                    border: `1px solid ${!isResolved ? 'rgba(52,211,153,0.22)' : d ? T.borderSubtle : T.borderSubtleL}`,
                    color: !isResolved ? T.semanticSuccess : d ? T.textTertiary : T.textTertiaryL,
                    padding: '11px 14px', borderRadius: 12,
                    fontSize: 12, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: resolving ? 'not-allowed' : 'pointer',
                    opacity: resolving ? 0.5 : 1,
                    transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                >
                  {!isResolved ? (
                    <><ClipboardCheck size={14} strokeWidth={1.5} /> Marquer résolu</>
                  ) : (
                    <><RefreshCw size={14} strokeWidth={1.5} /> Rouvrir</>
                  )}
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  style={{
                    background: d ? 'rgba(59,180,193,0.07)' : 'rgba(42,157,170,0.07)',
                    border: `1px solid ${d ? 'rgba(59,180,193,0.20)' : 'rgba(42,157,170,0.18)'}`,
                    color: T.gradientStart,
                    padding: '11px 14px', borderRadius: 12,
                    fontSize: 12, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                >
                  <Share2 size={14} strokeWidth={1.5} /> Partager
                </button>
              </div>

              {/* ── TERTIARY ROW ──────────────────── */}
              <div style={{ display: 'flex', gap: 8, padding: '0 18px 10px', marginTop: 10 }}>
                {/* False report */}
                <button
                  onClick={() => setShowFalseReportConfirm(true)}
                  style={{
                    flex: 1,
                    background: d ? T.interactiveHover : 'rgba(15,23,42,0.03)',
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    color: d ? T.textTertiary : T.textTertiaryL,
                    borderRadius: 12, padding: 9,
                    fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                >
                  <ThumbsDown size={13} strokeWidth={1.5} /> Signaler faux
                </button>

                {/* Contact author */}
                <button
                  onClick={() => {
                    if (pin?.user_id && pin?.username) {
                      openCommunityDM({ userId: pin.user_id, userName: pin.username });
                      onClose?.();
                    } else {
                      onContact(pin.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: d ? T.interactiveHover : 'rgba(15,23,42,0.03)',
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    color: d ? T.textTertiary : T.textTertiaryL,
                    borderRadius: 12, padding: 9,
                    fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                >
                  <MessageCircle size={13} strokeWidth={1.5} /> Contacter
                </button>

                {/* More */}
                <button
                  onClick={() => {
                    if (onNavigateTo) {
                      onNavigateTo(pin.lat, pin.lng, catDetails?.label ?? pin.category)
                    }
                  }}
                  style={{
                    flex: 1,
                    background: d ? T.interactiveHover : 'rgba(15,23,42,0.03)',
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    color: d ? T.textTertiary : T.textTertiaryL,
                    borderRadius: 12, padding: 9,
                    fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                >
                  <MoreHorizontal size={13} strokeWidth={1.5} /> Plus
                </button>
              </div>

            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FALSE REPORT MICRO-MODAL ──────── */}
      <AnimatePresence>
        {showFalseReportConfirm && (
          <>
            <motion.div
              key="false-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowFalseReportConfirm(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 310,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
              }}
            >
              <motion.div
                key="false-modal"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: 300, width: '100%',
                  background: d ? T.surfaceElevated : '#FFFFFF',
                  borderRadius: 20,
                  border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                  padding: 20, boxShadow: T.shadowLg,
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: T.semanticDangerSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 10px',
                }}>
                  <ThumbsDown size={22} color={T.semanticDanger} strokeWidth={1.5} />
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: d ? T.textPrimary : T.textPrimaryL,
                  marginBottom: 6,
                }}>
                  Signaler comme faux ?
                </div>
                <div style={{
                  fontSize: 12, color: d ? T.textSecondary : T.textSecondaryL,
                  marginBottom: 16, lineHeight: 1.5,
                }}>
                  Merci de ne signaler que les incidents incorrects ou inventés.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowFalseReportConfirm(false)}
                    style={{
                      flex: 1, padding: 11, borderRadius: 32,
                      background: d ? T.interactiveHover : T.interactiveHoverL,
                      border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                      color: d ? T.textSecondary : T.textSecondaryL,
                      fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleFalseReport}
                    style={{
                      flex: 1, padding: 11, borderRadius: 32,
                      background: T.semanticDangerSoft,
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: T.semanticDanger,
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Signaler
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CONFIRM INCIDENT MODAL ────────── */}
      <ConfirmIncidentModal
        pin={showConfirmModal ? pin : null}
        onClose={() => setShowConfirmModal(false)}
        onConfirmed={() => {
          setAlreadyConfirmed(true)
          setConfirmCount((c) => c + 1)
          setShowConfirmModal(false)
        }}
        userId={userId}
        alreadyConfirmed={alreadyConfirmed}
      />

      {/* Pulse keyframes for skeleton */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
    </>
  )
}

export default PinDetailSheet
export { PinDetailSheet }
