'use client'
// ÉCRAN 3 — TRIP HUD (composant standalone)
// Copier vers : src/components/TripHUD.tsx
// Monter dans : map/page.tsx dans le container relatif de la map, AVANT BottomNav
//
// Dans map/page.tsx :
//   import { TripHUD } from '@/components/TripHUD'
//   <TripHUD isDark={isDark} />
//
// Dans EscorteSheet.tsx :
//   const renderTripActive = () => null
//   'trip-active': '0px' dans SHEET_HEIGHTS

import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles, Share2, AlertTriangle, Check } from 'lucide-react'
import { useStore } from '@/stores/useStore'

interface TripHUDProps {
  isDark: boolean
}

export function TripHUD({ isDark }: TripHUDProps) {
  const activeEscorte = useStore(s => s.activeEscorte)
  const juliaActive   = useStore(s => (s as any).juliaActive ?? false)
  const tripProgress  = useStore(s => (s as any).tripProgress ?? 35)

  // Adapter ces deux lignes selon les vraies clés du store :
  // grep -n "setView\|handleArrived\|terminateTrip" src/stores/useStore.ts
  const setView       = useStore(s => (s as any).setView)
  const setActiveEscorte = useStore(s => (s as any).setActiveEscorte)

  const isVisible = !!activeEscorte &&
    (activeEscorte as any).mode === 'trip' &&
    (activeEscorte as any).status === 'active'

  const etaRemaining = (activeEscorte as any)?.eta_minutes ?? 0
  const destName     = (activeEscorte as any)?.dest_name ?? '—'

  const C = {
    t1:     isDark ? '#FFFFFF'                : '#0F172A',
    t2:     isDark ? '#94A3B8'               : '#475569',
    t3:     isDark ? '#64748B'               : '#94A3B8',
    bg:     isDark ? 'rgba(15,23,42,0.92)'   : 'rgba(255,255,255,0.95)',
    el:     isDark ? 'rgba(255,255,255,0.06)': '#F1F5F9',
    border: isDark ? 'rgba(255,255,255,0.08)': 'rgba(15,23,42,0.08)',
    divider:isDark ? 'rgba(255,255,255,0.10)': 'rgba(15,23,42,0.08)',
  }

  const handleArrived = () => {
    setView?.('arrived')
  }

  const handleTerminate = () => {
    setActiveEscorte?.(null)
    setView?.('hub')
  }

  const handleSOS = () => {
    // Chercher le handler SOS existant dans le projet :
    // grep -n "triggerSOS\|handleSOS\|sos" src/stores/useStore.ts | head -5
    ;(useStore.getState() as any).triggerSOS?.()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Ma position Breveil', url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="trip-hud"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type:'spring', stiffness:300, damping:30 }}
          style={{
            position: 'absolute',
            bottom: 64,          // BottomNav hardcodé à 64px dans BottomNav.tsx
            left: 0, right: 0,
            zIndex: 150,
            background: C.bg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${C.divider}`,
            padding: '10px 14px 12px',
          }}
        >
          {/* Julia chip — conditionnel */}
          {juliaActive && (
            <div style={{
              display:'flex', alignItems:'center', gap:6, marginBottom:8,
              padding:'4px 10px', borderRadius:100,
              background:'rgba(167,139,250,0.08)',
              border:'1px solid rgba(167,139,250,0.20)',
            }}>
              <Sparkles size={10} strokeWidth={1.5} color="#A78BFA" />
              <span style={{ fontSize:10, fontWeight:600, color:'#A78BFA', flex:1 }}>
                Julia vous accompagne · canal actif
              </span>
              <span style={{
                fontSize:7, fontWeight:800, color:'#A78BFA',
                background:'rgba(167,139,250,0.15)', padding:'1px 5px', borderRadius:3,
              }}>IA</span>
            </div>
          )}

          {/* Progress bar */}
          <div style={{
            height:3, borderRadius:2, marginBottom:9, overflow:'hidden',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
          }}>
            <motion.div
              animate={{ width:`${tripProgress}%` }}
              transition={{ duration:1.5, ease:'easeOut' }}
              style={{ height:'100%', background:'#3BB4C1', borderRadius:2 }}
            />
          </div>

          {/* Destination */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{
              width:32, height:32, borderRadius:10, flexShrink:0,
              background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <MapPin size={13} strokeWidth={1.5} color="#EF4444" />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:13, fontWeight:700, color:C.t1,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{destName}</div>
              <div style={{ fontSize:9, color:C.t2, marginTop:1 }}>
                ~{etaRemaining} min restantes
              </div>
            </div>
          </div>

          {/* Partager + SOS */}
          <div style={{ display:'flex', gap:7, marginBottom:7 }}>
            <button onClick={handleShare} style={{
              flex:1, padding:'8px', borderRadius:11,
              background:C.el, border:`1px solid ${C.border}`,
              fontFamily:'inherit', fontSize:11, fontWeight:600, color:C.t2,
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:5,
            }}>
              <Share2 size={11} strokeWidth={1.5} /> Partager
            </button>
            <button onClick={handleSOS} style={{
              flex:1, padding:'8px', borderRadius:11,
              background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.20)',
              fontFamily:'inherit', fontSize:11, fontWeight:700, color:'#EF4444',
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:5,
            }}>
              <AlertTriangle size={11} strokeWidth={2} /> SOS
            </button>
          </div>

          {/* Je suis arrivée */}
          <button onClick={handleArrived} style={{
            width:'100%', padding:'11px', borderRadius:28,
            background: isDark ? '#FFFFFF' : '#0F172A',
            color: isDark ? '#0F172A' : '#FFFFFF',
            fontFamily:'inherit', fontSize:13, fontWeight:800,
            border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            <Check size={13} strokeWidth={2.5} /> Je suis arrivée
          </button>

          {/* Terminer */}
          <div onClick={handleTerminate} style={{
            textAlign:'center', marginTop:7,
            fontSize:11, color:C.t3, cursor:'pointer',
          }}>
            Terminer le trajet
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
