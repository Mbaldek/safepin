// src/components/settings/screens/compte/UsernameScreen.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { supabase } from '@/lib/supabase';
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

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken';

interface UsernameScreenProps {
  currentUsername: string;
  onSave: (username: string) => void;
  onBack: () => void;
}

// Sanitize: only lowercase letters, numbers, underscores
function sanitize(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export default function UsernameScreen({ currentUsername, onSave, onBack }: UsernameScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);

  const [value, setValue] = useState(currentUsername);
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();

    // Same as current → idle (no need to check)
    if (trimmed === currentUsername) {
      setStatus('idle');
      return;
    }

    if (trimmed.length < 3) {
      setStatus('idle');
      return;
    }

    setStatus('checking');

    debounceRef.current = setTimeout(async () => {
      // Check Supabase for existing username
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', trimmed);

      if (error) {
        // Fallback: simulate availability on error
        setStatus('available');
        return;
      }

      setStatus(count && count > 0 ? 'taken' : 'available');
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, currentUsername]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(sanitize(e.target.value));
  }

  async function handleSave() {
    if (status !== 'available' || saving) return;
    setSaving(true);
    onSave(value.trim());
  }

  const canSave = status === 'available' && !saving;

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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Nom d&apos;utilisateur</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 32px' }}>
        {/* @username input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 14,
            border: `1.5px solid ${focused ? F.cyan : C.borderMid}`,
            background: C.inputBg,
            padding: '14px 16px',
            transition: 'border-color 200ms, box-shadow 200ms',
            boxShadow: focused ? '0 0 0 3px rgba(59,180,193,0.15)' : 'none',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: F.cyan,
              marginRight: 4,
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            @
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="username"
            maxLength={24}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: C.t1,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          />
        </div>

        {/* Availability indicator */}
        <div style={{ minHeight: 28, marginTop: 10 }}>
          <AnimatePresence mode="wait">
            {status === 'checking' && (
              <motion.div
                key="checking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={14} color={C.t3} />
                </motion.div>
                <span style={{ fontSize: 13, color: C.t3 }}>Vérification…</span>
              </motion.div>
            )}

            {status === 'available' && (
              <motion.div
                key="available"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Check size={14} color={F.success} />
                <span style={{ fontSize: 13, fontWeight: 600, color: F.success }}>
                  @{value} est disponible
                </span>
              </motion.div>
            )}

            {status === 'taken' && (
              <motion.div
                key="taken"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <X size={14} color={F.danger} />
                <span style={{ fontSize: 13, fontWeight: 600, color: F.danger }}>
                  @{value} est déjà pris
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint */}
        <p style={{ fontSize: 12, color: C.t3, marginTop: 8, lineHeight: 1.5 }}>
          Minimum 3 caractères · Lettres, chiffres et _ uniquement
        </p>

        {/* Save button */}
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
            marginTop: 28,
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </>
  );
}
