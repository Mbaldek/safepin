// src/app/login/page.tsx — Breveil landing + auth page

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { BreveilMonogram } from '@/components/BrandAssets';

function getAppOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}


export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('login');
  const locale = useLocale();

  function setLang(code: 'fr' | 'en') {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
    window.location.reload();
  }

  async function applyProfileLanguage(userId: string) {
    const { data } = await supabase.from('profiles').select('language').eq('id', userId).maybeSingle();
    if (data?.language) {
      document.cookie = `NEXT_LOCALE=${data.language};path=/;max-age=31536000`;
    }
  }

  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  // ─── Dev bypass ────────────────────────────────────
  const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL;
  const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD;
  const showDevLogin = !!devEmail && !!devPassword;

  async function handleDevLogin() {
    if (!devEmail || !devPassword) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.session) await applyProfileLanguage(data.session.user.id);
    router.push('/map');
  }

  // ─── Beta bypass (shared beta account) ───────────
  const betaEmail = process.env.NEXT_PUBLIC_BETA_EMAIL;
  const betaPassword = process.env.NEXT_PUBLIC_BETA_PASSWORD;

  async function handleBetaLogin() {
    if (!betaEmail || !betaPassword) { toast.error('Beta access unavailable'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: betaEmail, password: betaPassword });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.session) await applyProfileLanguage(data.session.user.id);
    router.push('/map');
  }

  // ─── Invite code state ───────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<null | {
    valid: boolean;
    organization_name?: string;
    spots_remaining?: number;
    reason?: string;
  }>(null);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from URL param (e.g. shared link with ?code=ASSO2024)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setInviteCode(urlCode.toUpperCase().trim());
      setInviteOpen(true);
    }
  }, []);

  const validateInviteCode = useCallback(async (code: string) => {
    if (code.length < 3) { setInviteStatus(null); return; }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setInviteStatus(data);
    } catch {
      setInviteStatus({ valid: false, reason: 'error' });
    }
    setInviteLoading(false);
  }, []);

  // Debounced validation + auto-validate URL pre-fill
  useEffect(() => {
    if (inviteCode.length >= 3) {
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
      inviteTimer.current = setTimeout(() => validateInviteCode(inviteCode), 500);
    } else {
      setInviteStatus(null);
    }
    return () => { if (inviteTimer.current) clearTimeout(inviteTimer.current); };
  }, [inviteCode, validateInviteCode]);

  /** Persist invite code before OAuth redirects */
  function persistInviteCode() {
    if (inviteCode && inviteStatus?.valid) {
      sessionStorage.setItem('breveil_invite_code', inviteCode.toUpperCase().trim());
    }
  }

  function getCallbackUrl() {
    const base = `${getAppOrigin()}/auth/callback`;
    if (inviteCode && inviteStatus?.valid) {
      return `${base}?invite_code=${encodeURIComponent(inviteCode.toUpperCase().trim())}`;
    }
    return base;
  }

  async function handleGoogleSignIn() {
    persistInviteCode();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getCallbackUrl() },
    });
  }

  async function handleAppleSignIn() {
    persistInviteCode();
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: getCallbackUrl() },
    });
  }

  function friendlyAuthError(msg: string): string {
    if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
      return t('errorRateLimit');
    }
    if (msg.includes('Invalid login credentials')) return t('errorInvalidCredentials');
    if (msg.includes('Email not confirmed')) return t('errorEmailNotConfirmed');
    if (msg.includes('User already registered')) return t('errorAlreadyRegistered');
    return msg;
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    persistInviteCode();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getCallbackUrl() },
    });
    setLoading(false);
    if (error) { toast.error(friendlyAuthError(error.message)); return; }
    setMagicSent(true);
    toast.success(t('magicLinkSuccess'));
  }

  async function redeemInviteCode() {
    if (!inviteCode || !inviteStatus?.valid) return;
    try {
      const res = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('invite.redeemed', { org: data.organization_name }));
      }
    } catch { /* silently fail — non-critical */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) { toast.error(friendlyAuthError(error.message)); setLoading(false); return; }
      // Sign in immediately after signup
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        toast.success(t('accountCreated'));
        setMode('signin');
        setLoading(false);
        return;
      }
      await redeemInviteCode();
      if (signInData.session) await applyProfileLanguage(signInData.session.user.id);
      toast.success(t('accountCreated'));
      router.push('/map');
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(friendlyAuthError(error.message)); setLoading(false); return; }
      await redeemInviteCode();
      if (signInData.session) await applyProfileLanguage(signInData.session.user.id);
      toast.success(t('welcomeBack'));
      router.push('/map');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Navbar ─────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <BreveilMonogram size={36} variant="dark" />
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.25rem', letterSpacing: '3px', color: 'var(--text-primary)' }}>
            BREVEIL
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showDevLogin && (
            <button
              onClick={handleDevLogin}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[0.6rem] font-bold transition hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              Dev
            </button>
          )}
          <button
            onClick={handleBetaLogin}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Beta
          </button>
          {/* FR / EN language toggle */}
          <div className="flex items-center rounded-xl overflow-hidden text-[0.65rem] font-bold"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            {(['fr', 'en'] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className="px-2.5 py-1.5 transition"
                style={locale === code
                  ? { backgroundColor: 'var(--accent)', color: 'var(--surface-base)' }
                  : { color: 'var(--text-muted)' }}
              >
                {code === 'fr' ? '🇫🇷' : '🇬🇧'} {code.toUpperCase()}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-8 pb-10">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold mb-5"
          style={{ backgroundColor: 'rgba(232,168,56,0.10)', color: 'var(--accent)' }}
        >
          <span>🛡️</span> {t('badge')}
        </div>
        <h1
          className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-md"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('heroTitle')}
        </h1>
      </section>


      {/* ─── Auth Card ─────────────────────────────── */}
      <section className="flex justify-center px-5 pb-8">
        <div
          className="w-full max-w-sm rounded-3xl p-5"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-black text-center mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('getStarted')}
          </h2>

          {/* Social auth */}
          <div className="flex flex-col gap-2.5 mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <path d="M47.532 24.552c0-1.636-.147-3.2-.408-4.704H24.48v8.928h12.96c-.576 2.952-2.232 5.472-4.728 7.152v5.88h7.632c4.464-4.104 7.188-10.152 7.188-17.256z" fill="#4285F4"/>
                <path d="M24.48 48c6.48 0 11.928-2.136 15.888-5.784l-7.632-5.88c-2.16 1.44-4.92 2.304-8.256 2.304-6.336 0-11.712-4.272-13.632-10.032H2.952v6.072C6.888 42.888 15.12 48 24.48 48z" fill="#34A853"/>
                <path d="M10.848 28.608c-.504-1.44-.792-2.976-.792-4.608s.288-3.168.792-4.608v-6.072H2.952A23.976 23.976 0 0 0 .48 24c0 3.888.912 7.56 2.472 10.68l7.896-6.072z" fill="#FBBC05"/>
                <path d="M24.48 9.552c3.576 0 6.768 1.224 9.288 3.624l6.936-6.936C36.384 2.424 30.936 0 24.48 0 15.12 0 6.888 5.112 2.952 13.32l7.896 6.072c1.92-5.76 7.296-9.84 13.632-9.84z" fill="#EA4335"/>
              </svg>
              {t('continueGoogle')}
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.45-3.74 4.25z"/>
              </svg>
              {t('continueApple')}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>{t('or')}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          {/* Magic link / email+password toggle */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            {(['magic', 'signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMagicSent(false); }}
                className="flex-1 py-1.5 rounded-lg text-[0.6rem] font-bold transition"
                style={{
                  backgroundColor: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}
              >
                {m === 'magic' ? t('magicLink') : m === 'signin' ? t('signIn') : t('signUp')}
              </button>
            ))}
          </div>

          {/* Magic link form */}
          {mode === 'magic' && (
            <div className="space-y-3">
              {magicSent ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">✉️</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('checkInbox')}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t('magicLinkSent')} <strong>{email}</strong>
                  </p>
                  <button
                    onClick={() => setMagicSent(false)}
                    className="text-xs font-bold mt-4 transition hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                  >
                    {t('sendAgain')}
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full rounded-xl text-sm px-4 py-3 outline-none"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
                  />
                  <button
                    onClick={handleMagicLink}
                    disabled={loading || !email.trim()}
                    className="w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {loading ? t('sending') : t('sendMagicLink')}
                  </button>
                  <p className="text-[0.6rem] text-center" style={{ color: 'var(--text-muted)' }}>
                    {t('magicLinkNote')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Email + password form */}
          {(mode === 'signin' || mode === 'signup') && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  required
                  className="w-full rounded-xl text-sm px-4 py-3 outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full rounded-xl text-sm px-4 py-3 outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                minLength={6}
                className="w-full rounded-xl text-sm px-4 py-3 outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {loading ? '...' : mode === 'signup' ? t('createAccount') : t('signIn')}
              </button>
            </form>
          )}

          {/* ─── Invite Code Section ──────────────────── */}
          <div className="mt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setInviteOpen(!inviteOpen)}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                🎟️ {t('invite.title')}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${inviteOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>
            {inviteOpen && (
              <div className="pb-3 space-y-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                  placeholder={t('invite.placeholder')}
                  maxLength={20}
                  className="w-full rounded-xl text-sm px-4 py-3 outline-none font-mono tracking-widest text-center"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                {inviteLoading && (
                  <div className="flex items-center gap-1.5 justify-center">
                    <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[0.65rem] font-bold" style={{ color: 'var(--text-muted)' }}>
                      {t('invite.validating')}
                    </span>
                  </div>
                )}
                {!inviteLoading && inviteStatus?.valid && (
                  <div className="flex items-center gap-1.5 justify-center">
                    <Check size={12} style={{ color: '#22c55e' }} />
                    <span className="text-[0.65rem] font-bold" style={{ color: '#22c55e' }}>
                      {t('invite.valid', {
                        org: inviteStatus.organization_name ?? '',
                        spots: String(inviteStatus.spots_remaining ?? 0),
                      })}
                    </span>
                  </div>
                )}
                {!inviteLoading && inviteStatus && !inviteStatus.valid && (
                  <div className="flex items-center gap-1.5 justify-center">
                    <AlertCircle size={12} style={{ color: 'var(--accent)' }} />
                    <span className="text-[0.65rem] font-bold" style={{ color: 'var(--accent)' }}>
                      {inviteStatus.reason === 'full'
                        ? t('invite.full')
                        : inviteStatus.reason === 'expired'
                          ? t('invite.expired')
                          : t('invite.invalid')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Legal links ───────────────────────────── */}
      <div className="flex items-center justify-center gap-4 pb-10 pt-2">
        <a href="/privacy" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
          {t('privacyPolicy')}
        </a>
        <a href="/terms" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
          {t('termsOfService')}
        </a>
        <a href="/cookies" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
          {t('cookiePolicy')}
        </a>
      </div>
    </div>
  );
}
