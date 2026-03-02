// src/components/OnboardingFunnelV2.tsx — 5-step onboarding funnel (v2)

'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Check, ChevronRight, Copy, Link2, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { CitySelector } from './CitySelector';

const STORAGE_KEY = 'brume_onboarding_done';

// ─── useOnboardingDone — used by map/page.tsx ─────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingFunnelV2({ onComplete }: { onComplete?: () => void }) {
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Paris');
  const [cityCoords, setCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<number[]>([0, 3]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedContacts, setInvitedContacts] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;
  const inviteLink = typeof window !== 'undefined' && userId
    ? `${window.location.origin}/login?ref=${userId}`
    : '';

  function goNext() {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
    else void handleComplete();
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  function toggleGoal(i: number) {
    setSelectedGoals((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  async function handleComplete() {
    if (completing) return;
    setCompleting(true);

    if (userId) {
      await supabase.from('profiles').update({
        ...(name.trim() ? { display_name: name.trim() } : {}),
        city,
        onboarding_goals: selectedGoals,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      }).eq('id', userId);
    }

    // Sync middleware cookie
    document.cookie = 'ob_done=1;path=/;max-age=31536000';
    // Clear all onboarding localStorage flags
    ['brume_onboarding_done', 'ob_done', 'onboardingDone', 'onboarding_done', 'onboarding_step', 'onboardingStep']
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEY, '1');

    setCompleting(false);
    onComplete?.();
  }

  async function requestLocation() {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        });
      });
      setLocationGranted(true);
    } catch {
      // user denied — that's fine, Continue still works
    }
  }

  async function requestNotifications() {
    try {
      if (!('Notification' in window)) return;
      const result = await Notification.requestPermission();
      if (result === 'granted') setNotificationsGranted(true);
    } catch {
      // not supported in this browser
    }
  }

  async function handleInviteContact() {
    if (!inviteEmail.trim()) return;
    if (userId) {
      await supabase.from('pending_invites').insert({
        inviter_id: userId,
        contact_info: inviteEmail.trim(),
      });
    }
    setInvitedContacts((prev) => [...prev, inviteEmail.trim()]);
    setInviteEmail('');
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('avatarInvalidType'));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('avatarTooLarge'));
      e.target.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) {
        toast.error(t('avatarUploadFailed'));
        return;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
      setAvatar(avatarUrl);
      toast.success(t('avatarUploaded'));
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  // ─── Rendered goals list ────────────────────────────────────────────────────
  const GOALS = [
    { e: '🛡️', key: 'v2Goal1' as const },
    { e: '📍', key: 'v2Goal2' as const },
    { e: '👥', key: 'v2Goal3' as const },
    { e: '🚶‍♀️', key: 'v2Goal4' as const },
    { e: '💛', key: 'v2Goal5' as const },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-600 flex flex-col"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ── Top bar: back · progress dots · skip ─────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button
          onClick={goBack}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-opacity ${
            currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label={t('back')}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 24 : 8,
                height: 8,
                background:
                  i === currentStep
                    ? '#E8A838'
                    : i < currentStep
                    ? 'rgba(232,168,56,0.5)'
                    : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => void handleComplete()}
          disabled={completing}
          className="text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {t('passer')}
        </button>
      </div>

      {/* ── Sliding screens ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="absolute inset-0 flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >

          {/* ── SCREEN 1: Welcome ─────────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center px-6 py-8">
            <div className="mb-12">
              <BreveilSymbol />
            </div>

            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 28,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {t('welcome')}
            </h1>

            <p style={{ fontSize: 15, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280, marginBottom: 40 }}>
              {t('v2Tagline')}
            </p>

            <div className="flex flex-col gap-3 w-full max-w-75">
              {([
                { e: '🗺️', label: t('v2Prop1') },
                { e: '🆘',  label: t('v2Prop2') },
                { e: '💛',  label: t('v2Prop3') },
              ] as const).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-full"
                  style={{ background: 'var(--bg-card)', fontSize: 13, color: 'var(--text-secondary)' }}
                >
                  <span>{item.e}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="w-full mt-auto pt-8">
              <button
                onClick={goNext}
                className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {t('start')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SCREEN 2: Profile ─────────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {t('nameTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 40 }}>
              {t('nameSub')}
            </p>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center mb-2 transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: 'rgba(255,255,255,0.15)' }}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : avatarUploading ? (
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#E8A838' }}
                  />
                ) : (
                  <Camera className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
                )}
              </button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('addPhoto')}</span>
            </div>

            {/* Name input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder2')}
              className="w-full h-12 px-4 rounded-xl mb-6 focus:outline-none"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border)',
              }}
            />

            {/* City row */}
            <div className="flex items-center gap-3 mb-auto">
              <span
                className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                style={{ background: 'var(--bg-card)', fontSize: 14, color: 'var(--text-primary)' }}
              >
                📍 {city}
              </span>
              <button
                onClick={() => setShowCitySelector(true)}
                style={{ color: '#E8A838', fontSize: 14, fontWeight: 500 }}
              >
                {t('changeCity')}
              </button>
            </div>

            <div className="w-full mt-auto pt-8">
              <button
                onClick={goNext}
                className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SCREEN 3: Goals ───────────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {t('v2GoalsTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
              {t('v2GoalsSub')}
            </p>

            <div className="flex flex-col gap-3 mb-auto">
              {GOALS.map((g, i) => {
                const sel = selectedGoals.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleGoal(i)}
                    className="w-full h-14 px-4 rounded-xl flex items-center gap-3 transition-all border"
                    style={{
                      background: sel ? 'rgba(232,168,56,0.08)' : 'var(--bg-card)',
                      borderColor: sel ? 'rgba(232,168,56,0.3)' : 'var(--border)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: sel ? 'rgba(232,168,56,0.15)' : 'rgba(255,255,255,0.06)' }}
                    >
                      {g.e}
                    </div>
                    <span className="text-left flex-1" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                      {t(g.key)}
                    </span>
                    {sel && <Check className="w-5 h-5 shrink-0" style={{ color: '#E8A838' }} />}
                  </button>
                );
              })}
            </div>

            <div className="w-full mt-auto pt-8">
              <button
                onClick={goNext}
                className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SCREEN 4: Permissions ─────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {t('permissionsTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
              {t('permissionsSub')}
            </p>

            <div className="flex flex-col gap-4 mb-8">
              {/* Location card */}
              <div
                className="p-4 rounded-xl border transition-all"
                style={{
                  background: locationGranted ? 'rgba(107,166,142,0.1)' : 'var(--bg-card)',
                  borderColor: locationGranted ? '#6BA68E' : 'var(--border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('locationCardTitle')}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {t('locationCardDesc')}
                    </p>
                  </div>
                  {locationGranted ? (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#6BA68E' }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => void requestLocation()}
                      className="px-4 py-1.5 text-[13px] font-medium rounded-full shrink-0"
                      style={{ background: '#E8A838', color: '#1B2541' }}
                    >
                      {t('allow')}
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications card */}
              <div
                className="p-4 rounded-xl border transition-all"
                style={{
                  background: notificationsGranted ? 'rgba(107,166,142,0.1)' : 'var(--bg-card)',
                  borderColor: notificationsGranted ? '#6BA68E' : 'var(--border)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔔</span>
                  <div className="flex-1">
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('notifCardTitle')}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {t('notifCardDesc')}
                    </p>
                  </div>
                  {notificationsGranted ? (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#6BA68E' }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <button
                      onClick={() => void requestNotifications()}
                      className="px-4 py-1.5 text-[13px] font-medium rounded-full shrink-0"
                      style={{ background: '#E8A838', color: '#1B2541' }}
                    >
                      {t('allow')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-center gap-2 mb-auto"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              <span>🔒</span>
              <span>{t('privacyNote')}</span>
            </div>

            <div className="w-full mt-auto pt-8">
              <button
                onClick={goNext}
                className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── SCREEN 5: Circle ──────────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 26,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {t('circleTitle2')}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                textAlign: 'center',
                maxWidth: 320,
                margin: '0 auto 32px',
              }}
            >
              {t('circleSub2')}
            </p>

            {/* Avatar cluster illustration */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div
                  className="absolute inset-0 blur-xl rounded-full scale-150"
                  style={{ background: 'rgba(232,168,56,0.15)' }}
                />
                <div className="relative flex items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 z-30"
                    style={{ background: '#8B7EC8', borderColor: 'var(--bg-secondary)' }}
                  >M</div>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg border-2 -ml-4 z-20"
                    style={{ background: '#D4687A', borderColor: 'var(--bg-secondary)' }}
                  >L</div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 -ml-3 z-10"
                    style={{ background: '#6BA68E', borderColor: 'var(--bg-secondary)' }}
                  >S</div>
                </div>
              </div>
            </div>

            {/* Invite input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('invitePlaceholder')}
                className="w-full h-12 pl-4 pr-24 rounded-xl focus:outline-none"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1.5px solid var(--border)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && void handleInviteContact()}
              />
              <button
                onClick={() => void handleInviteContact()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-[13px] font-medium rounded-lg"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {t('send')}
              </button>
            </div>

            {/* Share link row */}
            <div
              className="flex items-center justify-center gap-2 mb-4"
              style={{ fontSize: 14, color: 'var(--text-muted)' }}
            >
              <Link2 className="w-4 h-4" />
              <span>{t('orShareLink')}</span>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: 'var(--bg-card)', fontSize: 13, color: 'var(--text-secondary)' }}
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink)
                    .then(() => toast.success(t('copy') + ' ✓'))
                    .catch(() => {});
                }}
              >
                <Copy className="w-4 h-4" /> {t('copy')}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
                style={{ background: 'var(--bg-card)', fontSize: 13, color: 'var(--text-secondary)' }}
                onClick={() => {
                  navigator.share?.({ title: 'Breveil', url: inviteLink }).catch(() => {});
                }}
              >
                <Share2 className="w-4 h-4" /> {t('shareBtn')}
              </button>
            </div>

            {/* Invited contact chips */}
            {invitedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {invitedContacts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(232,168,56,0.1)',
                      border: '1px solid rgba(232,168,56,0.2)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => setInvitedContacts((prev) => prev.filter((x) => x !== c))}
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.1)', fontSize: 10, color: 'var(--text-muted)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center mb-auto" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('addLater')}
            </p>

            <div className="w-full mt-auto pt-8 flex flex-col gap-3">
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                className="w-full h-12 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#E8A838', color: '#1B2541' }}
              >
                {completing ? '…' : t('finish')}
                {!completing && <ChevronRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                className="w-full h-10 transition-opacity disabled:opacity-40"
                style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}
              >
                {t('laterBtn')}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* City selector sheet */}
      <AnimatePresence>
        {showCitySelector && (
          <CitySelector
            value={city}
            onChange={(newCity) => setCity(newCity)}
            onClose={() => setShowCitySelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Breveil concentric arcs symbol ──────────────────────────────────────────
function BreveilSymbol() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 40C20 28.954 28.954 20 40 20" stroke="#E8A838" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 40C60 51.046 51.046 60 40 60" stroke="#E8A838" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 40C26 32.268 32.268 26 40 26" stroke="#8B7EC8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 40C54 47.732 47.732 54 40 54" stroke="#8B7EC8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 40C32 35.582 35.582 32 40 32" stroke="#E8A838" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 40C48 44.418 44.418 48 40 48" stroke="#E8A838" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" fill="#E8A838" />
    </svg>
  );
}
