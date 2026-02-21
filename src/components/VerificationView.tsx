// src/components/VerificationView.tsx
// ID + face verification using Onfido (onfido.com) — EU region, supports French IDs
// Env vars: ONFIDO_API_TOKEN, NEXT_PUBLIC_ONFIDO_REGION=eu, ONFIDO_WEBHOOK_TOKEN

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

// Onfido CDN SDK types (loaded at runtime)
declare global {
  interface Window {
    Onfido?: {
      init: (config: OnfidoConfig) => OnfidoInstance;
    };
  }
}
interface OnfidoConfig {
  token: string;
  useModal?: boolean;
  isModalOpen?: boolean;
  region?: string;
  onComplete?: (data: Record<string, unknown>) => void;
  onError?: (err: { message: string; type: string }) => void;
  onUserExit?: (code: string) => void;
  onModalRequestClose?: () => void;
  steps?: (string | { type: string; options?: Record<string, unknown> })[];
}
interface OnfidoInstance {
  tearDown: () => void;
  setOptions: (opts: Partial<OnfidoConfig>) => void;
}

type VerifStatus = 'unverified' | 'pending' | 'approved' | 'declined';

const STATUS_CONFIG: Record<VerifStatus, { emoji: string; label: string; color: string; bg: string }> = {
  unverified: { emoji: '🪪', label: 'Identity not verified', color: 'var(--text-muted)', bg: 'var(--bg-card)' },
  pending:    { emoji: '⏳', label: 'Under review',          color: '#f59e0b',            bg: 'rgba(245,158,11,0.1)' },
  approved:   { emoji: '✅', label: 'Verified',              color: '#10b981',            bg: 'rgba(16,185,129,0.1)' },
  declined:   { emoji: '❌', label: 'Declined — try again',  color: '#ef4444',            bg: 'rgba(239,68,68,0.1)'  },
};

const ONFIDO_CSS = 'https://sdk.onfido.com/v14/onfido.min.css';
const ONFIDO_JS  = 'https://sdk.onfido.com/v14/onfido.min.js';

export default function VerificationView({ onClose }: { onClose: () => void }) {
  const { userId, userProfile, setUserProfile } = useStore();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'active' | 'done'>('idle');
  const currentStatus: VerifStatus = (userProfile?.verification_status as VerifStatus) ?? 'unverified';
  const [displayStatus, setDisplayStatus] = useState<VerifStatus>(currentStatus);
  const onfidoRef = useRef<OnfidoInstance | null>(null);

  useEffect(() => {
    setDisplayStatus((userProfile?.verification_status as VerifStatus) ?? 'unverified');
  }, [userProfile?.verification_status]);

  // Cleanup Onfido on unmount
  useEffect(() => {
    return () => { onfidoRef.current?.tearDown(); };
  }, []);

  async function loadOnfidoSDK(): Promise<boolean> {
    if (window.Onfido) return true;
    return new Promise((resolve) => {
      if (!document.querySelector(`link[href="${ONFIDO_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = ONFIDO_CSS;
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = ONFIDO_JS;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function startVerification() {
    if (!userId) return;
    setPhase('loading');

    try {
      // Step 1: create applicant + get SDK token from our server
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to start verification');
      }
      const { sdkToken, applicantId } = await res.json() as { sdkToken: string; applicantId: string };

      // Step 2: load Onfido JS SDK from CDN
      const loaded = await loadOnfidoSDK();
      if (!loaded || !window.Onfido) {
        throw new Error('Onfido SDK failed to load. Check your internet connection.');
      }

      setPhase('active');

      // Step 3: open Onfido modal
      onfidoRef.current = window.Onfido.init({
        token: sdkToken,
        useModal: true,
        isModalOpen: true,
        region: (process.env.NEXT_PUBLIC_ONFIDO_REGION ?? 'EU').toUpperCase(),
        steps: [
          'welcome',
          {
            type: 'document',
            options: {
              documentTypes: {
                national_identity_card: { country: 'FRA' },
                passport: true,
                driving_licence: { country: 'FRA' },
              },
            },
          },
          { type: 'face', options: { requestedVariant: 'standard' } },
          'complete',
        ],
        onComplete: async () => {
          onfidoRef.current?.tearDown();
          // Step 4: trigger check creation server-side
          await fetch('/api/verify/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, applicantId }),
          });
          // Optimistically update local state
          setDisplayStatus('pending');
          if (userProfile) {
            setUserProfile({ ...userProfile, verification_status: 'pending', verification_id: applicantId });
          }
          await supabase.from('profiles')
            .update({ verification_status: 'pending', verification_id: applicantId })
            .eq('id', userId);
          setPhase('done');
        },
        onUserExit: () => {
          onfidoRef.current?.tearDown();
          setPhase('idle');
        },
        onModalRequestClose: () => {
          onfidoRef.current?.setOptions({ isModalOpen: false });
          setPhase('idle');
        },
        onError: (err) => {
          onfidoRef.current?.tearDown();
          toast.error(err?.message ?? 'Verification error');
          setPhase('idle');
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification unavailable');
      setPhase('idle');
    }
  }

  const cfg = STATUS_CONFIG[displayStatus];

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onClose}
          className="text-xl transition hover:opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          ←
        </button>
        <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
          Identity Verification
        </h2>
        <div
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          Powered by Onfido
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[440px] mx-auto w-full px-5 py-8 flex flex-col gap-6">

          {/* Status card */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}44` }}
          >
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-black text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {displayStatus === 'unverified' && 'Verify once — earn a trusted badge visible to all SafePin users'}
                {displayStatus === 'pending'    && 'Onfido is reviewing your documents. Usually takes a few minutes.'}
                {displayStatus === 'approved'   && 'Your identity has been confirmed. Trusted badge is active.'}
                {displayStatus === 'declined'   && 'Please try again with a valid ID and ensure your face is clearly visible.'}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {displayStatus !== 'approved' && displayStatus !== 'pending' && (
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                What you'll need
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { emoji: '🪪', title: 'Government-issued photo ID', sub: "Carte nationale d'identité, passport, or permis de conduire" },
                  { emoji: '🤳', title: 'A selfie',                   sub: 'Face clearly visible, good lighting, no glasses' },
                  { emoji: '⏱️', title: '~2 minutes',                 sub: 'Quick guided flow — fully secure' },
                ].map(({ emoji, title, sub }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-base shrink-0 mt-0.5">🔒</span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Verification is handled by{' '}
              <a
                href="https://onfido.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
                style={{ color: 'var(--accent)' }}
              >
                Onfido
              </a>
              {' '}— GDPR-compliant, EU data hosting. Your ID is processed by Onfido and never stored on SafePin servers. Onfido is ISO 27001 certified and used by major French fintechs (Alan, Lydia, etc).
            </p>
          </div>

          {/* CTA */}
          {(displayStatus === 'unverified' || displayStatus === 'declined') && (
            <button
              onClick={startVerification}
              disabled={phase === 'loading' || phase === 'active'}
              className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {phase === 'loading' ? 'Preparing…' : phase === 'active' ? 'Verification in progress…' : '🪪 Start verification'}
            </button>
          )}

          {displayStatus === 'pending' && (
            <div
              className="text-center py-5 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                ⏳ Documents submitted — under review
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                You'll see a badge on your profile once Onfido approves.
              </p>
            </div>
          )}

          {displayStatus === 'approved' && (
            <div
              className="text-center py-6 rounded-2xl"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)' }}
            >
              <p className="text-2xl mb-1">✅</p>
              <p className="text-sm font-black" style={{ color: '#10b981' }}>Identity verified</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Your trusted badge is visible to other users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
