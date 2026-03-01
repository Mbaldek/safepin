// Step 4 — Trusted contact (form + share invite)

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const RELATIONSHIPS = ['Friend', 'Partner', 'Family', 'Roommate'] as const;

type Props = {
  userId: string;
  onNext: () => void;
  onSkip: () => void;
  onContactAdded: (name: string) => void;
};

export default function StepTrustedContact({ userId, onNext, onSkip, onContactAdded }: Props) {
  const t = useTranslations('onboarding');
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim() || !info.trim()) return;
    setLoading(true);

    // Save pending invite
    await supabase.from('pending_invites').insert({
      inviter_id: userId,
      contact_name: name.trim(),
      contact_info: info.trim(),
      relationship: relationship || null,
    });

    // Share invite link
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/login?ref=${userId}`;
    const shareText = `Join me on Breveil — a community safety app. ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Breveil', text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // User cancelled share dialog — that's fine
    }

    toast.success(t('contactInviteSent'));
    onContactAdded(name.trim());
    setLoading(false);
    onNext();
  }

  return (
    <div className="flex flex-col pt-4 pb-4">
      <h2 className="text-xl font-black mb-2 text-center" style={{ color: 'var(--text-primary)' }}>
        {t('contactTitle')}
      </h2>
      <p className="text-sm mb-5 text-center" style={{ color: 'var(--text-muted)' }}>
        {t('contactBody')}
      </p>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('contactPlaceholderName')}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <input
          type="text"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder={t('contactPlaceholderInfo')}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Relationship pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {RELATIONSHIPS.map((r) => (
          <button
            key={r}
            onClick={() => setRelationship(relationship === r ? '' : r)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition"
            style={{
              backgroundColor: relationship === r ? 'var(--accent)' : 'var(--bg-card)',
              color: relationship === r ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${relationship === r ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <button
        onClick={handleAdd}
        disabled={!name.trim() || !info.trim() || loading}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98] disabled:opacity-40 mb-3"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {name.trim() ? t('contactAdd', { name: name.trim() }) : t('contactAdd', { name: '...' })}
      </button>

      <button
        onClick={onSkip}
        className="text-xs font-bold text-center py-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('skip')}
      </button>
      <p className="text-[0.6rem] text-center mt-1" style={{ color: 'var(--text-placeholder)' }}>
        {t('contactSkipNote')}
      </p>
    </div>
  );
}
