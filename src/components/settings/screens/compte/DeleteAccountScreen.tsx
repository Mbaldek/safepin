// src/components/settings/screens/compte/DeleteAccountScreen.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, FileX, Users, MapPin, Ban } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { springTransition, fadeSlideUp } from './types';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', sheet: '#1A2540', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.13)',
    inputBg: 'rgba(255,255,255,0.06)', hover: 'rgba(255,255,255,0.05)',
  } : {
    bg: '#F8FAFC', sheet: '#FFFFFF', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)', borderMid: 'rgba(15,23,42,0.12)',
    inputBg: 'rgba(15,23,42,0.04)', hover: 'rgba(15,23,42,0.03)',
  };
}

const F = {
  cyan: '#3BB4C1', cyanSoft: 'rgba(59,180,193,0.12)',
  gold: '#F5C341',
  success: '#34D399', successSoft: 'rgba(52,211,153,0.12)',
  danger: '#EF4444', dangerSoft: 'rgba(239,68,68,0.10)',
  purple: '#A78BFA', purpleSoft: 'rgba(167,139,250,0.12)',
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const BULLETS: { icon: typeof FileX; label: string }[] = [
  { icon: FileX, label: 'Tous vos signalements seront supprimés' },
  { icon: Users, label: 'Votre cercle de confiance sera dissous' },
  { icon: MapPin, label: 'Vos trajets et données de localisation seront effacés' },
  { icon: Ban, label: 'Cette action est définitive et irréversible' },
];

interface DeleteAccountScreenProps {
  onBack: () => void;
}

export default function DeleteAccountScreen({ onBack }: DeleteAccountScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [step, setStep] = useState<1 | 2>(1);
  const [understood, setUnderstood] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmMatch = confirmValue === 'SUPPRIMER';
  const confirmBorderColor = confirmValue.length === 0
    ? C.borderMid
    : confirmMatch
      ? F.success
      : F.danger;

  async function handleDelete() {
    if (!confirmMatch || deleting) return;
    setDeleting(true);

    const { error } = await supabase.rpc('delete_account');
    if (error) {
      console.error('[delete_account]', error);
      toast.error('Échec de la suppression. Réessayez ou contactez le support.');
      setDeleting(false);
      return;
    }

    // Clear all client-side state
    localStorage.clear();
    document.cookie = 'ob_done=;path=/;max-age=0';

    toast.success('Compte supprimé');
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 12px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: C.elevated,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color={C.t2} />
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Supprimer mon compte</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
            >
              <motion.div
                variants={stagger}
                initial="initial"
                animate="animate"
              >
                {/* Warning card */}
                <motion.div
                  variants={fadeSlideUp}
                  transition={springTransition}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: F.dangerSoft,
                    border: '1px solid rgba(239,68,68,0.20)',
                    marginBottom: 20,
                  }}
                >
                  <AlertTriangle size={20} color={F.danger} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: F.danger }}>
                      Action irréversible
                    </div>
                    <div style={{ fontSize: 12, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>
                      Conformément au RGPD, toutes vos données seront définitivement effacées sous 30 jours.
                    </div>
                  </div>
                </motion.div>

                {/* Bullets */}
                {BULLETS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={b.label}
                      variants={fadeSlideUp}
                      transition={springTransition}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: F.dangerSoft,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Icon size={15} color={F.danger} />
                      </div>
                      <span style={{ fontSize: 13, color: C.t2, lineHeight: 1.4 }}>{b.label}</span>
                    </motion.div>
                  );
                })}

                {/* Checkbox */}
                <motion.div
                  variants={fadeSlideUp}
                  transition={springTransition}
                  style={{ marginTop: 20 }}
                >
                  <button
                    onClick={() => setUnderstood(!understood)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: understood ? F.dangerSoft : 'transparent',
                      border: `1.5px solid ${understood ? F.danger : C.border}`,
                      cursor: 'pointer',
                      transition: 'border-color 200ms, background 200ms',
                      textAlign: 'left',
                    }}
                  >
                    {/* Custom checkbox */}
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${understood ? F.danger : C.t3}`,
                        background: understood ? F.danger : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 200ms, border-color 200ms',
                      }}
                    >
                      {understood && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          width="12" height="12" viewBox="0 0 12 12" fill="none"
                        >
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: understood ? F.danger : C.t2, lineHeight: 1.4 }}>
                      Je comprends que cette action est irréversible
                    </span>
                  </button>
                </motion.div>

                {/* CTA */}
                <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginTop: 24 }}>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!understood}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      background: understood ? F.danger : C.elevated,
                      border: 'none',
                      color: understood ? '#FFFFFF' : C.t3,
                      fontSize: 15, fontWeight: 700,
                      cursor: understood ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continuer vers la suppression
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
            >
              <motion.div
                variants={stagger}
                initial="initial"
                animate="animate"
              >
                {/* Instruction */}
                <motion.p
                  variants={fadeSlideUp}
                  transition={springTransition}
                  style={{ fontSize: 14, color: C.t2, marginBottom: 4, lineHeight: 1.5 }}
                >
                  Tapez{' '}
                  <strong style={{ color: F.danger, fontWeight: 700 }}>SUPPRIMER</strong>
                  {' '}pour confirmer la suppression définitive de votre compte.
                </motion.p>

                {/* Confirm input */}
                <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginTop: 16 }}>
                  <input
                    value={confirmValue}
                    onChange={(e) => setConfirmValue(e.target.value.toUpperCase())}
                    placeholder="SUPPRIMER"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${confirmBorderColor}`,
                      background: C.inputBg,
                      color: C.t1,
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'border-color 200ms',
                    }}
                  />
                </motion.div>

                {/* Buttons */}
                <motion.div
                  variants={fadeSlideUp}
                  transition={springTransition}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}
                >
                  <button
                    onClick={handleDelete}
                    disabled={!confirmMatch || deleting}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      background: confirmMatch && !deleting ? F.danger : C.elevated,
                      border: 'none',
                      color: confirmMatch && !deleting ? '#FFFFFF' : C.t3,
                      fontSize: 15, fontWeight: 700,
                      cursor: confirmMatch && !deleting ? 'pointer' : 'not-allowed',
                      opacity: deleting ? 0.6 : 1,
                      transition: 'background 200ms, opacity 150ms',
                    }}
                  >
                    {deleting ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}
                  </button>

                  <button
                    onClick={onBack}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 14,
                      background: 'transparent',
                      border: `1px solid ${C.borderMid}`,
                      color: C.t2,
                      fontSize: 14, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
