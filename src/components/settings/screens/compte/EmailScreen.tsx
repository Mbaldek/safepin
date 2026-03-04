// src/components/settings/screens/compte/EmailScreen.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
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
  cyan: '#3BB4C1',
  gold: '#F5C341',
  goldSoft: 'rgba(245,195,65,0.12)',
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

interface EmailScreenProps {
  currentEmail: string;
  onSave: (email: string) => void;
  onBack: () => void;
}

export default function EmailScreen({ currentEmail, onSave, onBack }: EmailScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasChanged = email.trim() !== currentEmail;
  const canSave = isValid && hasChanged && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    onSave(email.trim());
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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Adresse email</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          style={{ padding: '8px 20px 32px' }}
        >
          {/* Info banner */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: F.goldSoft,
              border: '1px solid rgba(245,195,65,0.30)',
              marginBottom: 24,
            }}
          >
            <Mail size={15} color={F.gold} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: F.gold, lineHeight: 1.4 }}>
              Un email de confirmation sera envoy&eacute; &agrave; la nouvelle adresse
            </span>
          </motion.div>

          {/* Email input */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <label style={labelStyle}>Nouvelle adresse email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              style={inputStyle}
            />
            <span style={{ fontSize: 11, color: C.t3, marginTop: 4, display: 'block' }}>
              Adresse actuelle : {currentEmail}
            </span>
          </motion.div>

          {/* Save button */}
          <motion.div variants={fadeSlideUp} transition={springTransition} style={{ marginTop: 28 }}>
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                background: canSave ? F.cyan : C.elevated,
                border: 'none',
                color: canSave ? '#FFFFFF' : C.t3,
                fontSize: 15,
                fontWeight: 700,
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 150ms, background 150ms',
              }}
            >
              {saving ? 'Envoi en cours\u2026' : 'Mettre \u00e0 jour'}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
