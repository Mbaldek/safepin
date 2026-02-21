// src/components/CommunityView.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Community, CommunityMessage } from '@/types';
import { toast } from 'sonner';
import StoriesRow from '@/components/StoriesRow';

type View = 'list' | 'chat' | 'create';

const EMOJI_OPTIONS = ['🏘️', '🏙️', '🌳', '🛡️', '🔒', '🌍', '🎯', '💡', '🎭', '⚡', '🌐', '🏃', '🚴', '🌙', '🎪'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (days < 1) return `${hours}h`;
  return `${days}d`;
}

// ─── Community Card ────────────────────────────────────────────────────────────

function CommunityCard({
  community, isMember, isOwner = false, onChat, onJoin, onLeave,
}: {
  community: Community;
  isMember: boolean;
  isOwner?: boolean;
  onChat: () => void;
  onJoin?: () => void;
  onLeave?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {community.avatar_emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
            {community.name}
          </p>
          {community.is_private && (
            <span className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>🔒</span>
          )}
        </div>
        {community.description && (
          <p className="text-xs line-clamp-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {community.description}
          </p>
        )}
        <p className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>
          {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {isMember ? (
          <>
            <button
              onClick={onChat}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              Chat
            </button>
            {!isOwner && (
              <button
                onClick={onLeave}
                className="px-3 py-1 rounded-xl text-[0.6rem] font-bold"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Leave
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onJoin}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CommunityView() {
  const { userId, userProfile } = useStore();
  const [view, setView] = useState<View>('list');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [newEmoji, setNewEmoji] = useState('🏘️');
  const [creating, setCreating] = useState(false);

  // ── Load communities + memberships ────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Load communities
    supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })
      .then(async ({ data: commData }) => {
        if (!commData) return;
        // Get member counts
        const { data: memberData } = await supabase
          .from('community_members')
          .select('community_id');
        const countMap: Record<string, number> = {};
        memberData?.forEach((m) => {
          countMap[m.community_id] = (countMap[m.community_id] ?? 0) + 1;
        });
        setCommunities(commData.map((c) => ({ ...c, member_count: countMap[c.id] ?? 0 })));
      });

    // Load my memberships
    supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setMyMemberships(new Set(data?.map((m) => m.community_id) ?? []));
      });
  }, [userId]);

  // ── Load messages for selected community ──────────────────────────────────
  useEffect(() => {
    if (!selectedCommunity) return;
    setMessages([]);
    supabase
      .from('community_messages')
      .select('*')
      .eq('community_id', selectedCommunity.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data ?? []));
  }, [selectedCommunity?.id]);

  // ── Realtime messages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCommunity) return;
    const ch = supabase
      .channel(`community-${selectedCommunity.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${selectedCommunity.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as CommunityMessage])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedCommunity?.id]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function joinCommunity(community: Community) {
    if (!userId) return;
    const { error } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: userId,
      role: 'member',
    });
    if (error) { toast.error('Failed to join'); return; }
    setMyMemberships((prev) => new Set([...prev, community.id]));
    setCommunities((prev) =>
      prev.map((c) => c.id === community.id ? { ...c, member_count: c.member_count + 1 } : c)
    );
    toast.success(`Joined ${community.name}`);
  }

  async function leaveCommunity(community: Community) {
    if (!userId) return;
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', userId);
    if (error) { toast.error('Failed to leave'); return; }
    setMyMemberships((prev) => { const s = new Set(prev); s.delete(community.id); return s; });
    setCommunities((prev) =>
      prev.map((c) => c.id === community.id ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c)
    );
    if (selectedCommunity?.id === community.id) setView('list');
    toast.success(`Left ${community.name}`);
  }

  async function sendMessage() {
    if (!msgInput.trim() || !userId || !selectedCommunity || sending) return;
    setSending(true);
    const { error } = await supabase.from('community_messages').insert({
      community_id: selectedCommunity.id,
      user_id: userId,
      display_name: userProfile?.display_name ?? null,
      content: msgInput.trim(),
    });
    setSending(false);
    if (!error) setMsgInput('');
  }

  async function createCommunity() {
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
      })
      .select()
      .single();
    if (error) { toast.error('Failed to create'); setCreating(false); return; }

    // Auto-join as owner
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: userId,
      role: 'owner',
    });

    setCommunities((prev) => [{ ...data, member_count: 1 }, ...prev]);
    setMyMemberships((prev) => new Set([...prev, data.id]));
    setCreating(false);
    setNewName(''); setNewDesc(''); setNewPrivate(false); setNewEmoji('🏘️');
    toast.success('Community created!');
    setView('list');
  }

  function openChat(community: Community) {
    setSelectedCommunity(community);
    setView('chat');
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  if (view === 'chat' && selectedCommunity) {
    const isMember = myMemberships.has(selectedCommunity.id);
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setView('list')}
            className="text-xl transition hover:opacity-60"
            style={{ color: 'var(--text-muted)' }}
          >
            ←
          </button>
          <span className="text-2xl">{selectedCommunity.avatar_emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {selectedCommunity.name}
            </p>
            <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
              {selectedCommunity.member_count} members
            </p>
          </div>
          {selectedCommunity.is_private && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              🔒 Private
            </span>
          )}
        </div>

        {/* Stories row */}
        <StoriesRow communityId={selectedCommunity.id} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span className="text-5xl">{selectedCommunity.avatar_emoji}</span>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                No messages yet
              </p>
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
                    style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
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

        {/* Input */}
        {isMember ? (
          <div
            className="shrink-0 flex gap-2 px-4 py-3"
            style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
          >
            <input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Message…"
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
              onClick={() => joinCommunity(selectedCommunity)}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              Join to send messages
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Create view ────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => setView('list')} className="text-xl hover:opacity-60 transition" style={{ color: 'var(--text-muted)' }}>
            ←
          </button>
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>New Community</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[440px] mx-auto w-full px-4 py-6 flex flex-col gap-5">
            {/* Emoji picker */}
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
                      backgroundColor: newEmoji === e ? 'rgba(244,63,94,0.12)' : 'var(--bg-card)',
                      border: newEmoji === e ? '2px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Name *
              </p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Night Runners Paris"
                className="w-full text-sm rounded-xl px-4 py-3 outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Description
              </p>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this community about?"
                rows={3}
                className="w-full text-sm rounded-xl px-4 py-3 outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Private toggle */}
            <button
              onClick={() => setNewPrivate(!newPrivate)}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl transition"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{newPrivate ? '🔒' : '🌐'}</span>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {newPrivate ? 'Private group' : 'Public group'}
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
              onClick={createCommunity}
              disabled={!newName.trim() || creating}
              className="w-full py-4 rounded-xl font-bold text-sm transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {creating ? 'Creating…' : `Create ${newPrivate ? '🔒 Private' : '🌐 Public'} Community`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const myCommunities = communities.filter((c) => myMemberships.has(c.id));
  const discoverCommunities = communities.filter((c) => !myMemberships.has(c.id) && !c.is_private);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[440px] mx-auto w-full flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Communities</h2>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[440px] mx-auto w-full px-4 py-4 flex flex-col gap-5">

          {/* My groups */}
          {myCommunities.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Your Groups
              </p>
              <div className="flex flex-col gap-2">
                {myCommunities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    isMember
                    isOwner={c.owner_id === userId}
                    onChat={() => openChat(c)}
                    onLeave={() => leaveCommunity(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Discover */}
          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Discover
            </p>
            {discoverCommunities.length === 0 ? (
              <div
                className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span className="text-3xl">🌐</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  No public groups yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Be the first to create one
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {discoverCommunities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    isMember={false}
                    onChat={() => openChat(c)}
                    onJoin={() => joinCommunity(c)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {myCommunities.length === 0 && discoverCommunities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <span className="text-5xl">💬</span>
              <div className="text-center">
                <p className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                  No communities yet
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Create your own group or invite friends
                </p>
              </div>
              <button
                onClick={() => setView('create')}
                className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Create a group
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
