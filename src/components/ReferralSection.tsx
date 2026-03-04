// src/components/ReferralSection.tsx — S49: Referral & Invite System

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Gift, Copy, Share2, Users } from 'lucide-react';
import { useTheme } from '@/stores/useTheme';

type Props = { userId: string };

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

export default function ReferralSection({ userId }: Props) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('referral_code, referral_count')
        .eq('id', userId)
        .single();

      if (data?.referral_code) {
        setReferralCode(data.referral_code);
        setReferralCount(data.referral_count ?? 0);
      } else {
        // Generate a unique referral code
        const code = `BRUME-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        await supabase.from('profiles').update({ referral_code: code }).eq('id', userId);
        setReferralCode(code);
      }
      setLoading(false);
    })();
  }, [userId]);

  function copyCode() {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('Referral code copied!');
    }
  }

  async function shareCode() {
    if (!referralCode) return;
    const shareData = {
      title: 'Join Breveil — Stay Safe Together',
      text: `Join me on Breveil, the safety mapping app! Use my referral code: ${referralCode}`,
      url: `https://safepin-pearl.vercel.app/login?ref=${referralCode}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success('Invite link copied!');
      }
    } catch {
      // Share dismissed — not an error
    }
  }

  if (loading) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Gift size={16} style={{ color: '#8b5cf6' }} />
        <span className="text-sm font-black" style={{ color: C.textPrimary }}>Invite Friends</span>
      </div>

      <p className="text-xs mb-3" style={{ color: C.textSecondary }}>
        Share Breveil with friends. Every signup with your code earns you bonus trust points!
      </p>

      {/* Referral code display */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex-1 px-3 py-2.5 rounded-xl text-center font-black tracking-widest text-sm"
          style={{ backgroundColor: C.bg, color: FIXED.accentCyan, border: `1px solid ${C.border}` }}
        >
          {referralCode}
        </div>
        <button
          onClick={copyCode}
          className="p-2.5 rounded-xl transition active:scale-95"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
        >
          <Copy size={16} style={{ color: C.textSecondary }} />
        </button>
      </div>

      {/* Share button */}
      <button
        onClick={shareCode}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-[0.98]"
        style={{ backgroundColor: '#8b5cf6' }}
      >
        <Share2 size={14} />
        Share Invite Link
      </button>

      {/* Stats */}
      {referralCount > 0 && (
        <div className="flex items-center gap-1.5 mt-3 justify-center">
          <Users size={13} style={{ color: '#10b981' }} />
          <span className="text-xs font-bold" style={{ color: '#10b981' }}>
            {referralCount} friend{referralCount !== 1 ? 's' : ''} joined with your code
          </span>
        </div>
      )}
    </div>
  );
}
