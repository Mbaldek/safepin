'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Moon, MapPin, Users, Heart, Shield, AlertTriangle, Eye,
  Check, Camera, X, Bell, Mail, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { registerPushSubscription } from '@/lib/pushSubscription';
import PaywallScreen from '@/components/subscription/PaywallScreen';

// ─── Exports ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'brume_onboarding_done';
const ONBOARDING_STATE_KEY = 'brume_onboarding_state';

export function useOnboardingDone(
  profile: { onboarding_completed?: boolean } | null,
): [boolean, () => void] {
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
    return profile?.onboarding_completed === true;
  });

  // Sync when profile loads asynchronously (e.g. returning user without localStorage)
  useEffect(() => {
    if (profile?.onboarding_completed && !done) {
      localStorage.setItem(STORAGE_KEY, '1');
      setDone(true);
    }
  }, [profile?.onboarding_completed, done]);

  const markDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDone(true);
  }, []);

  return [done, markDone];
}

/** Read and clear saved onboarding state (persisted before OAuth redirect) */
export function consumeOnboardingState(): { step: number; goals: string[] } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ONBOARDING_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    localStorage.removeItem(ONBOARDING_STATE_KEY);
    return parsed;
  } catch {
    localStorage.removeItem(ONBOARDING_STATE_KEY);
    return null;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingFunnelProps {
  userId?: string | null;
  onComplete?: () => void;
  onAuthComplete?: (userId: string) => void;
  initialStep?: number;
  initialGoals?: string[];
}

type CircleContact = { name: string; relation: string; phone: string };
type Community = { id: string; name: string; emoji?: string | null; description: string | null; member_count: number | null };

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 11;

const gradient = 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)';

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg'];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#A78BFA,#7C3AED)',
  'linear-gradient(135deg,#3BB4C1,#0E7490)',
  'linear-gradient(135deg,#F5C341,#E8A800)',
];

const goalsList = [
  { id: 'walk', label: 'Rentrer chez moi en sécurité', icon: Moon },
  { id: 'area', label: 'Connaître mon quartier', icon: MapPin },
  { id: 'connect', label: 'Me connecter avec d\'autres', icon: Users },
  { id: 'peace', label: 'Rassurer mes proches', icon: Heart },
  { id: 'watch', label: 'Veiller sur mes proches', icon: Eye },
  { id: 'report', label: 'Signaler des incidents', icon: AlertTriangle },
  { id: 'safe', label: 'Trouver des lieux sûrs', icon: Shield },
];

const AVATAR_EMOJIS = ['🌸', '🦋', '⭐', '🌿', '💫', '🌙', '🦄', '🌺', '✨', '🌊', '🍀', '🌈'];

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 13 - (CURRENT_YEAR - 100) + 1 }, (_, i) => CURRENT_YEAR - 13 - i);

const PRIORITY_COUNTRIES: { code: string; flag: string; name: string }[] = [
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgique' },
  { code: 'CH', flag: '🇨🇭', name: 'Suisse' },
  { code: 'MA', flag: '🇲🇦', name: 'Maroc' },
  { code: 'SN', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'CI', flag: '🇨🇮', name: 'Côte d\'Ivoire' },
];

const OTHER_COUNTRIES: { code: string; name: string }[] = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'ZA', name: 'Afrique du Sud' },
  { code: 'AL', name: 'Albanie' }, { code: 'DZ', name: 'Algérie' },
  { code: 'DE', name: 'Allemagne' }, { code: 'AR', name: 'Argentine' },
  { code: 'AU', name: 'Australie' }, { code: 'AT', name: 'Autriche' },
  { code: 'BR', name: 'Brésil' }, { code: 'BG', name: 'Bulgarie' },
  { code: 'CA', name: 'Canada' }, { code: 'CL', name: 'Chili' },
  { code: 'CN', name: 'Chine' }, { code: 'CO', name: 'Colombie' },
  { code: 'KR', name: 'Corée du Sud' }, { code: 'HR', name: 'Croatie' },
  { code: 'CU', name: 'Cuba' }, { code: 'DK', name: 'Danemark' },
  { code: 'EG', name: 'Égypte' }, { code: 'AE', name: 'Émirats arabes unis' },
  { code: 'ES', name: 'Espagne' }, { code: 'US', name: 'États-Unis' },
  { code: 'FI', name: 'Finlande' }, { code: 'GA', name: 'Gabon' },
  { code: 'GR', name: 'Grèce' }, { code: 'HU', name: 'Hongrie' },
  { code: 'IN', name: 'Inde' }, { code: 'IE', name: 'Irlande' },
  { code: 'IT', name: 'Italie' }, { code: 'JP', name: 'Japon' },
  { code: 'LB', name: 'Liban' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'ML', name: 'Mali' },
  { code: 'MX', name: 'Mexique' }, { code: 'MC', name: 'Monaco' },
  { code: 'NL', name: 'Pays-Bas' }, { code: 'PE', name: 'Pérou' },
  { code: 'PL', name: 'Pologne' }, { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Royaume-Uni' }, { code: 'RO', name: 'Roumanie' },
  { code: 'RU', name: 'Russie' }, { code: 'SE', name: 'Suède' },
  { code: 'TN', name: 'Tunisie' }, { code: 'TR', name: 'Turquie' },
];

const selectStyle: React.CSSProperties = {
  padding: '12px 10px', height: 48,
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14, color: '#fff', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
};

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14, color: '#fff', fontSize: 15,
  fontFamily: 'inherit', outline: 'none',
};

const btnMainStyle: React.CSSProperties = {
  width: '100%', padding: 15, borderRadius: 100,
  fontSize: 15, fontWeight: 600, border: 'none',
  background: '#fff', color: '#0A0F1E',
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'all .2s',
};

const btnGhostStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'rgba(255,255,255,0.35)', fontSize: 13,
  cursor: 'pointer', padding: '10px',
  textAlign: 'center' as const, fontFamily: 'inherit',
  width: '100%',
};

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 16, left: 16, width: 44, height: 44,
  borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
  border: 'none', color: '#FFFFFF', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const stepContainer: React.CSSProperties = {
  background: gradient, height: '100%',
  display: 'flex', flexDirection: 'column',
  padding: 24, paddingTop: 80, paddingBottom: 48,
  overflow: 'hidden',
};

const btnOAuthStyle: React.CSSProperties = {
  width: '100%', padding: '14px 24px', borderRadius: 50,
  background: '#FFFFFF', border: 'none', fontSize: 15,
  fontWeight: 500, color: '#0F172A', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 10, fontFamily: 'inherit', transition: 'opacity .2s',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function OnboardingFunnel({
  userId,
  onComplete,
  onAuthComplete,
  initialStep = 0,
  initialGoals,
}: OnboardingFunnelProps) {
  const [step, setStep] = useState(initialStep);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialGoals ?? []);

  // FIX C — profile text inputs use refs, synced to state on blur
  const firstNameRef = useRef('');
  const lastNameRef = useRef('');
  const pseudoRef = useRef('');
  const customCityRef = useRef('');
  const [firstName, setFirstName] = useState('');

  // PrenomStep local state (hoisted here so step can be called as function, not component)
  const [localHasName, setLocalHasName] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // FIX A — emoji avatar
  const [avatarEmoji, setAvatarEmoji] = useState('🌸');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // FIX B — birth date as 3 fields
  const [birthDay, setBirthDay] = useState(0);
  const [birthMonth, setBirthMonth] = useState(0);
  const [birthYear, setBirthYear] = useState(1995);
  const [birthError, setBirthError] = useState('');

  // FIX D — country
  const [countryCode, setCountryCode] = useState('FR');

  const [selectedCity, setSelectedCity] = useState('');
  const [circleContacts, setCircleContacts] = useState<CircleContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth step state
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'magic'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  // Sync localHasName when navigating to PrenomStep
  useEffect(() => {
    if (step === 4) setLocalHasName(firstNameRef.current.trim().length > 0);
  }, [step]);

  // ─── Communities fetch ──────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 8) return;
    supabase
      .from('communities')
      .select('id, name, emoji, member_count, description')
      .order('member_count', { ascending: false })
      .limit(5)
      .then(({ data }) => setCommunities((data as Community[]) ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Complete ─────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const fn = firstNameRef.current.trim();
      const ln = lastNameRef.current.trim();
      const ps = pseudoRef.current.trim();
      const city = selectedCity || customCityRef.current.trim() || null;

      // Build birth date string from 3 selects
      let birthDate: string | null = null;
      if (birthDay > 0 && birthMonth > 0) {
        const d = String(birthDay).padStart(2, '0');
        const m = String(birthMonth).padStart(2, '0');
        birthDate = `${birthYear}-${m}-${d}`;
      }

      await supabase.from('profiles').update({
        ...(fn && {
          name: [fn, ln].filter(Boolean).join(' '),
          first_name: fn,
          last_name: ln || null,
        }),
        ...(ps && {
          display_name: ps,
          username: ps.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        }),
        avatar_emoji: avatarEmoji,
        ...(avatarUrl && { avatar_url: avatarUrl }),
        ...(city && { city }),
        ...(birthDate && { date_of_birth: birthDate }),
        country_code: countryCode,
        onboarding_goals: selectedGoals,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      }).eq('id', userId);

      document.cookie = 'ob_done=1;path=/;max-age=31536000';
      localStorage.setItem('brume_onboarding_done', '1');

      // Welcome email — fire and forget
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});

      // Register push notifications — fire and forget
      registerPushSubscription().catch(() => {});

      onComplete?.();
    } catch (e) {
      console.error('[Onboarding] Erreur etape:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── OAuth helper (saves state before redirect) ───────────────────────

  const saveStateAndOAuth = async (provider: 'google' | 'apple') => {
    // Persist pre-auth selections so we can restore after redirect
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify({
      step: 2,
      goals: selectedGoals,
    }));
    setAuthLoading(true);
    setAuthError(null);
    const callbackUrl = `${window.location.origin}/auth/callback?next=/onboarding`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  // ─── Email auth handler ───────────────────────────────────────────────

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const callbackUrl = `${window.location.origin}/auth/callback?next=/onboarding`;

    try {
      if (authMode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: authEmail,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        // Save state for when they click the magic link
        localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify({
          step: 2,
          goals: selectedGoals,
        }));
        setMagicSent(true);
      } else if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        // If auto-confirmed (no email verification required), proceed
        if (data.user && data.session) {
          onAuthComplete?.(data.user.id);
          setStep(3); // Move to location step
        } else {
          // Email confirmation needed
          localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify({
            step: 2,
            goals: selectedGoals,
          }));
          setMagicSent(true);
        }
      } else {
        // signin
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user) {
          onAuthComplete?.(data.user.id);
          // Check if onboarding already done
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.user.id)
            .maybeSingle();
          if (profile?.onboarding_completed) {
            // Already onboarded — go to map
            document.cookie = 'ob_done=1;path=/;max-age=31536000';
            localStorage.setItem('brume_onboarding_done', '1');
            onComplete?.();
          } else {
            setStep(3); // Continue onboarding
          }
        }
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setAuthLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 0 — WELCOME
  // ════════════════════════════════════════════════════════════════════════

  const Welcome = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 28px', textAlign: 'center',
      }}>
        <div style={{
          width: 76, height: 76,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <svg width={36} height={36} viewBox="0 0 80 80" fill="none">
            <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
            <circle cx="40" cy="22" r="4" fill="#FFFFFF" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'serif', fontSize: 44, fontWeight: 700,
          lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 14,
          color: '#FFFFFF',
        }}>
          Vous n&apos;êtes<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, opacity: 0.72 }}>
            jamais seule.
          </em>
        </h1>

        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.65, maxWidth: 270,
        }}>
          Breveil cartographie votre ville, protège vos trajets
          et connecte votre cercle de confiance.
        </p>
      </div>

      <div style={{ padding: '12px 24px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => setStep(1)} style={btnMainStyle}>
          Commencer &rarr;
        </button>
        <button
          onClick={() => { setAuthMode('signin'); setStep(2); }}
          style={btnGhostStyle}
        >
          J&apos;ai déjà un compte
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // STEP 1 — OBJECTIFS
  // ════════════════════════════════════════════════════════════════════════

  const Objectifs = () => (
    <div style={stepContainer}>
      <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
          Étape 1 / {TOTAL_STEPS - 1}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Qu&apos;est-ce qui compte pour toi ?</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Choisis ce qui te parle</p>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {goalsList.map(g => {
          const Icon = g.icon;
          const sel = selectedGoals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
              display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '16px 20px',
              borderRadius: 16, background: sel ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
              border: sel ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color="#FFFFFF" strokeWidth={1.5} />
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#FFFFFF' }}>{g.label}</span>
              {sel && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#22D3EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color="#FFFFFF" strokeWidth={3} /></div>}
            </button>
          );
        })}
      </div>
      <button onClick={nextStep} style={{ ...btnMainStyle, marginTop: 20, flexShrink: 0, opacity: selectedGoals.length > 0 ? 1 : 0.5 }}>Continuer &rarr;</button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // STEP 2 — AUTH (signup/signin — NEW)
  // ════════════════════════════════════════════════════════════════════════

  const AuthStep = () => {
    if (magicSent) {
      return (
        <div style={{ ...stepContainer, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={32} color="#FFFFFF" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 300, color: '#FFFFFF', marginBottom: 12 }}>Vérifie ton email</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
              On t&apos;a envoyé un lien à <strong style={{ color: '#fff' }}>{authEmail}</strong>
            </p>
            <button onClick={() => setMagicSent(false)} style={{ ...btnMainStyle, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
              Retour
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ ...stepContainer, overflowY: 'auto' }}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Étape 2 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>
            {authMode === 'signin' ? 'Content de te revoir' : 'Crée ton compte'}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>
            {authMode === 'signin' ? 'Connecte-toi pour continuer' : 'En quelques secondes, c\'est parti'}
          </p>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => saveStateAndOAuth('google')}
            disabled={authLoading}
            style={{ ...btnOAuthStyle, opacity: authLoading ? 0.7 : 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
          </button>
          <button
            onClick={() => saveStateAndOAuth('apple')}
            disabled={authLoading}
            style={{ ...btnOAuthStyle, opacity: authLoading ? 0.7 : 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continuer avec Apple
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 50, padding: 3 }}>
          {(['signup', 'signin', 'magic'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setAuthMode(m); setAuthError(null); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 50, border: 'none',
                background: authMode === m ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: authMode === m ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .2s',
              }}
            >
              {m === 'signup' ? 'Inscription' : m === 'signin' ? 'Connexion' : 'Magic Link'}
            </button>
          ))}
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            required
            style={inputStyle}
          />
          {authMode !== 'magic' && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          )}
          {authError && (
            <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading}
            style={{
              ...btnMainStyle,
              background: '#3BB4C1',
              color: '#FFFFFF',
              marginTop: 4,
              opacity: authLoading ? 0.7 : 1,
            }}
          >
            {authLoading
              ? 'Chargement...'
              : authMode === 'magic'
                ? 'Envoyer le lien'
                : authMode === 'signup'
                  ? 'Créer mon compte'
                  : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
            style={{ ...btnGhostStyle, fontSize: 12 }}
          >
            {authMode === 'signin' ? 'Pas encore de compte ? Inscription' : 'Déjà un compte ? Connexion'}
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 3 — LOCATION PERMISSION
  // ════════════════════════════════════════════════════════════════════════

  const LocationStep = () => {
    const requestLocation = () => {
      navigator.geolocation.getCurrentPosition(() => nextStep(), () => nextStep());
    };

    return (
      <div style={stepContainer}>
        <button onClick={() => setStep(1)} style={closeBtn}><X size={20} /></button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
          <div style={{ width: 140, height: 140, margin: '0 auto', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={56} color="#FFFFFF" strokeWidth={1} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 12 }}>Laisse-nous veiller sur toi</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>On te montrera les infos de sécurité autour de toi.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={requestLocation} style={btnMainStyle}>Activer la localisation</button>
          <button onClick={nextStep} style={btnGhostStyle}>Pas maintenant</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 4 — PRÉNOM + NOM + PSEUDO
  // ════════════════════════════════════════════════════════════════════════

  const PrenomStep = () => {
    return (
      <div style={stepContainer}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Étape 4 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Comment vous appelle-t-on ?</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Votre profil visible par votre cercle</p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            placeholder="Prénom *"
            defaultValue={firstNameRef.current}
            onInput={e => {
              firstNameRef.current = (e.target as HTMLInputElement).value;
              setLocalHasName(firstNameRef.current.trim().length > 0);
            }}
            onBlur={() => setFirstName(firstNameRef.current.trim())}
            style={inputStyle}
          />
          <input
            placeholder="Nom (optionnel)"
            defaultValue={lastNameRef.current}
            onInput={e => { lastNameRef.current = (e.target as HTMLInputElement).value; }}
            style={inputStyle}
          />

          {/* FIX A — Emoji selector + pseudo input */}
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setEmojiOpen(v => !v)}
                style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.08)',
                  border: emojiOpen ? '2px solid #3BB4C1' : '2px solid rgba(255,255,255,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, cursor: 'pointer', transition: 'border-color .2s',
                }}
              >
                {avatarEmoji}
              </button>
              <input
                placeholder="Ton pseudo..."
                defaultValue={pseudoRef.current}
                maxLength={20}
                onInput={e => {
                  const v = (e.target as HTMLInputElement).value.replace(/^\s+/, '');
                  (e.target as HTMLInputElement).value = v;
                  pseudoRef.current = v;
                }}
                style={{ ...inputStyle, flex: 1, width: 'auto' }}
              />
            </div>
            {emojiOpen && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
                marginTop: 10, padding: 10, borderRadius: 14,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {AVATAR_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => { setAvatarEmoji(em); setEmojiOpen(false); }}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, cursor: 'pointer', border: 'none',
                      background: avatarEmoji === em ? 'rgba(59,180,193,0.25)' : 'transparent',
                      transform: avatarEmoji === em ? 'scale(1.2)' : 'scale(1)',
                      outline: avatarEmoji === em ? '2px solid #3BB4C1' : 'none',
                      transition: 'all .15s',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4, paddingLeft: 4 }}>
              Utilisé dans la communauté · Max 20 caractères
            </div>
          </div>
        </div>

        <button
          disabled={!localHasName}
          onClick={() => { setFirstName(firstNameRef.current.trim()); setStep(5); }}
          style={{
            ...btnMainStyle,
            marginTop: 20,
            background: localHasName ? '#fff' : 'rgba(255,255,255,0.18)',
            color: localHasName ? '#0A0F1E' : 'rgba(255,255,255,0.3)',
            cursor: localHasName ? 'pointer' : 'not-allowed',
          }}
        >
          Continuer &rarr;
        </button>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 5 — PHOTO DE PROFIL
  // ════════════════════════════════════════════════════════════════════════

  const PhotoStep = () => {
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;

      // Preview
      const reader = new FileReader();
      reader.onload = ev => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Upload
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        setAvatarUrl(data.publicUrl);
      }
    };

    return (
      <div style={stepContainer}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Étape 5 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Ajoutez une photo de profil</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Visible par votre cercle uniquement</p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'relative', width: 110, height: 110, borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.22)',
              background: avatarPreview ? 'transparent' : 'rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', margin: '8px auto 10px', overflow: 'hidden',
              transition: 'border-color .2s',
            }}
          >
            {avatarPreview
              ? <Image src={avatarPreview} alt="" fill className="object-cover" unoptimized />
              : <Camera size={28} color="rgba(255,255,255,0.38)" />
            }
          </div>

          <input
            ref={fileInputRef} type="file" accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.33)', textAlign: 'center', marginBottom: 14 }}>
            Appuyez pour choisir une photo
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '12px 14px',
            fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.65,
            width: '100%',
          }}>
            {'\u{1F512}'} JPG, PNG, HEIC · Max 5MB · Jamais partagée sans votre accord
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          <button onClick={() => setStep(6)} style={btnMainStyle}>Continuer &rarr;</button>
          <button onClick={() => setStep(6)} style={btnGhostStyle}>Passer cette étape</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 6 — DATE DE NAISSANCE + VILLE
  // ════════════════════════════════════════════════════════════════════════

  const DateVilleStep = () => {
    const validateBirthDate = () => {
      if (birthDay === 0 || birthMonth === 0) {
        setBirthError('');
        return true; // Optional, no selection = skip
      }
      const maxDays = daysInMonth(birthMonth, birthYear);
      if (birthDay > maxDays) {
        setBirthError('Date invalide');
        return false;
      }
      const age = CURRENT_YEAR - birthYear - (new Date() < new Date(CURRENT_YEAR, birthMonth - 1, birthDay) ? 1 : 0);
      if (age < 13) {
        setBirthError('Tu dois avoir au moins 13 ans');
        return false;
      }
      setBirthError('');
      return true;
    };

    const handleContinue = () => {
      if (validateBirthDate()) setStep(7);
    };

    return (
      <div style={{ ...stepContainer, overflowY: 'auto' }}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Étape 6 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Votre profil de sécurité</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Pour personnaliser vos alertes et filtrer les contenus adaptés à votre situation</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '12px 14px',
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          lineHeight: 1.65, marginBottom: 20,
        }}>
          {'\u{1F512}'} Ces informations ne sont jamais vendues. Elles servent à adapter les contenus, protéger votre cercle (parents, enfants) et affiner les alertes autour de vous.
        </div>

        {/* FIX B — Date de naissance : 3 selects */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
          Date de naissance
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: birthError ? 4 : 20 }}>
          <select
            value={birthDay}
            onChange={e => { setBirthDay(Number(e.target.value)); setBirthError(''); }}
            style={{ ...selectStyle, flex: 1 }}
          >
            <option value={0} style={{ color: '#000' }}>Jour</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d} style={{ color: '#000' }}>{d}</option>
            ))}
          </select>
          <select
            value={birthMonth}
            onChange={e => { setBirthMonth(Number(e.target.value)); setBirthError(''); }}
            style={{ ...selectStyle, flex: 2 }}
          >
            <option value={0} style={{ color: '#000' }}>Mois</option>
            {MONTHS_FR.map((m, i) => (
              <option key={i} value={i + 1} style={{ color: '#000' }}>{m}</option>
            ))}
          </select>
          <select
            value={birthYear}
            onChange={e => { setBirthYear(Number(e.target.value)); setBirthError(''); }}
            style={{ ...selectStyle, flex: 1 }}
          >
            {BIRTH_YEARS.map(y => (
              <option key={y} value={y} style={{ color: '#000' }}>{y}</option>
            ))}
          </select>
        </div>
        {birthError && (
          <p style={{ fontSize: 12, color: '#F87171', marginBottom: 16 }}>{birthError}</p>
        )}

        {/* FIX D — Pays de résidence */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
          Pays de résidence
        </div>
        <select
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
          style={{ ...selectStyle, width: '100%', marginBottom: 20 }}
        >
          {PRIORITY_COUNTRIES.map(c => (
            <option key={c.code} value={c.code} style={{ color: '#000' }}>{c.flag} {c.name}</option>
          ))}
          <option disabled style={{ color: '#999' }}>───────────</option>
          {OTHER_COUNTRIES.map(c => (
            <option key={c.code} value={c.code} style={{ color: '#000' }}>{c.name}</option>
          ))}
        </select>

        {/* Ville */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
          Votre ville
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
          {CITIES.map(city => (
            <button
              key={city}
              onClick={() => { setSelectedCity(city); customCityRef.current = ''; }}
              style={{
                padding: '7px 14px', borderRadius: 100,
                border: '1px solid',
                borderColor: selectedCity === city ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.14)',
                background: selectedCity === city ? '#fff' : 'rgba(255,255,255,0.07)',
                color: selectedCity === city ? '#0F172A' : '#fff',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              {city}
            </button>
          ))}
        </div>
        <input
          placeholder="Autre ville..."
          defaultValue={customCityRef.current}
          onInput={e => { customCityRef.current = (e.target as HTMLInputElement).value; setSelectedCity(''); }}
          style={{ ...inputStyle, fontSize: 13, marginTop: 8 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 20 }}>
          <button onClick={handleContinue} style={btnMainStyle}>Continuer &rarr;</button>
          <button onClick={() => setStep(7)} style={btnGhostStyle}>Passer cette étape</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 7 — CERCLE DE CONFIANCE
  // ════════════════════════════════════════════════════════════════════════

  const CercleStep = () => {
    const addContact = async () => {
      if (!contactName.trim() || !userId) return;
      const newC: CircleContact = {
        name: contactName.trim(),
        relation: contactRelation.trim(),
        phone: contactPhone.trim(),
      };
      setCircleContacts(p => [...p, newC]);
      setContactName(''); setContactRelation(''); setContactPhone('');
      setShowAddForm(false);

      await supabase.from('trusted_contacts').insert({
        user_id: userId,
        contact_name: contactName.trim(),
        contact_relation: contactRelation.trim() || null,
      });
    };

    return (
      <div style={{ ...stepContainer, overflowY: 'auto' }}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            Étape 7 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>
            Ajoutez votre <em style={{ fontStyle: 'italic', fontWeight: 300 }}>cercle de confiance.</em>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Les personnes qui seront alertées si vous avez besoin d&apos;aide</p>
        </div>

        <div style={{ flex: 1 }}>
          {/* Contact cards */}
          {circleContacts.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', marginBottom: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {c.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
                  {c.relation}{c.phone ? ' · ' + c.phone : ''}
                </div>
              </div>
              <div style={{
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.25)',
                color: '#34D399', fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 100,
              }}>Ajouté</div>
            </div>
          ))}

          {/* Add contact row */}
          {circleContacts.length < 3 && (
            <div
              onClick={() => setShowAddForm(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 16, cursor: 'pointer',
                transition: 'background .2s',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'rgba(255,255,255,0.5)', flexShrink: 0,
              }}>+</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Ajouter un contact</div>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: 14, marginTop: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <input placeholder="Prénom *" value={contactName} onChange={e => setContactName(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
              <input placeholder="Relation (Sœur, Ami…)" value={contactRelation} onChange={e => setContactRelation(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
              <input placeholder="Téléphone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
              <button
                disabled={contactName.trim() === ''}
                onClick={addContact}
                style={{
                  padding: 11, borderRadius: 100,
                  background: contactName.trim() ? '#fff' : 'rgba(255,255,255,0.18)',
                  color: contactName.trim() ? '#0A0F1E' : 'rgba(255,255,255,0.3)',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: contactName.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >Ajouter</button>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 14 }}>
            3 contacts maximum en plan Gratuit · Illimité en Pro
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
          <button onClick={() => setStep(8)} style={btnMainStyle}>Continuer &rarr;</button>
          <button onClick={() => setStep(8)} style={btnGhostStyle}>Je ferai ça plus tard</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 8 — GROUPES
  // ════════════════════════════════════════════════════════════════════════

  const FALLBACK_GROUPS: Community[] = [
    { id: 'fallback-1', name: 'Femmes de Paris', emoji: '\u{1F338}', member_count: 234, description: null },
    { id: 'fallback-2', name: 'Breveil France', emoji: '\u{1F499}', member_count: 891, description: null },
    { id: 'fallback-3', name: 'Trajet s\u00e9curis\u00e9', emoji: '\u{1F6B6}\u200D\u2640\uFE0F', member_count: 156, description: null },
  ];

  const GroupesStep = () => {
    const displayGroups = communities.length > 0 ? communities : FALLBACK_GROUPS;

    const joinGroup = async (groupId: string) => {
      if (joinedCommunities.includes(groupId)) return;
      setJoinedCommunities(p => [...p, groupId]);
      if (!userId || groupId.startsWith('fallback-')) return;
      await supabase.from('community_members').insert({
        community_id: groupId,
        user_id: userId,
      });
    };

    return (
      <div style={{ ...stepContainer, overflowY: 'auto' }}>
        <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            &Eacute;tape 8 / {TOTAL_STEPS - 1}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Ton quartier t&apos;attend</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Rejoins les femmes de ton secteur</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {displayGroups.map(g => {
            const joined = joinedCommunities.includes(g.id);
            return (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 16,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${joined ? 'rgba(59,180,193,0.38)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'border-color .2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(59,180,193,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {g.emoji || '\u{1F30D}'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{g.member_count ?? 0} membres</div>
                </div>
                {joined ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3BB4C1' }}>{'\u2713'} Rejoint</span>
                ) : (
                  <button
                    onClick={() => joinGroup(g.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 99,
                      background: 'rgba(59,180,193,0.12)',
                      border: '1px solid rgba(59,180,193,0.3)',
                      color: '#3BB4C1', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >
                    Rejoindre
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, alignItems: 'center' }}>
          <button onClick={() => setStep(9)} style={btnMainStyle}>
            {joinedCommunities.length > 0 ? 'C\u2019est parti\u00A0! \u2192' : 'Continuer \u2192'}
          </button>
          <span
            onClick={() => setStep(9)}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          >
            Cr&eacute;er un groupe plus tard
          </span>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 9 — PAYWALL
  // ════════════════════════════════════════════════════════════════════════

  const Paywall = () => (
    <PaywallScreen context="onboarding" onClose={nextStep} />
  );

  // ════════════════════════════════════════════════════════════════════════
  // STEP 10 — SUCCÈS / READY
  // ════════════════════════════════════════════════════════════════════════

  const Ready = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 100, height: 100, margin: '0 auto 24px', position: 'relative' }}>
          <svg width="100" height="100" style={{ position: 'absolute' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" strokeDasharray="283" strokeDashoffset="240" transform="rotate(-90 50 50)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 300, color: '#FFFFFF' }}>1</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>Jour</span>
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Bienvenue{firstName ? `, ${firstName}` : ''} !</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>Ton parcours sécurité commence aujourd&apos;hui.</p>
        <div style={{ width: '100%', background: 'rgba(52,211,153,0.15)', borderRadius: 12, padding: 16, border: '1px solid #34D399', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Check size={20} color="#34D399" />
          <span style={{ fontSize: 14, color: '#34D399' }}>Compte créé avec succès !</span>
        </div>
      </div>
      <button onClick={handleComplete} disabled={isSubmitting} style={{ ...btnMainStyle, background: '#22D3EE', opacity: isSubmitting ? 0.7 : 1 }}>
        {isSubmitting ? 'Chargement...' : 'Commencer'}
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  const steps = [Welcome, Objectifs, AuthStep, LocationStep, PrenomStep, PhotoStep, DateVilleStep, CercleStep, GroupesStep, Paywall, Ready];
  const CurrentStep = steps[step] ?? Ready;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden' }}>
      {/* Progress dots */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 6 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8, height: 8, borderRadius: 4,
            background: i === step ? '#FFFFFF' : i < step ? '#22D3EE' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ height: '100%' }}
        >
          {CurrentStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default OnboardingFunnel;
