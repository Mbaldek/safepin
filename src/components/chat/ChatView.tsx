'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import EmojiPickerButton from '@/components/ui/EmojiPickerButton';
import { sendSupportMessage, markConversationRead, notifyDmRecipient } from '@/lib/support';
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
  isDark?: boolean;
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
  isDark = false,
}: ChatViewProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop lourd (max 10 Mo)');
      return;
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    if (e.target) e.target.value = '';
  }, []);

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }, [pendingPreview]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;
    if (sending || uploading) return;

    let mediaUrl: string | undefined;
    let contentType: 'text' | 'image' | 'video' = 'text';

    if (pendingFile) {
      setUploading(true);
      const ext = pendingFile.name.split('.').pop() || 'bin';
      const path = `dm/${sendAsUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, pendingFile);
      setUploading(false);
      if (error) { toast.error("Erreur d'upload"); return; }
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      mediaUrl = pub.publicUrl;
      contentType = pendingFile.type.startsWith('video') ? 'video' : 'image';
      clearPending();
    }

    setSending(true);
    try {
      await sendSupportMessage(conversationId, sendAsUserId, trimmed, mediaUrl ? { media_url: mediaUrl, content_type: contentType } : undefined);
      notifyDmRecipient(conversationId, sendAsUserId, mediaUrl ? (trimmed || '📎 Media') : trimmed);
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
            mediaUrl={msg.media_url}
            contentType={msg.content_type}
          />
        ))}
      </div>

      {/* Preview strip */}
      {pendingPreview && (
        <div style={{
          padding: '6px 12px',
          borderTop: `1px solid ${inputBorder}`,
          background: inputBg,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {pendingFile?.type.startsWith('video') ? (
            <video src={pendingPreview} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <img src={pendingPreview} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
          )}
          <span style={{ fontSize: 11, color: colors.timestamp, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pendingFile?.name}
          </span>
          <button onClick={clearPending} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <X size={14} style={{ color: colors.timestamp }} />
          </button>
        </div>
      )}

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
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: isDark ? '#334155' : '#F8FAFC', border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: uploading ? 0.4 : 0.7,
            flexShrink: 0,
          }}
        >
          <Plus size={16} style={{ color: isDark ? '#94A3B8' : '#475569' }} />
        </button>
        <EmojiPickerButton onSelect={e => setText(p => p + e)} isDark={isDark} />
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
          disabled={(!text.trim() && !pendingFile) || sending || uploading}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: (text.trim() || pendingFile) ? buttonBg : 'transparent',
            color: (text.trim() || pendingFile) ? '#FFFFFF' : colors.timestamp,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (text.trim() || pendingFile) ? 'pointer' : 'default',
            transition: 'background 150ms',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
