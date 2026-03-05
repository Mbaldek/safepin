'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendSupportMessage, markConversationRead } from '@/lib/support';
import ChatBubble, { type ChatColors } from './ChatBubble';
import type { DirectMessage } from '@/types';

export interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  /** Who sends — currentUserId for user side, SUPPORT_USER_ID for admin */
  sendAsUserId: string;
  partnerName: string;
  colors: ChatColors;
  /** Extra color tokens for the input area */
  inputBg: string;
  inputBorder: string;
  inputText: string;
  buttonBg: string;
  onBack?: () => void;
}

export default function ChatView({
  conversationId,
  currentUserId,
  sendAsUserId,
  partnerName,
  colors,
  inputBg,
  inputBorder,
  inputText,
  buttonBg,
}: ChatViewProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine read position for this user
  const readPosition = useCallback(
    (convo: { user1_id: string; user2_id: string }) =>
      convo.user1_id === currentUserId ? 'user1' as const : 'user2' as const,
    [currentUserId],
  );

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;

    supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as DirectMessage[]);
      });

    // Mark as read
    supabase
      .from('dm_conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => {
        if (data) markConversationRead(conversationId, currentUserId, readPosition(data));
      });
  }, [conversationId, currentUserId, readPosition]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Mark as read if incoming
          if (msg.sender_id !== sendAsUserId) {
            supabase
              .from('dm_conversations')
              .select('user1_id, user2_id')
              .eq('id', conversationId)
              .single()
              .then(({ data }) => {
                if (data) markConversationRead(conversationId, currentUserId, readPosition(data));
              });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, sendAsUserId, currentUserId, readPosition]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await sendSupportMessage(conversationId, sendAsUserId, trimmed);
      setText('');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingTop: 12, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 8,
              opacity: 0.5,
            }}
          >
            <span style={{ fontSize: 32 }}>💬</span>
            <span style={{ fontSize: 14, color: colors.partnerText }}>
              Comment pouvons-nous vous aider ?
            </span>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            content={msg.content ?? ''}
            time={msg.created_at}
            isMine={msg.sender_id === sendAsUserId}
            colors={colors}
          />
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderTop: `1px solid ${inputBorder}`,
          background: inputBg,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${partnerName}...`}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 20,
            border: `1px solid ${inputBorder}`,
            background: 'transparent',
            color: inputText,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: text.trim() ? buttonBg : 'transparent',
            color: text.trim() ? '#FFFFFF' : colors.timestamp,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            transition: 'background 150ms',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
