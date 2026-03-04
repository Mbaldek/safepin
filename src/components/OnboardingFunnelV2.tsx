// src/components/OnboardingFunnelV2.tsx — 5-step onboarding funnel (v0 design)

'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, Check, ChevronRight,
  Copy, Link2, Share2,
} from 'lucide-react';
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

// ─── BreveilSymbol SVG ────────────────────────────────────────────────────────
function BreveilSymbol() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer arcs - Gold */}
      <path
        d="M20 40C20 28.954 28.954 20 40 20"
        stroke="#E8A838"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 40C60 51.046 51.046 60 40 60"
        stroke="#E8A838"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Middle arcs - Aurora Purple */}
      <path
        d="M26 40C26 32.268 32.268 26 40 26"
        stroke="#8B7EC8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M54 40C54 47.732 47.732 54 40 54"
        stroke="#8B7EC8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Inner arcs - Gold */}
      <path
        d="M32 40C32 35.582 35.582 32 40 32"
        stroke="#E8A838"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 40C48 44.418 44.418 48 40 48"
        stroke="#E8A838"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx="40" cy="40" r="4" fill="#E8A838" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingFunnelV2({ onComplete }: { onComplete?: () => void }) {
  const t = useTranslations('onboarding');
  const userId = useStore((s) => s.userId);

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Paris');
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

    document.cookie = 'ob_done=1;path=/;max-age=31536000';
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
      // user denied
    }
  }

  async function requestNotifications() {
    try {
      if (!('Notification' in window)) return;
      const result = await Notification.requestPermission();
      if (result === 'granted') setNotificationsGranted(true);
    } catch {
      // not supported
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

  // Goals data
  const goals = [
    { emoji: '🛡️', text: t('v2Goal1') },
    { emoji: '📍', text: t('v2Goal2') },
    { emoji: '👥', text: t('v2Goal3') },
    { emoji: '🚶‍♀️', text: t('v2Goal4') },
    { emoji: '💛', text: t('v2Goal5') },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        overflow: 'hidden',
        background: 'var(--surface-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', flexShrink: 0 }}>
        <button
          onClick={goBack}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            opacity: currentStep === 0 ? 0 : 1,
            pointerEvents: currentStep === 0 ? 'none' : 'auto',
            transition: 'opacity 200ms',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label={t('back')}
        >
          <ArrowLeft style={{ width: 20, height: 20, color: 'var(--text-primary)' }} />
        </button>

        {/* Progress Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 9999,
                transition: 'all 300ms',
                background:
                  i === currentStep
                    ? '#3BB4C1'
                    : i < currentStep
                    ? 'rgba(59, 180, 193, 0.6)'
                    : 'rgba(148, 163, 184, 0.3)',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => void handleComplete()}
          disabled={completing}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: completing ? 0.4 : 1,
            transition: 'color 200ms',
          }}
        >
          {t('passer')}
        </button>
      </div>

      {/* ── Content Area — horizontal slide ───────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
            transform: `translateX(-${currentStep * 100}%)`,
          }}
        >
          {/* ── SCREEN 1: Welcome ──────────────────────────────────── */}
          <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
            {/* Breveil Symbol */}
            <div style={{ marginBottom: 48 }}>
              <BreveilSymbol />
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 28, color: 'var(--text-primary)', fontStyle: 'italic', textAlign: 'center', marginBottom: 12, fontWeight: 400 }}>
              {t('welcome')}
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 280, marginBottom: 40 }}>
              {t('v2Tagline')}
            </p>

            {/* Value Props */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, marginBottom: 'auto' }}>
              {[
                { emoji: '🗺️', text: t('v2Prop1') },
                { emoji: '🆘', text: t('v2Prop2') },
                { emoji: '💛', text: t('v2Prop3') },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 40,
                    padding: '0 16px',
                    background: 'var(--surface-card)',
                    borderRadius: 9999,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32 }}>
              <button
                onClick={goNext}
                style={{
                  width: '100%',
                  height: 48,
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'opacity 200ms',
                }}
              >
                {t('start')}
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* ── SCREEN 2: Profile ──────────────────────────────────── */}
          <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
            {/* Title */}
            <h1 style={{ fontSize: 26, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>
              {t('nameTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 40 }}>
              {t('nameSub')}
            </p>

            {/* Profile Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: avatar ? 'none' : '2px dashed rgba(148, 163, 184, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  background: 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  opacity: avatarUploading ? 0.4 : 1,
                  transition: 'opacity 200ms',
                  padding: 0,
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : avatarUploading ? (
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #3BB4C1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Camera style={{ width: 24, height: 24, color: 'var(--text-secondary)' }} />
                )}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('addPhoto')}
              </span>
            </div>

            {/* Name Input */}
            <div style={{ marginBottom: 24 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder2')}
                style={{
                  width: '100%',
                  height: 48,
                  background: 'var(--surface-card)',
                  padding: '0 16px',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  outline: 'none',
                  transition: 'border-color 200ms',
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = '#3BB4C1'; }}
                onBlur={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
              />
            </div>

            {/* City Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: 'var(--surface-card)',
                borderRadius: 9999,
                fontSize: 14,
                color: 'var(--text-primary)',
              }}>
                <span>📍</span>
                <span>{city}</span>
              </span>
              <button
                onClick={() => setShowCitySelector(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3BB4C1',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t('changeCity')}
              </button>
            </div>

            {/* CTA */}
            <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32 }}>
              <button
                onClick={goNext}
                style={{
                  width: '100%',
                  height: 48,
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {t('continueBtn')}
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* ── SCREEN 3: Goals ────────────────────────────────────── */}
          <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
            <h1 style={{ fontSize: 26, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>
              {t('v2GoalsTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>
              {t('v2GoalsSub')}
            </p>

            {/* Goal Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'auto' }}>
              {goals.map((goal, i) => {
                const isSelected = selectedGoals.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleGoal(i)}
                    style={{
                      width: '100%',
                      height: 56,
                      padding: '0 16px',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: isSelected ? 'rgba(59, 180, 193, 0.1)' : 'var(--surface-card)',
                      border: isSelected ? '1px solid #3BB4C1' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                        background: isSelected ? 'rgba(59, 180, 193, 0.2)' : 'var(--surface-elevated)',
                      }}
                    >
                      {goal.emoji}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', textAlign: 'left', flex: 1 }}>
                      {goal.text}
                    </span>
                    {isSelected && (
                      <Check style={{ width: 20, height: 20, color: '#3BB4C1', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32 }}>
              <button
                onClick={goNext}
                style={{
                  width: '100%',
                  height: 48,
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {t('continueBtn')}
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* ── SCREEN 4: Permissions ──────────────────────────────── */}
          <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
            <h1 style={{ fontSize: 26, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>
              {t('permissionsTitle')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>
              {t('permissionsSub')}
            </p>

            {/* Permission Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              {/* Location */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: locationGranted ? '1px solid var(--semantic-success)' : '1px solid transparent',
                  background: locationGranted ? 'rgba(52, 211, 153, 0.1)' : 'var(--surface-card)',
                  transition: 'all 200ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('locationCardTitle')}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t('locationCardDesc')}
                    </p>
                  </div>
                  {locationGranted ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--semantic-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                    </div>
                  ) : (
                    <button
                      onClick={() => void requestLocation()}
                      style={{
                        padding: '6px 16px',
                        background: '#3BB4C1',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 9999,
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'opacity 200ms',
                      }}
                    >
                      {t('allow')}
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: notificationsGranted ? '1px solid var(--semantic-success)' : '1px solid transparent',
                  background: notificationsGranted ? 'rgba(52, 211, 153, 0.1)' : 'var(--surface-card)',
                  transition: 'all 200ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t('notifCardTitle')}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {t('notifCardDesc')}
                    </p>
                  </div>
                  {notificationsGranted ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--semantic-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                    </div>
                  ) : (
                    <button
                      onClick={() => void requestNotifications()}
                      style={{
                        padding: '6px 16px',
                        background: '#3BB4C1',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 9999,
                        border: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'opacity 200ms',
                      }}
                    >
                      {t('allow')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Reassurance */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 'auto' }}>
              <span>🔒</span>
              <span>{t('privacyNote')}</span>
            </div>

            {/* CTA */}
            <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32 }}>
              <button
                onClick={goNext}
                style={{
                  width: '100%',
                  height: 48,
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {t('continueBtn')}
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* ── SCREEN 5: Circle ───────────────────────────────────── */}
          <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
            <h1 style={{ fontSize: 26, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>
              {t('circleTitle2')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 320, margin: '0 auto 32px' }}>
              {t('circleSub2')}
            </p>

            {/* Avatar Illustration */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(59, 180, 193, 0.2)', filter: 'blur(20px)', borderRadius: '50%', transform: 'scale(1.5)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#8B7EC8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 600, fontSize: 14, border: '2px solid var(--surface-base)', zIndex: 30 }}>M</div>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 600, fontSize: 18, border: '2px solid var(--surface-base)', marginLeft: -16, zIndex: 20 }}>L</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--semantic-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 600, fontSize: 14, border: '2px solid var(--surface-base)', marginLeft: -12, zIndex: 10 }}>S</div>
                </div>
              </div>
            </div>

            {/* Invite Input */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type="text"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('invitePlaceholder')}
                style={{
                  width: '100%',
                  height: 48,
                  background: 'var(--surface-card)',
                  paddingLeft: 16,
                  paddingRight: 96,
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  border: 'none',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(59,180,193,0.5)'; }}
                onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                onKeyDown={(e) => e.key === 'Enter' && void handleInviteContact()}
              />
              <button
                onClick={() => void handleInviteContact()}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '6px 16px',
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 200ms',
                }}
              >
                {t('send')}
              </button>
            </div>

            {/* Share Link Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              <Link2 style={{ width: 16, height: 16 }} />
              <span>{t('orShareLink')}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink)
                    .then(() => toast.success(t('copy') + ' ✓'))
                    .catch(() => {});
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'var(--surface-card)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 200ms',
                }}
              >
                <Copy style={{ width: 16, height: 16 }} />
                {t('copy')}
              </button>
              <button
                onClick={() => {
                  navigator.share?.({ title: 'Breveil', url: inviteLink }).catch(() => {});
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'var(--surface-card)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 200ms',
                }}
              >
                <Share2 style={{ width: 16, height: 16 }} />
                {t('shareBtn')}
              </button>
            </div>

            {/* Invited Contacts */}
            {invitedContacts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {invitedContacts.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      background: 'rgba(59, 180, 193, 0.1)',
                      border: '1px solid rgba(59, 180, 193, 0.3)',
                      borderRadius: 9999,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{c}</span>
                    <button
                      onClick={() => setInvitedContacts((prev) => prev.filter((x) => x !== c))}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'rgba(148, 163, 184, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 200ms',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Helper Text */}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'auto' }}>
              {t('addLater')}
            </p>

            {/* CTA */}
            <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                style={{
                  width: '100%',
                  height: 48,
                  background: '#3BB4C1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  opacity: completing ? 0.6 : 1,
                  transition: 'opacity 200ms',
                }}
              >
                {completing ? (
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #FFF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    {t('finish')}
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </>
                )}
              </button>
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                style={{
                  width: '100%',
                  height: 40,
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: completing ? 0.4 : 1,
                  transition: 'opacity 200ms, color 200ms',
                }}
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
