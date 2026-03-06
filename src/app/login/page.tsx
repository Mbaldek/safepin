'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [sentMode, setSentMode] = useState<string>('magic');
  const router = useRouter();

  const gradient = 'linear-gradient(180deg, #3BB4C1 0%, #1E3A5F 45%, #4A2C5A 75%, #5C3D5E 100%)';

  const callbackUrl = nextPath
    ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    : `${window.location.origin}/auth/callback`;

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
      setError(e instanceof Error ? e.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
        setSentMode('reset');
        setMagicSent(true);
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        setSentMode('magic');
        setMagicSent(true);
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        setSentMode('signup');
        setMagicSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextPath || '/onboarding');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  if (magicSent) {
    return (
      <div style={{ minHeight: '100vh', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36 }}>✉️</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 300, color: '#FFFFFF', marginBottom: 12 }}>Check ton email</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
            {sentMode === 'reset'
              ? <>On t&apos;a envoyé un lien de réinitialisation à <strong>{email}</strong></>
              : <>On t&apos;a envoyé un lien de connexion à <strong>{email}</strong></>
            }
          </p>
          <button onClick={() => { setMagicSent(false); setMode('signin'); }} style={{ ...btnPrimary, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)' }}>
            Retour
          </button>
        </div>
      </div>
    );
  }

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
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Connecte-toi pour continuer</p>
        </div>

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

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 50, padding: 4 }}>
          {(['magic', 'signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 50,
                border: 'none',
                background: mode === m ? '#FFFFFF' : 'transparent',
                color: mode === m ? '#0F172A' : 'rgba(255,255,255,0.7)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {m === 'magic' ? 'Magic Link' : m === 'signin' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          {mode !== 'magic' && mode !== 'reset' && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          )}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', textAlign: 'right', padding: 0 }}
            >
              Mot de passe oublié ?
            </button>
          )}
          {error && (
            <p style={{ fontSize: 14, color: '#F87171', textAlign: 'center' }}>{error}</p>
          )}
          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
            {loading ? 'Chargement...' : mode === 'reset' ? 'Envoyer le lien' : mode === 'magic' ? 'Envoyer le lien' : mode === 'signup' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </form>

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
