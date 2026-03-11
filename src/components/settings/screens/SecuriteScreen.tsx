'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { bToast } from '@/components/GlobalToast';
import SettingsSection from '../components/SettingsSection';
import SettingsRow from '../components/SettingsRow';
import VerificationScreen from './compte/VerificationScreen';
import EmailScreen from './compte/EmailScreen';
import PasswordScreen from './compte/PasswordScreen';
import DeleteAccountScreen from './compte/DeleteAccountScreen';
import { slideVariants, springTransition } from './compte/types';

export interface SecuriteScreenProps {
  onBack: () => void;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

type InternalScreen = 'main' | 'verification' | 'email' | 'password' | 'delete-account';

export default function SecuriteScreen({ onBack, onClose, onNavigate }: SecuriteScreenProps) {
  const isDark = useIsDark();
  const userId = useStore((s) => s.userId);

  const [currentScreen, setCurrentScreen] = useState<InternalScreen>('main');
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userId) { setLoading(false); return; }
      const [authResult, profileResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('profiles').select('verified').eq('id', userId).maybeSingle(),
      ]);
      setEmail(authResult.data.user?.email ?? '');
      setIsVerified((profileResult.data?.verified as boolean) ?? false);
      setLoading(false);
    }
    load();
  }, [userId]);

  function navigateTo(screen: InternalScreen) {
    setDirection(1);
    setCurrentScreen(screen);
  }

  function goBack() {
    setDirection(-1);
    setCurrentScreen('main');
  }

  async function handleEmailSave(newEmail: string) {
    if (!userId) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      bToast.danger({ title: error.message }, isDark);
      return;
    }
    setEmail(newEmail);
    bToast.success({ title: 'Un email de confirmation a été envoyé' }, isDark);
    goBack();
  }

  async function handleVerified() {
    if (!userId) return;
    setIsVerified(true);
    await supabase.from('profiles').update({ verified: true, verification_status: 'approved' }).eq('id', userId);
    const store = useStore.getState();
    if (store.userProfile) {
      store.setUserProfile({ ...store.userProfile, verified: true, verification_status: 'approved' });
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={40} color="#3BB4C1" />
        </motion.div>
      </div>
    );
  }

  function renderScreen() {
    switch (currentScreen) {
      case 'verification':
        return <VerificationScreen isVerified={isVerified} onVerified={handleVerified} onBack={goBack} />;
      case 'email':
        return <EmailScreen currentEmail={email} onSave={handleEmailSave} onBack={goBack} />;
      case 'password':
        return <PasswordScreen onBack={goBack} />;
      case 'delete-account':
        return <DeleteAccountScreen onBack={goBack} />;
      default:
        return (
          <MainSecuriteScreen
            isDark={isDark}
            email={email}
            isVerified={isVerified}
            onBack={onBack}
            onNavigate={onNavigate}
            navigateTo={navigateTo}
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

// ─── Main overview ───────────────────────────────────────

interface MainSecuriteScreenProps {
  isDark: boolean;
  email: string;
  isVerified: boolean;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  navigateTo: (screen: InternalScreen) => void;
}

function MainSecuriteScreen({ isDark, email, isVerified, onBack, onNavigate, navigateTo }: MainSecuriteScreenProps) {
  const divider = { height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)', margin: '0 20px' } as const;

  const verifiedPill = isVerified ? (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: 'rgba(52,211,153,0.12)', color: '#34D399', whiteSpace: 'nowrap',
    }}>
      VÉRIFIÉ
    </span>
  ) : undefined;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 12px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isDark ? '#334155' : '#F1F5F9',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: isDark ? '#94A3B8' : '#64748B', fontSize: 18,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 19, fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}>
          Ma Sécurité & Confidentialité
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Vérification */}
        <SettingsSection label="Vérification">
          <SettingsRow
            icon="ShieldCheck"
            iconColor="#34D399"
            label="Vérifier mon identité"
            subtitle="powered by Veriff"
            onPress={() => navigateTo('verification')}
            rightEl={verifiedPill}
          />
        </SettingsSection>

        {/* Compte */}
        <SettingsSection label="Compte">
          <SettingsRow
            icon="Mail"
            iconColor="#F5C341"
            label="Adresse email"
            subtitle={email || undefined}
            onPress={() => navigateTo('email')}
          />
          <div style={divider} />
          <SettingsRow
            icon="Lock"
            iconColor="#F5C341"
            label="Mot de passe"
            subtitle="••••••••"
            onPress={() => navigateTo('password')}
          />
        </SettingsSection>

        {/* Alertes & localisation */}
        <SettingsSection label="Alertes & localisation">
          <SettingsRow
            icon="MapPin"
            iconColor="#22D3EE"
            label="Localisation & alertes"
            subtitle="Mode, rayon, notifications, heures calmes"
            onPress={() => onNavigate('location')}
          />
        </SettingsSection>

        {/* Données */}
        <SettingsSection label="Données">
          <SettingsRow
            icon="Lock"
            label="Confidentialité & RGPD"
            subtitle="Analytics, export"
            onPress={() => onNavigate('privacy-rgpd')}
          />
          <div style={divider} />
          <SettingsRow
            icon="Settings"
            label="Sessions & sécurité"
            subtitle="2FA, appareils connectés"
            onPress={() => onNavigate('sessions-security')}
          />
        </SettingsSection>

        {/* Zone sensible */}
        <SettingsSection label="Zone sensible">
          <SettingsRow
            icon="Trash2"
            iconColor="#EF4444"
            label="Supprimer mon compte"
            subtitle="Toutes vos données seront effacées"
            danger
            onPress={() => navigateTo('delete-account')}
          />
        </SettingsSection>

        <div style={{ height: 32 }} />
      </div>
    </>
  );
}
