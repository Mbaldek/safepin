'use client';

import { useState, useCallback } from 'react';
import {
  MapPin, Moon, Users, Heart, Shield, AlertTriangle, Eye,
  Check, ChevronRight, Camera, X, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'brume_onboarding_done';

export function useOnboardingDone(
  profile: { onboarding_completed?: boolean } | null,
): [boolean, () => void] {
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
    return profile?.onboarding_completed === true;
  });

  const markDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDone(true);
  }, []);

  return [done, markDone];
}

interface OnboardingFunnelV2Props {
  userId: string;
  onComplete?: () => void;
}

const gradient = 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)';

const goals = [
  { id: 'walk', label: 'Rentrer chez moi en sécurité', icon: Moon },
  { id: 'area', label: 'Connaître mon quartier', icon: MapPin },
  { id: 'connect', label: 'Me connecter avec d\'autres', icon: Users },
  { id: 'peace', label: 'Rassurer mes proches', icon: Heart },
  { id: 'watch', label: 'Veiller sur mes proches', icon: Eye },
  { id: 'report', label: 'Signaler des incidents', icon: AlertTriangle },
  { id: 'safe', label: 'Trouver des lieux sûrs', icon: Shield },
];

export function OnboardingFunnelV2({ userId, onComplete }: OnboardingFunnelV2Props) {
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 7;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(() => nextStep(), () => nextStep());
  };

  const requestNotifications = async () => {
    try {
      await Notification.requestPermission();
    } catch {}
    nextStep();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch (e) {
      console.error('Upload error:', e);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from('profiles').update({
        display_name: firstName || null,
        avatar_url: avatarUrl,
        onboarding_goals: selectedGoals,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      }).eq('id', userId);

      document.cookie = 'ob_done=1;path=/;max-age=31536000';
      localStorage.setItem('brume_onboarding_done', '1');
      onComplete?.();
    } catch (e) {
      console.error('Complete error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '18px 24px', borderRadius: 32,
    background: '#FFFFFF', border: 'none',
    fontSize: 16, fontWeight: 600, color: '#0F172A', cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    width: '100%', padding: '18px 24px', borderRadius: 32,
    background: 'transparent', border: 'none',
    fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
  };

  const closeBtn: React.CSSProperties = {
    position: 'absolute', top: 16, left: 16, width: 44, height: 44,
    borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
    border: 'none', color: '#FFFFFF', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  // Step 0: Welcome
  const Welcome = () => (
    <div onClick={nextStep} style={{ background: gradient, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer' }}>
      <div style={{ textAlign: 'center' }}>
        <svg width={80} height={80} viewBox="0 0 80 80" fill="none" style={{ marginBottom: 32 }}>
          <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
          <circle cx="40" cy="22" r="4" fill="#FFFFFF" />
        </svg>
        <h1 style={{ fontSize: 36, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Breveil</h1>
        <p style={{ fontSize: 24, fontWeight: 300, color: 'rgba(255,255,255,0.8)', marginBottom: 48 }}>Marche avec nous.</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Tap to continue</p>
      </div>
    </div>
  );

  // Step 1: Location
  const Location = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24, paddingTop: 80 }}>
      <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
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
        <button onClick={requestLocation} style={btnPrimary}>Activer la localisation</button>
        <button onClick={nextStep} style={btnSecondary}>Pas maintenant</button>
      </div>
    </div>
  );

  // Step 2: Goals
  const Goals = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24, paddingTop: 80 }}>
      <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Qu&apos;est-ce qui compte pour toi ?</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Choisis ce qui te parle</p>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {goals.map(g => {
          const Icon = g.icon;
          const sel = selectedGoals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
              display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '16px 20px',
              borderRadius: 16, background: sel ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
              border: sel ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              cursor: 'pointer', textAlign: 'left',
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
      <button onClick={nextStep} style={{ ...btnPrimary, marginTop: 20, opacity: selectedGoals.length > 0 ? 1 : 0.5 }}>Continuer</button>
    </div>
  );

  // Step 3: Profile
  const Profile = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24, paddingTop: 80 }}>
      <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Parle-nous de toi</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Ces infos restent privées</p>
      </div>
      <label style={{ width: 100, height: 100, margin: '0 auto 32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px dashed rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={28} color="rgba(255,255,255,0.5)" />}
        <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
      </label>
      <input
        type="text" placeholder="Prénom ou pseudo" value={firstName}
        onChange={e => setFirstName(e.target.value)}
        style={{ width: '100%', padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 16, color: '#FFFFFF', outline: 'none', marginBottom: 16 }}
      />
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={nextStep} style={btnPrimary}>Continuer</button>
        <button onClick={nextStep} style={btnSecondary}>Passer</button>
      </div>
    </div>
  );

  // Step 4: Notifications
  const Notifications = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24, paddingTop: 80 }}>
      <button onClick={prevStep} style={closeBtn}><X size={20} /></button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
        <div style={{ width: 140, height: 140, margin: '0 auto', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={56} color="#FFFFFF" strokeWidth={1} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 12 }}>Reste informée</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>Reçois des alertes quand quelque chose se passe près de toi.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={requestNotifications} style={btnPrimary}>Activer les notifications</button>
        <button onClick={nextStep} style={btnSecondary}>Pas maintenant</button>
      </div>
    </div>
  );

  // Step 5: Paywall
  const Paywall = () => (
    <div style={{ background: gradient, minHeight: '100%', display: 'flex', flexDirection: 'column', padding: 24, paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F5C341', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Breveil Pro</span>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginTop: 8 }}>Sécurité sans limites</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {['Trajets illimités', 'Alertes en temps réel', 'Cercle élargi (10 contacts)', 'Julia, ton accompagnatrice IA'].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
            <Check size={18} color="#22D3EE" /><span style={{ fontSize: 14, color: '#FFFFFF' }}>{f}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid #F5C341' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>Annuel</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#34D399' }}>Économise 33%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 300, color: '#FFFFFF' }}>€39,99</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/an</span>
        </div>
      </div>
      <button onClick={nextStep} style={btnPrimary}>Essayer gratuitement 7 jours</button>
      <button onClick={nextStep} style={{ ...btnSecondary, marginTop: 12 }}>Continuer gratuitement</button>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 16 }}>Annule quand tu veux.</p>
    </div>
  );

  // Step 6: Ready
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
      <button onClick={handleComplete} disabled={isSubmitting} style={{ ...btnPrimary, background: '#22D3EE', opacity: isSubmitting ? 0.7 : 1 }}>
        {isSubmitting ? 'Chargement...' : 'Commencer'}
      </button>
    </div>
  );

  const steps = [Welcome, Location, Goals, Profile, Notifications, Paywall, Ready];
  const CurrentStep = steps[step];

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
      <div style={{ height: '100%' }}><CurrentStep /></div>
    </div>
  );
}

export default OnboardingFunnelV2;
