// src/components/CommunityView.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Community, CommunityMessage } from '@/types';
import { toast } from 'sonner';
import { Plus, MessageCircle, MapPinned, Users, BookOpen, ChevronRight } from 'lucide-react';
import StoriesRow from '@/components/StoriesRow';
import FriendsView from '@/components/FriendsView';
import NeighborhoodFeed from '@/components/NeighborhoodFeed';
import TrustedCircleCard from '@/components/TrustedCircleCard';

type View = 'home' | 'list' | 'community-detail' | 'chat' | 'create' | 'messages' | 'neighborhoods';
type CreateType = 'community' | 'group';

import { timeAgo, springTransition } from '@/lib/utils';

const EMOJI_OPTIONS = ['🏘️', '🏙️', '🌳', '🛡️', '🔒', '🌍', '🎯', '💡', '🎭', '⚡', '🌐', '🏃', '🚴', '🌙', '🎪'];

// ─── Unified Card ─────────────────────────────────────────────────────────────

function ItemCard({
  item, isMember, isOwner = false,
  onPrimary, onJoin, onLeave, subGroupCount = 0,
}: {
  item: Community;
  isMember: boolean;
  isOwner?: boolean;
  onPrimary: () => void;
  onJoin?: () => void;
  onLeave?: () => void;
  subGroupCount?: number;
}) {
  const t = useTranslations('community');
  const isCommunity = item.community_type === 'community';
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {item.avatar_emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
            {item.name}
          </p>
          {isCommunity && (
            <span
              className="text-[0.5rem] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
            >
              Community
            </span>
          )}
          {item.is_private && (
            <span className="text-[0.55rem] shrink-0" style={{ color: 'var(--text-muted)' }}>🔒</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs line-clamp-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {item.description}
          </p>
        )}
        <p className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>
          {t('members', { count: item.member_count })}
          {isCommunity && subGroupCount > 0 && (
            <> · {subGroupCount} {subGroupCount === 1 ? 'group' : 'groups'}</>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {isMember ? (
          <>
            <button
              onClick={onPrimary}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {isCommunity ? 'View →' : 'Chat'}
            </button>
            {!isOwner && (
              <button
                onClick={onLeave}
                className="px-3 py-1 rounded-xl text-[0.6rem] font-bold"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                {t('leave')}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onJoin}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
          >
            {t('join')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CommunityView({ onClose }: { onClose: () => void }) {
  const t = useTranslations('community');
  const { userId, userProfile } = useStore();

  // Navigation
  const [view, setView]       = useState<View>('home');
  const [chatFrom, setChatFrom] = useState<'list' | 'community-detail'>('list');

  // All top-level items (communities + standalone groups)
  const [items, setItems]               = useState<Community[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [subGroupCounts, setSubGroupCounts] = useState<Record<string, number>>({});

  // Chat
  const [selectedItem, setSelectedItem] = useState<Community | null>(null);
  const [messages, setMessages]         = useState<CommunityMessage[]>([]);
  const [msgInput, setMsgInput]         = useState('');
  const [sending, setSending]           = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Community detail
  const [communityDetailOf, setCommunityDetailOf] = useState<Community | null>(null);
  const [subGroups, setSubGroups]                 = useState<Community[]>([]);

  // Create
  const [createType, setCreateType]     = useState<CreateType>('community');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showNewPicker, setShowNewPicker] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newDesc, setNewDesc]   = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [newEmoji, setNewEmoji] = useState('🏘️');
  const [creating, setCreating] = useState(false);

  // ── Load top-level items ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    loadItems();
    loadMyMemberships();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadItems() {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .is('parent_community_id', null)
      .order('created_at', { ascending: false });
    if (!data) return;

    const { data: memberData } = await supabase.from('community_members').select('community_id');
    const countMap: Record<string, number> = {};
    memberData?.forEach((m) => { countMap[m.community_id] = (countMap[m.community_id] ?? 0) + 1; });

    const { data: subData } = await supabase
      .from('communities')
      .select('parent_community_id')
      .not('parent_community_id', 'is', null);
    const subCountMap: Record<string, number> = {};
    subData?.forEach((s) => {
      if (s.parent_community_id) {
        subCountMap[s.parent_community_id] = (subCountMap[s.parent_community_id] ?? 0) + 1;
      }
    });

    setItems(data.map((c) => ({ ...c, community_type: c.community_type ?? 'community', parent_community_id: c.parent_community_id ?? null, member_count: countMap[c.id] ?? 0 })));
    setSubGroupCounts(subCountMap);
  }

  async function loadMyMemberships() {
    const { data } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId!);
    setMyMemberships(new Set(data?.map((m) => m.community_id) ?? []));
  }

  // ── Load sub-groups when community-detail opens ────────────────────────────
  useEffect(() => {
    if (view !== 'community-detail' || !communityDetailOf) return;
    supabase
      .from('communities')
      .select('*')
      .eq('parent_community_id', communityDetailOf.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setSubGroups([]); return; }
        const ids = data.map((g) => g.id);
        const { data: memberData } = await supabase
          .from('community_members')
          .select('community_id')
          .in('community_id', ids);
        const countMap: Record<string, number> = {};
        memberData?.forEach((m) => { countMap[m.community_id] = (countMap[m.community_id] ?? 0) + 1; });
        setSubGroups(data.map((g) => ({
          ...g,
          community_type: g.community_type ?? 'group',
          parent_community_id: g.parent_community_id ?? null,
          member_count: countMap[g.id] ?? 0,
        })));
      });
  }, [communityDetailOf?.id, view]);

  // ── Messages ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedItem) return;
    setMessages([]);
    supabase
      .from('community_messages')
      .select('*')
      .eq('community_id', selectedItem.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data ?? []));
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!selectedItem) return;
    const ch = supabase
      .channel(`community-${selectedItem.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_messages',
        filter: `community_id=eq.${selectedItem.id}`,
      }, (payload) => setMessages((prev) => [...prev, payload.new as CommunityMessage]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedItem?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function joinItem(item: Community) {
    if (!userId) return;
    const { error } = await supabase.from('community_members').insert({
      community_id: item.id, user_id: userId, role: 'member',
    });
    if (error) { toast.error(t('failedJoin')); return; }
    setMyMemberships((prev) => new Set([...prev, item.id]));
    setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, member_count: c.member_count + 1 } : c));
    toast.success(t('joined', { name: item.name }));
  }

  async function leaveItem(item: Community) {
    if (!userId) return;
    const { error } = await supabase
      .from('community_members').delete()
      .eq('community_id', item.id).eq('user_id', userId);
    if (error) { toast.error(t('failedLeave')); return; }
    setMyMemberships((prev) => { const s = new Set(prev); s.delete(item.id); return s; });
    setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c));
    if (selectedItem?.id === item.id) setView('home');
    toast.success(t('left', { name: item.name }));
  }

  async function joinSubGroup(group: Community) {
    if (!userId) return;
    const { error } = await supabase.from('community_members').insert({
      community_id: group.id, user_id: userId, role: 'member',
    });
    if (error) { toast.error(t('failedJoin')); return; }
    setMyMemberships((prev) => new Set([...prev, group.id]));
    setSubGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, member_count: g.member_count + 1 } : g));
    toast.success(t('joined', { name: group.name }));
  }

  async function leaveSubGroup(group: Community) {
    if (!userId) return;
    await supabase.from('community_members').delete()
      .eq('community_id', group.id).eq('user_id', userId);
    setMyMemberships((prev) => { const s = new Set(prev); s.delete(group.id); return s; });
    setSubGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g));
    toast.success(t('left', { name: group.name }));
  }

  async function sendMessage() {
    if (!msgInput.trim() || !userId || !selectedItem || sending) return;
    setSending(true);
    const { error } = await supabase.from('community_messages').insert({
      community_id: selectedItem.id, user_id: userId,
      display_name: userProfile?.display_name ?? null, content: msgInput.trim(),
    });
    setSending(false);
    if (!error) setMsgInput('');
  }

  async function handleCreate() {
    if (!newName.trim() || !userId || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        is_private: newPrivate,
        owner_id: userId,
        avatar_emoji: newEmoji,
        community_type: createType,
        parent_community_id: createParentId,
      })
      .select()
      .single();
    if (error) { toast.error(t('failedCreate')); setCreating(false); return; }

    await supabase.from('community_members').insert({
      community_id: data.id, user_id: userId, role: 'owner',
    });
    setMyMemberships((prev) => new Set([...prev, data.id]));

    const newItem: Community = {
      ...data,
      community_type: createType,
      parent_community_id: createParentId,
      member_count: 1,
    };

    if (createParentId) {
      setSubGroups((prev) => [newItem, ...prev]);
      setSubGroupCounts((prev) => ({
        ...prev,
        [createParentId]: (prev[createParentId] ?? 0) + 1,
      }));
      toast.success(t('groupCreated'));
      setView('community-detail');
    } else {
      setItems((prev) => [newItem, ...prev]);
      toast.success(createType === 'community' ? t('communityCreated') : t('groupCreated'));
      setView('list');
    }

    setCreating(false);
    setNewName(''); setNewDesc(''); setNewPrivate(false); setNewEmoji('🏘️');
    setCreateParentId(null);
  }

  function openChat(item: Community, from: 'list' | 'community-detail') {
    setSelectedItem(item);
    setChatFrom(from);
    setView('chat');
  }

  function openCommunityDetail(community: Community) {
    setCommunityDetailOf(community);
    setSubGroups([]);
    setView('community-detail');
  }

  function startCreate(type: CreateType, parentId: string | null) {
    setCreateType(type);
    setCreateParentId(parentId);
    setNewName('');
    setNewDesc('');
    setNewPrivate(false);
    setNewEmoji(type === 'community' ? '🏘️' : '👥');
    setShowNewPicker(false);
    setView('create');
  }

  // Pre-compute for list view
  const myCommunities = items.filter((c) => myMemberships.has(c.id) && c.community_type === 'community');
  const myGroups      = items.filter((c) => myMemberships.has(c.id) && c.community_type === 'group');
  const discoverItems = items.filter((c) => !myMemberships.has(c.id) && !c.is_private);

  // ── Close button helper ────────────────────────────────────────────────────
  const CloseBtn = () => (
    <button
      onClick={onClose}
      className="text-xs rounded-full px-3 py-1.5 font-bold transition hover:opacity-80 shrink-0"
      style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
    >
      ✕
    </button>
  );

  // ── Sheet wrapper ──────────────────────────────────────────────────────────
  return (
    <motion.div
      className="sheet-motion absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-110 rounded-t-2xl z-201 flex flex-col overflow-hidden lg:bottom-2 lg:left-2 lg:translate-x-0 lg:w-95 lg:max-w-none lg:rounded-2xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: '0 -10px 40px var(--bg-overlay)',
        maxHeight: '72dvh',
      }}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={springTransition}
    >
      {/* Drag handle */}
      <div className="w-9 h-1 rounded-full mx-auto mt-3 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

      {/* ── CHAT VIEW ─────────────────────────────────────────────────── */}
      {view === 'chat' && selectedItem && (() => {
        const isMember = myMemberships.has(selectedItem.id);
        return (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
            >
              <button
                onClick={() => chatFrom === 'community-detail' ? setView('community-detail') : setView('home')}
                className="text-xl transition hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                ←
              </button>
              <span className="text-2xl">{selectedItem.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedItem.name}
                </p>
                <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                  {t('members', { count: selectedItem.member_count })}
                  {selectedItem.community_type === 'group' && communityDetailOf && ` · ${communityDetailOf.name}`}
                </p>
              </div>
              {selectedItem.is_private && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  🔒 Private
                </span>
              )}
              <CloseBtn />
            </div>

            <StoriesRow communityId={selectedItem.id} />

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <span className="text-5xl">{selectedItem.avatar_emoji}</span>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{t('noMessages')}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isMember ? 'Start the conversation!' : 'Join to participate'}
                  </p>
                </div>
              )}
              {messages.map((m, i) => {
                const isMe = m.user_id === userId;
                const prevMsg = messages[i - 1];
                const showAvatar = !isMe && (!prevMsg || prevMsg.user_id !== m.user_id);
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 self-end ${!showAvatar ? 'invisible' : ''}`}
                        style={{ background: 'linear-gradient(135deg, #D4A853, #B8923E)' }}
                      >
                        {(m.display_name?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && !isMe && (
                        <span className="text-[0.6rem] font-bold mb-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                          {m.display_name ?? 'Anonymous'}
                        </span>
                      )}
                      <div
                        className="px-3 py-2 rounded-2xl text-sm leading-snug"
                        style={{
                          backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-card)',
                          color: isMe ? '#fff' : 'var(--text-primary)',
                          borderBottomRightRadius: isMe ? '6px' : undefined,
                          borderBottomLeftRadius: !isMe ? '6px' : undefined,
                        }}
                      >
                        {m.content}
                      </div>
                      <span className="text-[0.55rem] mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {isMember ? (
              <div
                className="shrink-0 flex gap-2 px-4 py-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
              >
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t('typePlaceholder')}
                  className="flex-1 text-sm rounded-2xl px-4 py-2.5 outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgInput.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold transition disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  ↑
                </button>
              </div>
            ) : (
              <div
                className="shrink-0 px-4 py-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => joinSubGroup(selectedItem)}
                  className="w-full py-3 rounded-xl font-bold text-sm"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  Join to send messages
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── COMMUNITY DETAIL VIEW ──────────────────────────────────────── */}
      {view === 'community-detail' && communityDetailOf && (() => {
        const isMember = myMemberships.has(communityDetailOf.id);
        const isOwner  = communityDetailOf.owner_id === userId;
        return (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setView('list')}
                className="text-xl transition hover:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >←</button>
              <span className="text-2xl">{communityDetailOf.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {communityDetailOf.name}
                </p>
                <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                  {t('members', { count: communityDetailOf.member_count })} · {subGroups.length} {subGroups.length === 1 ? 'group' : 'groups'}
                </p>
              </div>
              {isMember ? (
                !isOwner && (
                  <button
                    onClick={() => leaveItem(communityDetailOf)}
                    className="px-3 py-1 rounded-xl text-[0.6rem] font-bold"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    {t('leave')}
                  </button>
                )
              ) : (
                <button
                  onClick={() => joinItem(communityDetailOf)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
                >
                  {t('join')}
                </button>
              )}
              <CloseBtn />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {communityDetailOf.description && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {communityDetailOf.description}
                </p>
              )}

              {isMember && (
                <button
                  onClick={() => openChat(communityDetailOf, 'community-detail')}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{communityDetailOf.avatar_emoji}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Community Chat</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>General discussion</p>
                    </div>
                  </div>
                  <span className="text-base" style={{ color: 'var(--text-muted)' }}>→</span>
                </button>
              )}

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Groups
                  </p>
                  <button
                    onClick={() => startCreate('group', communityDetailOf.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(212,168,83,0.10)', color: 'var(--accent)' }}
                  >
                    <Plus size={11} strokeWidth={2.5} />
                    Add a group
                  </button>
                </div>

                {subGroups.length === 0 ? (
                  <div
                    className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-3xl">👥</span>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No groups yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add the first group to this community</p>
                    <button
                      onClick={() => startCreate('group', communityDetailOf.id)}
                      className="mt-1 px-4 py-2 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      + Add a Group
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {subGroups.map((group) => (
                      <ItemCard
                        key={group.id}
                        item={group}
                        isMember={myMemberships.has(group.id)}
                        isOwner={group.owner_id === userId}
                        onPrimary={() => openChat(group, 'community-detail')}
                        onJoin={() => joinSubGroup(group)}
                        onLeave={() => leaveSubGroup(group)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CREATE VIEW ────────────────────────────────────────────────── */}
      {view === 'create' && (() => {
        const isGroup = createType === 'group';
        return (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setView(createParentId ? 'community-detail' : 'home')}
                className="text-xl hover:opacity-60 transition"
                style={{ color: 'var(--text-muted)' }}
              >
                ←
              </button>
              <h2 className="text-lg font-black flex-1" style={{ color: 'var(--text-primary)' }}>
                {isGroup ? 'New Group' : 'New Community'}
              </h2>
              {createParentId && communityDetailOf && (
                <span
                  className="text-[0.6rem] px-2 py-1 rounded-full font-bold"
                  style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
                >
                  in {communityDetailOf.name}
                </span>
              )}
              <CloseBtn />
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-110 mx-auto w-full px-4 py-6 flex flex-col gap-5">
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Icon
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setNewEmoji(e)}
                        className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition"
                        style={{
                          backgroundColor: newEmoji === e ? 'rgba(212,168,83,0.12)' : 'var(--bg-card)',
                          border: newEmoji === e ? '2px solid var(--accent)' : '1px solid var(--border)',
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                    Name *
                  </p>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isGroup ? 'e.g. Night Watch, Support Circle…' : 'e.g. Night Runners Paris'}
                    className="w-full text-sm rounded-xl px-4 py-3 outline-none"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                    Description
                  </p>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder={isGroup ? 'What is this group for?' : 'What is this community about?'}
                    rows={3}
                    className="w-full text-sm rounded-xl px-4 py-3 outline-none resize-none"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button
                  onClick={() => setNewPrivate(!newPrivate)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl transition"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{newPrivate ? '🔒' : '🌐'}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {newPrivate ? 'Private' : 'Public'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {newPrivate ? 'Invite-only, not discoverable' : 'Anyone can find and join'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-11 h-6 rounded-full relative transition-all"
                    style={{ backgroundColor: newPrivate ? 'var(--accent)' : 'var(--border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: newPrivate ? '22px' : '2px' }}
                    />
                  </div>
                </button>

                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full py-4 rounded-xl font-bold text-sm transition disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {creating
                    ? 'Creating…'
                    : `Create ${newPrivate ? '🔒 Private' : '🌐 Public'} ${isGroup ? 'Group' : 'Community'}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── HOME — Trusted Circle + More rows ────────────────────────── */}
      {view === 'home' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{t('title')}</h2>
            <CloseBtn />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-110 mx-auto w-full px-4 py-3 flex flex-col gap-4">
              {/* Trusted Circle Card */}
              {userId && (
                <TrustedCircleCard
                  userId={userId}
                  onSeeOnMap={() => {
                    onClose();
                    useStore.getState().setActiveTab('map');
                  }}
                />
              )}

              {/* More section */}
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                  More
                </p>
                <div className="flex flex-col gap-1.5">
                  {([
                    { key: 'messages' as const, icon: MessageCircle, label: 'Messages', desc: 'Friends & direct messages', color: '#6366f1' },
                    { key: 'neighborhoods' as const, icon: MapPinned, label: 'Neighbourhoods', desc: 'See what\'s happening nearby', color: '#f59e0b' },
                    { key: 'list' as const, icon: Users, label: 'Groups & Communities', desc: `${myCommunities.length + myGroups.length} joined`, color: '#22c55e' },
                  ] as const).map((row) => (
                    <button
                      key={row.key}
                      onClick={() => setView(row.key)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition active:scale-[0.98] text-left"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${row.color}12` }}
                      >
                        <row.icon size={16} strokeWidth={2} style={{ color: row.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{row.label}</p>
                        <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{row.desc}</p>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES (Friends + DMs) ──────────────────────────────────── */}
      {view === 'messages' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <FriendsView onBack={() => setView('home')} />
        </div>
      )}

      {/* ── NEIGHBORHOODS VIEW ─────────────────────────────────────────── */}
      {view === 'neighborhoods' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="shrink-0 flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
          >
            <button
              onClick={() => setView('home')}
              className="text-xl transition hover:opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              ←
            </button>
            <h2 className="text-base font-black flex-1" style={{ color: 'var(--text-primary)' }}>Neighbourhoods</h2>
            <CloseBtn />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NeighborhoodFeed />
          </div>
        </div>
      )}

      {/* ── GROUPS LIST VIEW ─────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="shrink-0 px-4 pt-3 pb-3"
            style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="max-w-110 mx-auto w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('home')}
                    className="text-xl transition hover:opacity-60"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ←
                  </button>
                  <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Groups & Communities</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowNewPicker(!showNewPicker)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      + New
                    </button>
                    {showNewPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNewPicker(false)} />
                        <div
                          className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl overflow-hidden shadow-xl"
                          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: '190px' }}
                        >
                          <button
                            onClick={() => startCreate('community', null)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:opacity-70"
                          >
                            <span className="text-lg">🏛️</span>
                            <div>
                              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New Community</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Contains groups</p>
                            </div>
                          </button>
                          <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />
                          <button
                            onClick={() => startCreate('group', null)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:opacity-70"
                          >
                            <span className="text-lg">👥</span>
                            <div>
                              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New Group</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Standalone chat group</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <CloseBtn />
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            onClick={() => showNewPicker && setShowNewPicker(false)}
          >
            <div className="max-w-110 mx-auto w-full px-4 py-4 flex flex-col gap-5">

              {myCommunities.length > 0 && (
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Your Communities
                  </p>
                  <div className="flex flex-col gap-2">
                    {myCommunities.map((c) => (
                      <ItemCard
                        key={c.id}
                        item={c}
                        isMember
                        isOwner={c.owner_id === userId}
                        onPrimary={() => openCommunityDetail(c)}
                        onLeave={() => leaveItem(c)}
                        subGroupCount={subGroupCounts[c.id] ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myGroups.length > 0 && (
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Your Groups
                  </p>
                  <div className="flex flex-col gap-2">
                    {myGroups.map((g) => (
                      <ItemCard
                        key={g.id}
                        item={g}
                        isMember
                        isOwner={g.owner_id === userId}
                        onPrimary={() => openChat(g, 'list')}
                        onLeave={() => leaveItem(g)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {discoverItems.length > 0 && (
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Discover
                  </p>
                  <div className="flex flex-col gap-2">
                    {discoverItems.map((c) => (
                      <ItemCard
                        key={c.id}
                        item={c}
                        isMember={false}
                        onPrimary={() =>
                          c.community_type === 'community'
                            ? openCommunityDetail(c)
                            : openChat(c, 'list')
                        }
                        onJoin={() => joinItem(c)}
                        subGroupCount={subGroupCounts[c.id] ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {myCommunities.length === 0 && myGroups.length === 0 && discoverItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <span className="text-5xl">💬</span>
                  <div className="text-center">
                    <p className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                      Nothing here yet
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Create a community or a standalone group
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startCreate('community', null)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      🏛️ Community
                    </button>
                    <button
                      onClick={() => startCreate('group', null)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      👥 Group
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
