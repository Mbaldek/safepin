// src/components/OnboardingFunnelV2.tsx — 5-step onboarding funnel (v2)

'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Check, ChevronRight, Copy, Link2, Share2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { CitySelector } from './CitySelector';
import { Button, Input, SelectionCard } from './ui';

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

  // ─── Goals list ───────────────────────────────────────────────────────────────
  const GOALS = [
    { e: '🌙', key: 'v2Goal1' as const },
    { e: '🗺️', key: 'v2Goal2' as const },
    { e: '👥', key: 'v2Goal3' as const },
    { e: '💚', key: 'v2Goal4' as const },
    { e: '📍', key: 'v2Goal5' as const },
  ] as const;

  return (
    <div className="fixed inset-0 z-300 bg-gradient overflow-hidden flex flex-col">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ── Top bar: back · skip ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button
          onClick={goBack}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-opacity ${
            currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label={t('back')}
        >
          <ArrowLeft className="w-5 h-5 text-(--text-primary)" />
        </button>

        <button
          onClick={() => void handleComplete()}
          disabled={completing}
          className="text-sm font-medium text-(--text-tertiary) transition-opacity disabled:opacity-40"
        >
          {t('passer')}
        </button>
      </div>

      {/* ── Sliding screens ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="absolute inset-0 flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >

          {/* ── SCREEN 1: Welcome ───────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center px-6 py-8">
            <div className="mb-10">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center breathe">
                <Shield className="w-10 h-10 text-(--accent-teal)" />
              </div>
            </div>

            <h1 className="text-h2 text-center text-(--text-primary) mb-3">
              {t('welcome')}
            </h1>
            <p className="text-body-sm text-center text-(--text-secondary) max-w-72 mb-10">
              {t('v2Tagline')}
            </p>

            <div className="flex flex-col gap-3 w-full max-w-75 mb-auto">
              {([
                { e: '🗺️', label: t('v2Prop1') },
                { e: '🆘', label: t('v2Prop2') },
                { e: '💛', label: t('v2Prop3') },
              ] as const).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-white/10 backdrop-blur text-body-sm text-(--text-secondary)"
                >
                  <span>{item.e}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="w-full pt-8">
              <Button variant="primary" fullWidth onClick={goNext}>
                {t('start')} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── SCREEN 2: Profile ───────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1 className="text-h2 text-center text-(--text-primary) mb-2">
              {t('nameTitle')}
            </h1>
            <p className="text-body-sm text-center text-(--text-secondary) mb-10">
              {t('nameSub')}
            </p>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center mb-2 transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : avatarUploading ? (
                  <div className="w-5 h-5 border-2 rounded-full animate-spin border-white/30 border-t-(--accent-teal)" />
                ) : (
                  <Camera className="w-6 h-6 text-white/40" />
                )}
              </button>
              <span className="text-xs text-white/40">{t('addPhoto')}</span>
            </div>

            {/* Name input */}
            <div className="mb-6">
              <Input
                label={t('namePlaceholder2')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* City row */}
            <div className="flex items-center gap-3 mb-auto">
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-body-sm text-(--text-primary)">
                📍 {city}
              </span>
              <button
                onClick={() => setShowCitySelector(true)}
                className="text-body-sm font-medium text-(--accent-teal)"
              >
                {t('changeCity')}
              </button>
            </div>

            <div className="w-full mt-auto pt-8">
              <Button variant="primary" fullWidth onClick={goNext}>
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── SCREEN 3: Goals ─────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1 className="text-h2 text-center text-(--text-primary) mb-2">
              {t('v2GoalsTitle')}
            </h1>
            <p className="text-body-sm text-center text-(--text-secondary) mb-8">
              {t('v2GoalsSub')}
            </p>

            <div className="flex flex-col gap-3 mb-auto">
              {GOALS.map((g, i) => (
                <SelectionCard
                  key={i}
                  emoji={g.e}
                  label={t(g.key)}
                  selected={selectedGoals.includes(i)}
                  onClick={() => toggleGoal(i)}
                />
              ))}
            </div>

            <div className="w-full mt-auto pt-8">
              <Button variant="primary" fullWidth onClick={goNext}>
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── SCREEN 4: Permissions ───────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1 className="text-h2 text-center text-(--text-primary) mb-2">
              {t('permissionsTitle')}
            </h1>
            <p className="text-body-sm text-center text-(--text-secondary) mb-8">
              {t('permissionsSub')}
            </p>

            <div className="flex flex-col gap-4 mb-8">
              {/* Location card */}
              <div className={`p-4 rounded-lg border transition-all ${
                locationGranted
                  ? 'bg-(--semantic-success-soft) border-(--semantic-success)'
                  : 'bg-white/10 backdrop-blur border-white/10'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-(--text-primary) mb-1">
                      {t('locationCardTitle')}
                    </h3>
                    <p className="text-body-sm text-(--text-secondary)">
                      {t('locationCardDesc')}
                    </p>
                  </div>
                  {locationGranted ? (
                    <div className="w-8 h-8 rounded-full bg-(--semantic-success) flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => void requestLocation()}>
                      {t('allow')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Notifications card */}
              <div className={`p-4 rounded-lg border transition-all ${
                notificationsGranted
                  ? 'bg-(--semantic-success-soft) border-(--semantic-success)'
                  : 'bg-white/10 backdrop-blur border-white/10'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔔</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-(--text-primary) mb-1">
                      {t('notifCardTitle')}
                    </h3>
                    <p className="text-body-sm text-(--text-secondary)">
                      {t('notifCardDesc')}
                    </p>
                  </div>
                  {notificationsGranted ? (
                    <div className="w-8 h-8 rounded-full bg-(--semantic-success) flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => void requestNotifications()}>
                      {t('allow')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-auto text-xs text-(--text-tertiary)">
              <span>🔒</span>
              <span>{t('privacyNote')}</span>
            </div>

            <div className="w-full mt-auto pt-8">
              <Button variant="primary" fullWidth onClick={goNext}>
                {t('continueBtn')} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── SCREEN 5: Circle ────────────────────────────────────── */}
          <div className="w-full shrink-0 flex flex-col px-6 py-8">
            <h1 className="text-h2 text-center text-(--text-primary) mb-2">
              {t('circleTitle2')}
            </h1>
            <p className="text-body-sm text-center text-(--text-secondary) max-w-80 mx-auto mb-8">
              {t('circleSub2')}
            </p>

            {/* Avatar cluster illustration */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div
                  className="absolute inset-0 blur-xl rounded-full scale-150"
                  style={{ background: 'rgba(59,180,193,0.15)' }}
                />
                <div className="relative flex items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-(--surface-base) z-30 bg-[#8B7EC8]">M</div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg border-2 border-(--surface-base) -ml-4 z-20 bg-(--accent-coral)">L</div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-(--surface-base) -ml-3 z-10 bg-(--semantic-success)">S</div>
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
                className="w-full h-12 pl-4 pr-24 rounded-md bg-(--surface-card) border border-(--border-default) text-(--text-primary) text-base focus:outline-none focus:border-(--gradient-start)"
                onKeyDown={(e) => e.key === 'Enter' && void handleInviteContact()}
              />
              <button
                onClick={() => void handleInviteContact()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm font-medium rounded-sm bg-white text-(--surface-base)"
              >
                {t('send')}
              </button>
            </div>

            {/* Share link row */}
            <div className="flex items-center justify-center gap-2 mb-4 text-body-sm text-(--text-secondary)">
              <Link2 className="w-4 h-4" />
              <span>{t('orShareLink')}</span>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 backdrop-blur text-body-sm text-(--text-secondary) transition-opacity hover:opacity-70"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink)
                    .then(() => toast.success(t('copy') + ' ✓'))
                    .catch(() => {});
                }}
              >
                <Copy className="w-4 h-4" /> {t('copy')}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 backdrop-blur text-body-sm text-(--text-secondary) transition-opacity hover:opacity-70"
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-body-sm text-(--text-secondary)"
                    style={{
                      background: 'rgba(59,180,193,0.1)',
                      border: '1px solid rgba(59,180,193,0.2)',
                    }}
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => setInvitedContacts((prev) => prev.filter((x) => x !== c))}
                      className="w-4 h-4 rounded-full flex items-center justify-center bg-white/10 text-[10px] text-(--text-tertiary)"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center mb-auto text-xs text-(--text-tertiary)">
              {t('addLater')}
            </p>

            <div className="w-full mt-auto pt-8 flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={() => void handleComplete()} loading={completing}>
                {t('finish')} {!completing && <ChevronRight className="w-4 h-4" />}
              </Button>
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                className="w-full h-10 text-body-sm text-(--text-tertiary) transition-opacity disabled:opacity-40"
              >
                {t('laterBtn')}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Progress dots (bottom) ────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 pb-[calc(var(--space-4)+env(safe-area-inset-bottom))] pt-4 shrink-0">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentStep ? 24 : 8,
              height: 8,
              background:
                i === currentStep
                  ? 'var(--accent-teal)'
                  : i < currentStep
                  ? 'rgba(59,180,193,0.5)'
                  : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
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
