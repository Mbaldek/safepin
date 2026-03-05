// src/components/settings/screens/compte/PersonalInfoScreen.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import type { AccountData } from './types';
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

const COUNTRIES = [
  { code: 'fr', flag: '🇫🇷', label: 'France' },
  { code: 'be', flag: '🇧🇪', label: 'Belgique' },
  { code: 'ch', flag: '🇨🇭', label: 'Suisse' },
  { code: 'ca', flag: '🇨🇦', label: 'Canada' },
  { code: 'ma', flag: '🇲🇦', label: 'Maroc' },
  { code: 'sn', flag: '🇸🇳', label: 'Sénégal' },
  { code: 'dz', flag: '🇩🇿', label: 'Algérie' },
  { code: 'tn', flag: '🇹🇳', label: 'Tunisie' },
  { code: 'other', flag: '\u{1F30D}', label: 'Autre' },
] as const;

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

interface PersonalInfoScreenProps {
  data: AccountData;
  onSave: (partial: Partial<AccountData>) => void;
  onBack: () => void;
}

export default function PersonalInfoScreen({ data, onSave, onBack }: PersonalInfoScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [birthDate, setBirthDate] = useState(data.birthDate);
  const [country, setCountry] = useState(data.country);
  const [city, setCity] = useState(data.city);
  const [saving, setSaving] = useState(false);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    onSave({ firstName: firstName.trim(), lastName: lastName.trim(), birthDate, country, city: city.trim() });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${C.borderMid}`,
    background: C.inputBg,
    color: C.t1,
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: C.t2,
    marginBottom: 6,
    display: 'block',
  };

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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Informations personnelles</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          style={{ padding: '8px 20px 32px' }}
        >
          {/* ── RGPD Banner ── */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: F.purpleSoft,
              border: '1px solid rgba(167,139,250,0.30)',
              marginBottom: 24,
            }}
          >
            <Lock size={15} color={F.purple} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: F.purple, lineHeight: 1.4 }}>
              Votre nom réel n&apos;est jamais visible par les autres membres
            </span>
          </motion.div>

          {/* ── Section: IDENTITÉ ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: C.t3,
                marginBottom: 12,
              }}
            >
              Identité
            </div>

            {/* First + Last name grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <motion.div variants={fadeSlideUp} transition={springTransition}>
                <label style={labelStyle}>Prénom</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  style={inputStyle}
                />
              </motion.div>
              <motion.div variants={fadeSlideUp} transition={springTransition}>
                <label style={labelStyle}>Nom</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  style={inputStyle}
                />
              </motion.div>
            </div>

            {/* Birth date */}
            <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Date de naissance</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
              />
              <span style={{ fontSize: 11, color: C.t3, marginTop: 4, display: 'block' }}>
                Minimum 13 ans · Non visible par les membres
              </span>
            </motion.div>
          </motion.div>

          {/* ── Section: LOCALISATION ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: C.t3,
                marginBottom: 12,
              }}
            >
              Localisation
            </div>

            {/* Country select */}
            <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Pays de résidence</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(C.t3)}'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: isDark ? '#1E293B' : '#FFFFFF', color: C.t1 }}>
                  Sélectionner un pays
                </option>
                {COUNTRIES.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    style={{ background: isDark ? '#1E293B' : '#FFFFFF', color: C.t1 }}
                  >
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* City */}
            <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Ville</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville"
                style={inputStyle}
              />
              <span style={{ fontSize: 11, color: C.t3, marginTop: 4, display: 'block' }}>
                Optionnel · Visible selon vos réglages
              </span>
            </motion.div>
          </motion.div>

          {/* ── Save button ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                background: canSave ? F.cyan : C.elevated,
                border: 'none',
                color: canSave ? '#FFFFFF' : C.t3,
                fontSize: 15,
                fontWeight: 700,
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 150ms, background 150ms',
              }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
