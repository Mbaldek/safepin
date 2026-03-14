'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Video, Mic, MapPin, ChevronLeft, Loader2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useIsDark } from '@/hooks/useIsDark';
import { supabase } from '@/lib/supabase';

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

const CHIP_PALETTE: Record<string, { bg: string; text: string; led: string; hex: string }> = {
  // DANGER — blush/peach
  assault:    { bg: 'linear-gradient(145deg,#FFCCC4,#FFB5A7)', text: '#6B2C24', led: 'rgba(200,80,70,0.45)',   hex: 'FFB5A7' },
  harassment: { bg: 'linear-gradient(145deg,#FDE4DF,#FCD5CE)', text: '#703030', led: 'rgba(205,100,90,0.40)',  hex: 'FCD5CE' },
  theft:      { bg: 'linear-gradient(145deg,#FCE9D8,#F9DCC4)', text: '#6B3A1A', led: 'rgba(200,130,70,0.40)', hex: 'F9DCC4' },
  following:  { bg: 'linear-gradient(145deg,#FBF3F1,#F8EDEB)', text: '#6A3030', led: 'rgba(195,100,95,0.35)', hex: 'F8EDEB' },
  // ATTENTION — sand/taupe/warm
  suspect:    { bg: 'linear-gradient(145deg,#E8EBE6,#DADDD8)', text: '#4A4A3E', led: 'rgba(160,155,130,0.42)', hex: 'DADDD8' },
  group:      { bg: 'linear-gradient(145deg,#FFDAB8,#FEC89A)', text: '#6B4410', led: 'rgba(200,150,60,0.42)',  hex: 'FEC89A' },
  unsafe:     { bg: 'linear-gradient(145deg,#F3F2EC,#ECEBE4)', text: '#4E4C3E', led: 'rgba(165,158,130,0.38)', hex: 'ECEBE4' },
  lighting:   { bg: 'linear-gradient(145deg,#FCE9D6,#F9DCC4)', text: '#684015', led: 'rgba(195,135,70,0.38)', hex: 'F9DCC4' },
  blocked:    { bg: 'linear-gradient(145deg,#F5F6F8,#EEF0F2)', text: '#404855', led: 'rgba(140,150,168,0.38)', hex: 'EEF0F2' },
  closed:     { bg: 'linear-gradient(145deg,#FFFFFF,#FAFAFF)', text: '#404450', led: 'rgba(140,148,175,0.35)', hex: 'FAFAFF' },
  // POSITIF — mint/sage/teal
  safe:       { bg: 'linear-gradient(145deg,#D8EFEC,#C8E8E4)', text: '#1E5C55', led: 'rgba(80,178,165,0.42)',  hex: 'C8E8E4' },
  help:       { bg: 'linear-gradient(145deg,#C6E4E6,#B0D7D8)', text: '#1A5258', led: 'rgba(70,168,175,0.42)',  hex: 'B0D7D8' },
  presence:   { bg: 'linear-gradient(145deg,#7A8F8F,#6A7E7E)', text: '#E8F2F2', led: 'rgba(150,200,200,0.45)', hex: '6A7E7E' },
};

const allItems = groups.flatMap(g => g.items);

// Steps: 1 = category, 2 = details (merged transport+media+desc), '2b' = positive, 3 = success
type Step = 1 | 2 | '2b' | 3;

export function ReportSheet() {
  const isDark = useIsDark();
  const C = getColors(isDark);
  const { activeSheet, setActiveSheet, newPinCoords, userId, addPin, setMapFlyTo } = useStore();

  const [step, setStep] = useState<Step>(1);
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
    if (step === '2b' || step === 2) { setStep(1); setTransport(null); setTType(null); setTLine(''); }
  };

  const reset = () => {
    setStep(1);
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
    if (!newPinCoords || !cat) return;
    setIsSubmitting(true);

    try {
      const severity = selectedGroup?.id === 'urgent' ? 'high'
        : selectedGroup?.id === 'warning' ? 'med' : 'low';
      const decayType = selectedGroup?.id === 'positive' ? 'positive' : 'people';

      // Build timing context for description
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
        // Upload media + save to pin_evidence
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

      setStep(3);
      setTimeout(handleClose, 2000);
    } catch (error) {
      console.error('[ReportSheet] Erreur envoi:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBackdrop = step !== 1;
  const ctaColor = selectedGroup?.color ?? FIXED.accentCyan;

  // Section label helper
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.muted, marginBottom: 6, marginTop: 14 }}>
      {children}
    </p>
  );

  return (
    <AnimatePresence>
      {/* Backdrop blur for steps 2/2b/3 */}
      {showBackdrop && (
        <motion.div
          key="report-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 301,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={handleClose}
        />
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 302, display: 'flex', justifyContent: 'center', pointerEvents: 'none', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="sheet-glow sheet-highlight"
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 420,
          pointerEvents: 'auto',
          background: isDark ? 'rgba(30,41,59,0.88)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        {step !== 3 && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid ' + c.border }}>
            <button onClick={step === 1 ? handleClose : back} style={{ width: 32, height: 32, borderRadius: '50%', background: c.pill, border: 'none', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {step === 1 ? <X size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                {step === 1 ? 'Signaler' : step === '2b' ? 'Lieu positif' : 'Détails'}
              </span>
            </div>
            <div style={{ width: 32 }} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: step === 3 ? '14px 14px 20px' : '10px 14px 16px', maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Step 1: Category grid */}
          {step === 1 && (
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
                          onClick={() => { setCat(item.value); setStep(['safe','help','presence'].includes(item.value) ? '2b' : 2); }}
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
                          {/* Hex watermark */}
                          <span style={{
                            position: 'absolute', right: 6, bottom: 3,
                            fontSize: 8, fontWeight: 500, letterSpacing: '0.05em',
                            color: palette.text, opacity: isHovered ? 0.50 : 0.22,
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'opacity 0.2s',
                            pointerEvents: 'none',
                            textTransform: 'uppercase',
                          }}>
                            {palette.hex}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Step 2: Merged Details (transport + timing + media + description + CTA) */}
          {step === 2 && (
            <>
              {/* Category badge */}
              {catItem && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 12, background: selectedGroup?.bg, marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>{catItem.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedGroup?.color }}>{catItem.label}</span>
                </div>
              )}

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, minWidth: 0 }}>
                <MapPin size={12} color={c.muted} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newPinCoords
                    ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                    : 'Position actuelle'}
                </span>
              </div>

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

          {/* Step 2b: Positif funnel */}
          {step === '2b' && (
            <>
              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, minWidth: 0 }}>
                <MapPin size={13} color={c.muted} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {newPinCoords
                    ? (address ?? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}`)
                    : 'Position actuelle'}
                </span>
              </div>

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
                    setStep(3);
                    setTimeout(handleClose, 2000);
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

          {/* Step 3: Success */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ textAlign: 'center', padding: '12px 0' }}
            >
              {/* Animated check with ripple */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                  position: 'relative',
                }}
              >
                <Check size={28} color="#34D399" />
                <div style={{
                  position: 'absolute', inset: -8, borderRadius: '50%',
                  border: '2px solid rgba(52,211,153,0.20)',
                  animation: 'pin-ripple 1.5s ease-out forwards',
                }} />
              </motion.div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>
                Signalement envoyé !
              </h3>
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>
                Visible par la communauté autour de toi
              </p>

              {/* Mini recap card */}
              {catItem && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 12,
                  background: selectedGroup?.bg,
                  border: `1px solid ${selectedGroup?.color}30`,
                }}>
                  <span style={{ fontSize: 14 }}>{catItem.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedGroup?.color }}>{catItem.label}</span>
                  {address && (
                    <>
                      <span style={{ fontSize: 10, color: c.muted }}>·</span>
                      <span style={{ fontSize: 10, color: c.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
                    </>
                  )}
                </div>
              )}

              {/* Engagement hint */}
              <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 12 }}>
                Tu recevras une notification quand quelqu&apos;un confirme
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ReportSheet;
