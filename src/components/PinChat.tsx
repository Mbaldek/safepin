// src/components/PinChat.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatePresence } from 'framer-motion';
import { Comment } from '@/types';
import FlagReportModal from './FlagReportModal';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${hours}h ago`;
}

export default function PinChat({
  pinId,
  userId,
  displayName,
  isExpired,
  collapsed = false,
  onCountChange,
}: {
  pinId: string;
  userId: string | null;
  displayName: string | null;
  isExpired: boolean;
  collapsed?: boolean;
  onCountChange?: (n: number) => void;
}) {
  const [messages, setMessages] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flagTarget, setFlagTarget] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  // Initial load
  useEffect(() => {
    supabase
      .from('pin_comments')
      .select('*')
      .eq('pin_id', pinId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = data ?? [];
        setMessages(rows);
        onCountChangeRef.current?.(rows.length);
      });
  }, [pinId]);

  // Realtime new messages
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${pinId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pin_comments', filter: `pin_id=eq.${pinId}` },
        (payload) => setMessages((prev) => {
          const next = [...prev, payload.new as Comment];
          onCountChangeRef.current?.(next.length);
          return next;
        })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pinId]);

  // Auto-scroll to latest message only when visible
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  async function send() {
    if (!input.trim() || !userId || submitting || isExpired) return;
    setSubmitting(true);
    const { error } = await supabase.from('pin_comments').insert({
      pin_id: pinId,
      user_id: userId,
      display_name: displayName ?? null,
      content: input.trim(),
    });
    setSubmitting(false);
    if (!error) setInput('');
  }

  if (collapsed) return null;

  return (
    <div>
      <AnimatePresence>
        {flagTarget && (
          <FlagReportModal
            key="chat-flag"
            targetType="message"
            targetId={flagTarget}
            onClose={() => setFlagTarget(null)}
          />
        )}
      </AnimatePresence>
      {/* Message bubbles */}
      <div className="flex flex-col gap-1.5 mb-3 max-h-[260px] overflow-y-auto no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {isExpired
                ? 'This pin has expired — chat is archived'
                : 'No messages yet\nStart the conversation'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === userId;
            return (
              <div key={msg.id} className={`group flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender name (others only) */}
                {!isMe && (
                  <span className="text-[0.6rem] font-bold ml-2" style={{ color: 'var(--text-muted)' }}>
                    {msg.display_name ?? 'Anonymous'}
                  </span>
                )}
                {/* Bubble */}
                <div
                  className="max-w-[78%] px-3.5 py-2 text-sm leading-relaxed"
                  style={
                    isMe
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          borderRadius: '18px 18px 4px 18px',
                        }
                      : {
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '18px 18px 18px 4px',
                        }
                  }
                >
                  {msg.content}
                </div>
                {/* Timestamp + flag */}
                <div className={`flex items-center gap-1.5 mx-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(msg.created_at)}
                  </span>
                  {!isMe && userId && (
                    <button
                      onClick={() => setFlagTarget(msg.id)}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition p-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Flag size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      {!isExpired && userId ? (
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Message…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || submitting}
            className="w-7 h-7 rounded-full flex items-center justify-center transition disabled:opacity-30 shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Send size={13} strokeWidth={2.5} style={{ color: '#fff' }} />
          </button>
        </div>
      ) : isExpired ? (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
          Pin expired — chat is read-only
        </p>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
          Sign in to chat
        </p>
      )}
    </div>
  );
}
