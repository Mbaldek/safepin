'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Camera, Video, Mic, ChevronLeft, ArrowRight } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { CATEGORY_GROUPS, CATEGORY_DETAILS, TRANSPORT_TYPES } from '@/types';
import { getDecayType } from '@/lib/pin-utils';
import { springTransition } from '@/lib/tokens';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  card: '#1E293B',
  text: '#FFFFFF',
  muted: '#94A3B8',
  border: 'rgba(255,255,255,0.1)',
  pill: 'rgba(255,255,255,0.06)',
  accent: '#3BB4C1',
  sel: 'rgba(59,180,193,0.25)',
  gold: '#F5C341',
} as const;

const STEP_TITLES = ['', 'Signaler', 'Transport', 'Détails', 'Envoyé'];

// ─── Component ────────────────────────────────────────────────────────────────
export function ReportSheet() {
  const {
    activeSheet, setActiveSheet,
    newPinCoords, userId,
    reportStep, setReportStep,
    reportCategory, setReportCategory,
    reportTransport, setReportTransport,
    resetReport, addPin,
  } = useStore();

  const [description, setDescription] = useState('');
  const [media, setMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (activeSheet !== 'report') return null;

  const selectedCat = reportCategory ? CATEGORY_DETAILS[reportCategory] : null;
  const selectedGroup = selectedCat ? CATEGORY_GROUPS[selectedCat.group] : null;

  const canNext = () => {
    if (reportStep === 1) return !!reportCategory;
    if (reportStep === 2) return reportTransport.isTransport !== null;
    return true;
  };

  const handleBack = () => {
    if (reportStep > 1) setReportStep(reportStep - 1);
    else handleClose();
  };

  const handleNext = () => {
    if (reportStep === 3) {
      handleSubmit();
      return;
    }
    if (reportStep < 3 && canNext()) {
      setReportStep(reportStep + 1);
    }
  };

  const handleClose = () => {
    setActiveSheet('none');
    resetReport();
    setDescription('');
    setMedia(false);
  };

  const handleSubmit = async () => {
    if (!newPinCoords || !reportCategory) return;

    setIsSubmitting(true);
    try {
      const newPin = {
        user_id: userId,
        lat: newPinCoords.lat,
        lng: newPinCoords.lng,
        category: reportCategory,
        severity:
          selectedGroup?.id === 'urgent' ? 'high'
          : selectedGroup?.id === 'warning' ? 'med'
          : 'low',
        description: description || null,
        media_url: null,
        is_transport: reportTransport.isTransport ?? false,
        transport_type: reportTransport.type,
        transport_line: reportTransport.line || null,
        confirmations: 1,
        decay_type: getDecayType(reportCategory),
      };

      const { data, error } = await supabase.from('pins').insert(newPin).select().single();
      if (error) throw error;
      if (data) addPin(data);

      setReportStep(4);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={springTransition}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: C.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -2px 20px rgba(0,0,0,0.15)',
        zIndex: 201,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={reportStep > 1 && reportStep < 4 ? handleBack : handleClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: C.pill,
            border: 'none',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {reportStep > 1 && reportStep < 4 ? <ChevronLeft size={18} /> : <X size={18} />}
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
            {STEP_TITLES[reportStep]}
          </span>
        </div>

        {reportStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canNext() || isSubmitting}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: canNext() && !isSubmitting ? C.gold : C.pill,
              border: 'none',
              color: canNext() && !isSubmitting ? '#1A1A2E' : C.muted,
              cursor: canNext() && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canNext() && !isSubmitting ? 1 : 0.4,
            }}
          >
            <ArrowRight size={16} />
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '10px 14px 24px', maxHeight: '42vh', overflowY: 'auto' }}>

        {/* ── Step 1: Category Chips ── */}
        {reportStep === 1 && (
          <>
            {Object.entries(CATEGORY_GROUPS).map(([groupId, group]) => (
              <div key={groupId} style={{ marginBottom: 10 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: group.color.text,
                    marginBottom: 6,
                    letterSpacing: '0.05em',
                  }}
                >
                  {group.label}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.items.map((catId) => {
                    const cat = CATEGORY_DETAILS[catId];
                    const isSelected = reportCategory === catId;
                    return (
                      <button
                        key={catId}
                        onClick={() => setReportCategory(catId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 10px',
                          borderRadius: 14,
                          background: isSelected ? C.sel : group.color.bg,
                          border: `1.5px solid ${isSelected ? C.accent : 'transparent'}`,
                          color: isSelected ? C.text : group.color.text,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                        {cat.label}
                        {isSelected && <Check size={12} color={C.accent} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Step 2: Transport ── */}
        {reportStep === 2 && (
          <>
            {selectedCat && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 14,
                  background: selectedGroup?.color.bg,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 14 }}>{selectedCat.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: selectedGroup?.color.text }}>
                  {selectedCat.label}
                </span>
              </div>
            )}

            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>
              Dans un transport ?
            </p>

            {reportTransport.isTransport === null && (
              <div style={{ display: 'flex', gap: 10 }}>
                {(['Oui', 'Non'] as const).map((label) => (
                  <button
                    key={label}
                    onClick={() => setReportTransport({ isTransport: label === 'Oui' })}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      background: C.pill,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {reportTransport.isTransport === true && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {TRANSPORT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setReportTransport({ type: t.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '9px 14px',
                        borderRadius: 18,
                        background: reportTransport.type === t.id ? C.sel : C.pill,
                        border: `1.5px solid ${reportTransport.type === t.id ? C.accent : 'transparent'}`,
                        color: reportTransport.type === t.id ? C.text : C.muted,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>

                {reportTransport.type && (
                  <input
                    placeholder={TRANSPORT_TYPES.find((x) => x.id === reportTransport.type)?.placeholder}
                    value={reportTransport.line}
                    onChange={(e) => setReportTransport({ line: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 10,
                      background: C.pill,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                )}
              </>
            )}

            {reportTransport.isTransport === false && (
              <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
                Appuie sur → pour continuer
              </p>
            )}
          </>
        )}

        {/* ── Step 3: Details ── */}
        {reportStep === 3 && (
          <>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Optionnel</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {([
                { Icon: Camera, label: 'Photo' },
                { Icon: Video, label: 'Vidéo' },
                { Icon: Mic, label: 'Audio' },
              ] as const).map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMedia(true)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    background: C.pill,
                    border: `1px solid ${C.border}`,
                    color: C.muted,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <m.Icon size={18} />
                  {m.label}
                </button>
              ))}
            </div>

            {media && (
              <div style={{ position: 'relative', marginBottom: 10, borderRadius: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    width: '100%',
                    height: 70,
                    background: C.pill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  📷
                </div>
                <button
                  onClick={() => setMedia(false)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <textarea
              placeholder="Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 10,
                background: C.pill,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 13,
                outline: 'none',
                resize: 'none',
              }}
            />
          </>
        )}

        {/* ── Step 4: Success ── */}
        {reportStep === 4 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(52,211,153,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Check size={26} color="#34D399" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 500, color: C.text, marginBottom: 6 }}>
              Merci !
            </h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              Ton signalement aide la communauté.
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '12px 28px',
                borderRadius: 22,
                background: C.accent,
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
