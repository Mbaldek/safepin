// src/components/DetailSheet.tsx

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { Bell, BellOff, Radio, ChevronDown, ChevronUp, MessageCircle, Share2, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS, URBAN_CONTEXTS, Pin } from '@/types';
import { toast } from 'sonner';
import PinChat from './PinChat';
import PinStoriesRow from './PinStoriesRow';
import LiveBroadcaster from './LiveBroadcaster';
import LiveViewer from './LiveViewer';
import FlagReportModal from './FlagReportModal';

const springTransition = { type: 'spring', damping: 32, stiffness: 320, mass: 0.8 } as const;

type VoteRow = { user_id: string; vote_type: string; created_at: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (hours < 1) return `${mins}min ago`;
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

function maxDateStr(votes: VoteRow[]): string {
  return votes.reduce((m, v) => (v.created_at > m ? v.created_at : m), votes[0].created_at);
}

function getExpiry(pin: Pin): string {
  if (pin.is_emergency) {
    const remaining = Math.max(0, 2 - (Date.now() - new Date(pin.created_at).getTime()) / 3_600_000);
    if (remaining < 0.1) return 'expiring soon';
    return `${Math.round(remaining * 60)}min left`;
  }
  const base = pin.last_confirmed_at
    ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
    : new Date(pin.created_at).getTime();
  const remaining = Math.max(0, 24 - (Date.now() - base) / 3_600_000);
  if (remaining < 1) return `${Math.round(remaining * 60)}min left`;
  return `${Math.round(remaining)}h left`;
}

function isPinExpired(pin: Pin): boolean {
  if (pin.resolved_at) return true;
  if (pin.is_emergency) {
    return (Date.now() - new Date(pin.created_at).getTime()) / 3_600_000 >= 2;
  }
  const base = pin.last_confirmed_at
    ? Math.max(new Date(pin.created_at).getTime(), new Date(pin.last_confirmed_at).getTime())
    : new Date(pin.created_at).getTime();
  return (Date.now() - base) / 3_600_000 >= 24;
}

export default function DetailSheet() {
  const {
    selectedPin, setSelectedPin, setActiveSheet, userId, updatePin, userProfile,
    followedPinIds, toggleFollowPin, liveSessions, addLiveSession, updateLiveSession,
  } = useStore();
  const t = useTranslations('detail');
  const focusTrapRef = useFocusTrap(true, handleClose);

  const [confirms, setConfirms] = useState<VoteRow[]>([]);
  const [denies, setDenies] = useState<VoteRow[]>([]);
  const [myVote, setMyVote] = useState<VoteRow | null>(null);
  const [votingInFlight, setVotingInFlight] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showBroadcaster, setShowBroadcaster] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [showFlagModal, setShowFlagModal] = useState(false);

  useEffect(() => {
    if (!selectedPin) return;
    setConfirms([]); setDenies([]); setMyVote(null);
    setChatExpanded(false); setChatCount(0);
    supabase
      .from('pin_votes')
      .select('user_id, vote_type, created_at')
      .eq('pin_id', selectedPin.id)
      .then(({ data }) => {
        const rows = (data ?? []) as VoteRow[];
        setConfirms(rows.filter((v) => v.vote_type === 'confirm'));
        setDenies(rows.filter((v) => v.vote_type === 'deny'));
        setMyVote(rows.find((v) => v.user_id === userId) ?? null);
      });
  }, [selectedPin?.id, userId]);

  if (!selectedPin) return null;

  const cat = CATEGORIES[selectedPin.category as keyof typeof CATEGORIES];
  const sev = SEVERITY[selectedPin.severity as keyof typeof SEVERITY];
  const env = selectedPin.environment
    ? ENVIRONMENTS[selectedPin.environment as keyof typeof ENVIRONMENTS]
    : null;
  const urban = selectedPin.urban_context
    ? URBAN_CONTEXTS[selectedPin.urban_context as keyof typeof URBAN_CONTEXTS]
    : null;
  const isOwner = !!userId && userId === selectedPin.user_id;
  const isResolved = !!selectedPin.resolved_at;
  const isFollowed = followedPinIds.includes(selectedPin.id);
  const activeSession = liveSessions.find((s) => s.pin_id === selectedPin.id && !s.ended_at) ?? null;
  const mediaItems =
    selectedPin.media_urls?.length
      ? selectedPin.media_urls
      : selectedPin.photo_url
        ? [{ url: selectedPin.photo_url, type: 'image' as const }]
        : [];

  function handleClose() {
    setSelectedPin(null);
    setActiveSheet('none');
  }

  async function vote(type: 'confirm' | 'deny') {
    if (!userId || votingInFlight) return;
    setVotingInFlight(true);

    const isToggleOff = myVote?.vote_type === type;
    const now = new Date().toISOString();
    const pinId = selectedPin!.id;

    if (isToggleOff) {
      await supabase.from('pin_votes').delete().eq('pin_id', pinId).eq('user_id', userId);
      setMyVote(null);
      if (type === 'confirm') setConfirms((p) => p.filter((v) => v.user_id !== userId));
      else setDenies((p) => p.filter((v) => v.user_id !== userId));
    } else {
      const { error } = await supabase.from('pin_votes').upsert(
        { pin_id: pinId, user_id: userId, vote_type: type },
        { onConflict: 'pin_id,user_id' }
      );
      if (!error) {
        const newRow: VoteRow = { user_id: userId, vote_type: type, created_at: now };
        const prevType = myVote?.vote_type;
        setMyVote(newRow);

        if (type === 'confirm') {
          setConfirms((p) => [...p.filter((v) => v.user_id !== userId), newRow]);
          if (prevType === 'deny') setDenies((p) => p.filter((v) => v.user_id !== userId));
          // Reset expiry countdown
          await supabase.from('pins').update({ last_confirmed_at: now }).eq('id', pinId);
          updatePin({ ...selectedPin!, last_confirmed_at: now });
        } else {
          const newDenies = [...denies.filter((v) => v.user_id !== userId), newRow];
          setDenies(newDenies);
          if (prevType === 'confirm') setConfirms((p) => p.filter((v) => v.user_id !== userId));
          // Auto-resolve after 3 denials
          if (newDenies.length >= 3) {
            await supabase.from('pins').update({ resolved_at: now }).eq('id', pinId);
            updatePin({ ...selectedPin!, resolved_at: now });
            toast.success(t('pinRemoved'));
            setVotingInFlight(false);
            handleClose();
            return;
          }
        }
      }
    }
    setVotingInFlight(false);
  }

  async function resolvePin() {
    if (!isOwner || isResolved || resolving) return;
    setResolving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('pins').update({ resolved_at: now }).eq('id', selectedPin!.id);
    setResolving(false);
    if (error) { toast.error(t('failedResolve')); return; }
    updatePin({ ...selectedPin!, resolved_at: now });
    toast.success(t('markedResolved') + ' ✅');
  }

  const myVoteType = myVote?.vote_type as 'confirm' | 'deny' | undefined;

  return (
    <>
      <AnimatePresence>
        {showFlagModal && (
          <FlagReportModal
            key="flag-modal"
            targetType="pin"
            targetId={selectedPin.id}
            onClose={() => setShowFlagModal(false)}
          />
        )}
        {showBroadcaster && userId && (
          <LiveBroadcaster
            key="broadcaster"
            pinId={selectedPin.id}
            userId={userId}
            displayName={userProfile?.display_name ?? null}
            onClose={() => setShowBroadcaster(false)}
            onSessionStarted={(session) => addLiveSession(session)}
            onSessionEnded={() => {
              if (activeSession) updateLiveSession({ ...activeSession, ended_at: new Date().toISOString() });
            }}
          />
        )}
        {showViewer && activeSession && userId && (
          <LiveViewer
            key="viewer"
            session={activeSession}
            userId={userId}
            displayName={userProfile?.display_name ?? null}
            onClose={() => setShowViewer(false)}
            onReport={() => toast('Report submitted — thank you')}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 z-[200]"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
      />
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Incident details"
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] max-h-[88dvh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={springTransition}
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
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{t('emergencyAlert')}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isResolved ? '✅ ' + t('emergencyResolved') : t('emergencyHelp')}
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
            <div className="flex items-center gap-2 shrink-0">
              {/* Share button */}
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/map?pin=${selectedPin.id}`;
                  const shareData = { title: `KOVA — ${cat?.label || 'Report'}`, text: selectedPin.description?.slice(0, 120) || 'Safety report on KOVA', url };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch { /* cancelled */ }
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard');
                  }
                }}
                className="p-2 rounded-full transition"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                aria-label={t('share')}
                title={t('share')}
              >
                <Share2 size={15} />
              </button>
              {/* Follow button */}
              {userId && (
                <button
                  onClick={() => {
                    toggleFollowPin(selectedPin.id);
                    toast.success(isFollowed ? t('unfollowSuccess') : t('followSuccess'));
                  }}
                  className="p-2 rounded-full transition"
                  style={{
                    backgroundColor: isFollowed ? 'rgba(var(--accent-rgb),0.12)' : 'var(--bg-card)',
                    border: `1px solid ${isFollowed ? 'var(--accent)' : 'var(--border)'}`,
                    color: isFollowed ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                  aria-label={isFollowed ? t('unfollow') : t('follow')}
                  title={isFollowed ? t('unfollow') : t('follow')}
                >
                  {isFollowed ? <BellOff size={15} /> : <Bell size={15} />}
                </button>
              )}

              {/* Flag / report button */}
              {userId && !isOwner && (
                <button
                  onClick={() => setShowFlagModal(true)}
                  className="p-2 rounded-full transition"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  aria-label={t('report')}
                  title={t('report')}
                >
                  <Flag size={15} />
                </button>
              )}

              {/* Live button */}
              {userId && !isResolved && !activeSession && (
                <button
                  onClick={() => setShowBroadcaster(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide transition"
                  style={{ backgroundColor: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e' }}
                >
                  <Radio size={13} />
                  {t('goLive')}
                </button>
              )}
              {activeSession && !isOwner && (
                <button
                  onClick={() => setShowViewer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide transition"
                  style={{ backgroundColor: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f43f5e' }} />
                  {t('watchLive')}
                </button>
              )}
              {activeSession && isOwner && (
                <button
                  onClick={() => setShowBroadcaster(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide"
                  style={{ backgroundColor: 'rgba(244,63,94,0.2)', border: '1px solid #f43f5e', color: '#f43f5e' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f43f5e' }} />
                  {t('live')}
                </button>
              )}

              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: sev?.color + '18', color: sev?.color }}
              >
                {sev?.emoji} {sev?.label}
              </span>
            </div>
          </div>

          {(env || urban || selectedPin.is_moving) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {env && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {env.emoji} {env.label}
                </div>
              )}
              {urban && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {urban.emoji} {selectedPin.urban_context === 'other' && selectedPin.urban_context_custom
                    ? selectedPin.urban_context_custom
                    : urban.label}
                </div>
              )}
              {selectedPin.is_moving && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  🚶‍♂️ In motion
                </div>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
            {selectedPin.description}
          </p>

          <div className="flex gap-3 text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            <span>🕐 {timeAgo(selectedPin.created_at)}</span>
            {mediaItems.length > 0 && (
              <span>📎 {t('files', { count: mediaItems.length })}</span>
            )}
          </div>

          {/* Media */}
          {mediaItems.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {mediaItems.map((m, i) => {
                if (m.type === 'image') return (
                  <img key={i} src={m.url} alt="Evidence" className="w-full h-44 object-cover rounded-xl"
                    style={{ border: '1px solid var(--border)' }} />
                );
                if (m.type === 'video') return (
                  <video key={i} src={m.url} controls className="w-full rounded-xl"
                    style={{ border: '1px solid var(--border)', maxHeight: '180px' }} />
                );
                return (
                  <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-2xl">🎵</span>
                    <audio src={m.url} controls className="flex-1" style={{ height: '32px' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Action row ────────────────────────────────────────────── */}
          <div className="flex gap-2 mb-3">
            {/* Confirm */}
            <button
              onClick={() => vote('confirm')}
              disabled={!userId || votingInFlight}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition flex-1 justify-center disabled:opacity-50"
              style={
                myVoteType === 'confirm'
                  ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.6)' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              👍 {confirms.length > 0 ? confirms.length : ''} {t('stillThere')}
            </button>

            {/* Deny / cleared */}
            {!isResolved && (
              <button
                onClick={() => vote('deny')}
                disabled={!userId || votingInFlight}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition flex-1 justify-center disabled:opacity-50"
                style={
                  myVoteType === 'deny'
                    ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.6)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                👁️ {denies.length > 0 ? `${denies.length}/3` : ''} {t('cleared')}
              </button>
            )}

            {/* Resolve (owner only) */}
            {!isResolved && isOwner && (
              <button
                onClick={resolvePin}
                disabled={resolving}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.4)' }}
              >
                ✅
              </button>
            )}
            {isResolved && (
              <div
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                ✅ {t('resolved')}
              </div>
            )}
          </div>

          {/* ── Status card ───────────────────────────────────────────── */}
          {(confirms.length > 0 || denies.length > 0 || !selectedPin.is_emergency) && !isResolved && (
            <div
              className="rounded-xl p-3.5 mb-5 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {/* Confirms row */}
              {confirms.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👍</span>
                    <span className="text-xs font-bold" style={{ color: '#10b981' }}>
                      {t('confirmedStill', { count: confirms.length })}
                    </span>
                  </div>
                  <span className="text-[0.6rem] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                    last {timeAgo(maxDateStr(confirms))}
                  </span>
                </div>
              )}

              {/* Denies row + progress bar */}
              {denies.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">👁️</span>
                      <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                        {t('clearingVotes', { count: denies.length })}
                      </span>
                    </div>
                    <span className="text-[0.6rem] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                      last {timeAgo(maxDateStr(denies))}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(denies.length / 3) * 100}%`, backgroundColor: '#f59e0b' }}
                    />
                  </div>
                  {denies.length === 2 && (
                    <p className="text-[0.6rem] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t('oneMoreClearing')}
                    </p>
                  )}
                </div>
              )}

              {/* Expiry countdown */}
              {!selectedPin.is_emergency && (
                <div className="flex items-center gap-2 pt-1" style={{ borderTop: confirms.length + denies.length > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span className="text-sm">⏳</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {getExpiry(selectedPin)}
                  </span>
                  {selectedPin.last_confirmed_at && (
                    <span
                      className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                    >
                      {t('timerReset')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="mb-5" style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          {/* Pin Stories */}
          <PinStoriesRow pinId={selectedPin.id} />

          {/* Divider */}
          <div className="mt-5" style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          {/* ── Collapsible Chat ─────────────────────────────────────── */}
          {/* Toggle header — always visible */}
          <button
            onClick={() => setChatExpanded((v) => !v)}
            className="w-full flex items-center justify-between py-3 transition-opacity hover:opacity-70"
          >
            <div className="flex items-center gap-2">
              <MessageCircle size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {t('messages')}{chatCount > 0 ? ` · ${chatCount}` : ''}
              </span>
            </div>
            {chatExpanded
              ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
              : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            }
          </button>

          {/* Always mounted: loads message count in background even when collapsed */}
          <PinChat
            pinId={selectedPin.id}
            userId={userId}
            displayName={userProfile?.display_name ?? null}
            isExpired={isPinExpired(selectedPin)}
            collapsed={!chatExpanded}
            onCountChange={setChatCount}
          />

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-full font-bold rounded-xl py-3.5 text-sm transition hover:opacity-80 mt-5"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}
