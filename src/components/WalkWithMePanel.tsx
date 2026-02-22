// src/components/WalkWithMePanel.tsx — S45: Walk With Me Sessions

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { X, Copy, Users, Clock, Shield } from 'lucide-react';
import type { WalkSession } from '@/types';

type Props = {
  userId: string;
  destination?: string;
  onClose: () => void;
};

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function WalkWithMePanel({ userId, destination, onClose }: Props) {
  const { userProfile, userLocation } = useStore();
  const [session, setSession] = useState<WalkSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [nextCheckin, setNextCheckin] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing active session
  useEffect(() => {
    supabase
      .from('walk_sessions')
      .select('*')
      .eq('creator_id', userId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setSession(data[0] as WalkSession);
      });
  }, [userId]);

  // Elapsed timer
  useEffect(() => {
    if (session?.status === 'active' && session.started_at) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(session.started_at!).getTime()) / 1000));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [session?.status, session?.started_at]);

  // Safety check-in timer (every 15 min)
  useEffect(() => {
    if (session?.status !== 'active') return;
    checkinRef.current = setInterval(() => {
      setNextCheckin(Date.now());
    }, 15 * 60 * 1000);
    return () => { if (checkinRef.current) clearInterval(checkinRef.current); };
  }, [session?.status]);

  // Create session
  async function createSession() {
    setLoading(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from('walk_sessions')
      .insert({
        creator_id: userId,
        invite_code: code,
        destination: destination ?? null,
        status: 'waiting',
      })
      .select()
      .single();
    if (error) { toast.error('Failed to create session'); setLoading(false); return; }
    setSession(data as WalkSession);
    setLoading(false);
    toast.success('Session created! Share the code.');
  }

  // Join session by code
  async function joinSession() {
    if (!joinCode.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('walk_sessions')
      .update({ companion_id: userId, status: 'active', started_at: new Date().toISOString() })
      .eq('invite_code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .select()
      .single();
    if (error || !data) { toast.error('Invalid or expired code'); setLoading(false); return; }
    setSession(data as WalkSession);
    setLoading(false);
    toast.success('Joined! Walk together safely.');
  }

  // End session
  async function endSession() {
    if (!session) return;
    await supabase
      .from('walk_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    setSession(null);
    toast.success('Walk completed safely!');
    onClose();
  }

  // Check-in response
  const dismissCheckin = useCallback(() => setNextCheckin(null), []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // Copy invite code
  function copyCode() {
    if (session?.invite_code) {
      navigator.clipboard.writeText(session.invite_code);
      toast.success('Code copied!');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="absolute inset-x-0 bottom-16 z-[180] mx-3"
    >
      <div
        className="rounded-2xl p-4 shadow-xl"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Walk With Me</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* No active session — Create or Join */}
        {!session && (
          <div className="space-y-3">
            <button
              onClick={createSession}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? 'Creating...' : 'Start a Walk Session'}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>or join</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={6}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold text-center tracking-widest"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={joinSession}
                disabled={loading || !joinCode.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Join
              </button>
            </div>
          </div>
        )}

        {/* Waiting for companion */}
        {session?.status === 'waiting' && (
          <div className="text-center space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Share this code with your companion:</p>
            <div className="flex items-center justify-center gap-2">
              <span
                className="text-2xl font-black tracking-[0.3em] px-4 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                {session.invite_code}
              </span>
              <button onClick={copyCode} className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <Copy size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="animate-pulse text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              Waiting for companion...
            </div>
          </div>
        )}

        {/* Active session */}
        {session?.status === 'active' && (
          <div className="space-y-3">
            {/* Timer + status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: '#10b981' }} />
                <span className="text-xs font-bold" style={{ color: '#10b981' }}>Walking together</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>

            {destination && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Destination: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{destination}</span>
              </p>
            )}

            {/* Check-in prompt */}
            {nextCheckin && (
              <div
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>Safety check-in: Are you okay?</span>
                <button
                  onClick={dismissCheckin}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  I'm safe
                </button>
              </div>
            )}

            {/* End walk */}
            <button
              onClick={endSession}
              className="w-full py-3 rounded-xl text-sm font-bold transition"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              End Walk — I'm Safe
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
