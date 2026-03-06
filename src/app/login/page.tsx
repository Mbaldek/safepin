'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { registerPushSubscription } from '@/lib/pushSubscription';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const COUNTRY_CODES = [
  { flag: '🇫🇷', code: '+33', label: 'France' },
  { flag: '🇧🇪', code: '+32', label: 'Belgique' },
  { flag: '🇨🇭', code: '+41', label: 'Suisse' },
  { flag: '🇲🇦', code: '+212', label: 'Maroc' },
  { flag: '🇸🇳', code: '+221', label: 'Sénégal' },
  { flag: '🌍', code: '', label: 'Autre' },
];

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('already registered')) return 'Ce numéro est déjà utilisé';
  if (lower.includes('invalid') && lower.includes('otp')) return 'Code incorrect — vérifie le SMS';
  if (lower.includes('expired')) return 'Code expiré — demande un nouveau code';
  if (lower.includes('too many') || lower.includes('rate')) return 'Trop de tentatives — réessaie dans 1 heure';
  return 'Une erreur est survenue — réessaie';
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const router = useRouter();

  // Step: 'phone' or 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+33');
  const [localNumber, setLocalNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCd, setResendCd] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gradient = 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)';
  const fullPhone = `${countryCode}${localNumber.replace(/\D/g, '')}`;

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Start resend countdown
  const startResendCd = useCallback(() => {
    setResendCd(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCd((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  // ── OAuth ────────────────────────────────────────────────────────────────
  const callbackUrl = typeof window !== 'undefined'
    ? nextPath
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : `${window.location.origin}/auth/callback`
    : '/auth/callback';

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl },
      });
      if (error) throw error;
    } catch (e: unknown) {
      setError(e instanceof Error ? translateError(e.message) : 'Une erreur est survenue — réessaie');
      setLoading(false);
    }
  };

  // ── Step A: Send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = localNumber.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Numéro trop court — 8 chiffres minimum');
      return;
    }
    if (!countryCode) {
      setError('Sélectionne un indicatif pays');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      setStep('otp');
      startResendCd();
    } catch (e: unknown) {
      setError(e instanceof Error ? translateError(e.message) : 'Une erreur est survenue — réessaie');
    } finally {
      setLoading(false);
    }
  };

  // ── Step B: Verify OTP ──────────────────────────────────────────────────
  const verifyOtp = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' });
      if (error) throw error;

      // Check if profile exists → redirect accordingly
      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
        if (profile) registerPushSubscription().catch(() => {});
        router.push(profile ? (nextPath || '/map') : '/onboarding');
      } else {
        router.push('/onboarding');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? translateError(e.message) : 'Une erreur est survenue — réessaie');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [fullPhone, nextPath, router]);

  // ── OTP input handlers ──────────────────────────────────────────────────
  const handleOtpChange = useCallback((index: number, value: string) => {
    // Handle paste
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = cleaned[i] || '';
      }
      setOtp(newOtp);
      const focusIdx = Math.min(cleaned.length, 5);
      otpRefs.current[focusIdx]?.focus();
      if (cleaned.length === 6) {
        verifyOtp(cleaned);
      }
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (value && index === 5) {
      const token = newOtp.join('');
      if (token.length === 6) verifyOtp(token);
    }
  }, [otp, verifyOtp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCd > 0) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      startResendCd();
    } catch (e: unknown) {
      setError(e instanceof Error ? translateError(e.message) : 'Une erreur est survenue — réessaie');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: 16,
    color: '#FFFFFF',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 50,
    background: '#3BB4C1',
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    color: '#FFFFFF',
    cursor: 'pointer',
  };

  const btnOAuth: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 50,
    background: '#FFFFFF',
    border: 'none',
    fontSize: 15,
    fontWeight: 500,
    color: '#0F172A',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  };

  const otpInputStyle: React.CSSProperties = {
    width: 44,
    height: 52,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: gradient, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width={60} height={60} viewBox="0 0 80 80" fill="none" style={{ margin: '0 auto 16px' }}>
            <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
            <circle cx="40" cy="22" r="4" fill="#FFFFFF" />
          </svg>
          <h1 style={{ fontSize: 28, fontWeight: 300, color: '#FFFFFF', marginBottom: 8 }}>Ta communauté veille sur toi</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            {step === 'phone' ? 'Connecte-toi pour continuer' : `Code envoyé au ${fullPhone}`}
          </p>
        </div>

        {step === 'phone' && (
          <>
            {/* OAuth buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <button onClick={() => handleOAuth('google')} disabled={loading} style={btnOAuth}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuer avec Google
              </button>
              <button onClick={() => handleOAuth('apple')} disabled={loading} style={btnOAuth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Continuer avec Apple
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Phone form */}
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: 120,
                    padding: '14px 8px',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code || 'other'} value={c.code} style={{ color: '#0F172A' }}>
                      {c.flag} {c.code || '...'}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="6 12 34 56 78"
                  value={localNumber}
                  onChange={(e) => setLocalNumber(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  autoFocus
                />
              </div>
              {error && (
                <p style={{ fontSize: 14, color: '#F87171', textAlign: 'center' }}>{error}</p>
              )}
              <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
                {loading ? 'Envoi...' : 'Recevoir le code SMS'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* OTP inputs */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  style={otpInputStyle}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 14, color: '#F87171', textAlign: 'center' }}>{error}</p>
            )}

            {loading && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Vérification...</p>
            )}

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resendCd > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendCd > 0 ? 'rgba(255,255,255,0.4)' : '#3BB4C1',
                fontSize: 14,
                cursor: resendCd > 0 ? 'default' : 'pointer',
                padding: 0,
              }}
            >
              {resendCd > 0 ? `Renvoyer dans ${resendCd}s` : 'Renvoyer le code'}
            </button>

            {/* Back */}
            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}
            >
              Changer de numéro
            </button>
          </div>
        )}

        {/* Footer links */}
        <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Confidentialité</Link>
          <Link href="/terms" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Conditions</Link>
          <Link href="/cookies" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Cookies</Link>
        </div>
      </div>
    </div>
  );
}
