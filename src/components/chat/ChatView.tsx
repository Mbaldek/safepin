'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { sendSupportMessage, markConversationRead, notifyDmRecipient } from '@/lib/support';
import ChatBubble, { type ChatColors } from './ChatBubble';
import ChatTextBar from './ChatTextBar';
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
  const toast = useToast();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatPlaceholder = useMemo(() => {
    const phrases = [
      `Écrivez à ${partnerName}…`,
      `Un mot pour ${partnerName} ? 💬`,
      `Dites quelque chose de sympa à ${partnerName} 😊`,
      `${partnerName} attend votre message…`,
      `Envoyez un signe à ${partnerName} 👋`,
      `Quoi de neuf, ${partnerName} ? 🌟`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, [partnerName]);

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

  const handleFilePick = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop lourd (max 10 Mo)');
      return;
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
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
    } finally {
      setSending(false);
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

      {/* Input */}
      <ChatTextBar
        isDark={isDark}
        value={text}
        onChange={setText}
        onSend={handleSend}
        onFilePick={handleFilePick}
        pendingPreview={pendingPreview}
        pendingFileName={pendingFile?.name ?? null}
        pendingIsVideo={pendingFile?.type.startsWith('video')}
        onClearPending={clearPending}
        uploading={uploading}
        sending={sending}
        placeholder={chatPlaceholder}
      />
    </div>
  );
}
