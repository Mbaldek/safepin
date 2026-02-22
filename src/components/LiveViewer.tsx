// src/components/LiveViewer.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  VideoConference,
  useParticipants,
  useDataChannel,
  useRoomContext,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { X, Flag, Users, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveSession } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  text: string;
  sender: string;
  ts: number;
};

type Props = {
  session: LiveSession;
  userId: string;
  displayName: string | null;
  onClose: () => void;
  onReport: () => void;
};

// ─── ViewerInner (rendered inside LiveKitRoom context) ────────────────────────

function ViewerInner({
  session,
  displayName,
  onClose,
  onReport,
}: {
  session: LiveSession;
  displayName: string | null;
  onClose: () => void;
  onReport: () => void;
}) {
  const participants = useParticipants();
  const room = useRoomContext();
  const [hostPublishesVideo, setHostPublishesVideo] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Detect if host is publishing video
  useEffect(() => {
    if (!room) return;
    const checkVideo = () => {
      const hasVideo = Array.from(room.remoteParticipants.values()).some(
        (p) => p.videoTrackPublications.size > 0
      );
      setHostPublishesVideo(hasVideo);
    };
    room.on(RoomEvent.TrackPublished, checkVideo);
    room.on(RoomEvent.TrackUnpublished, checkVideo);
    room.on(RoomEvent.ParticipantConnected, checkVideo);
    room.on(RoomEvent.ParticipantDisconnected, checkVideo);
    checkVideo();
    return () => {
      room.off(RoomEvent.TrackPublished, checkVideo);
      room.off(RoomEvent.TrackUnpublished, checkVideo);
      room.off(RoomEvent.ParticipantConnected, checkVideo);
      room.off(RoomEvent.ParticipantDisconnected, checkVideo);
    };
  }, [room]);

  // Receive chat messages
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
      // malformed, ignore
    }
  });

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const payload = JSON.stringify({ type: 'chat', text, sender: displayName ?? 'Anonymous' });
    sendData(new TextEncoder().encode(payload), { reliable: true });
    setChatMessages((prev) => [
      ...prev.slice(-49),
      { id: crypto.randomUUID(), text, sender: displayName ?? 'Anonymous', ts: Date.now() },
    ]);
    setChatInput('');
  }, [chatInput, displayName, sendData]);

  const viewerCount = Math.max(0, participants.length);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
          >
            {(session.display_name?.[0] ?? '?').toUpperCase()}
          </div>
          <span className="text-sm font-bold truncate text-white">
            {session.display_name ?? 'Anonymous'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#f43f5e' }}
            />
            <span
              className="text-[0.6rem] font-black tracking-widest px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}
            >
              LIVE
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <Users size={11} color="#9ca3af" />
          <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
            {viewerCount}
          </span>
        </div>

        <button
          onClick={onReport}
          className="p-1.5 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          aria-label="Report broadcast"
        >
          <Flag size={14} color="#9ca3af" />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          aria-label="Leave broadcast"
        >
          <X size={14} color="#9ca3af" />
        </button>
      </div>

      {/* Media area */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div className="h-full">
          {hostPublishesVideo ? <VideoConference /> : <AudioConference />}
        </div>

        {/* Floating chat overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pointer-events-none">
          <div className="flex flex-col gap-1 max-h-48 overflow-hidden justify-end">
            <AnimatePresence initial={false}>
              {chatMessages.slice(-8).map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-baseline gap-1.5 text-xs"
                >
                  <span className="font-bold shrink-0" style={{ color: '#f43f5e' }}>
                    {m.sender}
                  </span>
                  <span
                    style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
                  >
                    {m.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat input */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Say something…"
          maxLength={200}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-600"
          style={{ color: 'rgba(255,255,255,0.9)', caretColor: '#f43f5e' }}
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
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveViewer({ session, userId, displayName, onClose, onReport }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''
  );
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: session.room_name,
            userId,
            displayName,
            canPublish: false,
          }),
        });
        if (!res.ok) throw new Error('Token fetch failed');
        const data = (await res.json()) as { token: string; url?: string };
        setToken(data.token);
        if (data.url) setLivekitUrl(data.url);
      } catch (e) {
        setTokenError(e instanceof Error ? e.message : 'Failed to connect');
      }
    })();
  }, [session.room_name, userId, displayName]);

  // Session already ended
  if (session.ended_at) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5"
        style={{ backgroundColor: '#000' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          📡
        </div>
        <div className="text-center">
          <p className="text-base font-black text-white mb-1">Live ended</p>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {session.display_name ?? 'The broadcaster'} has stopped the live.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
        >
          Close
        </button>
      </motion.div>
    );
  }

  // Token error
  if (tokenError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6"
        style={{ backgroundColor: '#000' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(244,63,94,0.15)' }}
        >
          <X size={24} color="#f43f5e" />
        </div>
        <p className="text-sm font-bold text-white">Could not join</p>
        <p className="text-xs text-center" style={{ color: '#6b7280' }}>
          {tokenError}
        </p>
        <button
          onClick={onClose}
          className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
        >
          Close
        </button>
      </motion.div>
    );
  }

  // Loading token
  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#000' }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.3 }}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(244,63,94,0.12)', border: '2px solid rgba(244,63,94,0.3)' }}
        >
          <Users size={22} color="#f43f5e" />
        </motion.div>
        <p className="text-sm font-bold tracking-widest" style={{ color: '#9ca3af' }}>
          JOINING…
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ backgroundColor: '#000' }}
    >
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        audio={false}
        video={false}
        connect={true}
        style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <ViewerInner
          session={session}
          displayName={displayName}
          onClose={onClose}
          onReport={onReport}
        />
      </LiveKitRoom>
    </motion.div>
  );
}
