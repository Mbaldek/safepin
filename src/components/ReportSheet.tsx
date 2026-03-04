'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Camera, Video, Mic, MapPin, ChevronLeft, ArrowRight } from 'lucide-react';
import { useStore } from '@/stores/useStore';
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

interface CategoryItem {
  id: string;
  emoji: string;
  label: string;
}

export function ReportSheet() {
  const { activeSheet, setActiveSheet, newPinCoords, userId, addPin } = useStore();

  const [step, setStep] = useState(1);
  const [cat, setCat] = useState<CategoryItem | null>(null);
  const [transport, setTransport] = useState<boolean | null>(null);
  const [tType, setTType] = useState<string | null>(null);
  const [tLine, setTLine] = useState('');
  const [desc, setDesc] = useState('');
  const [media, setMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeSheet !== 'report') return null;

  const selectedGroup = cat ? groups.find(g => g.items.some(i => i.id === cat.id)) : null;

  const c = {
    bg: '#0F172A',
    card: '#1E293B',
    text: '#FFFFFF',
    muted: '#94A3B8',
    border: 'rgba(255,255,255,0.1)',
    pill: 'rgba(255,255,255,0.06)',
    accent: '#3BB4C1',
    sel: 'rgba(59,180,193,0.25)',
    gold: '#3BB4C1',
  };

  const canNext = cat !== null;
  const next = () => {
    if (step === 1 && canNext) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) handleSubmit();
  };
  const back = () => step > 1 && setStep(step - 1);

  const reset = () => {
    setStep(1);
    setCat(null);
    setTransport(null);
    setTType(null);
    setTLine('');
    setDesc('');
    setMedia(false);
  };

  const handleClose = () => {
    setActiveSheet('none');
    reset();
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
      };

      const { data, error } = await supabase.from('pins').insert(newPin).select().single();
      if (error) throw error;
      if (data) addPin(data);

      setStep(4);
      setTimeout(handleClose, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: c.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -2px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid ' + c.border }}>
          <button onClick={step > 1 ? back : handleClose} style={{ width: 32, height: 32, borderRadius: '50%', background: c.pill, border: 'none', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {step > 1 ? <ChevronLeft size={18} /> : <X size={18} />}
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
              {step === 1 ? 'Signaler' : step === 2 ? 'Transport' : step === 3 ? 'Détails' : 'Envoyé'}
            </span>
          </div>
          {step < 4 ? (
            <button onClick={next} disabled={step === 1 && !canNext} style={{ width: 32, height: 32, borderRadius: '50%', background: (step === 1 && !canNext) ? c.pill : c.gold, border: 'none', color: (step === 1 && !canNext) ? c.muted : '#1A1A2E', cursor: (step === 1 && !canNext) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (step === 1 && !canNext) ? 0.4 : 1 }}>
              <ArrowRight size={16} />
            </button>
          ) : <div style={{ width: 32 }} />}
        </div>

        {/* Content */}
        <div style={{ padding: '10px 14px 24px', maxHeight: '50vh', overflowY: 'auto' }}>

          {/* Step 1: Chips */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MapPin size={13} color={c.muted} />
                <span style={{ fontSize: 12, color: c.muted }}>
                  {newPinCoords ? `${newPinCoords.lat.toFixed(4)}, ${newPinCoords.lng.toFixed(4)}` : 'Position actuelle'}
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
                          onClick={() => setCat(item)}
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
              <p style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 12 }}>Dans un transport ?</p>

              {transport === null && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTransport(true)} style={{ flex: 1, padding: 14, borderRadius: 12, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Oui</button>
                  <button onClick={() => setTransport(false)} style={{ flex: 1, padding: 14, borderRadius: 12, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Non</button>
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
                  {tType && <input placeholder={trans.find(x => x.id === tType)?.p} value={tLine} onChange={e => setTLine(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 14, outline: 'none' }} />}
                </>
              )}

              {transport === false && <p style={{ fontSize: 13, color: c.muted, marginTop: 8 }}>Appuie sur → pour continuer</p>}
            </>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>Optionnel</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[{ I: Camera, l: 'Photo' }, { I: Video, l: 'Vidéo' }, { I: Mic, l: 'Audio' }].map((m, i) => (
                  <button key={i} onClick={() => setMedia(true)} style={{ flex: 1, padding: 12, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.muted, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 5 }}>
                    <m.I size={18} /> {m.l}
                  </button>
                ))}
              </div>
              {media && (
                <div style={{ position: 'relative', marginBottom: 10, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: 70, background: c.pill, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
                  <button onClick={() => setMedia(false)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                </div>
              )}
              <textarea placeholder="Description..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ width: '100%', padding: 10, borderRadius: 10, background: c.pill, border: '1px solid ' + c.border, color: c.text, fontSize: 13, outline: 'none', resize: 'none' }} />
            </>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={26} color="#34D399" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 500, color: c.text, marginBottom: 6 }}>Merci !</h3>
              <p style={{ fontSize: 13, color: c.muted }}>Ton signalement aide la communauté.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ReportSheet;
