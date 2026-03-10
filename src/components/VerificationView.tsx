// src/components/VerificationView.tsx
// ID + face verification using Veriff (veriff.com) — EU-native, supports French IDs
// Env vars: VERIFF_API_KEY, VERIFF_SECRET_KEY

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { useToast } from '@/hooks/useToast';

function getColors(isDark: boolean) {
  return isDark ? {
    bgPrimary: '#0F172A',
    bgSecondary: '#1E293B',
    bgCard: '#334155',
    border: 'rgba(255,255,255,0.12)',
    textPrimary: '#FFFFFF',
    textMuted: '#64748B',
    accent: '#3BB4C1',
  } : {
    bgPrimary: '#F8FAFC',
    bgSecondary: '#FFFFFF',
    bgCard: '#FFFFFF',
    border: 'rgba(15,23,42,0.10)',
    textPrimary: '#0F172A',
    textMuted: '#94A3B8',
    accent: '#C48A1E',
  };
}

// Veriff incontext SDK types (loaded at runtime from CDN)
declare global {
  interface Window {
    veriffSDK?: {
      createVeriffFrame: (opts: {
        url: string;
        onEvent?: (msg: { action: string }) => void;
      }) => void;
    };
  }
}

type VerifStatus = 'unverified' | 'pending' | 'approved' | 'declined';

function getStatusConfig(c: ReturnType<typeof getColors>): Record<VerifStatus, { emoji: string; label: string; color: string; bg: string }> {
  return {
    unverified: { emoji: '\u{1FAAA}', label: 'Identity not verified', color: c.textMuted, bg: c.bgCard },
    pending:    { emoji: '\u23F3',     label: 'Under review',          color: '#f59e0b',  bg: 'rgba(245,158,11,0.1)' },
    approved:   { emoji: '\u2705',     label: 'Verified',              color: '#10b981',  bg: 'rgba(16,185,129,0.1)' },
    declined:   { emoji: '\u274C',     label: 'Declined \u2014 try again',  color: '#ef4444',  bg: 'rgba(239,68,68,0.1)'  },
  };
}

const VERIFF_CDN = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';

export default function VerificationView({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const isDark = useTheme(s => s.theme) === 'dark';
  const c = getColors(isDark);
  const STATUS_CONFIG = getStatusConfig(c);
  const { userId, userProfile, setUserProfile } = useStore();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'active' | 'done'>('idle');
  const currentStatus: VerifStatus = (userProfile?.verification_status as VerifStatus) ?? 'unverified';
  const [displayStatus, setDisplayStatus] = useState<VerifStatus>(currentStatus);

  useEffect(() => {
    setDisplayStatus((userProfile?.verification_status as VerifStatus) ?? 'unverified');
  }, [userProfile?.verification_status]);

  async function loadVeriffSDK(): Promise<boolean> {
    if (window.veriffSDK) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = VERIFF_CDN;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function startVerification() {
    if (!userId) return;
    setPhase('loading');

    try {
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to create verification session');
      }
      const { sessionUrl } = await res.json() as { sessionUrl: string };

      const loaded = await loadVeriffSDK();
      if (!loaded || !window.veriffSDK) {
        throw new Error('Veriff SDK failed to load');
      }

      setPhase('active');

      window.veriffSDK.createVeriffFrame({
        url: sessionUrl,
        onEvent: async (msg) => {
          if (msg.action === 'FINISHED') {
            setDisplayStatus('pending');
            if (userProfile) {
              setUserProfile({ ...userProfile, verification_status: 'pending' });
            }
            await supabase.from('profiles')
              .update({ verification_status: 'pending' })
              .eq('id', userId);
            setPhase('done');
          } else if (msg.action === 'CANCELED') {
            setPhase('idle');
          }
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification unavailable');
      setPhase('idle');
    }
  }

  const daysSinceSignup = userProfile?.created_at
    ? Math.floor((Date.now() - new Date(userProfile.created_at).getTime()) / 86400000)
    : 0;
  const showVerifyNudge = userProfile && !userProfile.verified && daysSinceSignup >= 2 && daysSinceSignup <= 7;
  const daysRemaining = 7 - daysSinceSignup;

  const cfg = STATUS_CONFIG[displayStatus];

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ backgroundColor: c.bgPrimary }}
    >
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: c.bgSecondary, borderBottom: `1px solid ${c.border}` }}
      >
        <button
          onClick={onClose}
          className="text-xl transition hover:opacity-60"
          style={{ color: c.textMuted }}
        >
          {'\u2190'}
        </button>
        <h2 className="text-base font-black" style={{ color: c.textPrimary }}>
          Identity Verification
        </h2>
        <div
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          Powered by Veriff
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[440px] mx-auto w-full px-5 py-8 flex flex-col gap-6">

          {showVerifyNudge && (
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{
                backgroundColor: 'rgba(245,158,11,0.08)',
                border: '1.5px solid rgba(245,158,11,0.35)',
              }}
            >
              <span className="text-2xl shrink-0">{daysRemaining <= 2 ? '\u23F3' : '\u{1F44B}'}</span>
              <div>
                <p className="text-sm font-black" style={{ color: '#f59e0b' }}>
                  {daysRemaining <= 2
                    ? `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to verify!`
                    : 'Verify your identity to unlock your trusted badge'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>
                  {daysRemaining <= 2
                    ? 'Complete verification now to keep your account in good standing.'
                    : 'Verified users build more trust in the Breveil community. It only takes 2 minutes.'}
                </p>
              </div>
            </div>
          )}

          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}44` }}
          >
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-black text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>
                {displayStatus === 'unverified' && 'Verify once \u2014 earn a trusted badge visible to all Breveil users'}
                {displayStatus === 'pending'    && 'Veriff is reviewing your documents. Usually takes a few minutes.'}
                {displayStatus === 'approved'   && 'Your identity has been confirmed. Trusted badge is active.'}
                {displayStatus === 'declined'   && 'Please try again with a clear, valid ID and good lighting.'}
              </p>
            </div>
          </div>

          {displayStatus !== 'approved' && displayStatus !== 'pending' && (
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-3" style={{ color: c.textMuted }}>
                What you'll need
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { emoji: '\u{1FAAA}', title: 'Government-issued photo ID', sub: "Carte nationale d'identit\u00e9, passport, or permis de conduire" },
                  { emoji: '\u{1F933}', title: 'A selfie',                   sub: 'Face clearly visible, good lighting, no glasses' },
                  { emoji: '\u23F1\uFE0F', title: '~2 minutes',              sub: 'Quick guided flow \u2014 fully secure' },
                ].map(({ emoji, title, sub }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: c.bgCard, border: `1px solid ${c.border}` }}
                  >
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: c.textPrimary }}>{title}</p>
                      <p className="text-xs" style={{ color: c.textMuted }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: c.bgCard, border: `1px solid ${c.border}` }}
          >
            <span className="text-base shrink-0 mt-0.5">{'\u{1F512}'}</span>
            <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}>
              Verification is handled by{' '}
              <a
                href="https://veriff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
                style={{ color: c.accent }}
              >
                Veriff
              </a>
              {' '}{'\u2014'} Estonian company, EU data hosting, GDPR-compliant. Your ID is processed by Veriff and never stored on Breveil servers.
            </p>
          </div>

          {(displayStatus === 'unverified' || displayStatus === 'declined') && (
            <button
              onClick={startVerification}
              disabled={phase === 'loading' || phase === 'active'}
              className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: c.accent, color: '#fff' }}
            >
              {phase === 'loading' ? 'Preparing\u2026' : phase === 'active' ? 'Verification in progress\u2026' : '\u{1FAAA} Start verification'}
            </button>
          )}

          {displayStatus === 'pending' && (
            <div
              className="text-center py-5 rounded-2xl"
              style={{ backgroundColor: c.bgCard, border: `1px solid ${c.border}` }}
            >
              <p className="text-sm font-bold" style={{ color: c.textMuted }}>
                {'\u23F3'} Documents submitted {'\u2014'} under review
              </p>
              <p className="text-xs mt-1" style={{ color: c.textMuted }}>
                You'll see a badge on your profile once Veriff approves.
              </p>
            </div>
          )}

          {displayStatus === 'approved' && (
            <div
              className="text-center py-6 rounded-2xl"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)' }}
            >
              <p className="text-2xl mb-1">{'\u2705'}</p>
              <p className="text-sm font-black" style={{ color: '#10b981' }}>Identity verified</p>
              <p className="text-xs mt-1" style={{ color: c.textMuted }}>
                Your trusted badge is visible to other users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
