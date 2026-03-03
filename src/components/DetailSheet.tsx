// src/components/DetailSheet.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useMapPadding } from '@/hooks/useMapPadding';
import { Bell, BellOff, Radio, ChevronDown, ChevronUp, MessageCircle, Share2, Flag, Paperclip, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS, URBAN_CONTEXTS, Pin, PinEvidence, MediaItem } from '@/types';
import { toast } from 'sonner';
import PinChat from './PinChat';
import PinStoriesRow from './PinStoriesRow';
import LiveBroadcaster from './LiveBroadcaster';
import LiveViewer from './LiveViewer';
import FlagReportModal from './FlagReportModal';
import SosBroadcastPanel from './SosBroadcastPanel';
import AudioCheckinButton from './AudioCheckinButton';
import { timeAgoLong as timeAgo, springTransition } from '@/lib/utils';

type VoteRow = { user_id: string; vote_type: string; created_at: string };

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
  useMapPadding(focusTrapRef);

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
  const [hasThanked, setHasThanked] = useState(false);
  const [thanksCount, setThanksCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  // Evidence timeline
  const [evidence, setEvidence] = useState<PinEvidence[]>([]);
  // Vote evidence panel
  const [votePanel, setVotePanel] = useState<'confirm' | 'deny' | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<{ file: File; preview: string; type: 'image' | 'video' | 'audio' }[]>([]);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const evidenceFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedPin) return;
    setConfirms([]); setDenies([]); setMyVote(null);
    setChatExpanded(false); setChatCount(0);
    setEvidence([]); setVotePanel(null); setEvidenceText(''); setEvidenceFiles([]);
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
    // Load evidence timeline
    supabase
      .from('pin_evidence')
      .select('*')
      .eq('pin_id', selectedPin.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setEvidence((data as PinEvidence[]) ?? []));
    // Load thanks count + check if user thanked
    setHasThanked(false); setThanksCount(0);
    supabase.from('pin_thanks').select('user_id').eq('pin_id', selectedPin.id).then(({ data }) => {
      setThanksCount(data?.length ?? 0);
      setHasThanked(data?.some((r) => r.user_id === userId) ?? false);
    });
    // Realtime evidence
    const channel = supabase
      .channel(`evidence-${selectedPin.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_evidence', filter: `pin_id=eq.${selectedPin.id}` },
        (payload) => setEvidence((prev) => [...prev, payload.new as PinEvidence]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  async function thankReporter() {
    if (!userId || !selectedPin || hasThanked || isOwner) return;
    const { error } = await supabase.from('pin_thanks').insert({ pin_id: selectedPin.id, user_id: userId });
    if (!error) {
      setHasThanked(true);
      setThanksCount((c) => c + 1);
      // Increment reporter's thanks_received counter (fire-and-forget)
      supabase.from('profiles').select('thanks_received').eq('id', selectedPin.user_id).single().then(({ data }) => {
        if (data) supabase.from('profiles').update({ thanks_received: (data.thanks_received ?? 0) + 1 }).eq('id', selectedPin.user_id).then(() => {});
      });
      toast.success('Thanks sent!');
    }
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

  function handleVoteClick(type: 'confirm' | 'deny') {
    if (myVote?.vote_type === type) {
      // Toggle off — just remove the vote directly
      vote(type);
      return;
    }
    // Open evidence panel for this vote type
    setVotePanel(type);
    setEvidenceText('');
    setEvidenceFiles([]);
  }

  async function submitVoteWithEvidence() {
    if (!votePanel || !userId || submittingEvidence) return;
    setSubmittingEvidence(true);

    // Upload media files
    const uploaded: MediaItem[] = [];
    for (const media of evidenceFiles) {
      const fileName = `${userId}/${Date.now()}-${media.file.name}`;
      const { error: uploadError } = await supabase.storage.from('pin-photos').upload(fileName, media.file);
      if (uploadError) {
        toast.error('Could not upload file.');
        setSubmittingEvidence(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('pin-photos').getPublicUrl(fileName);
      uploaded.push({ url: urlData.publicUrl, type: media.type });
    }

    // Submit the vote
    await vote(votePanel);

    // Insert evidence row
    const activity = votePanel === 'confirm' ? 'confirmation' : 'rejection';
    if (evidenceText.trim() || uploaded.length > 0) {
      await supabase.from('pin_evidence').insert({
        pin_id: selectedPin!.id,
        user_id: userId,
        activity,
        content: evidenceText.trim() || null,
        media_urls: uploaded.length > 0 ? uploaded : null,
      });
    }

    setVotePanel(null);
    setEvidenceText('');
    setEvidenceFiles([]);
    setSubmittingEvidence(false);
  }

  function handleEvidenceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || evidenceFiles.length >= 3) return;
    const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
    setEvidenceFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file), type: mediaType as 'image' | 'video' | 'audio' }]);
    e.target.value = '';
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
        className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-2xl z-[201] max-h-[88dvh] overflow-y-auto"
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
                  const shareData = { title: `Breveil — ${cat?.label || 'Report'}`, text: selectedPin.description?.slice(0, 120) || 'Safety report on Breveil', url };
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

          {/* ── Evidence Timeline ── */}
          {evidence.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {evidence.map((ev) => {
                const badge = ev.activity === 'report'
                  ? { icon: '📍', label: 'Report', bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' }
                  : ev.activity === 'confirmation'
                    ? { icon: '👍', label: 'Confirmation', bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.3)' }
                    : { icon: '👁️', label: 'Rejection', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
                const media = (ev.media_urls ?? []) as MediaItem[];
                return (
                  <div key={ev.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border)` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {badge.icon} {badge.label}
                      </span>
                      <span className="text-[0.6rem] font-medium ml-auto" style={{ color: 'var(--text-muted)' }}>{timeAgo(ev.created_at)}</span>
                    </div>
                    {ev.content && <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{ev.content}</p>}
                    {media.map((m, i) => {
                      if (m.type === 'image') return (
                        <img key={i} src={m.url} alt="" className="w-full h-40 object-cover rounded-lg mt-1" style={{ border: '1px solid var(--border)' }} />
                      );
                      if (m.type === 'video') return (
                        <video key={i} src={m.url} controls className="w-full rounded-lg mt-1" style={{ border: '1px solid var(--border)', maxHeight: '160px' }} />
                      );
                      return (
                        <div key={i} className="rounded-lg p-2 flex items-center gap-2 mt-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                          <span>🎵</span>
                          <audio src={m.url} controls className="flex-1" style={{ height: '28px' }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback: show pin media directly if no evidence rows yet */}
          {evidence.length === 0 && mediaItems.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {mediaItems.map((m, i) => {
                if (m.type === 'image') return (
                  <img key={i} src={m.url} alt="Evidence" className="w-full h-44 object-cover rounded-xl" style={{ border: '1px solid var(--border)' }} />
                );
                if (m.type === 'video') return (
                  <video key={i} src={m.url} controls className="w-full rounded-xl" style={{ border: '1px solid var(--border)', maxHeight: '180px' }} />
                );
                return (
                  <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-2xl">🎵</span>
                    <audio src={m.url} controls className="flex-1" style={{ height: '32px' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Primary actions: Confirm + Deny (large, always visible) ── */}
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => handleVoteClick('confirm')}
              disabled={!userId || votingInFlight || submittingEvidence}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold transition flex-1 justify-center disabled:opacity-50"
              style={
                myVoteType === 'confirm'
                  ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.6)' }
                  : votePanel === 'confirm'
                    ? { backgroundColor: 'rgba(16,185,129,0.06)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
              }
            >
              👍 {confirms.length > 0 ? confirms.length : ''} {t('stillThere')}
            </button>

            {!isResolved && (
              <button
                onClick={() => handleVoteClick('deny')}
                disabled={!userId || votingInFlight || submittingEvidence}
                className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold transition flex-1 justify-center disabled:opacity-50"
                style={
                  myVoteType === 'deny'
                    ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.6)' }
                    : votePanel === 'deny'
                      ? { backgroundColor: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                👁️ {denies.length > 0 ? `${denies.length}/3` : ''} {t('cleared')}
              </button>
            )}

            {isResolved && (
              <div
                className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold flex-1 justify-center"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                ✅ {t('resolved')}
              </div>
            )}
          </div>

          {/* ── Vote Evidence Panel (expandable) ── */}
          <AnimatePresence>
            {votePanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-3"
              >
                <div className="rounded-xl p-3 mt-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: votePanel === 'confirm' ? '#10b981' : '#f59e0b' }}>
                    {votePanel === 'confirm' ? '👍 Add evidence for your confirmation' : '👁️ Add evidence for your rejection'}
                  </p>
                  <input
                    type="text"
                    placeholder="Add a note (optional)..."
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 mb-2 outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  {/* Media previews */}
                  {evidenceFiles.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {evidenceFiles.map((f, i) => (
                        <div key={i} className="relative">
                          {f.type === 'image' ? (
                            <img src={f.preview} alt="" className="w-16 h-16 object-cover rounded-lg" style={{ border: '1px solid var(--border)' }} />
                          ) : f.type === 'video' ? (
                            <video src={f.preview} className="w-16 h-16 object-cover rounded-lg" style={{ border: '1px solid var(--border)' }} />
                          ) : (
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>🎵</div>
                          )}
                          <button
                            onClick={() => setEvidenceFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[0.5rem]"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input ref={evidenceFileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleEvidenceFile} />
                    <button
                      onClick={() => evidenceFileRef.current?.click()}
                      disabled={evidenceFiles.length >= 3}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      <Paperclip size={12} /> Attach
                    </button>
                    <button
                      onClick={submitVoteWithEvidence}
                      disabled={submittingEvidence}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white transition disabled:opacity-50"
                      style={{ backgroundColor: votePanel === 'confirm' ? '#10b981' : '#f59e0b' }}
                    >
                      {submittingEvidence ? 'Submitting...' : `Submit ${votePanel === 'confirm' ? 'confirmation' : 'rejection'}`}
                    </button>
                    <button
                      onClick={() => setVotePanel(null)}
                      className="px-3 py-2 rounded-lg text-xs font-bold transition"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Secondary actions: Comment, Follow, Thank (compact row) ── */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setChatExpanded((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-1 justify-center"
              style={{
                backgroundColor: chatExpanded ? 'rgba(56,189,248,0.12)' : 'var(--bg-card)',
                color: chatExpanded ? '#38bdf8' : 'var(--text-muted)',
                border: `1px solid ${chatExpanded ? 'rgba(56,189,248,0.4)' : 'var(--border)'}`,
              }}
            >
              <MessageCircle size={14} />
              {t('messages')}{chatCount > 0 ? ` · ${chatCount}` : ''}
            </button>

            {userId && (
              <button
                onClick={() => {
                  toggleFollowPin(selectedPin.id);
                  toast.success(isFollowed ? t('unfollowSuccess') : t('followSuccess'));
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{
                  backgroundColor: isFollowed ? 'rgba(212,168,83,0.12)' : 'var(--bg-card)',
                  color: isFollowed ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${isFollowed ? 'var(--accent)' : 'var(--border)'}`,
                }}
                aria-label={isFollowed ? t('unfollow') : t('follow')}
              >
                {isFollowed ? <BellOff size={14} /> : <Bell size={14} />}
                {isFollowed ? t('unfollow') : t('follow')}
              </button>
            )}

            {!isOwner && userId && (
              <button
                onClick={thankReporter}
                disabled={hasThanked}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
                style={
                  hasThanked
                    ? { backgroundColor: 'rgba(236,72,153,0.12)', color: '#ec4899', border: '1.5px solid rgba(236,72,153,0.5)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                🙏 {thanksCount > 0 ? thanksCount : ''}
              </button>
            )}
          </div>

          {/* ── Tertiary actions: collapsed "More" ── */}
          {userId && (
            <div className="mb-3">
              <button
                onClick={() => setShowMore((v) => !v)}
                className="w-full flex items-center justify-between py-2 transition-opacity hover:opacity-70"
              >
                <span className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {t('more') || 'More'}
                </span>
                {showMore
                  ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                }
              </button>

              {showMore && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Go Live */}
                  {!isResolved && !activeSession && (
                    <button
                      onClick={() => setShowBroadcaster(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                      style={{ backgroundColor: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.4)', color: 'var(--accent)' }}
                    >
                      <Radio size={13} />
                      {t('goLive')}
                    </button>
                  )}

                  {/* Watch Live */}
                  {activeSession && !isOwner && (
                    <button
                      onClick={() => setShowViewer(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                      style={{ backgroundColor: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.4)', color: 'var(--accent)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                      {t('watchLive')}
                    </button>
                  )}

                  {/* Resume Live (owner) */}
                  {activeSession && isOwner && (
                    <button
                      onClick={() => setShowBroadcaster(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: 'rgba(212,168,83,0.2)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                      {t('live')}
                    </button>
                  )}

                  {/* Flag / Report */}
                  {!isOwner && (
                    <button
                      onClick={() => setShowFlagModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                      style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      aria-label={t('report')}
                    >
                      <Flag size={13} />
                      {t('report')}
                    </button>
                  )}

                  {/* Resolve (owner only) */}
                  {!isResolved && isOwner && (
                    <button
                      onClick={resolvePin}
                      disabled={resolving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1.5px solid rgba(16,185,129,0.4)' }}
                    >
                      ✅ {t('resolve') || 'Resolve'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SOS Broadcast (S50) + Audio Check-in (S51) — emergency pins only ── */}
          {selectedPin.is_emergency && !isResolved && (
            <div className="mb-3 space-y-2">
              <SosBroadcastPanel
                pinId={selectedPin.id}
                pinLat={selectedPin.lat}
                pinLng={selectedPin.lng}
                onClose={() => {}}
              />
              {userId && (
                <div className="flex justify-center">
                  <AudioCheckinButton userId={userId} sessionType="emergency" sessionId={selectedPin.id} />
                </div>
              )}
            </div>
          )}

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

          {/* ── Chat (toggle via secondary Comment button) ── */}
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
