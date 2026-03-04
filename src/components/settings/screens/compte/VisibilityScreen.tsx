// src/components/settings/screens/compte/VisibilityScreen.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Lock, Shield, AtSign, MapPin, Flag, Calendar } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import type { AccountData, VisibilityLevel } from './types';
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

// ── Level config ──

const LEVELS: { value: VisibilityLevel; label: string; color: string }[] = [
  { value: 'public', label: 'Public', color: F.cyan },
  { value: 'circle', label: 'Cercle', color: F.purple },
  { value: 'private', label: 'Privé', color: '#64748B' },
];

// ── Field config ──

type FieldKey = keyof AccountData['visibility'];

interface FieldDef {
  key: FieldKey;
  icon: typeof AtSign;
  iconColor: string;
  label: string;
  subtitle: string;
  disabledLevels?: VisibilityLevel[];
}

const FIELDS: FieldDef[] = [
  {
    key: 'username',
    icon: AtSign,
    iconColor: F.purple,
    label: "Nom d'utilisateur",
    subtitle: 'Votre identifiant @username',
    disabledLevels: ['private'],
  },
  {
    key: 'city',
    icon: MapPin,
    iconColor: F.cyan,
    label: 'Ville',
    subtitle: 'Votre ville de résidence',
  },
  {
    key: 'country',
    icon: Flag,
    iconColor: F.gold,
    label: 'Pays',
    subtitle: 'Votre pays de résidence',
  },
  {
    key: 'birthDate',
    icon: Calendar,
    iconColor: F.success,
    label: 'Date de naissance',
    subtitle: 'Votre date de naissance',
  },
];

// ── Component ──

interface VisibilityScreenProps {
  visibility: AccountData['visibility'];
  onSave: (v: AccountData['visibility']) => void;
  onBack: () => void;
}

export default function VisibilityScreen({ visibility, onSave, onBack }: VisibilityScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [local, setLocal] = useState<AccountData['visibility']>({ ...visibility });

  function setLevel(key: FieldKey, level: VisibilityLevel) {
    setLocal((prev) => ({ ...prev, [key]: level }));
  }

  function handleSave() {
    onSave(local);
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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Visibilité du profil</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          style={{ padding: '8px 20px 32px' }}
        >
          {/* ── Locked banner (nom réel) ── */}
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
              border: '1px solid rgba(239,68,68,0.15)',
              marginBottom: 20,
            }}
          >
            <Lock size={15} color={F.danger} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: F.danger }}>
                Nom &amp; prénom réels
              </div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>
                Jamais visible — utilisé uniquement pour la vérification
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
                background: F.dangerSoft,
                color: F.danger,
                border: '1px solid rgba(239,68,68,0.20)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              PRIVÉ
            </span>
          </motion.div>

          {/* ── Legend (3 pills) ── */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            style={{ display: 'flex', gap: 8, marginBottom: 20 }}
          >
            <LegendPill icon={<Globe size={12} />} color={F.cyan} label="Tous les membres" C={C} />
            <LegendPill icon={<Shield size={12} />} color={F.purple} label="Contacts de confiance" C={C} />
            <LegendPill icon={<Lock size={12} />} color={C.t3} label="Moi uniquement" C={C} />
          </motion.div>

          {/* ── Configurable fields card ── */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            style={{
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              background: C.card,
              overflow: 'hidden',
            }}
          >
            {FIELDS.map((field, i) => {
              const Icon = field.icon;
              return (
                <div key={field.key}>
                  {i > 0 && (
                    <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
                  )}
                  <div style={{ padding: '16px 16px 14px' }}>
                    {/* Label row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: field.iconColor + '20',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={15} color={field.iconColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{field.label}</div>
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>{field.subtitle}</div>
                      </div>
                    </div>

                    {/* Level pills */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {LEVELS.map((lvl) => {
                        const isActive = local[field.key] === lvl.value;
                        const isDisabled = field.disabledLevels?.includes(lvl.value) ?? false;

                        return (
                          <motion.button
                            key={lvl.value}
                            onClick={() => {
                              if (!isDisabled) setLevel(field.key, lvl.value);
                            }}
                            whileTap={!isDisabled ? { scale: 1.08 } : undefined}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            style={{
                              flex: 1,
                              padding: '8px 0',
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              border: isActive
                                ? `1.5px solid ${lvl.color}`
                                : `1px solid ${C.border}`,
                              background: isActive ? lvl.color + '20' : 'transparent',
                              color: isActive ? lvl.color : C.t3,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.35 : 1,
                              transition: 'background 150ms, border-color 150ms, color 150ms',
                            }}
                          >
                            {lvl.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* ── Save button ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginTop: 28 }}>
            <button
              onClick={handleSave}
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
              Enregistrer
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

// ── Legend pill sub-component ──

function LegendPill({
  icon,
  color,
  label,
  C,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  C: ReturnType<typeof getColors>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 999,
        background: color + '15',
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: C.t2, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}
