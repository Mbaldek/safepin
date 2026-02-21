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

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/map` },
    });
  }

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
      toast.success('Account created! Check your email to confirm, or just sign in.');
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

      {/* Google sign-in */}
      <div className="w-full max-w-sm space-y-3 mb-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold transition hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M47.532 24.552c0-1.636-.147-3.2-.408-4.704H24.48v8.928h12.96c-.576 2.952-2.232 5.472-4.728 7.152v5.88h7.632c4.464-4.104 7.188-10.152 7.188-17.256z" fill="#4285F4"/>
            <path d="M24.48 48c6.48 0 11.928-2.136 15.888-5.784l-7.632-5.88c-2.16 1.44-4.92 2.304-8.256 2.304-6.336 0-11.712-4.272-13.632-10.032H2.952v6.072C6.888 42.888 15.12 48 24.48 48z" fill="#34A853"/>
            <path d="M10.848 28.608c-.504-1.44-.792-2.976-.792-4.608s.288-3.168.792-4.608v-6.072H2.952A23.976 23.976 0 0 0 .48 24c0 3.888.912 7.56 2.472 10.68l7.896-6.072z" fill="#FBBC05"/>
            <path d="M24.48 9.552c3.576 0 6.768 1.224 9.288 3.624l6.936-6.936C36.384 2.424 30.936 0 24.48 0 15.12 0 6.888 5.112 2.952 13.32l7.896 6.072c1.92-5.76 7.296-9.84 13.632-9.84z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3 w-full max-w-sm mb-4">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>OR</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {/* Form */}
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