// src/components/ReferralSection.tsx — S49: Referral & Invite System

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Gift, Copy, Share2, Users } from 'lucide-react';

type Props = { userId: string };

export default function ReferralSection({ userId }: Props) {
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
        const code = `KOVA-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
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
      title: 'Join KOVA — Stay Safe Together',
      text: `Join me on KOVA, the safety mapping app! Use my referral code: ${referralCode}`,
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
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Gift size={16} style={{ color: '#8b5cf6' }} />
        <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Invite Friends</span>
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Share KOVA with friends. Every signup with your code earns you bonus trust points!
      </p>

      {/* Referral code display */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex-1 px-3 py-2.5 rounded-xl text-center font-black tracking-widest text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          {referralCode}
        </div>
        <button
          onClick={copyCode}
          className="p-2.5 rounded-xl transition active:scale-95"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <Copy size={16} style={{ color: 'var(--text-muted)' }} />
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
