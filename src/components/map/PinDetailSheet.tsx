'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Flag,
  ExternalLink,
  ThumbsDown,
  MessageCircle,
  MapPin,
  Users,
} from 'lucide-react'
import { useTheme } from '@/stores/useTheme'

// ─── Theme palette ────────────────────────────────

function getColors(isDark: boolean) {
  return isDark
    ? {
        sheetBg: '#1A2540',
        surfaceElevated: '#334155',
        surfaceHighlight: '#243050',
        textPrimary: '#FFFFFF',
        textSecondary: '#94A3B8',
        textTertiary: '#64748B',
        borderSubtle: 'rgba(255,255,255,0.08)',
        borderDefault: 'rgba(255,255,255,0.12)',
        btnSecBg: '#334155',
        btnSecColor: '#94A3B8',
        btnSecBorder: 'rgba(255,255,255,0.08)',
        descriptionBg: '#243050',
        shadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }
    : {
        sheetBg: '#FFFFFF',
        surfaceElevated: '#F1F5F9',
        surfaceHighlight: '#F8FAFC',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textTertiary: '#94A3B8',
        borderSubtle: 'rgba(15,23,42,0.06)',
        borderDefault: 'rgba(15,23,42,0.10)',
        btnSecBg: '#F1F5F9',
        btnSecColor: '#475569',
        btnSecBorder: 'rgba(15,23,42,0.08)',
        descriptionBg: '#F8FAFC',
        shadow: '0 -8px 32px rgba(0,0,0,0.08)',
      }
}

const FIXED = {
  accentCyan: '#3BB4C1',
  accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentCyanBorder: 'rgba(59,180,193,0.25)',
  semanticSuccess: '#34D399',
  semanticSuccessSoft: 'rgba(52,211,153,0.12)',
  semanticDanger: '#EF4444',
}

// ─── Constants ────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  assault: '🚨', harassment: '🚫', theft: '👜',
  following: '👤', suspect: '👁️', group: '👥',
  unsafe: '⚠️', lighting: '💡', blocked: '🚧',
  closed: '🚷', safe: '💚', help: '🙋', presence: '👮',
}

const CATEGORY_LABEL: Record<string, string> = {
  assault: 'Agression', harassment: 'Harcèlement', theft: 'Vol',
  following: 'Filature', suspect: 'Suspect', group: 'Groupe',
  unsafe: 'Zone dangereuse', lighting: 'Éclairage', blocked: 'Bloqué',
  closed: 'Fermé', safe: 'Zone sûre', help: "Besoin d'aide", presence: 'Présence',
}

// ─── Helper ───────────────────────────────────────

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "à l'instant"
  if (diffMins < 60) return `il y a ${diffMins}min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  return `il y a ${diffDays}j`
}

// ─── Types ────────────────────────────────────────

interface PinDetailSheetProps {
  pin: {
    id: string
    category: string
    confirmations?: number
    created_at: string
    is_transport?: boolean
    transport_type?: 'metro' | 'bus' | 'tram' | 'rer'
    transport_line?: string
    address?: string
    description?: string
    media_url?: string | null
    [key: string]: unknown
  } | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (pinId: string) => void
  onResolved: (pinId: string) => void
  onFalse: (pinId: string) => void
  onContact: (pinId: string) => void
}

// ─── Component ────────────────────────────────────

function PinDetailSheet({
  pin,
  isOpen,
  onClose,
  onConfirm,
  onResolved,
  onFalse,
  onContact,
}: PinDetailSheetProps) {
  const isDark = useTheme((s) => s.theme) === 'dark'
  const C = getColors(isDark)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setIsExpanded(false)
  }, [pin?.id])

  const transportLabel = pin?.is_transport && pin?.transport_type
    ? `${pin.transport_type.charAt(0).toUpperCase() + pin.transport_type.slice(1)} L${pin.transport_line}`
    : null

  const subtitle = pin
    ? transportLabel
      ? `${transportLabel} · ${getTimeAgo(pin.created_at)}`
      : getTimeAgo(pin.created_at)
    : ''

  const confirmCount = pin?.confirmations ?? 0

  return (
    <AnimatePresence>
      {isOpen && pin && (
        <motion.div
          key="pin-detail-sheet"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            background: C.sheetBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTop: `1px solid ${C.borderSubtle}`,
            boxShadow: C.shadow,
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80) onClose()
          }}
        >
          {/* Handle */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: C.borderDefault,
              margin: '12px auto 8px',
              cursor: 'pointer',
            }}
            onClick={() => setIsExpanded((v) => !v)}
          />

          {/* Collapsed content — always visible */}
          <div style={{ padding: '0 20px 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Left: emoji + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>{CATEGORY_EMOJI[pin.category]}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.textPrimary }}>
                    {CATEGORY_LABEL[pin.category]}
                  </div>
                  <div style={{ fontSize: 13, color: C.textSecondary }}>
                    {subtitle}
                  </div>
                </div>
              </div>

              {/* Right: chevron */}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isExpanded
                  ? <ChevronDown size={20} color={C.textTertiary} />
                  : <ChevronUp size={20} color={C.textTertiary} />}
              </button>
            </div>
          </div>

          {/* Confirmation bar — always visible */}
          <div
            style={{
              margin: '0 16px 16px',
              background: FIXED.accentCyanSoft,
              border: `1px solid ${FIXED.accentCyanBorder}`,
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color={FIXED.accentCyan} />
              <span style={{ fontSize: 14, fontWeight: 500, color: FIXED.accentCyan }}>
                {confirmCount} confirmation{confirmCount > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => onConfirm(pin.id)}
              style={{
                background: FIXED.accentCyan,
                color: '#fff',
                borderRadius: 10,
                padding: '7px 16px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Confirmer
            </button>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 20px', overflowY: 'auto', maxHeight: '50vh' }}>
                  {/* Address */}
                  {pin.address && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        marginBottom: 16,
                      }}
                    >
                      <MapPin
                        size={16}
                        color={FIXED.accentCyan}
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>
                          {pin.address}
                        </div>
                        {pin.is_transport && pin.transport_line && (
                          <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>
                            Ligne {pin.transport_line}, direction Porte d&apos;Orléans
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {pin.description && (
                    <div
                      style={{
                        background: C.descriptionBg,
                        border: `1px solid ${C.borderSubtle}`,
                        borderRadius: 12,
                        padding: '12px 14px',
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          fontStyle: 'italic',
                          fontSize: 14,
                          color: C.textSecondary,
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        &quot;{pin.description}&quot;
                      </p>
                    </div>
                  )}

                  {/* Media */}
                  {pin.media_url && (
                    <img
                      src={pin.media_url}
                      alt="Photo du signalement"
                      style={{
                        width: '100%',
                        height: 160,
                        objectFit: 'cover',
                        borderRadius: 12,
                        marginBottom: 16,
                        display: 'block',
                      }}
                    />
                  )}

                  {/* Action buttons row 1 — 3 cols */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    {/* Confirmer */}
                    <button
                      onClick={() => onConfirm(pin.id)}
                      style={{
                        background: FIXED.accentCyan,
                        color: '#fff',
                        borderRadius: 12,
                        padding: '12px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle size={16} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Confirmer</span>
                    </button>

                    {/* Résolu */}
                    <button
                      onClick={() => onResolved(pin.id)}
                      style={{
                        background: FIXED.semanticSuccessSoft,
                        color: FIXED.semanticSuccess,
                        borderRadius: 12,
                        padding: '12px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Flag size={16} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Résolu</span>
                    </button>

                    {/* Partager */}
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: CATEGORY_LABEL[pin.category],
                            text: pin.description || '',
                            url: window.location.href,
                          })
                        }
                      }}
                      style={{
                        background: C.btnSecBg,
                        color: C.btnSecColor,
                        border: `1px solid ${C.btnSecBorder}`,
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>

                  {/* Action buttons row 2 — 2 cols */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginBottom: 28,
                    }}
                  >
                    {/* Faux */}
                    <button
                      onClick={() => onFalse(pin.id)}
                      style={{
                        background: C.btnSecBg,
                        color: C.btnSecColor,
                        border: `1px solid ${C.btnSecBorder}`,
                        borderRadius: 12,
                        padding: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <ThumbsDown size={14} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Faux</span>
                    </button>

                    {/* Contact */}
                    <button
                      onClick={() => onContact(pin.id)}
                      style={{
                        background: C.btnSecBg,
                        color: C.btnSecColor,
                        border: `1px solid ${C.btnSecBorder}`,
                        borderRadius: 12,
                        padding: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <MessageCircle size={14} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Contact</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PinDetailSheet
export { PinDetailSheet }
