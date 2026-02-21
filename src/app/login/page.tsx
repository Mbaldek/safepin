// src/app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
      // SIGN UP
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }, // This gets passed to the trigger that creates the profile
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
      // SIGN IN
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{
        background: 'radial-gradient(ellipse 60% 50% at 70% 20%, rgba(244,63,94,0.1) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 20% 80%, rgba(56,189,248,0.06) 0%, transparent 70%), #0a0c10',
      }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-[rgba(244,63,94,0.3)]">
          🛡️
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          <span className="text-[#f43f5e]">Safe</span>Pin
        </h1>
        <p className="text-[#6b7490] text-sm mt-2 max-w-[260px]">
          A safer world, mapped by women — for women.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marie"
              required
              className="w-full bg-[#191d28] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-sm px-4 py-3.5 outline-none focus:border-[#f43f5e] focus:ring-2 focus:ring-[rgba(244,63,94,0.25)] transition placeholder:text-[#4a5068]"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-[#191d28] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-sm px-4 py-3.5 outline-none focus:border-[#f43f5e] focus:ring-2 focus:ring-[rgba(244,63,94,0.25)] transition placeholder:text-[#4a5068]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#6b7490] uppercase tracking-wider mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
            className="w-full bg-[#191d28] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-sm px-4 py-3.5 outline-none focus:border-[#f43f5e] focus:ring-2 focus:ring-[rgba(244,63,94,0.25)] transition placeholder:text-[#4a5068]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white font-bold rounded-xl py-3.5 text-sm tracking-wide shadow-lg shadow-[rgba(244,63,94,0.25)] hover:shadow-[rgba(244,63,94,0.4)] transition disabled:opacity-50"
        >
          {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {/* Toggle sign in / sign up */}
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-6 text-sm text-[#6b7490] hover:text-white transition"
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}