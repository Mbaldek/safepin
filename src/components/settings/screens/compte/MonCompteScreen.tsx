// src/components/settings/screens/compte/MonCompteScreen.tsx

'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../../components/SettingsSection';
import SettingsRow from '../../components/SettingsRow';
import { bToast } from '@/components/GlobalToast';
import VerificationScreen from './VerificationScreen';
import PasswordScreen from './PasswordScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import EmailScreen from './EmailScreen';
import type { AccountData, CompteScreen } from './types';
import { slideVariants, springTransition, staggerChildren, fadeSlideUp } from './types';

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

interface MonCompteScreenProps {
  onBack: () => void;
  onNavigateParent?: (screen: string) => void;
}

export default function MonCompteScreen({ onBack, onNavigateParent }: MonCompteScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const userId = useStore((s) => s.userId);

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<CompteScreen>('main');
  const [direction, setDirection] = useState(1);

  // Load user data from Supabase
  useEffect(() => {
    async function load() {
      if (!userId) {
        setLoading(false);
        return;
      }

      const [authResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);

      const email = authResult.data.user?.email ?? '';
      const p = profileResult.data;

      // Prefer dedicated columns, fall back to display_name split
      let firstName = (p?.first_name as string) ?? '';
      let lastName = (p?.last_name as string) ?? '';
      if (!firstName && !lastName) {
        const displayName = (p?.display_name as string) ?? '';
        const parts = displayName.split(' ');
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
      }

      const defaultVis = {
        username: 'public' as const,
        city: 'public' as const,
        country: 'private' as const,
        birthDate: 'private' as const,
      };
      const rawVis = p?.visibility as Record<string, string> | null;

      setAccount({
        firstName,
        lastName,
        username: (p?.username as string) ?? (p?.name as string) ?? '',
        email,
        birthDate: (p?.date_of_birth as string) ?? (p?.birthday as string) ?? '',
        country: (p?.country as string) ?? '',
        city: (p?.city as string) ?? '',
        isVerified: (p?.verified as boolean) ?? false,
        visibility: rawVis
          ? {
              username: (rawVis.username as AccountData['visibility']['username']) ?? defaultVis.username,
              city: (rawVis.city as AccountData['visibility']['city']) ?? defaultVis.city,
              country: (rawVis.country as AccountData['visibility']['country']) ?? defaultVis.country,
              birthDate: (rawVis.birthDate as AccountData['visibility']['birthDate']) ?? defaultVis.birthDate,
            }
          : defaultVis,
      });

      setLoading(false);
    }

    load();
  }, [userId]);

  function navigateTo(screen: CompteScreen) {
    setDirection(1);
    setCurrentScreen(screen);
  }

  function goBack() {
    setDirection(-1);
    setCurrentScreen('main');
  }

  // Email onSave → supabase.auth.updateUser({ email })
  async function handleEmailSave(newEmail: string) {
    if (!account || !userId) return;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      bToast.danger({ title: error.message }, isDark);
      return;
    }

    setAccount({ ...account, email: newEmail });
    bToast.success({ title: 'Un email de confirmation a été envoyé' }, isDark);
    goBack();
  }

  // Mark user as verified
  async function handleVerified() {
    if (!account || !userId) return;
    setAccount({ ...account, isVerified: true });
    await supabase.from('profiles').update({ verified: true, verification_status: 'approved' }).eq('id', userId);
    const store = useStore.getState();
    if (store.userProfile) {
      store.setUserProfile({ ...store.userProfile, verified: true, verification_status: 'approved' });
    }
  }

  // Spinner while loading
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={40} color={F.cyan} />
        </motion.div>
      </div>
    );
  }

  function renderScreen() {
    switch (currentScreen) {
      case 'verification':
        return (
          <VerificationScreen
            isVerified={account?.isVerified ?? false}
            onVerified={handleVerified}
            onBack={goBack}
          />
        );
      case 'email':
        return (
          <EmailScreen
            currentEmail={account?.email ?? ''}
            onSave={handleEmailSave}
            onBack={goBack}
          />
        );
      case 'password':
        return <PasswordScreen onBack={goBack} />;
      case 'delete-account':
        return <DeleteAccountScreen onBack={goBack} />;
      default:
        return (
          <MainCompteScreen
            account={account}
            C={C}
            onBack={onBack}
            navigateTo={navigateTo}
            onNavigateParent={onNavigateParent}
          />
        );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentScreen}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springTransition}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main account overview ───────────────────────────────────────

interface MainCompteScreenProps {
  account: AccountData | null;
  C: ReturnType<typeof getColors>;
  onBack: () => void;
  navigateTo: (screen: CompteScreen) => void;
  onNavigateParent?: (screen: string) => void;
}

function MainCompteScreen({ account, C, onBack, navigateTo }: MainCompteScreenProps) {
  // Verified badge pill for SettingsRow rightEl
  const verifiedPill = account?.isVerified ? (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 999,
        background: F.successSoft,
        color: F.success,
        whiteSpace: 'nowrap',
      }}
    >
      VÉRIFIÉ
    </span>
  ) : undefined;

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
        <span style={{ fontSize: 19, fontWeight: 600, color: C.t1 }}>Mon compte</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <motion.div
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          {/* ── Section: VÉRIFICATION ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <SettingsSection label="Vérification">
              <SettingsRow
                icon="ShieldCheck"
                iconColor={F.success}
                label="Vérifier mon identité"
                subtitle="powered by Veriff"
                onPress={() => navigateTo('verification')}
                rightEl={verifiedPill}
              />
            </SettingsSection>
          </motion.div>

          {/* ── Section: SÉCURITÉ DU COMPTE ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <SettingsSection label="Sécurité du compte">
              <SettingsRow
                icon="Mail"
                iconColor={F.gold}
                label="Adresse email"
                subtitle={account?.email || undefined}
                onPress={() => navigateTo('email')}
              />
              <div style={{ height: 1, background: C.border, margin: '0 20px' }} />
              <SettingsRow
                icon="Lock"
                iconColor={F.gold}
                label="Mot de passe"
                subtitle={'••••••••'}
                onPress={() => navigateTo('password')}
              />
            </SettingsSection>
          </motion.div>

          {/* ── Section: ZONE SENSIBLE ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <SettingsSection label="Zone sensible">
              <SettingsRow
                icon="Trash2"
                iconColor={F.danger}
                label="Supprimer mon compte"
                subtitle="Toutes vos données seront effacées"
                danger
                onPress={() => navigateTo('delete-account')}
              />
            </SettingsSection>
          </motion.div>

          {/* Bottom spacing */}
          <div style={{ height: 32 }} />
        </motion.div>
      </div>
    </>
  );
}

