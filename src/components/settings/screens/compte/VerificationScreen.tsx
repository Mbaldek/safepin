// src/components/settings/screens/compte/VerificationScreen.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Camera, Check, BadgeCheck, Lock, Users } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';
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

type Step = 'intro' | 'scanning' | 'done';

interface VerificationScreenProps {
  isVerified: boolean;
  onVerified: () => void;
  onBack: () => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const BENEFITS: { icon: typeof BadgeCheck; color: string; label: string; desc: string }[] = [
  {
    icon: BadgeCheck,
    color: F.success,
    label: 'Badge vérifié',
    desc: 'Affichez un badge de confiance sur votre profil',
  },
  {
    icon: Users,
    color: F.purple,
    label: 'Communautés',
    desc: 'Accédez aux fonctionnalités communautaires',
  },
  {
    icon: Lock,
    color: F.cyan,
    label: 'Sécurité Veriff',
    desc: 'Vos données sont traitées de manière sécurisée',
  },
];

export default function VerificationScreen({ isVerified, onVerified, onBack }: VerificationScreenProps) {
  const isDark = useIsDark();
  const C = getColors(isDark);

  const [step, setStep] = useState<Step>(isVerified ? 'done' : 'intro');

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
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.elevated,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color={C.t2} />
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Vérification</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 'intro' && <IntroView C={C} onStart={() => setStep('scanning')} />}
        {step === 'scanning' && (
          <ScanningView
            C={C}
            onSimulateSuccess={() => {
              setStep('done');
              onVerified();
            }}
          />
        )}
        {step === 'done' && <DoneView C={C} onBack={onBack} />}
      </div>
    </>
  );
}

// ── INTRO ──

function IntroView({ C, onStart }: { C: ReturnType<typeof getColors>; onStart: () => void }) {
  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px',
      }}
    >
      {/* Icon */}
      <motion.div
        variants={fadeSlideUp}
        transition={springTransition}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: F.purpleSoft,
          border: '1px solid rgba(167,139,250,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Shield size={32} color={F.purple} />
      </motion.div>

      {/* Title */}
      <motion.h2
        variants={fadeSlideUp}
        transition={springTransition}
        style={{
          fontSize: 22,
          fontWeight: 300,
          color: C.t1,
          margin: 0,
          textAlign: 'center',
        }}
      >
        Vérifiez votre identité
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        variants={fadeSlideUp}
        transition={springTransition}
        style={{
          fontSize: 13,
          color: C.t3,
          marginTop: 8,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Propulsé par Veriff · Moins de 2 minutes
      </motion.p>

      {/* Benefits */}
      <div style={{ width: '100%', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BENEFITS.map((b) => {
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
                padding: '14px 16px',
                borderRadius: 14,
                background: C.card,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: b.color + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={b.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{b.label}</div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 1 }}>{b.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div variants={fadeSlideUp} transition={springTransition} style={{ width: '100%', marginTop: 28 }}>
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: F.cyan,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Commencer la vérification
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── SCANNING ──

function ScanningView({
  C,
  onSimulateSuccess,
}: {
  C: ReturnType<typeof getColors>;
  onSimulateSuccess: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
      }}
    >
      {/* Pulsing camera icon */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: F.cyanSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Camera size={32} color={F.cyan} />
      </motion.div>

      {/* Title */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 300,
          color: C.t1,
          margin: 0,
          textAlign: 'center',
        }}
      >
        Vérification en cours…
      </h2>

      {/* Animated dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: F.cyan,
            }}
          />
        ))}
      </div>

      {/* Simulate button */}
      <button
        onClick={onSimulateSuccess}
        style={{
          marginTop: 40,
          padding: '12px 24px',
          borderRadius: 12,
          background: 'transparent',
          border: `1px solid ${C.borderMid}`,
          color: C.t2,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Simuler succès
      </button>
    </div>
  );
}

// ── DONE ──

function DoneView({ C, onBack }: { C: ReturnType<typeof getColors>; onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
      }}
    >
      {/* Checkmark with entry animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: F.successSoft,
          border: `1.5px solid ${F.success}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Check size={32} color={F.success} strokeWidth={2.5} />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...springTransition }}
        style={{
          fontSize: 22,
          fontWeight: 300,
          color: C.t1,
          margin: 0,
          textAlign: 'center',
        }}
      >
        Identité vérifiée
      </motion.h2>

      {/* Badge pill */}
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, ...springTransition }}
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '5px 14px',
          borderRadius: 999,
          background: F.successSoft,
          color: F.success,
          border: `1px solid ${F.success}40`,
          marginTop: 12,
          letterSpacing: '0.05em',
        }}
      >
        VÉRIFIÉ PAR VERIFF
      </motion.span>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ marginTop: 36 }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '12px 32px',
            borderRadius: 12,
            background: F.cyan,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Retour
        </button>
      </motion.div>
    </div>
  );
}
