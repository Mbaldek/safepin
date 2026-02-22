// src/components/ProGate.tsx — Wraps Pro-only features with an upgrade prompt

'use client';

import { Crown } from 'lucide-react';
import { useIsPro } from '@/lib/useIsPro';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

type Props = {
  feature: string;
  children: React.ReactNode;
};

export default function ProGate({ feature, children }: Props) {
  const { isPro, loading } = useIsPro();
  const userId = useStore((s) => s.userId);

  if (loading) return <>{children}</>;
  if (isPro) return <>{children}</>;

  async function handleUpgrade() {
    if (!userId) return;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: '', plan: 'pro' }),
      });
      const { url, error } = await res.json();
      if (error) { toast.error(error); return; }
      window.location.href = url;
    } catch { toast.error('Failed to start checkout'); }
  }

  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
        <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center max-w-[260px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Crown size={18} style={{ color: '#f59e0b' }} />
          </div>
          <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{feature}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Unlock this feature with KOVA Pro
          </p>
          <button
            onClick={handleUpgrade}
            className="w-full py-2.5 rounded-xl text-xs font-black transition hover:opacity-90"
            style={{ backgroundColor: '#f59e0b', color: '#000' }}
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
