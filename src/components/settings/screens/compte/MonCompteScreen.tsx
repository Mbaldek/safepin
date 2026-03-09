// src/components/settings/screens/compte/MonCompteScreen.tsx

'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import SettingsSection from '../../components/SettingsSection';
import SettingsRow from '../../components/SettingsRow';
import { bToast } from '@/components/GlobalToast';
import PersonalInfoScreen from './PersonalInfoScreen';
import UsernameScreen from './UsernameScreen';
import VisibilityScreen from './VisibilityScreen';
import VerificationScreen from './VerificationScreen';
import PasswordScreen from './PasswordScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import ProfilePhotoScreen from './ProfilePhotoScreen';
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

  // PersonalInfo onSave → persist first_name, last_name, birth_date, country, city
  async function handleSave(partial: Partial<AccountData>) {
    if (!account || !userId) return;
    const updated = { ...account, ...partial };
    setAccount(updated);

    const displayName = [updated.firstName, updated.lastName].filter(Boolean).join(' ');
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updated.firstName || null,
        last_name: updated.lastName || null,
        display_name: displayName,
        date_of_birth: updated.birthDate || null,
        country: updated.country || null,
        city: updated.city || null,
      })
      .eq('id', userId);

    if (error) {
      bToast.danger({ title: 'Erreur lors de la sauvegarde' }, isDark);
      return;
    }

    const store = useStore.getState();
    if (store.userProfile) {
      store.setUserProfile({ ...store.userProfile, display_name: displayName });
    }
    bToast.success({ title: 'Informations mises à jour' }, isDark);
    goBack();
  }

  // Username onSave → check uniqueness then update profiles.username
  async function handleUsernameSave(username: string) {
    if (!account || !userId) return;

    // Double-check uniqueness server-side
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
      .neq('id', userId);

    if (count && count > 0) {
      bToast.danger({ title: 'Ce nom d\'utilisateur est déjà pris' }, isDark);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username, name: username })
      .eq('id', userId);

    if (error) {
      bToast.danger({ title: 'Erreur lors de la sauvegarde' }, isDark);
      return;
    }

    setAccount({ ...account, username });
    bToast.success({ title: 'Nom d\'utilisateur mis à jour' }, isDark);
    goBack();
  }

  // Visibility onSave → update profiles.visibility (jsonb)
  async function handleVisibilitySave(v: AccountData['visibility']) {
    if (!account || !userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ visibility: v })
      .eq('id', userId);

    if (error) {
      bToast.danger({ title: 'Erreur lors de la sauvegarde' }, isDark);
      return;
    }

    setAccount({ ...account, visibility: v });
    bToast.success({ title: 'Visibilité mise à jour' }, isDark);
    goBack();
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
      case 'personal-info':
        return account ? (
          <PersonalInfoScreen data={account} onSave={handleSave} onBack={goBack} />
        ) : null;
      case 'username':
        return (
          <UsernameScreen
            currentUsername={account?.username ?? ''}
            onSave={handleUsernameSave}
            onBack={goBack}
          />
        );
      case 'visibility':
        return account ? (
          <VisibilityScreen
            visibility={account.visibility}
            onSave={handleVisibilitySave}
            onBack={goBack}
          />
        ) : null;
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
      case 'profile-photo':
        return <ProfilePhotoScreen firstName={account?.firstName ?? ''} onBack={goBack} />;
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

function MainCompteScreen({ account, C, onBack, navigateTo, onNavigateParent }: MainCompteScreenProps) {
  const userProfile = useStore((s) => s.userProfile);
  const displayName = [account?.firstName, account?.lastName].filter(Boolean).join(' ')
    || account?.username
    || account?.email?.split('@')[0]
    || '';
  const initial = displayName.charAt(0).toUpperCase();

  // Build subtitle for "Informations personnelles"
  const infoSubtitleParts: string[] = [];
  if (account?.firstName) infoSubtitleParts.push(account.firstName);
  if (account?.city) infoSubtitleParts.push(account.city);
  if (account?.country) infoSubtitleParts.push(account.country);
  const infoSubtitle = infoSubtitleParts.join(' · ') || undefined;

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
          {/* ── Avatar block ── */}
          <motion.div
            variants={fadeSlideUp}
            transition={springTransition}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 24,
              paddingBottom: 20,
            }}
          >
            {/* Avatar circle + camera button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateTo('profile-photo')}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3BB4C1, #4A2C5A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 30, fontWeight: 300, color: '#FFFFFF' }}>
                    {initial}
                  </span>
                )}
              </div>

              {/* Camera button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo('profile-photo');
                }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: F.cyan,
                  border: `2px solid ${C.sheet}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Camera size={13} color="#FFFFFF" />
              </button>
            </motion.div>

            {/* Name */}
            <span style={{ fontSize: 20, fontWeight: 300, color: C.t1, marginTop: 12 }}>
              {displayName}
            </span>

            {/* @username */}
            {account?.username && (
              <span style={{ fontSize: 13, color: C.t3, marginTop: 2 }}>
                @{account.username}
              </span>
            )}

            {/* Verified badge */}
            {account?.isVerified && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: 999,
                  background: F.successSoft,
                  color: F.success,
                  marginTop: 8,
                }}
              >
                VÉRIFIÉ
              </span>
            )}
          </motion.div>

          {/* ── Section: PROFIL ── */}
          <motion.div variants={fadeSlideUp} transition={springTransition}>
            <SettingsSection label="Profil">
              <SettingsRow
                icon="User"
                iconColor="#22D3EE"
                label="Informations personnelles"
                subtitle={infoSubtitle}
                onPress={() => navigateTo('personal-info')}
              />
              <div style={{ height: 1, background: C.border, margin: '0 20px' }} />
              <SettingsRow
                icon="AtSign"
                iconColor={F.purple}
                label="Nom d'utilisateur"
                subtitle={account?.username ? `@${account.username}` : undefined}
                onPress={() => navigateTo('username')}
              />
              <div style={{ height: 1, background: C.border, margin: '0 20px' }} />
              <SettingsRow
                icon="User"
                iconColor={F.cyan}
                label="Mon profil"
                subtitle="Gerer abonnes, cercle et visibilite"
                onPress={() => onNavigateParent?.('myProfile')}
              />
              <div style={{ height: 1, background: C.border, margin: '0 20px' }} />
              <SettingsRow
                icon="Eye"
                iconColor={F.cyan}
                label="Visibilité du profil"
                subtitle="Choisir qui voit quoi"
                onPress={() => navigateTo('visibility')}
              />
            </SettingsSection>
          </motion.div>

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

