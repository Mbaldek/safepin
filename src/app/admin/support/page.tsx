'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { SUPPORT_USER_ID } from '@/lib/support';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { timeAgo } from '@/lib/utils';
import ChatView from '@/components/chat/ChatView';
import type { ChatColors } from '@/components/chat/ChatBubble';

/* ─── Types ─── */

type ConvoRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_sender_id: string | null;
  last_message_at: string;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
  partner_name: string;
  partner_id: string;
  is_unread: boolean;
};

/* ─── Helpers ─── */

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Main Page ─── */

export default function AdminSupportPage() {
  const { theme } = useAdminTheme();
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminUserId(data.user.id);
    });
  }, []);

  const fetchConvos = useCallback(async () => {
    const { data: rows } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`user1_id.eq.${SUPPORT_USER_ID},user2_id.eq.${SUPPORT_USER_ID}`)
      .order('last_message_at', { ascending: false });

    if (!rows || rows.length === 0) {
      setConvos([]);
      return;
    }

    const partnerIds = rows.map((r) =>
      r.user1_id === SUPPORT_USER_ID ? r.user2_id : r.user1_id,
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, name')
      .in('id', partnerIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name || p.name || 'User']),
    );

    const enriched: ConvoRow[] = rows.map((r) => {
      const partnerId = r.user1_id === SUPPORT_USER_ID ? r.user2_id : r.user1_id;
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

  useEffect(() => { fetchConvos(); }, [fetchConvos]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-support-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_conversations', filter: `or(user1_id=eq.${SUPPORT_USER_ID},user2_id=eq.${SUPPORT_USER_ID})` }, () => fetchConvos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConvos]);

  /* ─── Mark as read ─── */

  async function markAsRead(convo: ConvoRow) {
    const supportPosition = convo.user1_id === SUPPORT_USER_ID ? 'user1' : 'user2';
    const field = `${supportPosition}_last_read_at`;
    await supabase
      .from('dm_conversations')
      .update({ [field]: new Date().toISOString() })
      .eq('id', convo.id);
    // Optimistic update
    setConvos((prev) =>
      prev.map((c) => (c.id === convo.id ? { ...c, is_unread: false } : c)),
    );
  }

  function selectConvo(convo: ConvoRow) {
    setSelectedId(convo.id);
    if (convo.is_unread) markAsRead(convo);
  }

  const selected = convos.find((c) => c.id === selectedId);
  const unreadCount = convos.filter((c) => c.is_unread).length;

  // Filter conversations
  const filtered = search.trim()
    ? convos.filter((c) => c.partner_name.toLowerCase().includes(search.toLowerCase()))
    : convos;

  const chatColors: ChatColors = {
    myBg: theme.cyan,
    myText: '#FFFFFF',
    partnerBg: theme.elevated,
    partnerText: theme.t1,
    timestamp: theme.t3,
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px - 48px)', overflow: 'hidden', borderRadius: 20, border: `1px solid ${theme.border}` }}>
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
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: theme.t1 }}>Support Inbox</span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: theme.dangerSoft,
                  color: theme.danger,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                convos.filter((c) => c.is_unread).forEach((c) => markAsRead(c));
              }}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 100,
                border: 'none',
                background: theme.cyanSoft,
                color: theme.cyan,
                cursor: 'pointer',
              }}
            >
              Tout lire
            </motion.button>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: '8px 16px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 8,
              border: `1px solid ${theme.borderMd}`,
              background: theme.elevated,
              color: theme.t1,
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: theme.t3, fontSize: 13 }}>
              Aucune conversation
            </div>
          )}
          {filtered.map((convo) => (
            <button
              key={convo.id}
              onClick={() => selectConvo(convo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 20px',
                border: 'none',
                borderLeft: convo.id === selectedId ? '3px solid #3BB4C1' : '3px solid transparent',
                background: convo.id === selectedId ? theme.cyanSoft : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: convo.is_unread ? 700 : 500, color: theme.t1 }}>
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
              {convo.is_unread && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#3BB4C1',
                    flexShrink: 0,
                    boxShadow: '0 0 6px rgba(59,180,193,0.4)',
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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.t1 }}>
                  {selected.partner_name}
                </div>
                <div style={{ fontSize: 11, color: theme.t3 }}>
                  Conversation support
                </div>
              </div>
            </div>

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
