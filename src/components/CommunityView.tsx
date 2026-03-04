// src/components/CommunityView.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { Community, CommunityMessage } from '@/types';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8',
    border: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.05)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569',
    border: 'rgba(15,23,42,0.06)', hover: 'rgba(15,23,42,0.03)',
  };
}
const FIXED = { accentCyan: '#3BB4C1' };
import { toast } from 'sonner';
import { Plus, Search, Send, ChevronLeft, Users, MessageCircle, Globe } from 'lucide-react';

type Tab = 'messages' | 'groups' | 'communities';

/* ── Helpers ─────────────────────────────────────────────────── */

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ── Main Component ──────────────────────────────────────────── */

export default function CommunityView({ onClose }: { onClose: () => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const { userId, userProfile, unreadDmCount } = useStore();
  const [tab, setTab] = useState<Tab>('messages');
  const [search, setSearch] = useState('');

  // Data
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [lastMessages, setLastMessages] = useState<Record<string, CommunityMessage>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // DM state
  const [dmConvos, setDmConvos] = useState<Array<{
    id: string; partner_id: string; partner_name: string; partner_avatar: string | null;
    last_message: string | null; last_message_at: string; is_unread: boolean;
  }>>([]);

  // Chat state
  const [chatTarget, setChatTarget] = useState<{ id: string; name: string; type: 'community' | 'dm' } | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Fetch communities & memberships ───────────────────────── */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: items }, { data: members }] = await Promise.all([
        supabase.from('communities').select('*').is('parent_community_id', null).order('created_at', { ascending: false }),
        supabase.from('community_members').select('community_id').eq('user_id', userId),
      ]);
      if (items) setCommunities(items);
      if (members) setMemberships(new Set(members.map(m => m.community_id)));
    })();
  }, [userId]);

  /* ── Fetch last messages per community ─────────────────────── */
  useEffect(() => {
    if (!userId || communities.length === 0) return;
    (async () => {
      const ids = communities.map(c => c.id);
      const { data } = await supabase
        .from('community_messages')
        .select('*')
        .in('community_id', ids)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) return;
      const last: Record<string, CommunityMessage> = {};
      const unread: Record<string, number> = {};
      const cutoff = Date.now() - 86_400_000;
      for (const m of data) {
        if (!last[m.community_id]) last[m.community_id] = m;
        if (new Date(m.created_at).getTime() > cutoff && m.user_id !== userId) {
          unread[m.community_id] = (unread[m.community_id] || 0) + 1;
        }
      }
      setLastMessages(last);
      setUnreadCounts(unread);
    })();
  }, [userId, communities]);

  /* ── Fetch DM conversations ────────────────────────────────── */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: convos } = await supabase
        .from('dm_conversations')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });
      if (!convos) return;
      const partnerIds = convos.map(c => c.user1_id === userId ? c.user2_id : c.user1_id);
      const { data: profiles } = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', partnerIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setDmConvos(convos.map(c => {
        const pid = c.user1_id === userId ? c.user2_id : c.user1_id;
        const p = profileMap.get(pid);
        const readAt = c.user1_id === userId ? c.user1_last_read_at : c.user2_last_read_at;
        return {
          id: c.id, partner_id: pid,
          partner_name: p?.display_name || 'Utilisateur',
          partner_avatar: p?.avatar_url || null,
          last_message: c.last_message || null,
          last_message_at: c.last_message_at || c.created_at,
          is_unread: !readAt || new Date(c.last_message_at) > new Date(readAt),
        };
      }));
    })();
  }, [userId]);

  /* ── Chat messages ─────────────────────────────────────────── */
  useEffect(() => {
    if (!chatTarget) return;
    const table = chatTarget.type === 'dm' ? 'direct_messages' : 'community_messages';
    const col = chatTarget.type === 'dm' ? 'conversation_id' : 'community_id';
    (async () => {
      const { data } = await supabase.from(table).select('*').eq(col, chatTarget.id).order('created_at', { ascending: true }).limit(100);
      if (data) setMessages(data as CommunityMessage[]);
    })();
    const channel = supabase.channel(`chat-${chatTarget.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `${col}=eq.${chatTarget.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as CommunityMessage])
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatTarget]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Send message ──────────────────────────────────────────── */
  const sendMessage = useCallback(async () => {
    if (!msgInput.trim() || !chatTarget || !userId) return;
    const text = msgInput.trim();
    setMsgInput('');
    if (chatTarget.type === 'dm') {
      await supabase.from('direct_messages').insert({ conversation_id: chatTarget.id, sender_id: userId, content: text, content_type: 'text' });
      await supabase.from('dm_conversations').update({ last_message: text, last_message_sender_id: userId, last_message_at: new Date().toISOString() }).eq('id', chatTarget.id);
    } else {
      await supabase.from('community_messages').insert({ community_id: chatTarget.id, user_id: userId, display_name: userProfile?.display_name || null, content: text });
    }
  }, [msgInput, chatTarget, userId, userProfile]);

  /* ── Join / Leave ──────────────────────────────────────────── */
  const handleJoin = async (communityId: string) => {
    if (!userId) return;
    const { error } = await supabase.from('community_members').insert({ community_id: communityId, user_id: userId });
    if (error) { toast.error('Impossible de rejoindre'); return; }
    setMemberships(prev => new Set([...prev, communityId]));
    toast.success('Rejoint !');
  };

  /* ── Filter ────────────────────────────────────────────────── */
  const q = search.toLowerCase();
  const myGroups = communities.filter(c => c.community_type === 'group' && memberships.has(c.id) && (!q || c.name.toLowerCase().includes(q)));
  const myCommunities = communities.filter(c => c.community_type === 'community' && memberships.has(c.id) && (!q || c.name.toLowerCase().includes(q)));
  const discoverCommunities = communities.filter(c => c.community_type === 'community' && !memberships.has(c.id) && (!q || c.name.toLowerCase().includes(q)));
  const filteredDMs = dmConvos.filter(d => !q || d.partner_name.toLowerCase().includes(q));

  /* ── Chat View ─────────────────────────────────────────────── */
  if (chatTarget) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col" style={{ backgroundColor: C.bg }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setChatTarget(null)} className="p-1"><ChevronLeft size={22} style={{ color: C.textPrimary }} /></button>
          <h2 className="font-semibold text-base flex-1" style={{ color: C.textPrimary }}>{chatTarget.name}</h2>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map(m => {
            const mine = m.user_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${mine ? 'rounded-br-md' : 'rounded-bl-md'}`}
                  style={mine ? { background: FIXED.accentCyan, color: '#fff' } : { backgroundColor: C.card, color: C.textPrimary }}>
                  {!mine && m.display_name && <p className="text-xs font-medium mb-0.5" style={{ color: FIXED.accentCyan }}>{m.display_name}</p>}
                  <p>{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
          <input
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
            style={{ backgroundColor: C.card, color: C.textPrimary, border: `1px solid ${C.border}` }}
          />
          <button onClick={sendMessage} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: FIXED.accentCyan, color: '#fff' }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Tabs config ───────────────────────────────────────────── */
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'messages', label: 'Messages', badge: unreadDmCount || filteredDMs.filter(d => d.is_unread).length },
    { id: 'groups', label: 'Groupes' },
    { id: 'communities', label: 'Communautés' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ backgroundColor: C.bg }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Communauté</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: FIXED.accentCyan, color: '#fff' }}>
          <Plus size={20} />
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <Search size={16} style={{ color: C.textSecondary }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: C.textPrimary }}
          />
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={tab === t.id ? { background: FIXED.accentCyan, color: '#fff' } : { backgroundColor: C.card, color: C.textSecondary }}
          >
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full text-[0.65rem] font-bold flex items-center justify-center px-1"
                style={tab === t.id ? { background: '#fff', color: FIXED.accentCyan } : { background: FIXED.accentCyan, color: '#fff' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">

        {/* Messages Tab */}
        {tab === 'messages' && (
          <div className="space-y-1">
            {filteredDMs.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: C.textSecondary }}>Aucune conversation</p>
            )}
            {filteredDMs.map(dm => (
              <button
                key={dm.id}
                onClick={() => setChatTarget({ id: dm.id, name: dm.partner_name, type: 'dm' })}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:opacity-80"
                style={{ backgroundColor: dm.is_unread ? C.card : 'transparent' }}
              >
                <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-lg font-semibold overflow-hidden"
                  style={{ backgroundColor: C.card, color: C.textSecondary, border: `1px solid ${C.border}` }}>
                  {dm.partner_avatar
                    ? <img src={dm.partner_avatar} alt="" className="w-full h-full object-cover" />
                    : dm.partner_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${dm.is_unread ? 'font-semibold' : 'font-medium'}`} style={{ color: C.textPrimary }}>{dm.partner_name}</span>
                    <span className="text-xs" style={{ color: C.textSecondary }}>{timeAgo(dm.last_message_at)}</span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: dm.is_unread ? C.textPrimary : C.textSecondary }}>
                    {dm.last_message || 'Nouvelle conversation'}
                  </p>
                </div>
                {dm.is_unread && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: FIXED.accentCyan }} />}
              </button>
            ))}
          </div>
        )}

        {/* Groups Tab */}
        {tab === 'groups' && (
          <div className="space-y-5">
            {/* Mon Cercle */}
            <Section icon="🛡️" title="Mon Cercle">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-square rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                    <Users size={24} style={{ color: C.textSecondary }} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Mes Groupes */}
            <Section icon="👥" title="Mes Groupes">
              {myGroups.length === 0 && <EmptyState text="Aucun groupe rejoint" />}
              {myGroups.map(g => (
                <CommunityRow
                  key={g.id}
                  emoji={g.avatar_emoji || '👥'}
                  name={g.name}
                  subtitle={lastMessages[g.id]?.content || 'Aucun message'}
                  time={lastMessages[g.id] ? timeAgo(lastMessages[g.id].created_at) : ''}
                  unread={unreadCounts[g.id] || 0}
                  onClick={() => setChatTarget({ id: g.id, name: g.name, type: 'community' })}
                />
              ))}
            </Section>

            {/* Autour de vous */}
            <Section icon="📍" title="Autour de vous">
              <div className="grid grid-cols-3 gap-2">
                {communities.filter(c => c.community_type === 'group' && !memberships.has(c.id)).slice(0, 6).map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleJoin(g.id)}
                    className="rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
                  >
                    <span className="text-2xl">{g.avatar_emoji || '👥'}</span>
                    <span className="text-xs font-medium truncate w-full" style={{ color: C.textPrimary }}>{g.name}</span>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Communities Tab */}
        {tab === 'communities' && (
          <div className="space-y-5">
            {/* Vos communautés */}
            <Section icon="🌍" title="Vos communautés">
              {myCommunities.length === 0 && <EmptyState text="Aucune communauté rejointe" />}
              {myCommunities.map(c => (
                <CommunityRow
                  key={c.id}
                  emoji={c.avatar_emoji || '🏘️'}
                  name={c.name}
                  subtitle={lastMessages[c.id]?.content || c.description || 'Aucun message'}
                  time={lastMessages[c.id] ? timeAgo(lastMessages[c.id].created_at) : ''}
                  unread={unreadCounts[c.id] || 0}
                  onClick={() => setChatTarget({ id: c.id, name: c.name, type: 'community' })}
                />
              ))}
            </Section>

            {/* Découvrir */}
            <Section icon="🔍" title="Découvrir">
              {discoverCommunities.length === 0 && <EmptyState text="Toutes les communautés sont rejointes" />}
              {discoverCommunities.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: C.card }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: C.hover }}>
                    {c.avatar_emoji || '🏘️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: C.textPrimary }}>{c.name}</p>
                    <p className="text-xs truncate" style={{ color: C.textSecondary }}>{c.description || 'Communauté'}</p>
                  </div>
                  <button
                    onClick={() => handleJoin(c.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors hover:opacity-80"
                    style={{ background: FIXED.accentCyan, color: '#fff' }}
                  >
                    Rejoindre
                  </button>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small UI Pieces ─────────────────────────────────────────── */

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CommunityRow({ emoji, name, subtitle, time, unread, onClick }: {
  emoji: string; name: string; subtitle: string; time: string; unread: number; onClick: () => void;
}) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:opacity-80"
      style={{ backgroundColor: unread > 0 ? C.card : 'transparent' }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: C.hover }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${unread > 0 ? 'font-semibold' : 'font-medium'}`} style={{ color: C.textPrimary }}>{name}</span>
          {time && <span className="text-xs" style={{ color: C.textSecondary }}>{time}</span>}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: C.textSecondary }}>{subtitle}</p>
      </div>
      {unread > 0 && (
        <span className="min-w-[20px] h-[20px] rounded-full text-[0.65rem] font-bold flex items-center justify-center px-1 shrink-0"
          style={{ background: FIXED.accentCyan, color: '#fff' }}>
          {unread}
        </span>
      )}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  return <p className="text-center py-8 text-sm" style={{ color: C.textSecondary }}>{text}</p>;
}
