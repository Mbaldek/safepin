// src/app/login/page.tsx — KOVA landing + auth page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

const FEATURES = [
  { emoji: '📍', title: 'Live Safety Map', desc: 'See real-time safety reports from your community' },
  { emoji: '🆘', title: 'Emergency SOS', desc: 'One-tap alert with live GPS tracking & trusted contacts' },
  { emoji: '🗺️', title: 'Smart Trip Planner', desc: 'Find the safest route — not just the fastest' },
  { emoji: '💬', title: 'Community Chat', desc: 'Discuss, confirm & support each other in real time' },
  { emoji: '🔔', title: 'Proximity Alerts', desc: 'Get notified when something happens near you' },
  { emoji: '🛡️', title: 'Verified Identity', desc: 'Build trust with verified profiles & expertise badges' },
];

const STATS = [
  { value: '10K+', label: 'Reports filed' },
  { value: '30+', label: 'Languages' },
  { value: '24/7', label: 'Live monitoring' },
  { value: '100%', label: 'Free core features' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/map` },
    });
  }

  async function handleAppleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/map` },
    });
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/map` },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setMagicSent(true);
    toast.success('Magic link sent! Check your inbox.');
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
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success('Account created! Check your email to confirm.');
      setMode('signin');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success('Welcome back!');
      router.push('/map');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Navbar ─────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-lg"
            style={{ boxShadow: '0 4px 12px var(--accent-glow)' }}
          >
            🛡️
          </div>
          <span className="text-lg font-extrabold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            KO<span style={{ color: 'var(--accent)' }}>V</span>A
          </span>
        </div>
        <ThemeToggle />
      </nav>

      {/* ─── Hero ──────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-8 pb-10">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.65rem] font-bold mb-5"
          style={{ backgroundColor: 'rgba(244,63,94,0.10)', color: 'var(--accent)' }}
        >
          <span>🛡️</span> Community-powered safety
        </div>
        <h1
          className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-md"
          style={{ color: 'var(--text-primary)' }}
        >
          A safer world,{' '}
          <span className="bg-gradient-to-r from-[#f43f5e] to-[#e11d48] bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
            mapped by women
          </span>{' '}
          — for everyone.
        </h1>
        <p className="text-sm mt-3 max-w-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Report, navigate & protect each other with real-time safety intelligence.
          Free, open, and built by the community.
        </p>
      </section>

      {/* ─── Stats ─────────────────────────────────── */}
      <section className="flex justify-center gap-3 px-6 pb-8">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex-1 max-w-[90px] text-center py-3 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>{s.value}</p>
            <p className="text-[0.55rem] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </section>

      {/* ─── Auth Card ─────────────────────────────── */}
      <section className="flex justify-center px-5 pb-8">
        <div
          className="w-full max-w-sm rounded-3xl p-5"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-black text-center mb-4" style={{ color: 'var(--text-primary)' }}>
            Get started
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
              Continue with Google
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
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>OR</span>
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
                {m === 'magic' ? 'Magic Link' : m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Magic link form */}
          {mode === 'magic' && (
            <div className="space-y-3">
              {magicSent ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">✉️</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Check your inbox</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    We sent a magic link to <strong>{email}</strong>
                  </p>
                  <button
                    onClick={() => setMagicSent(false)}
                    className="text-xs font-bold mt-4 transition hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                  >
                    Send again
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                    {loading ? 'Sending...' : 'Send magic link'}
                  </button>
                  <p className="text-[0.6rem] text-center" style={{ color: 'var(--text-muted)' }}>
                    No password needed — we'll email you a sign-in link
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
                  placeholder="Name"
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
                placeholder="Password"
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
                {loading ? '...' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────── */}
      <section className="px-5 pb-10">
        <h2 className="text-lg font-black text-center mb-5" style={{ color: 'var(--text-primary)' }}>
          Everything you need to stay safe
        </h2>
        <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-3.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xl mb-1.5">{f.emoji}</p>
              <p className="text-xs font-black mb-0.5" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
              <p className="text-[0.6rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Social Proof ──────────────────────────── */}
      <section className="px-5 pb-10">
        <div
          className="max-w-sm mx-auto rounded-2xl p-5 text-center"
          style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}
        >
          <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            &ldquo;KOVA gave me the confidence to walk home at night.
            Knowing my community has my back changes everything.&rdquo;
          </p>
          <p className="text-xs mt-3 font-bold" style={{ color: 'var(--accent)' }}>
            — KOVA user, Paris
          </p>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────── */}
      <footer
        className="mt-auto px-5 py-6 text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-center gap-4 mb-3">
          <a href="/privacy" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            Privacy Policy
          </a>
          <a href="/terms" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            Terms of Service
          </a>
          <a href="/cookies" className="text-[0.6rem] font-bold transition hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            Cookie Policy
          </a>
        </div>
        <p className="text-[0.55rem]" style={{ color: 'var(--text-placeholder)' }}>
          &copy; {new Date().getFullYear()} KOVA. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
