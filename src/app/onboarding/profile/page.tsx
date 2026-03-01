// src/app/onboarding/profile/page.tsx — Step 1/5: Profile setup
// Collects first name, birthday, city, personas → saves to profiles → /onboarding/goals

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/lib/useOnboarding';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';

const PERSONAS = [
  { id: 'commuter',   icon: '🚇', labelKey: 'persona_commuter' },
  { id: 'student',    icon: '📚', labelKey: 'persona_student' },
  { id: 'nightowl',   icon: '🌙', labelKey: 'persona_nightowl' },
  { id: 'runner',     icon: '🏃', labelKey: 'persona_runner' },
  { id: 'parent',     icon: '👶', labelKey: 'persona_parent' },
  { id: 'traveler',   icon: '✈️', labelKey: 'persona_traveler' },
  { id: 'freelance',  icon: '💻', labelKey: 'persona_freelance' },
  { id: 'nightlife',  icon: '🎉', labelKey: 'persona_nightlife' },
  { id: 'everything', icon: '✨', labelKey: 'persona_everything' },
] as const;

type PersonaId = (typeof PERSONAS)[number]['id'];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);
  const userProfile = useStore((s) => s.userProfile);
  const { state } = useOnboarding();

  const [firstName, setFirstName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [city, setCity] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<PersonaId[]>([]);
  const [saving, setSaving] = useState(false);

  // Pre-fill from store (display_name) and hook state (birthday/city/personas)
  useEffect(() => {
    if (userProfile?.display_name && !firstName) {
      setFirstName(userProfile.display_name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  useEffect(() => {
    if (!state) return;
    if (state.birthday) setBirthday(state.birthday);
    if (state.city) setCity(state.city);
    if (state.personas?.length) setSelectedPersonas(state.personas as PersonaId[]);
  }, [state]);

  const togglePersona = useCallback((id: PersonaId) => {
    setSelectedPersonas((prev) => {
      if (id === 'everything') {
        return prev.includes('everything') ? [] : ['everything'];
      }
      const without = prev.filter((p) => p !== 'everything');
      return without.includes(id)
        ? without.filter((p) => p !== id)
        : [...without, id];
    });
  }, []);

  const handleSkip = () => router.push('/onboarding/goals');

  const handleSubmit = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        ...(firstName.trim() ? { name: firstName.trim() } : {}),
        birthday: birthday || null,
        city: city.trim() || null,
        personas: selectedPersonas,
        onboarding_step: 1,
      })
      .eq('id', userId);
    router.push('/onboarding/goals');
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '14px 16px',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Progress bar — 25% */}
      <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: '25%', height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease-out' }} />
      </div>

      {/* Skip button */}
      <div className="flex justify-end px-5 pt-4">
        <button
          onClick={handleSkip}
          className="text-sm"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('skipBtn')}
        </button>
      </div>

      {/* Main content */}
      <div className="max-w-sm mx-auto px-5 pt-8 pb-10 flex flex-col gap-6">

        {/* Heading */}
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>
            {t('profileTitle')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('profileSub')}
          </p>
        </div>

        {/* Form inputs */}
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder={t('firstName')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={inputStyle}
          />
          <div className="flex gap-3">
            <input
              type={birthday ? 'date' : 'text'}
              placeholder={t('birthday')}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              onFocus={(e) => { e.currentTarget.type = 'date'; }}
              onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.type = 'text'; }}
              style={{ ...inputStyle, flex: 1, color: birthday ? 'var(--text-primary)' : undefined }}
            />
            <input
              type="text"
              placeholder={t('city')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Persona chips */}
        <div>
          <p
            className="text-xs font-bold mb-3 uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('iAm')}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {PERSONAS.map((p) => {
              const selected = selectedPersonas.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePersona(p.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200"
                  style={{
                    backgroundColor: selected ? 'rgba(232,168,56,0.12)' : 'rgba(255,255,255,0.04)',
                    color: selected ? '#E8A838' : 'rgba(255,255,255,0.6)',
                    border: `1px solid ${selected ? 'rgba(232,168,56,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-sm">{p.icon}</span>
                  <span>{t(p.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#1B2541',
            opacity: saving ? 0.7 : 1,
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '…' : `${t('continueBtn')} →`}
        </button>
      </div>
    </div>
  );
}
