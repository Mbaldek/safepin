'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { getOrCreateSupportConversation, SUPPORT_USER_ID } from '@/lib/support';
import ChatView from '@/components/chat/ChatView';
import type { ChatColors } from '@/components/chat/ChatBubble';

interface SupportChatScreenProps {
  onBack: () => void;
}

export default function SupportChatScreen({ onBack }: SupportChatScreenProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const userId = useStore((s) => s.userId);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !SUPPORT_USER_ID) return;
    getOrCreateSupportConversation(userId)
      .then((convo) => setConversationId(convo.id))
      .finally(() => setLoading(false));
  }, [userId]);

  const chatColors: ChatColors = {
    myBg: isDark ? '#1E3A5F' : '#3BB4C1',
    myText: '#FFFFFF',
    partnerBg: isDark ? '#1E293B' : '#F1F5F9',
    partnerText: isDark ? '#E2E8F0' : '#0F172A',
    timestamp: isDark ? '#94A3B8' : '#64748B',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 12px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'}`,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isDark ? '#334155' : '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#94A3B8' : '#64748B',
            fontSize: 18,
          }}
        >
          &#8249;
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E3A5F, #3BB4C1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: 700,
          }}
        >
          B
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}>
            Breveil Support
          </div>
          <div style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8' }}>
            Nous vous répondrons rapidement
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: isDark ? '#64748B' : '#94A3B8',
              fontSize: 14,
            }}
          >
            Chargement...
          </div>
        ) : conversationId && userId ? (
          <ChatView
            conversationId={conversationId}
            currentUserId={userId}
            sendAsUserId={userId}
            partnerName="Breveil Support"
            colors={chatColors}
            inputBg={isDark ? '#0F172A' : '#FFFFFF'}
            inputBorder={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
            inputText={isDark ? '#FFFFFF' : '#0F172A'}
            buttonBg="#3BB4C1"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: isDark ? '#64748B' : '#94A3B8',
              fontSize: 14,
            }}
          >
            Support non disponible
          </div>
        )}
      </div>
    </div>
  );
}
