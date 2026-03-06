// src/components/TripHUD.tsx
// Compact floating overlay visible on the map during an ACTIVE trip.
// Shows destination, ETA, progress bar, and quick-action buttons.

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Share2, AlertTriangle, Check } from 'lucide-react';
import { useStore, TripSession } from '@/stores/useStore';
import { geocodeReverse } from '@/lib/geocode';
import { useTheme } from '@/stores/useTheme';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type Props = {
  trip: TripSession;
  onImSafe: () => void;
  onOpenTrip: () => void;
  nudge?: string | null;
};

export default function TripHUD({ trip, onImSafe, onOpenTrip, nudge }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const { userLocation } = useStore();
  const [now, setNow] = useState(Date.now());
  const [streetName, setStreetName] = useState<string | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  const C = {
    t1:      isDark ? '#FFFFFF'                : '#0F172A',
    t2:      isDark ? '#94A3B8'                : '#475569',
    t3:      isDark ? '#64748B'                : '#94A3B8',
    bg:      isDark ? 'rgba(15,23,42,0.92)'    : 'rgba(255,255,255,0.95)',
    el:      isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    border:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    divider: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
  };

  useEffect(() => {
    if (!userLocation) return;
    if (lastGeocodedRef.current) {
      const dlat = (userLocation.lat - lastGeocodedRef.current.lat) * 111_000;
      const dlng = (userLocation.lng - lastGeocodedRef.current.lng) * 111_000;
      if (Math.sqrt(dlat * dlat + dlng * dlng) < 50) return;
    }
    lastGeocodedRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    geocodeReverse(userLocation.lng, userLocation.lat).then((name) => {
      if (name) setStreetName(name.split(',')[0]);
    });
  }, [userLocation]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(trip.startedAt).getTime();
  const etaMs = new Date(trip.estimatedArrival).getTime();
  const totalMs = etaMs - startMs;
  const elapsed = now - startMs;
  const remaining = Math.max(0, etaMs - now);
  const progress = totalMs > 0 ? Math.min(1, elapsed / totalMs) : 0;
  const critical = remaining < 5 * 60_000 && remaining > 0;
  const etaMin = Math.max(0, Math.ceil(remaining / 60_000));

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Ma position Breveil', url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type:'spring', stiffness:300, damping:30 }}
      style={{
        position: 'absolute',
        bottom: 64,
        left: 0, right: 0,
        zIndex: 150,
        background: C.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.divider}`,
        padding: '10px 14px 12px',
      }}
      onClick={onOpenTrip}
    >
      {/* Nudge banner */}
      {nudge && (
        <div style={{
          display:'flex', alignItems:'center', gap:6, marginBottom:8,
          padding:'4px 10px', borderRadius:100,
          background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.20)',
        }}>
          <AlertTriangle size={10} strokeWidth={2.5} color="#f59e0b" />
          <span style={{ fontSize:10, fontWeight:600, color:'#f59e0b', flex:1 }}>
            {nudge}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        height:3, borderRadius:2, marginBottom:9, overflow:'hidden',
        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      }}>
        <motion.div
          animate={{ width:`${progress * 100}%` }}
          transition={{ duration:1.5, ease:'easeOut' }}
          style={{ height:'100%', background: critical ? '#EF4444' : '#3BB4C1', borderRadius:2 }}
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
          }}>{trip.destination.label}</div>
          <div style={{ fontSize:9, color:C.t2, marginTop:1 }}>
            {critical
              ? `${formatCountdown(remaining)} restantes`
              : `~${etaMin} min restantes`}
            {streetName && ` · ${streetName}`}
          </div>
        </div>
      </div>

      {/* Partager + SOS */}
      <div style={{ display:'flex', gap:7, marginBottom:7 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleShare} style={{
          flex:1, padding:'8px', borderRadius:11,
          background:C.el, border:`1px solid ${C.border}`,
          fontFamily:'inherit', fontSize:11, fontWeight:600, color:C.t2,
          cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', gap:5,
        }}>
          <Share2 size={11} strokeWidth={1.5} /> Partager
        </button>
        <button onClick={() => {
          const store = useStore.getState();
          store.setShowSafeSpaces(true);
        }} style={{
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
      <div onClick={(e) => e.stopPropagation()}>
        <button onClick={onImSafe} style={{
          width:'100%', padding:'11px', borderRadius:28,
          background: isDark ? '#FFFFFF' : '#0F172A',
          color: isDark ? '#0F172A' : '#FFFFFF',
          fontFamily:'inherit', fontSize:13, fontWeight:800,
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <Check size={13} strokeWidth={2.5} /> Je suis arrivée
        </button>
      </div>
    </motion.div>
  );
}
