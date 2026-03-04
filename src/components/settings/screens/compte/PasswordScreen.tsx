// src/components/settings/screens/compte/PasswordScreen.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { springTransition } from './types';

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

type Strength = 'weak' | 'medium' | 'strong';

function getStrength(pw: string): Strength {
  if (pw.length < 6) return 'weak';
  const hasNumberOrSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
  if (pw.length >= 8 && hasNumberOrSpecial) return 'strong';
  return 'medium';
}

const STRENGTH_CONFIG: Record<Strength, { segments: number; color: string; label: string }> = {
  weak: { segments: 1, color: F.danger, label: 'Faible' },
  medium: { segments: 2, color: '#F59E0B', label: 'Moyen' },
  strong: { segments: 3, color: F.success, label: 'Fort' },
};

interface PasswordScreenProps {
  onBack: () => void;
}

export default function PasswordScreen({ onBack }: PasswordScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [step, setStep] = useState(1);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const autoBackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoBackRef.current) clearTimeout(autoBackRef.current);
    };
  }, []);

  const strength = getStrength(newPw);
  const mismatch = confirmPw.length > 0 && confirmPw !== newPw;

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    autoBackRef.current = setTimeout(onBack, 1500);
  }

  // ── Input builder ──

  function renderPasswordInput(
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    show: boolean,
    toggleShow: () => void,
  ) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 12,
          border: `1px solid ${C.borderMid}`,
          background: C.inputBg,
          overflow: 'hidden',
        }}
      >
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '12px 14px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.t1,
            fontSize: 14,
            fontWeight: 500,
          }}
        />
        <button
          type="button"
          onClick={toggleShow}
          style={{
            padding: '0 14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {show
            ? <EyeOff size={16} color={C.t3} />
            : <Eye size={16} color={C.t3} />}
        </button>
      </div>
    );
  }

  // ── Success state ──

  if (success) {
    return (
      <>
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
          <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Mot de passe</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: F.successSoft, border: `1.5px solid ${F.success}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}
          >
            <Check size={32} color={F.success} strokeWidth={2.5} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...springTransition }}
            style={{ fontSize: 18, fontWeight: 300, color: C.t1, textAlign: 'center' }}
          >
            Mot de passe mis à jour
          </motion.p>
        </div>
      </>
    );
  }

  // ── Main flow ──

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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Mot de passe</span>
      </div>

      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px 20px' }}>
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            animate={{ width: step === s ? 24 : 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              height: 4,
              borderRadius: 2,
              background: step >= s ? F.cyan : C.border,
              transition: 'background 250ms ease',
            }}
          />
        ))}
      </div>

      {/* Step content */}
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
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 12 }}>
                Étape 1
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: C.t1, marginBottom: 16 }}>
                Entrez votre mot de passe actuel
              </p>
              {renderPasswordInput(currentPw, setCurrentPw, 'Mot de passe actuel', showCurrent, () => setShowCurrent(!showCurrent))}
              <button
                onClick={() => setStep(2)}
                disabled={!currentPw.trim()}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 24,
                  background: currentPw.trim() ? F.cyan : C.elevated,
                  border: 'none', color: currentPw.trim() ? '#FFFFFF' : C.t3,
                  fontSize: 15, fontWeight: 700, cursor: currentPw.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Continuer
              </button>
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
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 12 }}>
                Étape 2
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: C.t1, marginBottom: 16 }}>
                Choisissez un nouveau mot de passe
              </p>
              {renderPasswordInput(newPw, setNewPw, 'Nouveau mot de passe', showNew, () => setShowNew(!showNew))}

              {/* Strength indicator */}
              {newPw.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((seg) => {
                      const cfg = STRENGTH_CONFIG[strength];
                      return (
                        <motion.div
                          key={seg}
                          animate={{
                            background: seg <= cfg.segments ? cfg.color : C.border,
                          }}
                          transition={{ duration: 0.25 }}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: C.border,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 12, color: STRENGTH_CONFIG[strength].color, marginTop: 6, display: 'block', fontWeight: 600 }}>
                    {STRENGTH_CONFIG[strength].label}
                  </span>
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={strength === 'weak'}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 24,
                  background: strength !== 'weak' ? F.cyan : C.elevated,
                  border: 'none', color: strength !== 'weak' ? '#FFFFFF' : C.t3,
                  fontSize: 15, fontWeight: 700, cursor: strength !== 'weak' ? 'pointer' : 'not-allowed',
                }}
              >
                Continuer
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.t3, marginBottom: 12 }}>
                Étape 3
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: C.t1, marginBottom: 16 }}>
                Confirmez votre nouveau mot de passe
              </p>
              {renderPasswordInput(confirmPw, setConfirmPw, 'Confirmer le mot de passe', showConfirm, () => setShowConfirm(!showConfirm))}

              {/* Mismatch error */}
              {mismatch && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 12, fontWeight: 600, color: F.danger, marginTop: 8 }}
                >
                  Les mots de passe ne correspondent pas
                </motion.p>
              )}

              <button
                onClick={handleSubmit}
                disabled={mismatch || !confirmPw.trim() || saving}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 24,
                  background: !mismatch && confirmPw.trim() && !saving ? F.cyan : C.elevated,
                  border: 'none',
                  color: !mismatch && confirmPw.trim() && !saving ? '#FFFFFF' : C.t3,
                  fontSize: 15, fontWeight: 700,
                  cursor: !mismatch && confirmPw.trim() && !saving ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Enregistrement…' : 'Changer le mot de passe'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
