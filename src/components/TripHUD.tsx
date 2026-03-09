'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles, Share2, AlertTriangle, Check } from 'lucide-react'

interface TripHUDProps {
  isDark:       boolean
  isVisible:    boolean        // view === 'trip-active'
  destName:     string
  etaMinutes:   number
  tripProgress: number         // 0–100
  juliaActive:  boolean
  onArrived:    () => void
  onTerminate:  () => void
  onSOS:        () => void
}

export default function TripHUD({
  isDark, isVisible, destName, etaMinutes,
  tripProgress, juliaActive, onArrived, onTerminate, onSOS,
}: TripHUDProps) {

  const C = {
    t1:      isDark ? '#FFFFFF'                : '#0F172A',
    t2:      isDark ? '#94A3B8'               : '#475569',
    t3:      isDark ? '#64748B'               : '#94A3B8',
    bg:      isDark ? 'rgba(15,23,42,0.93)'   : 'rgba(255,255,255,0.96)',
    el:      isDark ? 'rgba(255,255,255,0.06)': '#F1F5F9',
    border:  isDark ? 'rgba(255,255,255,0.08)': 'rgba(15,23,42,0.08)',
    topLine: isDark ? 'rgba(255,255,255,0.10)': 'rgba(15,23,42,0.08)',
    btn:     isDark ? '#FFFFFF'               : '#0F172A',
    btnTxt:  isDark ? '#0F172A'               : '#FFFFFF',
  }

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: 'Ma position Breveil', url: window.location.href })
    else navigator.clipboard?.writeText(window.location.href)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="trip-hud"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          style={{
            position: 'absolute',
            bottom: 64,
            left: 0, right: 0,
            zIndex: 200,
            background: C.bg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${C.topLine}`,
            padding: '10px 16px 14px',
          }}
        >
          {/* Julia chip */}
          {juliaActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9,
              padding: '5px 11px', borderRadius: 100,
              background: 'rgba(167,139,250,0.09)',
              border: '1px solid rgba(167,139,250,0.22)',
            }}>
              <Sparkles size={10} strokeWidth={1.5} color="#A78BFA" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', flex: 1 }}>
                Julia vous accompagne · canal actif
              </span>
              <span style={{
                fontSize: 8, fontWeight: 800, color: '#A78BFA',
                background: 'rgba(167,139,250,0.15)', padding: '1px 5px', borderRadius: 3,
              }}>IA</span>
            </div>
          )}

          {/* Progress bar */}
          <div style={{
            height: 3, borderRadius: 2, marginBottom: 10, overflow: 'hidden',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
          }}>
            <motion.div
              animate={{ width: `${tripProgress}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ height: '100%', background: '#3BB4C1', borderRadius: 2 }}
            />
          </div>

          {/* Destination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={14} strokeWidth={1.5} color="#EF4444" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: C.t1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {destName || 'Destination'}
              </div>
              <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>
                ~{etaMinutes} min restantes
              </div>
            </div>
          </div>

          {/* Partager */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={handleShare} style={{
              flex: 1, padding: '9px', borderRadius: 12,
              background: C.el, border: `1px solid ${C.border}`,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: C.t2,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}>
              <Share2 size={12} strokeWidth={1.5} /> Partager
            </button>
          </div>

          {/* Je suis arrivée */}
          <button onClick={onArrived} style={{
            width: '100%', padding: '12px', borderRadius: 28,
            background: C.btn, color: C.btnTxt,
            fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Check size={14} strokeWidth={2.5} /> Je suis arrivée
          </button>

          <div onClick={onTerminate} style={{
            textAlign: 'center', marginTop: 8,
            fontSize: 12, color: C.t3, cursor: 'pointer',
          }}>
            Terminer le trajet
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
