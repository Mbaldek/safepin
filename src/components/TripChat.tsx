// src/components/TripChat.tsx — Mini chat panel for active trips

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTranslations } from 'next-intl';

type TripMessage = {
  id: string;
  trip_id: string;
  sender_id: string;
  type: 'quick' | 'text';
  content: string;
  created_at: string;
  sender_name?: string;
};

const QUICK_REPLIES = [
  { label: 'Je suis dispo !', emoji: '💪' },
  { label: 'Je surveille', emoji: '👀' },
  { label: 'Bon courage', emoji: '❤️' },
];

export default function TripChat({ tripId }: { tripId: string }) {
  const userId = useStore((s) => s.userId);
  const t = useTranslations('trip');
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages + subscribe to new ones
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('trip_messages')
        .select('id, trip_id, sender_id, type, content, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        // Hydrate sender names
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', senderIds);
        const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name ?? '?']));

        setMessages(data.map((m) => ({ ...m, sender_name: nameMap[m.sender_id] })));
      }
    }

    load();

    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_messages',
        filter: `trip_id=eq.${tripId}`,
      }, async (payload) => {
        const msg = payload.new as TripMessage;
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', msg.sender_id)
          .single();
        msg.sender_name = profile?.display_name ?? '?';
        setMessages((prev) => [...prev, msg]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function sendMessage(content: string, type: 'quick' | 'text') {
    if (!userId || !content.trim()) return;
    setSending(true);
    await supabase.from('trip_messages').insert({
      trip_id: tripId,
      sender_id: userId,
      type,
      content: content.trim(),
    });
    setText('');
    setSending(false);
  }

  return (
    <div className="flex flex-col gap-2" style={{ maxHeight: '240px' }}>
      {/* Quick response pills */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_REPLIES.map((qr) => (
          <button
            key={qr.label}
            onClick={() => sendMessage(`${qr.emoji} ${qr.label}`, 'quick')}
            disabled={sending}
            className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {qr.emoji} {qr.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-1.5 overflow-y-auto pr-1"
        style={{ maxHeight: '150px' }}
      >
        {messages.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
            {t('chatEmpty') ?? 'No messages yet'}
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  {msg.sender_name}
                </span>
              )}
              <div
                className="text-xs px-3 py-1.5 rounded-xl max-w-[85%]"
                style={{
                  backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-card)',
                  color: isMe ? 'var(--surface-base)' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Text input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(text, 'text'); }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chatPlaceholder') ?? 'Message...'}
          className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="p-2 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Send size={14} color="var(--surface-base)" />
        </button>
      </form>
    </div>
  );
}
