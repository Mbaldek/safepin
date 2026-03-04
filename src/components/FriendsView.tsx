// DEPRECATED — V2
// src/components/FriendsView.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, UserPlus, Search, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTranslations } from 'next-intl';
import { DMConversation, DirectMessage } from '@/types';
import { toast } from 'sonner';

type View = 'list' | 'search' | 'chat';
type ListTab = 'friends' | 'requests';

type Friend = { userId: string; displayName: string | null; friendshipId: string };
type FriendRequest = { id: string; requesterId: string; requesterName: string | null };
type SearchResult = {
  id: string;
  display_name: string | null;
  status: 'none' | 'friends' | 'sent' | 'received';
  friendshipId?: string;
};
type FriendshipRow = { id: string; requester_id: string; addressee_id: string; status: string };

import { timeAgo } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sz =
    size === 'lg' ? 'w-14 h-14 text-2xl' :
    size === 'sm' ? 'w-8 h-8 text-xs' :
    'w-11 h-11 text-base';
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ background: 'linear-gradient(135deg, var(--accent-gold), #B8923E)' }}
    >
      {(name?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FriendsView({ onBack }: { onBack?: () => void }) {
  const { userId } = useStore();
  const tc = useTranslations('community');
  const [view, setView] = useState<View>('list');
  const [listTab, setListTab] = useState<ListTab>('friends');

  // Friendship data
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [allFriendships, setAllFriendships] = useState<FriendshipRow[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [trustedIds, setTrustedIds] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // DM chat
  const [selectedConvo, setSelectedConvo] = useState<DMConversation | null>(null);
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load friendships ─────────────────────────────────────────────────────
  const loadFriendships = useCallback(async () => {
    if (!userId) return;
    setLoadingFriends(true);

    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const rows = (data ?? []) as FriendshipRow[];
    setAllFriendships(rows);

    const accepted = rows.filter((r) => r.status === 'accepted');
    const incoming = rows.filter((r) => r.status === 'pending' && r.addressee_id === userId);

    const partnerIds = accepted.map((r) => r.requester_id === userId ? r.addressee_id : r.requester_id);
    const requesterIds = incoming.map((r) => r.requester_id);
    const allIds = [...new Set([...partnerIds, ...requesterIds])];

    let profileMap = new Map<string, string | null>();
    if (allIds.length) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name').in('id', allIds);
      profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);
    }

    setFriends(accepted.map((r) => {
      const pid = r.requester_id === userId ? r.addressee_id : r.requester_id;
      return { userId: pid, displayName: profileMap.get(pid) ?? null, friendshipId: r.id };
    }));
    setRequests(incoming.map((r) => ({
      id: r.id,
      requesterId: r.requester_id,
      requesterName: profileMap.get(r.requester_id) ?? null,
    })));

    // Fetch trusted circle membership
    const { data: tcRows } = await supabase
      .from('trusted_contacts')
      .select('user_id, contact_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},contact_id.eq.${userId}`);
    const tcIds = new Set((tcRows ?? []).map((r) => r.user_id === userId ? r.contact_id : r.user_id));
    setTrustedIds(tcIds);

    setLoadingFriends(false);
  }, [userId]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  // ── Search users ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', `%${searchQuery}%`)
        .neq('id', userId ?? '')
        .limit(10);
      const results: SearchResult[] = (data ?? []).map((u) => {
        const fs = allFriendships.find(
          (r) => r.requester_id === u.id || r.addressee_id === u.id
        );
        if (!fs) return { ...u, status: 'none' as const };
        if (fs.status === 'accepted') return { ...u, status: 'friends' as const, friendshipId: fs.id };
        if (fs.requester_id === userId) return { ...u, status: 'sent' as const, friendshipId: fs.id };
        return { ...u, status: 'received' as const, friendshipId: fs.id };
      });
      setSearchResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, userId, allFriendships]);

  // ── Friend request actions ────────────────────────────────────────────────
  async function sendRequest(addresseeId: string) {
    if (!userId) return;
    const { error } = await supabase.from('friendships').insert({ requester_id: userId, addressee_id: addresseeId });
    if (error) { toast.error('Could not send request'); return; }
    toast.success('Friend request sent!');
    await loadFriendships();
  }

  async function acceptRequest(requestId: string) {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    if (error) { toast.error('Failed to accept'); return; }
    toast.success('Friend added!');
    await loadFriendships();
  }

  async function declineRequest(requestId: string) {
    await supabase.from('friendships').delete().eq('id', requestId);
    await loadFriendships();
  }

  // ── Open DM chat ──────────────────────────────────────────────────────────
  async function openChat(friend: Friend) {
    if (!userId) return;
    const pid = friend.userId;
    const { data: existing } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${pid}),and(user1_id.eq.${pid},user2_id.eq.${userId})`)
      .maybeSingle();

    let convo = existing;
    if (!convo) {
      const { data: created, error } = await supabase
        .from('dm_conversations').insert({ user1_id: userId, user2_id: pid }).select().single();
      if (error) { toast.error('Could not open conversation'); return; }
      convo = created;
    }
    const field = convo.user1_id === userId ? 'user1_last_read_at' : 'user2_last_read_at';
    supabase.from('dm_conversations').update({ [field]: new Date().toISOString() }).eq('id', convo.id);
    setSelectedConvo({ ...convo, partner_id: pid, partner_name: friend.displayName, is_unread: false });
    setChatFriend(friend);
    setView('chat');
  }

  // ── Load messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConvo) return;
    setMessages([]);
    supabase
      .from('direct_messages').select('*')
      .eq('conversation_id', selectedConvo.id)
      .order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => setMessages((data ?? []) as DirectMessage[]));
  }, [selectedConvo?.id]);

  // ── Realtime messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConvo) return;
    const ch = supabase
      .channel(`dm-${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, (p) => setMessages((prev) => [...prev, p.new as DirectMessage]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!msgInput.trim() || !userId || !selectedConvo || sending) return;
    setSending(true);
    const content = msgInput.trim();
    setMsgInput('');
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: selectedConvo.id, sender_id: userId, content, content_type: 'text',
    });
    if (!error) {
      await supabase.from('dm_conversations').update({
        last_message: content, last_message_sender_id: userId,
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConvo.id);
    }
    setSending(false);
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    if (!userId || !selectedConvo) return;
    setUploadingImage(true);
    const ext = file.name.split('.').pop();
    const path = `dm/${selectedConvo.id}/${Date.now()}.${ext}`;
    const { error: up } = await supabase.storage.from('media').upload(path, file);
    if (up) { toast.error('Upload failed'); setUploadingImage(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
    const isVideo = file.type.startsWith('video');
    await supabase.from('direct_messages').insert({
      conversation_id: selectedConvo.id, sender_id: userId,
      content_type: isVideo ? 'video' : 'image', media_url: publicUrl,
    });
    await supabase.from('dm_conversations').update({
      last_message: isVideo ? '📹 Video' : '📷 Photo',
      last_message_sender_id: userId, last_message_at: new Date().toISOString(),
    }).eq('id', selectedConvo.id);
    setUploadingImage(false);
  }

  async function shareInvite() {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://brumeapp.io';
    const text = `Join me on Breveil — a community safety app. ${url}`;
    if (navigator.share) {
      await navigator.share({ title: 'Breveil', text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Invite link copied!');
    }
  }

  // ── Chat view ─────────────────────────────────────────────────────────────
  if (view === 'chat' && selectedConvo && chatFriend) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => { setView('list'); setSelectedConvo(null); setChatFriend(null); setMessages([]); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <ArrowLeft size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </button>
          <Avatar name={chatFriend.displayName} size="sm" />
          <p className="font-black text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
            {chatFriend.displayName ?? 'Anonymous'}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Avatar name={chatFriend.displayName} size="lg" />
              <p className="text-sm font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {chatFriend.displayName ?? 'Anonymous'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Say hello 👋</p>
            </div>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender_id === userId;
            const prev = messages[i - 1];
            const showTime = !prev ||
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 300_000;
            return (
              <div key={m.id}>
                {showTime && (
                  <p className="text-center text-[0.6rem] my-2" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(m.created_at)}
                  </p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[78%] px-3 py-2 rounded-2xl text-sm"
                    style={{
                      backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-card)',
                      color: isMe ? '#fff' : 'var(--text-primary)',
                      borderBottomRightRadius: isMe ? '6px' : undefined,
                      borderBottomLeftRadius: !isMe ? '6px' : undefined,
                      border: !isMe ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    {m.content_type === 'image' && m.media_url && (
                      <img src={m.media_url} alt="Photo"
                        className="rounded-xl max-h-52 w-full object-cover mb-1" />
                    )}
                    {m.content_type === 'video' && m.media_url && (
                      <video src={m.media_url} controls
                        className="rounded-xl max-h-40 w-full mb-1" />
                    )}
                    {m.content && <span>{m.content}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 flex gap-2 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {uploadingImage ? <span className="text-xs animate-spin">↻</span> : '📎'}
          </button>
          <input
            value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message…"
            className="flex-1 text-sm rounded-2xl px-4 py-2.5 outline-none"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button onClick={sendMessage} disabled={!msgInput.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // ── Search / add friend view ──────────────────────────────────────────────
  if (view === 'search') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => { setView('list'); setSearchQuery(''); setSearchResults([]); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
            style={{ backgroundColor: 'var(--bg-card)' }}>
            <ArrowLeft size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </button>
          <h2 className="text-lg font-black flex-1" style={{ color: 'var(--text-primary)' }}>
            Add Friend
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[440px] mx-auto w-full px-4 pt-4 flex flex-col gap-3">
            {/* Search input */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
              <Search size={14} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by display name…" autoFocus
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {/* Invite */}
            <button onClick={shareInvite}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              🔗 Invite a friend to Breveil
            </button>

            {/* Results */}
            {searching && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Searching…</p>
            )}
            {!searching && searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[0.7rem] font-black uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  Results
                </p>
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Avatar name={u.display_name} size="sm" />
                    <span className="text-sm font-bold flex-1 min-w-0 truncate"
                      style={{ color: 'var(--text-primary)' }}>
                      {u.display_name ?? 'Anonymous'}
                    </span>
                    {u.status === 'friends' && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        Friends
                      </span>
                    )}
                    {u.status === 'sent' && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Pending
                      </span>
                    )}
                    {u.status === 'received' && (
                      <button onClick={() => u.friendshipId && acceptRequest(u.friendshipId)}
                        className="text-xs font-bold px-2.5 py-1 rounded-full transition shrink-0"
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        Accept
                      </button>
                    )}
                    {u.status === 'none' && (
                      <button onClick={() => sendRequest(u.id)}
                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition hover:opacity-80 shrink-0"
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        <UserPlus size={11} strokeWidth={2.5} />
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
              <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
                No users found. Invite them!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Friends list ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-0"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[440px] mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <ArrowLeft size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Friends</h2>
            </div>
            <button onClick={() => setView('search')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              <UserPlus size={12} strokeWidth={2.5} />
              Add
            </button>
          </div>

          {/* Segment switcher */}
          <div className="flex">
            {(['friends', 'requests'] as const).map((tab) => (
              <button key={tab} onClick={() => setListTab(tab)}
                className="flex-1 py-2.5 text-xs font-black transition"
                style={{
                  color: listTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: listTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                {tab === 'friends'
                  ? `Friends${friends.length > 0 ? ` · ${friends.length}` : ''}`
                  : `Requests${requests.length > 0 ? ` · ${requests.length}` : ''}`
                }
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[440px] mx-auto w-full">

          {/* ── Friends tab ─────────────────────────────────────────── */}
          {listTab === 'friends' && (
            loadingFriends ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              </div>
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 px-8">
                <span className="text-5xl">👥</span>
                <div className="text-center">
                  <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                    Vos amis apparaîtront ici 💛
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Invitez vos proches sur Breveil
                  </p>
                </div>
                <button onClick={() => setView('search')}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  Find friends
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {friends.map((f) => {
                  const isTrusted = trustedIds.has(f.userId);
                  return (
                    <button key={f.friendshipId} onClick={() => openChat(f)}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left transition active:opacity-70"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <Avatar name={f.displayName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {f.displayName ?? 'Anonymous'}
                          </p>
                          {isTrusted && (
                            <Shield size={12} strokeWidth={2.5} className="shrink-0" style={{ color: 'var(--accent)' }} />
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isTrusted ? tc('circle') : tc('tapToMessage')}
                        </p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Message
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* ── Requests tab ────────────────────────────────────────── */}
          {listTab === 'requests' && (
            requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="text-4xl">📬</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  No pending requests
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Avatar name={req.requesterName} />
                    <p className="text-sm font-bold flex-1 min-w-0 truncate"
                      style={{ color: 'var(--text-primary)' }}>
                      {req.requesterName ?? 'Anonymous'}
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => declineRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Decline
                      </button>
                      <button onClick={() => acceptRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
