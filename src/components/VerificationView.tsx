// src/components/VerificationView.tsx
// ID + face verification using Persona (withpersona.com)
// Env vars required: PERSONA_API_KEY, PERSONA_TEMPLATE_ID, NEXT_PUBLIC_PERSONA_ENV

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

// Persona CDN types
declare global {
  interface Window {
    Persona?: {
      Client: new (config: PersonaConfig) => PersonaClient;
    };
  }
}
interface PersonaConfig {
  inquiryId: string;
  sessionToken: string;
  environment?: string;
  onReady?: () => void;
  onComplete?: (data: { inquiryId: string; status: string }) => void;
  onCancel?: () => void;
  onError?: (err: { message: string }) => void;
}
interface PersonaClient {
  open: () => void;
  cancel: () => void;
}

type VerifStatus = 'unverified' | 'pending' | 'approved' | 'declined';

const STATUS_CONFIG: Record<VerifStatus, { emoji: string; label: string; color: string; bg: string }> = {
  unverified: { emoji: '🪪', label: 'Identity not verified', color: 'var(--text-muted)', bg: 'var(--bg-card)' },
  pending:    { emoji: '⏳', label: 'Under review',          color: '#f59e0b',            bg: 'rgba(245,158,11,0.1)' },
  approved:   { emoji: '✅', label: 'Verified',              color: '#10b981',            bg: 'rgba(16,185,129,0.1)' },
  declined:   { emoji: '❌', label: 'Declined — try again',  color: '#ef4444',            bg: 'rgba(239,68,68,0.1)'  },
};

export default function VerificationView({ onClose }: { onClose: () => void }) {
  const { userId, userProfile, setUserProfile } = useStore();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'widget' | 'done'>('idle');
  const currentStatus: VerifStatus = (userProfile?.verification_status as VerifStatus) ?? 'unverified';
  const [displayStatus, setDisplayStatus] = useState<VerifStatus>(currentStatus);

  // Keep in sync if profile updates
  useEffect(() => {
    setDisplayStatus((userProfile?.verification_status as VerifStatus) ?? 'unverified');
  }, [userProfile?.verification_status]);

  async function loadPersonaSDK(): Promise<boolean> {
    if (window.Persona) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.withpersona.com/dist/persona-v4.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function startVerification() {
    if (!userId) return;
    setPhase('loading');

    try {
      // 1. Create inquiry server-side
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to start verification');
      }

      const { inquiryId, sessionToken } = await res.json();

      // 2. Load Persona SDK
      const sdkLoaded = await loadPersonaSDK();

      if (!sdkLoaded || !window.Persona) {
        // Fallback: open Persona in new tab
        const env = process.env.NEXT_PUBLIC_PERSONA_ENV ?? 'sandbox';
        const url = `https://withpersona.com/verify?inquiry-id=${inquiryId}&session-token=${sessionToken}&environment=${env}`;
        window.open(url, '_blank');
        setPhase('done');
        await markPending(userId, inquiryId);
        return;
      }

      // 3. Open Persona inline widget
      setPhase('widget');
      const client = new window.Persona.Client({
        inquiryId,
        sessionToken,
        environment: process.env.NEXT_PUBLIC_PERSONA_ENV ?? 'sandbox',
        onReady: () => client.open(),
        onComplete: async ({ inquiryId: id }) => {
          await markPending(userId, id);
          setDisplayStatus('pending');
          setPhase('done');
        },
        onCancel: () => {
          setPhase('idle');
        },
        onError: (err) => {
          toast.error(err?.message ?? 'Verification error');
          setPhase('idle');
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification unavailable');
      setPhase('idle');
    }
  }

  async function markPending(uid: string, inquiryId: string) {
    await supabase.from('profiles').update({
      verification_status: 'pending',
      verification_id: inquiryId,
    }).eq('id', uid);
    if (userProfile) {
      setUserProfile({ ...userProfile, verification_status: 'pending', verification_id: inquiryId });
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[440px] mx-auto w-full px-5 py-8 flex flex-col gap-6">

          {/* Current status */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}22` }}
          >
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-black text-sm" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {displayStatus === 'unverified' && 'Verify once to unlock a trusted badge across the app'}
                {displayStatus === 'pending' && 'Our partner Persona is reviewing your documents (usually <24h)'}
                {displayStatus === 'approved' && 'Your identity has been confirmed. Trusted badge is active.'}
                {displayStatus === 'declined' && 'Please try again with a valid government-issued ID and clear selfie.'}
              </p>
            </div>
          </div>

          {/* What you'll need — only show if not approved */}
          {displayStatus !== 'approved' && (
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                What you'll need
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { emoji: '🪪', title: 'Government-issued photo ID', sub: 'Passport, national ID, or driver\'s license' },
                  { emoji: '🤳', title: 'A selfie',                   sub: 'Face clearly visible, good lighting' },
                  { emoji: '⏱️', title: '~2 minutes',                 sub: 'The process is quick and secure' },
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
                href="https://withpersona.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
                style={{ color: 'var(--accent)' }}
              >
                Persona
              </a>
              , an industry-standard KYC provider. Your ID documents are processed by Persona and never stored on SafePin servers.
            </p>
          </div>

          {/* CTA */}
          {(displayStatus === 'unverified' || displayStatus === 'declined') && (
            <button
              onClick={startVerification}
              disabled={phase === 'loading' || phase === 'widget'}
              className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {phase === 'loading' ? 'Starting…' : phase === 'widget' ? 'Verification in progress…' : '🪪 Start verification'}
            </button>
          )}

          {displayStatus === 'pending' && (
            <div
              className="text-center py-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                ⏳ Your verification is being reviewed
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                You'll see a badge on your profile once approved
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
