'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Check, Loader2, Image, Video, Mic,
  Upload, FileCheck, UserMinus,
  EyeOff, AlertTriangle, Wrench, CheckCircle2,
  MapPin,
} from 'lucide-react'
import { useIsDark } from '@/hooks/useIsDark'
import { useStore } from '@/stores/useStore'
import { supabase } from '@/lib/supabase'
import { CATEGORY_DETAILS } from '@/types'
import type { Pin } from '@/types'
import { T } from '@/lib/tokens'
import { bToast } from '@/components/GlobalToast'
import { avatarColor } from '@/lib/escorteHelpers'

// ─── Category config ─────────────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; colorSoft: string }> = {
  urgent:   { color: T.semanticDanger,  colorSoft: T.semanticDangerSoft },
  warning:  { color: T.semanticWarning, colorSoft: T.semanticWarningSoft },
  infra:    { color: T.accentCyan,      colorSoft: 'rgba(34,211,238,0.12)' },
  positive: { color: T.semanticSuccess, colorSoft: T.semanticSuccessSoft },
}

const GROUP_ICONS = {
  urgent:   EyeOff,
  warning:  AlertTriangle,
  infra:    Wrench,
  positive: CheckCircle2,
} as const

// ─── Helpers ─────────────────────────────────────

function getCategoryGroup(category: string): string {
  return CATEGORY_DETAILS[category]?.group ?? 'urgent'
}

function getTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins}min`
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${days}j`
}

// ─── Props ───────────────────────────────────────

interface ConfirmIncidentModalProps {
  pin: Pin | null
  onClose: () => void
  onConfirmed: (pinId: string) => void
  userId: string
  alreadyConfirmed?: boolean
}

// ─── Component ───────────────────────────────────

export function ConfirmIncidentModal({
  pin,
  onClose,
  onConfirmed,
  userId,
  alreadyConfirmed: alreadyConfirmedProp = false,
}: ConfirmIncidentModalProps) {
  const isDark = useIsDark()
  const d = isDark
  const updatePin = useStore((s) => s.updatePin)

  const [proofType, setProofType] = useState<'photo' | 'video' | 'audio' | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmCount, setConfirmCount] = useState(pin?.confirmations ?? 0)
  const [recentConfirmers, setRecentConfirmers] = useState<{ name: string }[]>([])
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(alreadyConfirmedProp)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when pin changes
  useEffect(() => {
    if (!pin) return
    setProofType(null)
    setProofFile(null)
    setIsAnonymous(false)
    setConfirming(false)
    setConfirmCount(pin.confirmations ?? 0)
    setAlreadyConfirmed(alreadyConfirmedProp)

    const load = async () => {
      // Fetch recent confirmers
      const { data } = await supabase
        .from('pin_evidence')
        .select('user_id, profiles:user_id(name)')
        .eq('pin_id', pin.id)
        .eq('activity', 'confirmation')
        .order('created_at', { ascending: false })
        .limit(3)
      if (data) {
        setRecentConfirmers(
          data.map((c: Record<string, unknown>) => ({
            name: (c.profiles as { name?: string } | null)?.name ?? '?',
          }))
        )
      }

      // Check if already confirmed by this user
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
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.id])

  // ─── Upload proof ────────────────────────────
  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile || !pin) return null
    const ext = proofFile.name.split('.').pop()
    const path = `${pin.id}/${userId}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('incident-proofs')
      .upload(path, proofFile, { upsert: false })

    if (error) return null

    const { data } = supabase.storage
      .from('incident-proofs')
      .getPublicUrl(path)

    return data.publicUrl
  }

  // ─── Handle confirm ─────────────────────────
  const handleConfirm = async () => {
    if (!pin || !userId) return
    setConfirming(true)

    let proofUrl: string | null = null
    if (proofFile && proofType && proofType !== 'audio') {
      proofUrl = await uploadProof()
    }

    let data: unknown = null
    let error: { code?: string; message?: string } | null = null
    try {
      const res = await supabase.rpc('confirm_pin', {
        p_pin_id: pin.id,
        p_is_anonymous: isAnonymous,
        p_proof_type: proofType ?? null,
        p_proof_url: proofUrl,
      })
      data = res.data
      error = res.error
    } catch {
      bToast.danger({ title: 'Erreur réseau · Réessaie' }, isDark)
      setConfirming(false)
      return
    }

    if (error) {
      if (error.message?.includes('already_confirmed')) {
        bToast.info({ title: 'Tu as déjà confirmé cet incident' }, isDark)
        setAlreadyConfirmed(true)
      } else if (error.code === '23502') {
        bToast.danger({ title: 'Session expirée · Reconnecte-toi' }, isDark)
      } else if (error.code === '23503') {
        bToast.danger({ title: 'Ce signalement n\'existe plus' }, isDark)
      } else if (error.code === 'PGRST202') {
        bToast.danger({ title: 'Erreur serveur · Réessaie' }, isDark)
      } else {
        bToast.danger({ title: 'Erreur · Réessaie plus tard' }, isDark)
      }
      setConfirming(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (data) updatePin(data as any)
    const newCount = (pin.confirmations ?? 0) + 1
    setConfirmCount(newCount)
    bToast.success({ title: 'Confirmation envoyée' }, isDark)
    setConfirming(false)
    onConfirmed(pin.id)
    onClose()

    // Notify pin creator about the confirmation
    if (pin.user_id && pin.user_id !== userId) {
      const catLabel = CATEGORY_DETAILS[pin.category]?.label ?? pin.category
      void supabase.from('notifications').insert({
        user_id: pin.user_id,
        type: 'pin_confirmed',
        title: 'Ton signalement a été confirmé',
        body: `${catLabel} · ${newCount} confirmation${newCount > 1 ? 's' : ''}`,
        pin_id: pin.id,
      })
    }

    // Notify nearby users when confirmation threshold (5) is crossed
    if ((pin.confirmations ?? 0) < 5 && newCount >= 5) {
      fetch('/api/notify-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: { id: pin.id, lat: pin.lat, lng: pin.lng, category: pin.category, severity: pin.severity, user_id: pin.user_id, is_emergency: false },
          event_type: 'confirmed',
        }),
      }).catch(() => {})
    }
  }

  // ─── Derived values ─────────────────────────
  if (!pin) return null

  const group = getCategoryGroup(pin.category)
  const catCfg = CATEGORY_CONFIG[group] ?? CATEGORY_CONFIG.urgent
  const catDetails = CATEGORY_DETAILS[pin.category]
  const GroupIcon = GROUP_ICONS[group as keyof typeof GROUP_ICONS] ?? AlertTriangle

  const reliabilityLabel =
    confirmCount >= 20 ? 'Très fiable' :
    confirmCount >= 10 ? 'Fiable' :
    confirmCount >= 5  ? 'En cours' : 'Non vérifié'

  const reliabilityColor =
    confirmCount >= 10 ? T.semanticWarning :
    confirmCount >= 5  ? T.gradientStart : T.textTertiary

  return (
    <AnimatePresence>
      {pin && (
        <>
          {/* ── OVERLAY ──────────────────────────── */}
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: d ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 600,
            }}
          >
            {/* ── MODAL ────────────────────────────── */}
            <motion.div
              key="confirm-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 400,
                width: '100%',
                background: d ? T.surfaceElevated : '#FFFFFF',
                borderRadius: 24,
                border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                boxShadow: T.shadowLg,
                overflow: 'hidden',
              }}
            >
              {/* ① HEADER ──────────────────────────── */}
              <div
                style={{
                  padding: '20px 20px 16px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: d ? T.textPrimary : T.textPrimaryL,
                    flex: 1,
                  }}
                >
                  Confirmer cet incident
                </span>
                <button
                  onClick={onClose}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: d ? T.interactiveHover : T.interactiveHoverL,
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <X size={12} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={2.5} />
                </button>
              </div>

              {/* ② INCIDENT PREVIEW ────────────────── */}
              <div
                style={{
                  padding: '14px 20px 12px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Icon wrap */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: catCfg.colorSoft,
                    border: `1px solid ${catCfg.color}38`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GroupIcon size={18} color={catCfg.color} strokeWidth={1.5} />
                </div>

                {/* Body */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: d ? T.textPrimary : T.textPrimaryL,
                    }}
                  >
                    {catDetails?.label ?? pin.category}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: d ? T.textSecondary : T.textSecondaryL,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <MapPin size={10} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={1.5} />
                    <span>{pin.address ?? 'Position signalée'}</span>
                    <span style={{ color: d ? T.textTertiary : T.textTertiaryL }}> · {getTimeAgo(pin.created_at)}</span>
                  </div>
                </div>

                {/* Badge catégorie */}
                <span
                  style={{
                    flexShrink: 0,
                    background: catCfg.colorSoft,
                    border: `1px solid ${catCfg.color}38`,
                    color: catCfg.color,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: T.radiusFull,
                    textTransform: 'capitalize',
                  }}
                >
                  {group}
                </span>
              </div>

              {/* ③ CONFIRMATIONS ROW ───────────────── */}
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {/* Avatars */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {recentConfirmers.slice(0, 3).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: avatarColor(c.name),
                        border: `1.5px solid ${d ? T.surfaceElevated : '#FFFFFF'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        fontWeight: 700,
                        color: '#fff',
                        marginLeft: i > 0 ? -7 : 0,
                        position: 'relative',
                        zIndex: 3 - i,
                      }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {confirmCount > 3 && (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: d ? T.interactiveHover : T.interactiveHoverL,
                        border: `1.5px solid ${d ? T.surfaceElevated : '#FFFFFF'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        color: d ? T.textTertiary : T.textTertiaryL,
                        marginLeft: -7,
                      }}
                    >
                      +{confirmCount - 3}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
                    {confirmCount} confirmation{confirmCount > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Reliability chip */}
                <div
                  style={{
                    background: `${reliabilityColor}1A`,
                    border: `1px solid ${reliabilityColor}33`,
                    borderRadius: T.radiusFull,
                    padding: '4px 9px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: reliabilityColor,
                    }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 700, color: reliabilityColor }}>
                    {reliabilityLabel}
                  </span>
                </div>
              </div>

              {/* ④ PROOF SECTION ────────────────────── */}
              <div style={{ padding: '14px 20px 12px' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                    color: d ? T.textTertiary : T.textTertiaryL,
                    marginBottom: 10,
                  }}
                >
                  Ajouter une preuve (optionnel)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {([
                    { id: 'photo' as const, icon: Image, label: 'Photo' },
                    { id: 'video' as const, icon: Video, label: 'Vidéo' },
                    { id: 'audio' as const, icon: Mic, label: 'Audio' },
                  ]).map((m) => {
                    const sel = proofType === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (proofType === m.id) {
                            setProofType(null)
                            setProofFile(null)
                          } else {
                            setProofType(m.id)
                            setProofFile(null)
                          }
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '12px 8px',
                          borderRadius: 12,
                          background: sel
                            ? 'rgba(59,180,193,0.08)'
                            : d ? T.interactiveHover : 'rgba(15,23,42,0.03)',
                          border: `1px solid ${sel ? 'rgba(59,180,193,0.30)' : d ? T.borderSubtle : T.borderSubtleL}`,
                          cursor: 'pointer',
                          transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            background: sel
                              ? 'rgba(59,180,193,0.10)'
                              : d ? T.interactiveHover : T.interactiveHoverL,
                            border: `1px solid ${sel ? 'rgba(59,180,193,0.25)' : d ? T.borderSubtle : T.borderSubtleL}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <m.icon
                            size={18}
                            color={sel ? T.gradientStart : d ? T.textTertiary : T.textTertiaryL}
                            strokeWidth={1.5}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: sel ? T.gradientStart : d ? T.textSecondary : T.textSecondaryL,
                          }}
                        >
                          {m.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ⑤ UPLOAD ZONE (conditional) ────────── */}
              <AnimatePresence>
                {(proofType === 'photo' || proofType === 'video') && (
                  <motion.div
                    key="upload-zone"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    {!proofFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          margin: '0 20px 12px',
                          border: '1.5px dashed rgba(59,180,193,0.30)',
                          background: 'rgba(59,180,193,0.04)',
                          borderRadius: 12,
                          padding: 14,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'rgba(59,180,193,0.10)',
                            border: '1px solid rgba(59,180,193,0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Upload size={14} color={T.gradientStart} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.gradientStart }}>
                            Choisir un fichier
                          </div>
                          <div style={{ fontSize: 10, color: d ? T.textTertiary : T.textTertiaryL }}>
                            {proofType === 'photo' ? 'JPG, PNG, HEIC · max 20MB' : 'MP4, MOV, AVI · max 50MB'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          margin: '0 20px 12px',
                          background: 'rgba(59,180,193,0.06)',
                          border: '1px solid rgba(59,180,193,0.18)',
                          borderRadius: 12,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: 'rgba(59,180,193,0.10)',
                            border: '1px solid rgba(59,180,193,0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileCheck size={13} color={T.gradientStart} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.gradientStart,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {proofFile.name}
                          </div>
                          <div style={{ fontSize: 10, color: d ? T.textTertiary : T.textTertiaryL }}>
                            {(proofFile.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                        <button
                          onClick={() => setProofFile(null)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: d ? T.interactiveHover : T.interactiveHoverL,
                            border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <X size={11} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept={proofType === 'photo' ? 'image/*' : 'video/*'}
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ⑥ TOGGLE ANONYME ──────────────────── */}
              <div
                style={{
                  margin: '0 20px 14px',
                  background: d ? T.interactiveHover : 'rgba(15,23,42,0.03)',
                  border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: d ? T.interactiveHover : T.interactiveHoverL,
                    border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserMinus size={14} color={d ? T.textTertiary : T.textTertiaryL} strokeWidth={1.5} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
                    Rester anonyme
                  </div>
                  <div style={{ fontSize: 10, color: d ? T.textTertiary : T.textTertiaryL, marginTop: 1 }}>
                    Ton nom ne sera pas visible
                  </div>
                </div>

                {/* Toggle pill */}
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: T.radiusFull,
                    border: 'none',
                    cursor: 'pointer',
                    background: isAnonymous ? T.gradientStart : d ? T.borderDefault : T.borderDefaultL,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2px',
                    transition: 'background 200ms cubic-bezier(0.16,1,0.3,1)',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      transform: isAnonymous ? 'translateX(16px)' : 'translateX(0)',
                      transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </button>
              </div>

              {/* ⑦ CTA ──────────────────────────────── */}
              <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Primary button */}
                <button
                  onClick={handleConfirm}
                  disabled={confirming || alreadyConfirmed}
                  style={{
                    background: alreadyConfirmed
                      ? T.semanticSuccessSoft
                      : d ? '#FFFFFF' : '#0F172A',
                    color: alreadyConfirmed
                      ? T.semanticSuccess
                      : d ? '#0F172A' : '#FFFFFF',
                    border: alreadyConfirmed
                      ? '1px solid rgba(52,211,153,0.22)'
                      : 'none',
                    borderRadius: 32,
                    padding: '15px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: (confirming || alreadyConfirmed) ? 'not-allowed' : 'pointer',
                    opacity: (confirming || alreadyConfirmed) ? 0.5 : 1,
                    animation: (!confirming && !alreadyConfirmed) ? 'confirmCTAPulse 2s ease-out infinite' : undefined,
                    transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!confirming && !alreadyConfirmed) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                      e.currentTarget.style.animation = 'none'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!confirming && !alreadyConfirmed) {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.animation = 'confirmCTAPulse 2s ease-out infinite'
                    }
                  }}
                >
                  {alreadyConfirmed ? (
                    <>Déjà confirmé</>
                  ) : confirming ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      Confirmation…
                    </>
                  ) : (
                    <>
                      <Check size={15} strokeWidth={2.5} />
                      {"Confirmer l'incident"}
                    </>
                  )}
                </button>

                {/* Cancel */}
                <button
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: d ? T.textTertiary : T.textTertiaryL,
                    fontSize: 13,
                    fontWeight: 500,
                    padding: 12,
                    borderRadius: 32,
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'color 150ms',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = d ? T.textSecondary : T.textSecondaryL
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = d ? T.textTertiary : T.textTertiaryL
                  }}
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Spin keyframes */}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConfirmIncidentModal
