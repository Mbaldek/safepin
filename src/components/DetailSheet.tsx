// src/components/DetailSheet.tsx

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS } from '@/types';
import { toast } from 'sonner';
import CommentsSection from './CommentsSection';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'Just now';
  if (hours < 1) return `${mins}min ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DetailSheet() {
  const { selectedPin, setSelectedPin, setActiveSheet, userId, updatePin, userProfile } = useStore();

  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingInFlight, setVotingInFlight] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Load votes whenever a pin is opened
  useEffect(() => {
    if (!selectedPin) return;
    setVoteCount(0);
    setHasVoted(false);
    supabase
      .from('pin_votes')
      .select('user_id')
      .eq('pin_id', selectedPin.id)
      .then(({ data }) => {
        setVoteCount(data?.length ?? 0);
        setHasVoted(!!data?.find((v) => v.user_id === userId));
      });
  }, [selectedPin?.id, userId]);

  if (!selectedPin) return null;

  const cat = CATEGORIES[selectedPin.category as keyof typeof CATEGORIES];
  const sev = SEVERITY[selectedPin.severity as keyof typeof SEVERITY];
  const env = selectedPin.environment
    ? ENVIRONMENTS[selectedPin.environment as keyof typeof ENVIRONMENTS]
    : null;

  const isOwner = !!userId && userId === selectedPin.user_id;
  const isResolved = !!selectedPin.resolved_at;

  const mediaItems =
    selectedPin.media_urls && selectedPin.media_urls.length > 0
      ? selectedPin.media_urls
      : selectedPin.photo_url
        ? [{ url: selectedPin.photo_url, type: 'image' as const }]
        : [];

  function handleClose() {
    setSelectedPin(null);
    setActiveSheet('none');
  }

  async function toggleVote() {
    if (!userId || votingInFlight) return;
    setVotingInFlight(true);
    if (hasVoted) {
      await supabase.from('pin_votes').delete().eq('pin_id', selectedPin!.id).eq('user_id', userId);
      setVoteCount((c) => Math.max(0, c - 1));
      setHasVoted(false);
    } else {
      await supabase.from('pin_votes').insert({ pin_id: selectedPin!.id, user_id: userId });
      setVoteCount((c) => c + 1);
      setHasVoted(true);
    }
    setVotingInFlight(false);
  }

  async function resolvePin() {
    if (!isOwner || isResolved || resolving) return;
    setResolving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('pins')
      .update({ resolved_at: now })
      .eq('id', selectedPin!.id);
    setResolving(false);
    if (error) { toast.error('Failed to resolve'); return; }
    updatePin({ ...selectedPin!, resolved_at: now });
    toast.success('Marked as resolved ✅');
  }

  return (
    <>
      <div
        className="absolute inset-0 z-[200]"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={handleClose}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] max-h-[88dvh] overflow-y-auto animate-slide-up"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
        <div className="p-5 pb-10">

          {/* Emergency banner */}
          {selectedPin.is_emergency && (
            <div
              className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}
            >
              <span className="text-2xl">🆘</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Emergency Alert</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isResolved ? '✅ This alert has been resolved' : 'This person signalled they need help'}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[0.66rem] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                {cat?.emoji} {selectedPin.category.replace('_', ' ')}
              </p>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {cat?.label || 'Report'}
              </h2>
            </div>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: sev?.color + '18', color: sev?.color }}
            >
              {sev?.emoji} {sev?.label}
            </span>
          </div>

          {/* Environment badge */}
          {env && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {env.emoji} {env.label}
            </div>
          )}

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-4"
            style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}
          >
            {selectedPin.description}
          </p>

          {/* Meta */}
          <div className="flex gap-3 text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            <span>🕐 {timeAgo(selectedPin.created_at)}</span>
            {mediaItems.length > 0 && (
              <span>📎 {mediaItems.length} {mediaItems.length === 1 ? 'file' : 'files'}</span>
            )}
          </div>

          {/* Media gallery */}
          {mediaItems.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {mediaItems.map((m, i) => {
                if (m.type === 'image') {
                  return (
                    <img
                      key={i}
                      src={m.url}
                      alt="Evidence"
                      className="w-full h-44 object-cover rounded-xl"
                      style={{ border: '1px solid var(--border)' }}
                    />
                  );
                }
                if (m.type === 'video') {
                  return (
                    <video
                      key={i}
                      src={m.url}
                      controls
                      className="w-full rounded-xl"
                      style={{ border: '1px solid var(--border)', maxHeight: '180px' }}
                    />
                  );
                }
                return (
                  <div
                    key={i}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-2xl">🎵</span>
                    <audio src={m.url} controls className="flex-1" style={{ height: '32px' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Action row: Vote + Resolve ─────────────────────────── */}
          <div className="flex gap-2 mb-5">
            {/* Upvote */}
            <button
              onClick={toggleVote}
              disabled={!userId || votingInFlight}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition flex-1 justify-center disabled:opacity-50"
              style={
                hasVoted
                  ? { backgroundColor: 'rgba(244,63,94,0.12)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              👍
              <span>{voteCount > 0 ? ` ${voteCount}` : ''} Confirm</span>
            </button>

            {/* Resolve */}
            {isResolved ? (
              <div
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                ✅ Resolved
              </div>
            ) : (
              <button
                onClick={resolvePin}
                disabled={!isOwner || resolving}
                title={!isOwner ? 'Only the reporter can resolve this' : undefined}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
                style={
                  isOwner
                    ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.5)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                ✅ {resolving ? 'Resolving…' : 'Resolve'}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="mb-5" style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          {/* Comments */}
          <CommentsSection
            pinId={selectedPin.id}
            userId={userId}
            displayName={userProfile?.display_name ?? null}
          />

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-full font-bold rounded-xl py-3.5 text-sm transition hover:opacity-80 mt-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
