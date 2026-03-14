'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Camera, Video, Mic, MapPin, ChevronLeft, ChevronRight, Loader2, Lock } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useIsDark } from '@/hooks/useIsDark';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const groups = [
  {
    id: 'urgent',
    label: 'DANGER',
    dotColor: '#EF4444',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.10)',
    items: [
      { value: 'assault', emoji: '🚨', label: 'Agression' },
      { value: 'harassment', emoji: '😰', label: 'Harcèlement' },
      { value: 'theft', emoji: '👜', label: 'Vol' },
      { value: 'following', emoji: '🕵️', label: 'Filature' },
    ],
  },
  {
    id: 'warning',
    label: 'ATTENTION',
    dotColor: '#F59E0B',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    items: [
      { value: 'suspect', emoji: '👁️', label: 'Suspect' },
      { value: 'group', emoji: '⚠️', label: 'Attroupement' },
      { value: 'unsafe', emoji: '🚧', label: 'Zone à éviter' },
      { value: 'lighting', emoji: '💡', label: 'Mal éclairé' },
      { value: 'blocked', emoji: '🚧', label: 'Passage difficile' },
      { value: 'closed', emoji: '🔒', label: 'Fermé' },
    ],
  },
  {
    id: 'positive',
    label: 'POSITIF',
    dotColor: '#34D399',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.10)',
    items: [
      { value: 'safe', emoji: '💚', label: 'Lieu sûr' },
      { value: 'help', emoji: '🤝', label: 'Aide reçue' },
      { value: 'presence', emoji: '🛡️', label: 'Sécurité' },
    ],
  },
];

const trans = [
  { id: 'metro', e: '🚇', label: 'Métro', p: 'Ligne (4, 11...)' },
  { id: 'rer', e: '🚆', label: 'RER', p: 'Ligne (A, B...)' },
  { id: 'bus', e: '🚌', label: 'Bus', p: 'N° (72, 91...)' },
  { id: 'tram', e: '🚊', label: 'Tram', p: 'Ligne' },
];

const TIMING_OPTIONS = [
  { id: 'now' as const, label: 'Maintenant' },
  { id: '15min' as const, label: 'Il y a ~15 min' },
  { id: '1h' as const, label: 'Il y a ~1h' },
  { id: 'earlier' as const, label: 'Plus tôt' },
];

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444', semanticDangerSoft: 'rgba(239,68,68,0.12)',
  semanticSuccess: '#34D399', semanticSuccessSoft: 'rgba(52,211,153,0.12)',
};

const CHIP_PALETTE: Record<string, { bg: string; text: string; led: string }> = {
  // DANGER — blush/peach
  assault:    { bg: 'linear-gradient(145deg,#FFCCC4,#FFB5A7)', text: '#6B2C24', led: 'rgba(200,80,70,0.45)' },
  harassment: { bg: 'linear-gradient(145deg,#FDE4DF,#FCD5CE)', text: '#703030', led: 'rgba(205,100,90,0.40)' },
  theft:      { bg: 'linear-gradient(145deg,#FCE9D8,#F9DCC4)', text: '#6B3A1A', led: 'rgba(200,130,70,0.40)' },
  following:  { bg: 'linear-gradient(145deg,#FBF3F1,#F8EDEB)', text: '#6A3030', led: 'rgba(195,100,95,0.35)' },
  // ATTENTION — sand/taupe/warm
  suspect:    { bg: 'linear-gradient(145deg,#E8EBE6,#DADDD8)', text: '#4A4A3E', led: 'rgba(160,155,130,0.42)' },
  group:      { bg: 'linear-gradient(145deg,#FFDAB8,#FEC89A)', text: '#6B4410', led: 'rgba(200,150,60,0.42)' },
  unsafe:     { bg: 'linear-gradient(145deg,#F3F2EC,#ECEBE4)', text: '#4E4C3E', led: 'rgba(165,158,130,0.38)' },
  lighting:   { bg: 'linear-gradient(145deg,#FCE9D6,#F9DCC4)', text: '#684015', led: 'rgba(195,135,70,0.38)' },
  blocked:    { bg: 'linear-gradient(145deg,#F5F6F8,#EEF0F2)', text: '#404855', led: 'rgba(140,150,168,0.38)' },
  closed:     { bg: 'linear-gradient(145deg,#FFFFFF,#FAFAFF)', text: '#404450', led: 'rgba(140,148,175,0.35)' },
  // POSITIF — mint/sage/teal
  safe:       { bg: 'linear-gradient(145deg,#D8EFEC,#C8E8E4)', text: '#1E5C55', led: 'rgba(80,178,165,0.42)' },
  help:       { bg: 'linear-gradient(145deg,#C6E4E6,#B0D7D8)', text: '#1A5258', led: 'rgba(70,168,175,0.42)' },
  presence:   { bg: 'linear-gradient(145deg,#7A8F8F,#6A7E7E)', text: '#E8F2F2', led: 'rgba(150,200,200,0.45)' },
};

const allItems = groups.flatMap(g => g.items);

// Steps: 'category' | 'place' | 'details' | 'details-positive'
type ReportStep = 'category' | 'place' | 'details' | 'details-positive';

// Snap heights
type SnapPoint = 'default' | 'full';
const STEP_HEIGHTS: Record<ReportStep, { default: string; full: string }> = {
  category:          { default: '42vh', full: '80vh' },
  place:             { default: '110px', full: '110px' },
  details:           { default: '48vh', full: '80vh' },
  'details-positive': { default: '48vh', full: '80vh' },
};

export function ReportSheet() {
  const isDark = useIsDark();
  const C = getColors(isDark);
  const { activeSheet, setActiveSheet, newPinCoords, userId, addPin, setMapFlyTo, setReportPlaceMode } = useStore();

  const [step, setStep] = useState<ReportStep>('category');
  const [snap, setSnap] = useState<SnapPoint>('default');
  const [cat, setCat] = useState<string | null>(null);
  const [transport, setTransport] = useState<boolean | null>(null);
  const [tType, setTType] = useState<string | null>(null);
  const [tLine, setTLine] = useState('');
  const [timing, setTiming] = useState<'now' | '15min' | '1h' | 'earlier'>('now');
  const [desc, setDesc] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [establishmentType, setEstablishmentType] = useState<string | null>(null);
  const [positifNote, setPositifNote] = useState('');

  // Sync reportPlaceMode to store
  useEffect(() => {
    setReportPlaceMode(step === 'place' && activeSheet === 'report');
    return () => setReportPlaceMode(false);
  }, [step, activeSheet, setReportPlaceMode]);

  // Reverse geocode when coords change
  useEffect(() => {
    if (!newPinCoords) { setAddress(null); return; }
    let cancelled = false;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${newPinCoords.lng},${newPinCoords.lat}.json?access_token=${token}&limit=1&language=fr`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const name = data.features?.[0]?.place_name;
        setAddress(name ?? null);
      })
      .catch(() => { if (!cancelled) setAddress(null); });
    return () => { cancelled = true; };
  }, [newPinCoords]);

  if (activeSheet !== 'report') return null;

  const catItem = cat ? allItems.find(i => i.value === cat) : null;
  const selectedGroup = cat ? groups.find(g => g.items.some(i => i.value === cat)) : null;

  const c = {
    bg: C.bg,
    card: C.card,
    text: C.textPrimary,
    muted: C.textSecondary,
    border: C.border,
    pill: C.elevated,
    accent: FIXED.accentCyan,
    sel: `${FIXED.accentCyan}40`,
    gold: FIXED.accentCyan,
  };

  const back = () => {
    if (step === 'details' || step === 'details-positive') {
      setStep('place');
      setTransport(null); setTType(null); setTLine('');
    } else if (step === 'place') {
      setStep('category');
    }
  };

  const reset = () => {
    setStep('category');
    setSnap('default');
    setCat(null);
    setTransport(null);
    setTType(null);
    setTLine('');
    setTiming('now');
    setDesc('');
    setMediaType(null);
    setMediaFile(null);
    setAddress(null);
    setEstablishmentType(null);
    setPositifNote('');
  };

  const handleClose = () => {
    setActiveSheet('none');
    reset();
  };

  const uploadMedia = async (pinId: string): Promise<string | null> => {
    if (!mediaFile || !userId) return null;
    const ext = mediaFile.name.split('.').pop();
    const path = `${pinId}/${userId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('incident-proofs').upload(path, mediaFile, { upsert: false });
    if (error) return null;
    return supabase.storage.from('incident-proofs').getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!newPinCoords || !cat || !userId) return;
    setIsSubmitting(true);

    try {
      const severity = selectedGroup?.id === 'urgent' ? 'high'
        : selectedGroup?.id === 'warning' ? 'med' : 'low';
      const decayType = selectedGroup?.id === 'positive' ? 'positive' : 'people';

      const timingLabel = timing !== 'now' ? TIMING_OPTIONS.find(t => t.id === timing)?.label : null;
      const fullDesc = [timingLabel ? `[${timingLabel}]` : null, desc || null].filter(Boolean).join(' ') || null;

      const newPin = {
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: cat,
        severity,
        description: fullDesc,
        is_transport: transport ?? false,
        transport_type: tType,
        transport_line: tLine || null,
        confirmations: 1,
        decay_type: decayType,
        address: address || null,
        last_confirmed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('pins').insert(newPin).select().single();
      if (error) throw error;
      if (data) {
        addPin(data);
        let mediaUrl: string | null = null;
        if (mediaFile && mediaType && mediaType !== 'audio') {
          mediaUrl = await uploadMedia(data.id);
        }
        if (mediaType || desc) {
          await supabase.from('pin_evidence').insert({
            pin_id: data.id,
            user_id: userId,
            activity: 'report',
            content: desc || null,
            media_urls: mediaUrl ? [{ type: mediaType, url: mediaUrl }] : null,
          });
        }
      }
      setMapFlyTo({ lat: newPinCoords.lat, lng: newPinCoords.lng, zoom: 16 });

      // Success toast instead of step 3
      toast.success('Signalement envoyé !', {
        description: `${catItem?.emoji} ${catItem?.label} — visible par la communauté`,
        duration: 3000,
      });
      handleClose();
    } catch (error) {
      const e = error as Record<string, unknown>;
      console.error('[ReportSheet] Erreur envoi:', e?.message ?? e?.code ?? JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const ctaColor = selectedGroup?.color ?? FIXED.accentCyan;
  const currentHeight = STEP_HEIGHTS[step][snap];
  const isToolbar = step === 'place';

  // Drag snap handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isToolbar) return; // no drag on toolbar
    const vel = info.velocity.y;
    if (vel > 400) {
      if (snap === 'full') setSnap('default');
      else handleClose();
    } else if (vel < -400) {
      setSnap('full');
    }
  };

  // Section label helper
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.muted, marginBottom: 6, marginTop: 14 }}>
      {children}
    </p>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="report-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="sheet-glow sheet-highlight"
        style={{
          position: 'fixed',
          bottom: 64,
          left: 0, right: 0,
          zIndex: 302,
          background: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderTopLeftRadius: isToolbar ? 0 : 16,
          borderTopRightRadius: isToolbar ? 0 : 16,
          overflow: 'hidden',
        }}
      >
        {/* Animated height wrapper */}
        <motion.div
          animate={{ height: currentHeight }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Drag handle — not on toolbar */}
          {!isToolbar && (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              style={{ cursor: 'grab', padding: '8px 0 4px', display: 'flex', justifyContent: 'center' }}
            >
              <div style={{ width: 32, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </motion.div>
          )}

          {/* ═══ TOOLBAR — Place mode ═══ */}
          {isToolbar && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px',
              minHeight: 110,
            }}>
              {/* Category badge — tap to go back */}
              <button
                onClick={() => { setCat(null); setStep('category'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 10,
                  background: selectedGroup?.bg, border: 'none',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16 }}>{catItem?.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: selectedGroup?.color }}>{catItem?.label}</span>
              </button>

              {/* Address — live updating */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.muted, marginBottom: 2 }}>
                  Placer le pin
                </p>
                <p style={{
                  fontSize: 11, color: c.text, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {newPinCoords
                    ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                    : 'Déplace la carte...'}
                </p>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => {
                  const isPositive = ['safe', 'help', 'presence'].includes(cat ?? '');
                  setStep(isPositive ? 'details-positive' : 'details');
                  setSnap('default');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '9px 14px', borderRadius: 12,
                  background: ctaColor, border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                  animation: 'confirmCTAPulse 2s ease-in-out infinite',
                }}
              >
                Confirmer <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* ═══ HEADER — Category & Details steps ═══ */}
          {!isToolbar && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 14px 8px', borderBottom: '1px solid ' + c.border }}>
              <button onClick={step === 'category' ? handleClose : back} style={{ width: 32, height: 32, borderRadius: '50%', background: c.pill, border: 'none', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {step === 'category' ? <X size={18} /> : <ChevronLeft size={18} />}
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                  {step === 'category' ? 'Signaler' : step === 'details-positive' ? 'Lieu positif' : 'Détails'}
                </span>
              </div>
              <div style={{ width: 32 }} />
            </div>
          )}

          {/* ═══ CONTENT ═══ */}
          <div style={{
            padding: isToolbar ? 0 : '10px 14px 16px',
            flex: 1,
            overflowY: isToolbar ? 'hidden' : 'auto',
          }}>

            {/* ── Step: Category grid ── */}
            {step === 'category' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, minWidth: 0 }}>
                  <MapPin size={13} color={c.muted} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {newPinCoords
                      ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                      : 'Position actuelle'}
                  </span>
                </div>

                {groups.map((group, gi) => (
                  <div
                    key={group.id}
                    style={{
                      marginBottom: 14,
                      animation: `reportGroupIn 0.35s ${gi * 0.08}s both ease-out`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span
                        style={{
                          width: 7, height: 7, borderRadius: '50%',
                          backgroundColor: group.dotColor, flexShrink: 0,
                          animation: group.id === 'urgent' ? 'reportUrgentPulse 2s ease-in-out infinite' : undefined,
                        }}
                      />
                      <p style={{ fontSize: 10, fontWeight: 800, color: group.color, letterSpacing: '0.08em' }}>
                        {group.label}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {group.items.map((item, ci) => {
                        const isSelected = cat === item.value;
                        const isHovered = hoveredChip === item.value;
                        const palette = CHIP_PALETTE[item.value];
                        if (!palette) return null;
                        return (
                          <button
                            key={item.value}
                            onClick={() => {
                              setCat(item.value);
                              setStep('place');
                            }}
                            onMouseEnter={() => setHoveredChip(item.value)}
                            onMouseLeave={() => setHoveredChip(null)}
                            style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 10px', borderRadius: 10,
                              background: palette.bg,
                              border: 'none',
                              boxShadow: isSelected
                                ? 'inset 0 0 0 1.5px rgba(0,0,0,0.12), 0 3px 10px rgba(0,0,0,0.15)'
                                : '-1px -1px 4px rgba(255,255,255,0.70), 2px 3px 7px rgba(0,0,0,0.14)',
                              cursor: 'pointer', textAlign: 'left',
                              overflow: 'hidden',
                              minHeight: 36,
                              animation: `chipFloat ${3.5 + ci * 0.10}s ease-in-out ${gi * 0.08 + ci * 0.16}s infinite`,
                              transition: 'box-shadow 0.2s, filter 0.2s',
                              filter: isHovered ? 'brightness(1.04)' : 'none',
                              animationPlayState: (isHovered || isSelected) ? 'paused' : 'running',
                            }}
                          >
                            {/* LED bottom edge */}
                            <div style={{
                              position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                              borderRadius: '0 0 10px 10px',
                              background: `linear-gradient(90deg, transparent, ${palette.led}, transparent)`,
                              opacity: (isHovered || isSelected) ? 1 : 0,
                              transition: 'opacity 0.2s',
                              pointerEvents: 'none',
                            }} />
                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                              {item.emoji}
                            </span>
                            <span style={{
                              flex: 1, fontSize: 11, fontWeight: 400,
                              color: palette.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── Step: Details (danger/warning) ── */}
            {step === 'details' && (
              <>
                {/* Category badge */}
                {catItem && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 12, background: selectedGroup?.bg, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>{catItem.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedGroup?.color }}>{catItem.label}</span>
                  </div>
                )}

                {/* Address — locked, tap to re-place */}
                <button
                  onClick={() => setStep('place')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, minWidth: 0,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left',
                  }}
                >
                  <Lock size={10} color={c.muted} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {newPinCoords
                      ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                      : 'Position actuelle'}
                  </span>
                  <span style={{ fontSize: 9, color: c.accent, fontWeight: 600 }}>Ajuster</span>
                </button>

                {/* Transport section */}
                <SectionLabel>Transport</SectionLabel>
                {transport === null ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setTransport(true)} style={{ flex: 1, padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Oui</button>
                    <button onClick={() => setTransport(false)} style={{ flex: 1, padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Non</button>
                  </div>
                ) : transport ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {trans.map(t => (
                        <button key={t.id} onClick={() => setTType(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 14, background: tType === t.id ? c.sel : c.pill, border: '1.5px solid ' + (tType === t.id ? c.accent : 'transparent'), color: tType === t.id ? c.text : c.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                          {t.e} {t.label}
                        </button>
                      ))}
                    </div>
                    {tType && <input placeholder={trans.find(x => x.id === tType)?.p} value={tLine} onChange={e => setTLine(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 13, outline: 'none' }} />}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: c.pill, fontSize: 11, color: c.muted }}>
                    Pas dans un transport
                    <button onClick={() => setTransport(null)} style={{ background: 'none', border: 'none', color: c.accent, cursor: 'pointer', fontSize: 10, fontWeight: 600, padding: 0 }}>Modifier</button>
                  </div>
                )}

                {/* Timing section */}
                <SectionLabel>Quand</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TIMING_OPTIONS.map(t => {
                    const sel = timing === t.id;
                    return (
                      <button key={t.id} onClick={() => setTiming(t.id)} style={{
                        padding: '7px 12px', borderRadius: 14,
                        background: sel ? c.sel : c.pill,
                        border: `1.5px solid ${sel ? c.accent : 'transparent'}`,
                        color: sel ? c.text : c.muted,
                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 120ms',
                      }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Media section */}
                <SectionLabel>Preuve (optionnel)</SectionLabel>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {([{ id: 'photo' as const, I: Camera, l: 'Photo' }, { id: 'video' as const, I: Video, l: 'Vidéo' }, { id: 'audio' as const, I: Mic, l: 'Audio' }]).map((m) => {
                    const sel = mediaType === m.id;
                    return (
                      <button key={m.id} onClick={() => {
                        if (sel) { setMediaType(null); setMediaFile(null); return; }
                        setMediaType(m.id);
                        setMediaFile(null);
                        if (m.id !== 'audio') setTimeout(() => fileInputRef.current?.click(), 0);
                      }} style={{ flex: 1, padding: '8px 6px', borderRadius: 10, background: sel ? `${c.accent}14` : c.pill, border: `1px solid ${sel ? c.accent : c.border}`, color: sel ? c.accent : c.muted, fontSize: 10, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3, transition: 'all 150ms' }}>
                        <m.I size={16} /> {m.l}
                      </button>
                    );
                  })}
                </div>
                {/* File picker zone */}
                {(mediaType === 'photo' || mediaType === 'video') && (
                  <div style={{ marginBottom: 8 }}>
                    {!mediaFile ? (
                      <div onClick={() => fileInputRef.current?.click()} style={{ border: `1.5px dashed ${c.accent}50`, background: `${c.accent}06`, borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${c.accent}14`, border: `1px solid ${c.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {mediaType === 'photo' ? <Camera size={12} color={c.accent} /> : <Video size={12} color={c.accent} />}
                        </div>
                        <span style={{ fontSize: 11, color: c.muted }}>Choisir un fichier</span>
                      </div>
                    ) : (
                      <div style={{ borderRadius: 10, background: c.pill, border: `1px solid ${c.border}`, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {mediaType === 'photo' ? <Camera size={12} color={c.accent} /> : <Video size={12} color={c.accent} />}
                        <span style={{ fontSize: 11, color: c.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaFile.name}</span>
                        <button onClick={() => setMediaFile(null)} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={9} /></button>
                      </div>
                    )}
                  </div>
                )}
                {mediaType === 'audio' && (
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: `${c.accent}10`, border: `1px solid ${c.accent}30` }}>
                    <Mic size={12} color={c.accent} />
                    <span style={{ fontSize: 11, color: c.accent, flex: 1 }}>Audio attaché</span>
                    <button onClick={() => setMediaType(null)} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={9} /></button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setMediaFile(e.target.files?.[0] ?? null)} />

                {/* Description */}
                <textarea placeholder="Description (optionnel)..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 13, outline: 'none', resize: 'none' as const, marginTop: 6 }} />

                {/* CTA */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newPinCoords || !cat}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 14, marginTop: 14,
                    background: isSubmitting ? c.pill : ctaColor,
                    border: 'none',
                    color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    animation: !isSubmitting ? 'confirmCTAPulse 2s ease-in-out infinite' : 'none',
                    transition: 'background 200ms',
                  }}
                >
                  {isSubmitting ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Envoi...</>
                  ) : (
                    <>Signaler · {catItem?.label}</>
                  )}
                </button>
              </>
            )}

            {/* ── Step: Positif details ── */}
            {step === 'details-positive' && (
              <>
                {/* Address — locked */}
                <button
                  onClick={() => setStep('place')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, minWidth: 0,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left',
                  }}
                >
                  <Lock size={10} color={c.muted} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>
                    {newPinCoords
                      ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                      : 'Position actuelle'}
                  </span>
                  <span style={{ fontSize: 9, color: c.accent, fontWeight: 600 }}>Ajuster</span>
                </button>

                {/* Establishment type */}
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.muted, marginBottom: 8 }}>
                  Type d&apos;établissement
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {([
                    { id: 'cafe', emoji: '☕', label: 'Café / bar' },
                    { id: 'pharma', emoji: '💊', label: 'Pharmacie' },
                    { id: 'police', emoji: '🚓', label: 'Commissariat' },
                    { id: 'hotel', emoji: '🏨', label: 'Hôtel / lobby' },
                    { id: 'transport', emoji: '🚇', label: 'Station metro/bus' },
                    { id: 'other', emoji: '📍', label: 'Autre lieu sûr' },
                  ]).map((et) => {
                    const isSel = establishmentType === et.id;
                    return (
                      <button
                        key={et.id}
                        onClick={() => setEstablishmentType(isSel ? null : et.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', borderRadius: 12,
                          background: isSel
                            ? 'rgba(52,211,153,0.10)'
                            : (isDark ? '#334155' : '#F8FAFC'),
                          border: `1.5px solid ${isSel ? 'rgba(52,211,153,0.35)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)')}`,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{et.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isSel ? '#34D399' : c.text }}>{et.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Note */}
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.muted, marginBottom: 6 }}>
                  Note (facultatif)
                </p>
                <textarea
                  placeholder="Ex: ouvert 24h/7j, personnel accueillant..."
                  value={positifNote}
                  onChange={(e) => setPositifNote(e.target.value)}
                  maxLength={120}
                  rows={2}
                  style={{
                    width: '100%', padding: 10, borderRadius: 10,
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
                    border: `1px solid ${c.border}`,
                    color: c.text, fontSize: 13, outline: 'none', resize: 'none' as const,
                    marginBottom: 12,
                  }}
                />

                {/* Callout */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(52,211,153,0.06)',
                  border: '1px solid rgba(52,211,153,0.15)',
                  marginBottom: 14,
                }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{'✅'}</span>
                  <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>
                    Visible immédiatement — pas de validation requise
                  </span>
                </div>

                {/* CTA */}
                <button
                  disabled={!establishmentType || isSubmitting}
                  onClick={async () => {
                    if (!newPinCoords || !cat || !establishmentType) return;
                    setIsSubmitting(true);
                    try {
                      const newPin = {
                        user_id: userId,
                        lat: newPinCoords.lat,
                        lng: newPinCoords.lng,
                        category: cat,
                        severity: 'low' as const,
                        description: positifNote || null,
                        is_transport: false,
                        transport_type: null,
                        transport_line: null,
                        confirmations: 1,
                        decay_type: 'positive' as const,
                        address: address || null,
                        last_confirmed_at: new Date().toISOString(),
                        urban_context_custom: JSON.stringify({ establishment_type: establishmentType }),
                      };
                      const { data, error } = await supabase.from('pins').insert(newPin).select().single();
                      if (error) throw error;
                      if (data) addPin(data);
                      setMapFlyTo({ lat: newPinCoords.lat, lng: newPinCoords.lng, zoom: 16 });
                      toast.success('Lieu positif ajouté !', {
                        description: `${catItem?.emoji} ${catItem?.label} — visible immédiatement`,
                        duration: 3000,
                      });
                      handleClose();
                    } catch {
                      // submission failed silently
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    background: establishmentType ? '#34D399' : (isDark ? '#334155' : '#CBD5E1'),
                    border: 'none',
                    color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                    cursor: establishmentType && !isSubmitting ? 'pointer' : 'default',
                    opacity: establishmentType ? 1 : 0.4,
                    transition: 'all 150ms',
                  }}
                >
                  {isSubmitting ? 'Envoi...' : 'Publier ce lieu ✓'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ReportSheet;
