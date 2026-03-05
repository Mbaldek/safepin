'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPPORT_USER_ID } from '@/lib/support';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import ChatView from '@/components/chat/ChatView';
import type { ChatColors } from '@/components/chat/ChatBubble';

type ConvoRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_sender_id: string | null;
  last_message_at: string;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
  // enriched
  partner_name: string;
  partner_id: string;
  is_unread: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminSupportPage() {
  const { theme } = useAdminTheme();
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string>('');

  // Get admin user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminUserId(data.user.id);
    });
  }, []);

  const fetchConvos = useCallback(async () => {
    // Fetch all conversations where support user is a participant
    const { data: rows } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`user1_id.eq.${SUPPORT_USER_ID},user2_id.eq.${SUPPORT_USER_ID}`)
      .order('last_message_at', { ascending: false });

    if (!rows || rows.length === 0) {
      setConvos([]);
      return;
    }

    // Collect partner user IDs
    const partnerIds = rows.map((r) =>
      r.user1_id === SUPPORT_USER_ID ? r.user2_id : r.user1_id,
    );

    // Fetch partner profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, name')
      .in('id', partnerIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name || p.name || 'User']),
    );

    const enriched: ConvoRow[] = rows.map((r) => {
      const partnerId = r.user1_id === SUPPORT_USER_ID ? r.user2_id : r.user1_id;
      // Support reads as whichever position they are
      const supportPosition = r.user1_id === SUPPORT_USER_ID ? 'user1' : 'user2';
      const lastRead = supportPosition === 'user1' ? r.user1_last_read_at : r.user2_last_read_at;
      const isUnread =
        r.last_message_sender_id !== SUPPORT_USER_ID &&
        (!lastRead || new Date(r.last_message_at) > new Date(lastRead));

      return {
        ...r,
        partner_id: partnerId,
        partner_name: profileMap.get(partnerId) ?? 'User',
        is_unread: isUnread,
      };
    });

    setConvos(enriched);
  }, []);

  useEffect(() => {
    fetchConvos();
  }, [fetchConvos]);

  // Realtime: refresh conversation list on changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-convos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_conversations' },
        () => fetchConvos(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConvos]);

  const selected = convos.find((c) => c.id === selectedId);

  const chatColors: ChatColors = {
    myBg: theme.cyan,
    myText: '#FFFFFF',
    partnerBg: theme.elevated,
    partnerText: theme.t1,
    timestamp: theme.t3,
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px - 48px)', overflow: 'hidden' }}>
      {/* Left panel — conversation list */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          borderRight: `1px solid ${theme.borderMd}`,
          display: 'flex',
          flexDirection: 'column',
          background: theme.card,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
            fontSize: 15,
            fontWeight: 600,
            color: theme.t1,
          }}
        >
          Support Inbox
          {convos.filter((c) => c.is_unread).length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                background: theme.dangerSoft,
                color: theme.danger,
              }}
            >
              {convos.filter((c) => c.is_unread).length}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convos.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: theme.t3,
                fontSize: 13,
              }}
            >
              Aucune conversation
            </div>
          )}
          {convos.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedId(convo.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 20px',
                border: 'none',
                borderLeft:
                  convo.id === selectedId
                    ? `3px solid ${theme.cyan}`
                    : '3px solid transparent',
                background: convo.id === selectedId ? theme.cyanSoft : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: theme.elevated,
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.t2,
                  flexShrink: 0,
                }}
              >
                {initials(convo.partner_name)}
              </div>

              {/* Name + last message */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: convo.is_unread ? 700 : 500,
                      color: theme.t1,
                    }}
                  >
                    {convo.partner_name}
                  </span>
                  <span style={{ fontSize: 10, color: theme.t3 }}>
                    {timeAgo(convo.last_message_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: convo.is_unread ? theme.t1 : theme.t3,
                    fontWeight: convo.is_unread ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {convo.last_message ?? 'Nouvelle conversation'}
                </div>
              </div>

              {/* Unread dot */}
              {convo.is_unread && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: theme.cyan,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.bg }}>
        {selected && adminUserId ? (
          <>
            {/* Chat header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: theme.card,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: theme.elevated,
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.t2,
                }}
              >
                {initials(selected.partner_name)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.t1 }}>
                  {selected.partner_name}
                </div>
                <div style={{ fontSize: 11, color: theme.t3 }}>
                  Conversation support
                </div>
              </div>
            </div>

            {/* Chat */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatView
                key={selected.id}
                conversationId={selected.id}
                currentUserId={adminUserId}
                sendAsUserId={SUPPORT_USER_ID}
                partnerName={selected.partner_name}
                colors={chatColors}
                inputBg={theme.card}
                inputBorder={theme.borderMd}
                inputText={theme.t1}
                buttonBg={theme.cyan}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
              color: theme.t3,
            }}
          >
            <span style={{ fontSize: 40 }}>💬</span>
            <span style={{ fontSize: 14 }}>Sélectionnez une conversation</span>
          </div>
        )}
      </div>
    </div>
  );
}
