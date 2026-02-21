// src/app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success('Account created! You can now sign in.');
      setIsSignUp(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success('Welcome back!');
      router.push('/map');
    }

    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'apple' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/map`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6 relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Theme toggle top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg" style={{ boxShadow: '0 8px 24px var(--accent-glow)' }}>
          🛡️
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--accent)' }}>Safe</span>
          <span style={{ color: 'var(--text-primary)' }}>Pin</span>
        </h1>
        <p className="text-sm mt-2 max-w-[260px]" style={{ color: 'var(--text-muted)' }}>
          A safer world, mapped by women — for women.
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="w-full max-w-sm space-y-2.5 mb-5">
        <button
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={() => handleOAuth('apple')}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>
      </div>

      {/* Divider */}
      <div className="w-full max-w-sm flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>OR</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marie"
              required
              className="w-full rounded-xl text-sm px-4 py-3.5 outline-none transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl text-sm px-4 py-3.5 outline-none transition"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            className="w-full rounded-xl text-sm px-4 py-3.5 outline-none transition"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white font-bold rounded-xl py-3.5 text-sm tracking-wide shadow-lg transition disabled:opacity-50"
          style={{ boxShadow: '0 8px 24px var(--accent-glow)' }}
        >
          {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {/* Toggle sign in / sign up */}
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-6 text-sm transition hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}