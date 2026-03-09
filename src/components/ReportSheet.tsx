'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Video, Mic, MapPin, ChevronLeft, ArrowRight } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';

const groups = [
  {
    id: 'urgent',
    label: 'URGENT',
    color: { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    items: [
      { id: 'assault', emoji: '🚨', label: 'Agression' },
      { id: 'harassment', emoji: '🚫', label: 'Harcèlement' },
      { id: 'theft', emoji: '👜', label: 'Vol' },
      { id: 'following', emoji: '👤', label: 'Filature' },
    ]
  },
  {
    id: 'warning',
    label: 'ATTENTION',
    color: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    items: [
      { id: 'suspect', emoji: '👁️', label: 'Suspect' },
      { id: 'group', emoji: '👥', label: 'Attroupement' },
      { id: 'unsafe', emoji: '⚠️', label: 'Zone à éviter' },
    ]
  },
  {
    id: 'infra',
    label: 'INFRASTRUCTURE',
    color: { text: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    items: [
      { id: 'lighting', emoji: '💡', label: 'Mal éclairé' },
      { id: 'blocked', emoji: '🚧', label: 'Passage difficile' },
      { id: 'closed', emoji: '🚷', label: 'Fermé' },
    ]
  },
  {
    id: 'positive',
    label: 'POSITIF',
    color: { text: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    items: [
      { id: 'safe', emoji: '💚', label: 'Lieu sûr' },
      { id: 'help', emoji: '🙋', label: 'Aide reçue' },
      { id: 'presence', emoji: '👮', label: 'Sécurité' },
    ]
  },
];

const trans = [
  { id: 'metro', e: '🚇', label: 'Métro', p: 'Ligne (4, 11...)' },
  { id: 'rer', e: '🚆', label: 'RER', p: 'Ligne (A, B...)' },
  { id: 'bus', e: '🚌', label: 'Bus', p: 'N° (72, 91...)' },
  { id: 'tram', e: '🚊', label: 'Tram', p: 'Ligne' },
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

interface CategoryItem {
  id: string;
  emoji: string;
  label: string;
}

export function ReportSheet() {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { activeSheet, setActiveSheet, newPinCoords, userId, addPin, setMapFlyTo } = useStore();

  const [step, setStep] = useState<number | '2b'>(1);
  const [cat, setCat] = useState<CategoryItem | null>(null);
  const [transport, setTransport] = useState<boolean | null>(null);
  const [tType, setTType] = useState<string | null>(null);
  const [tLine, setTLine] = useState('');
  const [desc, setDesc] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const selectedGroup = cat ? groups.find(g => g.items.some(i => i.id === cat.id)) : null;

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

  const canNext = cat !== null;
  const next = () => {
    if (step === 1 && canNext) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) handleSubmit();
  };
  const back = () => {
    if (step === '2b') setStep(1);
    else if (typeof step === 'number' && step > 1) setStep(step - 1);
  };

  const reset = () => {
    setStep(1);
    setCat(null);
    setTransport(null);
    setTType(null);
    setTLine('');
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
      const decayType = selectedGroup?.id === 'infra' ? 'infra'
        : selectedGroup?.id === 'positive' ? 'positive' : 'people';

      const newPin = {
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: cat.id,
        severity,
        description: desc || null,
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

      setStep(4);
      setTimeout(handleClose, 1500);
    } catch (error) {
      console.error('[ReportSheet] Erreur envoi:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, zIndex: 301, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: '100%',
          maxWidth: 480,
          pointerEvents: 'auto',
          background: c.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -2px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid ' + c.border }}>
          <button onClick={step === 1 ? handleClose : back} style={{ width: 32, height: 32, borderRadius: '50%', background: c.pill, border: 'none', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {step === 1 ? <X size={18} /> : <ChevronLeft size={18} />}
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
              {step === 1 ? 'Signaler' : step === '2b' ? 'Lieu positif' : step === 2 ? 'Transport' : step === 3 ? 'Validation' : 'Envoyé'}
            </span>
          </div>
          {step === 2 ? (
            <button onClick={next} style={{ width: 32, height: 32, borderRadius: '50%', background: c.gold, border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={16} />
            </button>
          ) : step === 3 ? (
            <button onClick={handleSubmit} disabled={isSubmitting || !newPinCoords || !cat} style={{ width: 32, height: 32, borderRadius: '50%', background: '#34D399', border: 'none', color: '#FFFFFF', cursor: (isSubmitting || !newPinCoords || !cat) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (isSubmitting || !newPinCoords || !cat) ? 0.4 : 1 }}>
              <Check size={16} />
            </button>
          ) : step === '2b' ? (
            <div style={{ width: 32 }} />
          ) : <div style={{ width: 32 }} />}
        </div>

        {/* Content */}
        <div style={{ padding: '10px 14px 24px', maxHeight: '60vh', overflowY: 'auto' }}>

          {/* Step 1: Chips */}
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

              {groups.map(group => (
                <div key={group.id} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: group.color.text, marginBottom: 6, letterSpacing: '0.05em' }}>
                    {group.label}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.items.map(item => {
                      const isSelected = cat?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setCat(item); setStep(['safe','help','presence'].includes(item.id) ? '2b' : 2); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            borderRadius: 14,
                            background: isSelected ? c.sel : group.color.bg,
                            border: '1.5px solid ' + (isSelected ? c.accent : 'transparent'),
                            color: isSelected ? c.text : group.color.text,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{item.emoji}</span>
                          {item.label}
                          {isSelected && <Check size={12} color={c.accent} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Step 2: Transport */}
          {step === 2 && (
            <>
              {cat && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 14, background: selectedGroup?.color.bg, marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: selectedGroup?.color.text }}>{cat.label}</span>
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 12 }}>Dans un transport ?</p>

              {transport === null && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTransport(true)} style={{ flex: 1, padding: 14, borderRadius: 12, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Oui</button>
                  <button onClick={() => { setTransport(false); setStep(3); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Non</button>
                </div>
              )}

              {transport === true && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {trans.map(t => (
                      <button key={t.id} onClick={() => setTType(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 18, background: tType === t.id ? c.sel : c.pill, border: '1.5px solid ' + (tType === t.id ? c.accent : 'transparent'), color: tType === t.id ? c.text : c.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        {t.e} {t.label}
                      </button>
                    ))}
                  </div>
                  {tType && <input placeholder={trans.find(x => x.id === tType)?.p} value={tLine} onChange={e => setTLine(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 16, outline: 'none' }} />}
                </>
              )}

              {/* transport === false auto-advances to step 3 */}
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
                  { id: 'cafe', emoji: '\u2615', label: 'Café / bar' },
                  { id: 'pharma', emoji: '\uD83D\uDC8A', label: 'Pharmacie' },
                  { id: 'police', emoji: '\uD83D\uDE94', label: 'Commissariat' },
                  { id: 'hotel', emoji: '\uD83C\uDFE8', label: 'Hôtel / lobby' },
                  { id: 'transport', emoji: '\uD83D\uDE87', label: 'Station metro/bus' },
                  { id: 'other', emoji: '\uD83D\uDCCD', label: 'Autre lieu sûr' },
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
                  color: c.text, fontSize: 16, outline: 'none', resize: 'none' as const,
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
                <span style={{ fontSize: 13, flexShrink: 0 }}>{'\u2705'}</span>
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
                      category: cat.id,
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
                    setStep(4);
                    setTimeout(handleClose, 1500);
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
                {isSubmitting ? 'Envoi...' : 'Publier ce lieu \u2713'}
              </button>
            </>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Optionnel</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {([{ id: 'photo' as const, I: Camera, l: 'Photo' }, { id: 'video' as const, I: Video, l: 'Vidéo' }, { id: 'audio' as const, I: Mic, l: 'Audio' }]).map((m) => {
                  const sel = mediaType === m.id;
                  return (
                    <button key={m.id} onClick={() => {
                      if (sel) { setMediaType(null); setMediaFile(null); return; }
                      setMediaType(m.id);
                      setMediaFile(null);
                      if (m.id !== 'audio') setTimeout(() => fileInputRef.current?.click(), 0);
                    }} style={{ flex: 1, padding: 12, borderRadius: 10, background: sel ? `${c.accent}14` : c.pill, border: `1px solid ${sel ? c.accent : c.border}`, color: sel ? c.accent : c.muted, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 5, transition: 'all 150ms' }}>
                      <m.I size={18} /> {m.l}
                    </button>
                  );
                })}
              </div>
              {/* File picker zone for photo/video */}
              {(mediaType === 'photo' || mediaType === 'video') && (
                <div style={{ marginBottom: 10 }}>
                  {!mediaFile ? (
                    <div onClick={() => fileInputRef.current?.click()} style={{ border: `1.5px dashed ${c.accent}50`, background: `${c.accent}06`, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.accent}14`, border: `1px solid ${c.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {mediaType === 'photo' ? <Camera size={14} color={c.accent} /> : <Video size={14} color={c.accent} />}
                      </div>
                      <span style={{ fontSize: 12, color: c.muted }}>Appuyer pour choisir un fichier</span>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: c.pill, border: `1px solid ${c.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {mediaType === 'photo' ? <Camera size={14} color={c.accent} /> : <Video size={14} color={c.accent} />}
                      <span style={{ fontSize: 12, color: c.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaFile.name}</span>
                      <button onClick={() => setMediaFile(null)} style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={10} /></button>
                    </div>
                  )}
                </div>
              )}
              {/* Audio badge */}
              {mediaType === 'audio' && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: `${c.accent}10`, border: `1px solid ${c.accent}30` }}>
                  <Mic size={14} color={c.accent} />
                  <span style={{ fontSize: 12, color: c.accent, flex: 1 }}>Audio attaché</span>
                  <button onClick={() => setMediaType(null)} style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
                </div>
              )}
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setMediaFile(e.target.files?.[0] ?? null)} />
              <textarea placeholder="Description..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 16, outline: 'none', resize: 'none' }} />
            </>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={26} color="#34D399" />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 6 }}>Merci !</h3>
              <p style={{ fontSize: 13, color: c.muted }}>Ton signalement aide la communauté.</p>
            </div>
          )}
        </div>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ReportSheet;
