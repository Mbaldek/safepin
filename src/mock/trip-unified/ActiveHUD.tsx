/**
 * MOCK — ActiveHUD: Composant HUD unifié pour un trajet en cours
 *
 * Fusionne:
 *   - TripHUD.tsx (149 LOC, map-level, utilisé par escorte)
 *   - TripActiveHUD.tsx (204 LOC, panel-level, utilisé par TripView)
 *
 * Résultat: un seul composant avec toutes les features combinées.
 *
 * Features intégrées:
 *   - Julia chip (from TripHUD)
 *   - Progress bar animée (both)
 *   - Destination + ETA + elapsed timer (merged)
 *   - Circle member avatars (from TripActiveHUD)
 *   - Share toggle (merged — TripHUD had share, TripActiveHUD had toggle)
 *   - SOS button (from TripActiveHUD — le seul qui devrait exister)
 *   - "Je suis arrivée" CTA (both)
 *   - Cancel link (from TripHUD)
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles, Share2, AlertTriangle, Check, X } from 'lucide-react'
import type { ActiveTrip, TripCircleMember } from './types'

// ── CONSTANTS ────────────────────────────────────────

const TEAL = '#3BB4C1'
const PURPLE = '#A78BFA'
const GOLD = '#F5C341'
const RED = '#EF4444'
const SUCCESS = '#22C55E'
const CONTACT_COLORS = [PURPLE, TEAL, GOLD, SUCCESS, '#60A5FA', '#F97316']
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 32 }

// ── HELPERS ──────────────────────────────────────────

function formatElapsed(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function Avatar({ name, color, size = 26, isDark }: {
  name: string; color: string; size?: number; isDark: boolean
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, color,
      border: `2px solid ${isDark ? 'rgba(15,23,42,0.93)' : 'rgba(255,255,255,0.96)'}`,
      flexShrink: 0,
    }}>
      {name[0]}
    </div>
  )
}

// ── PROPS ────────────────────────────────────────────

interface ActiveHUDProps {
  trip: ActiveTrip
  isDark: boolean
  progress: number      // 0–100 (computed by useTrip)
  etaMinutes: number    // computed by useTrip
  remainingKm: number   // computed by useTrip
  onComplete: () => void
  onCancel: () => void
  onSOS: () => void
  onToggleSharing: () => void
}

// ── COMPONENT ────────────────────────────────────────

export default function ActiveHUD({
  trip, isDark, progress, etaMinutes, remainingKm,
  onComplete, onCancel, onSOS, onToggleSharing,
}: ActiveHUDProps) {

  // Theme colors
  const t1 = isDark ? '#FFFFFF' : '#0F172A'
  const t2 = isDark ? '#94A3B8' : '#475569'
  const t3 = isDark ? '#64748B' : '#94A3B8'
  const bg = isDark ? 'rgba(15,23,42,0.93)' : 'rgba(255,255,255,0.96)'
  const el = isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: 'Ma position Breveil', url: window.location.href })
    else navigator.clipboard?.writeText(window.location.href)
  }

  return (
    <AnimatePresence>
      {trip.state === 'active' && (
        <motion.div
          key="active-hud"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={SPRING}
          style={{
            position: 'absolute',
            bottom: 64, left: 0, right: 0,
            zIndex: 200,
            background: bg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${border}`,
            padding: '10px 16px 14px',
          }}
        >
          {/* ── Julia chip ── */}
          {trip.juliaActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9,
              padding: '5px 11px', borderRadius: 100,
              background: 'rgba(167,139,250,0.09)',
              border: '1px solid rgba(167,139,250,0.22)',
            }}>
              <Sparkles size={10} strokeWidth={1.5} color={PURPLE} />
              <span style={{ fontSize: 11, fontWeight: 600, color: PURPLE, flex: 1 }}>
                Julia vous accompagne · canal actif
              </span>
              <span style={{
                fontSize: 8, fontWeight: 800, color: PURPLE,
                background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 3,
              }}>IA</span>
            </div>
          )}

          {/* ── Julia countdown ── */}
          {!trip.juliaActive && trip.juliaCdSeconds > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9,
              padding: '5px 11px', borderRadius: 100,
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.12)',
            }}>
              <Sparkles size={10} strokeWidth={1.5} color={t3} />
              <span style={{ fontSize: 11, fontWeight: 500, color: t3, flex: 1 }}>
                Julia rejoint dans {Math.ceil(trip.juliaCdSeconds / 60)} min
              </span>
            </div>
          )}

          {/* ── Progress bar ── */}
          <div style={{
            height: 4, borderRadius: 2, marginBottom: 10, overflow: 'hidden',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
          }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, ${TEAL}, ${SUCCESS})`,
              }}
            />
          </div>

          {/* ── Destination + timer ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={14} strokeWidth={1.5} color={RED} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: t1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {trip.destination || 'Destination'}
              </div>
              <div style={{ fontSize: 10, color: t2, marginTop: 2 }}>
                ~{etaMinutes} min · {remainingKm.toFixed(1)} km restants
              </div>
            </div>
            {/* Elapsed timer (from TripActiveHUD) */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t1, fontVariantNumeric: 'tabular-nums' }}>
                {formatElapsed(trip.elapsedS)}
              </div>
              <div style={{ fontSize: 9, color: t3 }}>écoulé</div>
            </div>
          </div>

          {/* ── Status chips (circle count + sharing) ── */}
          {(trip.circleMembers.length > 0 || trip.isSharingLocation) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {trip.circleMembers.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 16,
                  backgroundColor: `${PURPLE}15`, color: PURPLE,
                }}>
                  {trip.circleMembers.length} proches
                </span>
              )}
              {trip.isSharingLocation && (
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 16,
                  backgroundColor: `${SUCCESS}15`, color: SUCCESS,
                }}>
                  Position partagée
                </span>
              )}
            </div>
          )}

          {/* ── Action row: Share + SOS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <button onClick={trip.isSharingLocation ? handleShare : onToggleSharing} style={{
              padding: '10px', borderRadius: 12,
              background: trip.isSharingLocation ? `${SUCCESS}15` : el,
              border: trip.isSharingLocation ? `1px solid ${SUCCESS}40` : `1px solid ${border}`,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              color: trip.isSharingLocation ? SUCCESS : t2,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}>
              <Share2 size={13} strokeWidth={1.5} />
              {trip.isSharingLocation ? 'Partagé ✓' : 'Partager'}
            </button>
            <button onClick={onSOS} style={{
              padding: '10px', borderRadius: 12,
              backgroundColor: RED, border: 'none',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}>
              <AlertTriangle size={13} strokeWidth={2} /> SOS
            </button>
          </div>

          {/* ── "Je suis arrivée" CTA ── */}
          <button onClick={onComplete} style={{
            width: '100%', padding: '13px', borderRadius: 28,
            background: `linear-gradient(135deg, ${GOLD}, #E8A800)`,
            boxShadow: '0 4px 20px rgba(245,195,65,0.3)',
            color: 'white', fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Check size={14} strokeWidth={2.5} /> Je suis arrivée
          </button>

          {/* ── Cancel ── */}
          <div onClick={onCancel} style={{
            textAlign: 'center', marginTop: 8,
            fontSize: 12, color: t3, cursor: 'pointer',
          }}>
            Annuler
          </div>

          {/* ── Circle watchers ── */}
          {trip.circleMembers.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, flexWrap: 'wrap', marginTop: 10,
            }}>
              <div style={{ display: 'flex' }}>
                {trip.circleMembers.slice(0, 3).map((c, i) => (
                  <div key={c.contactId} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                    <Avatar name={c.name} color={CONTACT_COLORS[i % CONTACT_COLORS.length]} isDark={isDark} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: t3 }}>
                {formatWatchers(trip.circleMembers)}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── UTILS ────────────────────────────────────────────

function formatWatchers(members: TripCircleMember[]): string {
  if (members.length === 0) return ''
  if (members.length <= 2) return members.map(c => c.name).join(' et ') + ' vous suivent'
  return `${members[0].name}, ${members[1].name} et ${members.length - 2} autre${members.length - 2 > 1 ? 's' : ''} vous suivent`
}
