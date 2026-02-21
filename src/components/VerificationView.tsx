// src/components/VerificationView.tsx
// ID + face verification using Veriff (veriff.com) — EU-native, supports French IDs
// Env vars: VERIFF_API_KEY, VERIFF_SECRET_KEY

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

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

const STATUS_CONFIG: Record<VerifStatus, { emoji: string; label: string; color: string; bg: string }> = {
  unverified: { emoji: '🪪', label: 'Identity not verified', color: 'var(--text-muted)', bg: 'var(--bg-card)' },
  pending:    { emoji: '⏳', label: 'Under review',          color: '#f59e0b',            bg: 'rgba(245,158,11,0.1)' },
  approved:   { emoji: '✅', label: 'Verified',              color: '#10b981',            bg: 'rgba(16,185,129,0.1)' },
  declined:   { emoji: '❌', label: 'Declined — try again',  color: '#ef4444',            bg: 'rgba(239,68,68,0.1)'  },
};

const VERIFF_CDN = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';

export default function VerificationView({ onClose }: { onClose: () => void }) {
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
      // Step 1: create session server-side (userId stored as vendorData)
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

      // Step 2: load Veriff incontext SDK from CDN
      const loaded = await loadVeriffSDK();
      if (!loaded || !window.veriffSDK) {
        throw new Error('Veriff SDK failed to load');
      }

      setPhase('active');

      // Step 3: open Veriff frame
      window.veriffSDK.createVeriffFrame({
        url: sessionUrl,
        onEvent: async (msg) => {
          if (msg.action === 'FINISHED') {
            // User completed the flow — mark as pending until webhook arrives
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
          Powered by Veriff
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
                {displayStatus === 'pending'    && 'Veriff is reviewing your documents. Usually takes a few minutes.'}
                {displayStatus === 'approved'   && 'Your identity has been confirmed. Trusted badge is active.'}
                {displayStatus === 'declined'   && 'Please try again with a clear, valid ID and good lighting.'}
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
                href="https://veriff.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
                style={{ color: 'var(--accent)' }}
              >
                Veriff
              </a>
              {' '}— Estonian company, EU data hosting, GDPR-compliant. Your ID is processed by Veriff and never stored on SafePin servers.
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
                You'll see a badge on your profile once Veriff approves.
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
