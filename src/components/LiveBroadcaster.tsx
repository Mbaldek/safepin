// src/components/LiveBroadcaster.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react'; // useRef kept for chatEndRef
import {
  LiveKitRoom,
  AudioConference,
  VideoConference,
  useParticipants,
  useDataChannel,
  useRoomContext,
} from '@livekit/components-react';
import { X, Eye, EyeOff, Mic, Video, Radio, Users, StopCircle, Battery, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { LiveSession } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  text: string;
  sender: string;
  ts: number;
};

type Props = {
  pinId: string;
  userId: string;
  displayName: string | null;
  onClose: () => void;
  onSessionStarted: (session: LiveSession) => void;
  onSessionEnded: () => void;
};

// ─── BroadcasterInner (rendered inside LiveKitRoom context) ──────────────────

function BroadcasterInner({
  session,
  useVideo,
  displayName,
  onStopLive,
}: {
  session: LiveSession;
  useVideo: boolean;
  displayName: string | null;
  onStopLive: () => void;
}) {
  const participants = useParticipants();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { send: sendData } = useDataChannel('chat', (msg) => {
    try {
      const decoded = new TextDecoder().decode(msg.payload);
      const parsed = JSON.parse(decoded) as { type: string; text: string; sender: string };
      if (parsed.type === 'chat' && parsed.text && parsed.sender) {
        setChatMessages((prev) => [
          ...prev.slice(-49),
          { id: crypto.randomUUID(), text: parsed.text, sender: parsed.sender, ts: Date.now() },
        ]);
      }
    } catch {
      // ignore malformed
    }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const payload = JSON.stringify({ type: 'chat', text, sender: displayName ?? 'Host' });
    sendData(new TextEncoder().encode(payload), { reliable: true });
    setChatMessages((prev) => [
      ...prev.slice(-49),
      { id: crypto.randomUUID(), text, sender: displayName ?? 'Host', ts: Date.now() },
    ]);
    setChatInput('');
  }, [chatInput, displayName, sendData]);

  const viewerCount = Math.max(0, participants.length - 1);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: '#f43f5e' }}
        />
        <span
          className="text-[0.6rem] font-black tracking-widest px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}
        >
          LIVE
        </span>
        <div className="flex-1" />
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <Users size={12} color="#9ca3af" />
          <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
            {viewerCount}
          </span>
        </div>
      </div>

      {/* Media area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {useVideo ? (
            <VideoConference />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(244,63,94,0.15)',
                  border: '2px solid rgba(244,63,94,0.4)',
                }}
              >
                <Radio size={32} color="#f43f5e" />
              </motion.div>
              <AudioConference />
              <p className="text-sm font-semibold" style={{ color: '#9ca3af' }}>
                {displayName ?? 'You'} — Audio live
              </p>
            </div>
          )}
        </div>

        {/* Floating chat overlay */}
        <AnimatePresence>
          {chatMessages.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pointer-events-none">
              <div className="flex flex-col gap-1 max-h-40 overflow-hidden justify-end">
                {chatMessages.slice(-6).map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-baseline gap-1.5 text-xs"
                  >
                    <span className="font-bold shrink-0" style={{ color: '#f43f5e' }}>
                      {m.sender}
                    </span>
                    <span
                      className="font-medium"
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      {m.text}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div ref={chatEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat input */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Say something…"
          maxLength={200}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
          style={{ color: '#fff', caretColor: '#f43f5e' }}
        />
        <button
          onClick={handleSend}
          disabled={!chatInput.trim()}
          className="p-2 rounded-full transition disabled:opacity-30"
          style={{ backgroundColor: chatInput.trim() ? '#f43f5e' : 'rgba(255,255,255,0.08)' }}
        >
          <Send size={14} color="white" />
        </button>
      </div>

      {/* Stop Live */}
      <div
        className="shrink-0 px-4 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="sr-only">{session.id}</p>
        <button
          onClick={onStopLive}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm tracking-widest text-white"
          style={{ backgroundColor: '#f43f5e' }}
        >
          <StopCircle size={16} />
          STOP LIVE
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveBroadcaster({
  pinId,
  userId,
  displayName,
  onClose,
  onSessionStarted,
  onSessionEnded,
}: Props) {
  const [phase, setPhase] = useState<'setup' | 'connecting' | 'live' | 'error'>('setup');
  const [visibility, setVisibility] = useState<'public' | 'contacts'>('public');
  const [useVideo, setUseVideo] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''
  );
  const [session, setSession] = useState<LiveSession | null>(null);
  const [roomName] = useState(() => `pin-${pinId}-${Date.now()}`);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fetch token so Go Live is instant
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, userId, displayName, canPublish: true }),
        });
        if (!res.ok) throw new Error('Token fetch failed');
        const data = (await res.json()) as { token: string; url?: string };
        setToken(data.token);
        if (data.url) setLivekitUrl(data.url);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to get token');
        setPhase('error');
      }
    })();
  }, [roomName, userId, displayName]);

  const handleGoLive = useCallback(async () => {
    if (!token) return;
    setPhase('connecting');
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          pin_id: pinId,
          host_user_id: userId,
          room_name: roomName,
          started_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      const newSession = data as LiveSession;
      setSession(newSession);
      onSessionStarted(newSession);
      setPhase('live');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to start session');
      setPhase('error');
    }
  }, [token, pinId, userId, roomName, onSessionStarted]);

  const handleStopLive = useCallback(async () => {
    if (!session) return;
    await supabase
      .from('live_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);
    onSessionEnded();
    onClose();
  }, [session, onSessionEnded, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ backgroundColor: '#000' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <Radio size={16} color="#f43f5e" />
          <span className="text-sm font-black tracking-wider text-white">BROADCAST</span>
        </div>
        {phase !== 'live' && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Setup */}
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex-1 flex flex-col px-5 py-6 gap-6 overflow-y-auto"
          >
            {/* Visibility */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
                Who can watch?
              </p>
              <div className="flex gap-3">
                {(['public', 'contacts'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition"
                    style={{
                      backgroundColor: visibility === v ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${visibility === v ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                      color: visibility === v ? '#f43f5e' : '#9ca3af',
                    }}
                  >
                    {v === 'public' ? <Eye size={14} /> : <EyeOff size={14} />}
                    {v === 'public' ? 'Public' : 'Contacts only'}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                {visibility === 'public'
                  ? 'Anyone nearby can join and listen.'
                  : 'Only people in your trusted circle can watch.'}
              </p>
            </div>

            {/* Audio / Video */}
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
                Stream type
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUseVideo(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition"
                  style={{
                    backgroundColor: !useVideo ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${!useVideo ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                    color: !useVideo ? '#f43f5e' : '#9ca3af',
                  }}
                >
                  <Mic size={14} />
                  Audio only
                </button>
                <button
                  onClick={() => setUseVideo(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition"
                  style={{
                    backgroundColor: useVideo ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${useVideo ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                    color: useVideo ? '#f43f5e' : '#9ca3af',
                  }}
                >
                  <Video size={14} />
                  Video
                </button>
              </div>
              {useVideo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg overflow-hidden"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  <Battery size={14} className="mt-0.5 shrink-0" color="#f59e0b" />
                  <p className="text-xs leading-snug" style={{ color: '#f59e0b' }}>
                    Video streaming drains battery faster. Consider audio-only for longer broadcasts in emergencies.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Go Live */}
            <div className="mt-auto">
              <button
                onClick={handleGoLive}
                disabled={!token}
                className="w-full py-4 rounded-2xl font-black text-base tracking-widest text-white transition disabled:opacity-40"
                style={{ backgroundColor: '#f43f5e' }}
              >
                {token ? 'GO LIVE' : 'PREPARING…'}
              </button>
              <p className="text-xs text-center mt-3" style={{ color: '#4b5563' }}>
                Your location will be visible to viewers via this pin.
              </p>
            </div>
          </motion.div>
        )}

        {/* Connecting */}
        {phase === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(244,63,94,0.15)', border: '2px solid rgba(244,63,94,0.4)' }}
            >
              <Radio size={28} color="#f43f5e" />
            </motion.div>
            <p className="text-sm font-bold tracking-widest" style={{ color: '#9ca3af' }}>
              STARTING BROADCAST…
            </p>
          </motion.div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 px-6"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(244,63,94,0.15)' }}
            >
              <X size={24} color="#f43f5e" />
            </div>
            <p className="text-sm font-bold text-white">Broadcast failed</p>
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              {errorMsg ?? 'An unknown error occurred'}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
            >
              Close
            </button>
          </motion.div>
        )}

        {/* Live */}
        {phase === 'live' && token && session && (
          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl}
              audio={true}
              video={useVideo}
              connect={true}
              style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <BroadcasterInner
                session={session}
                useVideo={useVideo}
                displayName={displayName}
                onStopLive={handleStopLive}
              />
            </LiveKitRoom>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
