// src/components/MessagesView.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { DMConversation, DirectMessage } from '@/types';
import { toast } from 'sonner';

type View = 'list' | 'chat' | 'search';

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

// ─── Conversation card ────────────────────────────────────────────────────────

function ConvoCard({ convo, onOpen }: { convo: DMConversation; onOpen: () => void }) {
  const initial = (convo.partner_name?.[0] ?? '?').toUpperCase();
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3 transition active:opacity-70"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {convo.partner_name ?? 'Anonymous'}
          </span>
          <span className="text-[0.6rem] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(convo.last_message_at)}
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: convo.is_unread ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: convo.is_unread ? 700 : 400 }}>
          {convo.last_message ?? 'Start a conversation'}
        </p>
      </div>
      {convo.is_unread && (
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
      )}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MessagesView() {
  const { userId, userProfile } = useStore();
  const [view, setView] = useState<View>('list');
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<DMConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const { data: convos } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });
    if (!convos?.length) { setConversations([]); return; }

    const partnerIds = [...new Set(convos.map((c) => c.user1_id === userId ? c.user2_id : c.user1_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', partnerIds);
    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

    const enriched: DMConversation[] = convos.map((c) => {
      const partnerId = c.user1_id === userId ? c.user2_id : c.user1_id;
      const myLastRead = c.user1_id === userId ? c.user1_last_read_at : c.user2_last_read_at;
      const isUnread = !!c.last_message_sender_id &&
        c.last_message_sender_id !== userId &&
        (!myLastRead || c.last_message_at > myLastRead);
      return {
        ...c,
        partner_id: partnerId,
        partner_name: profileMap.get(partnerId) ?? null,
        is_unread: isUnread,
      };
    });
    setConversations(enriched);
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for selected convo ──────────────────────────────────────
  useEffect(() => {
    if (!selectedConvo) return;
    setMessages([]);
    supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', selectedConvo.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages((data ?? []) as DirectMessage[]));

    // Mark as read
    if (!userId) return;
    const field = selectedConvo.user1_id === userId ? 'user1_last_read_at' : 'user2_last_read_at';
    supabase.from('dm_conversations').update({ [field]: new Date().toISOString() }).eq('id', selectedConvo.id);
  }, [selectedConvo?.id, userId]);

  // ── Realtime messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConvo) return;
    const ch = supabase
      .channel(`dm-${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as DirectMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConvo?.id]);

  // ── Realtime conversation updates ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel('dm-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_conversations' },
        () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadConversations]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── User search ───────────────────────────────────────────────────────────
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
      setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, userId]);

  // ── Open or create a conversation ─────────────────────────────────────────
  async function openOrCreateConvo(partnerId: string, partnerName: string | null) {
    if (!userId) return;
    // Check if convo already exists
    const { data: existing } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${userId})`)
      .maybeSingle();

    let convo = existing;
    if (!convo) {
      const { data: created, error } = await supabase
        .from('dm_conversations')
        .insert({ user1_id: userId, user2_id: partnerId })
        .select()
        .single();
      if (error) { toast.error('Could not open conversation'); return; }
      convo = created;
    }
    setSelectedConvo({ ...convo, partner_id: partnerId, partner_name: partnerName, is_unread: false });
    setView('chat');
    setSearchQuery('');
  }

  // ── Send text message ─────────────────────────────────────────────────────
  async function sendMessage() {
    if (!msgInput.trim() || !userId || !selectedConvo || sending) return;
    setSending(true);
    const content = msgInput.trim();
    setMsgInput('');
    const { error } = await supabase.from('direct_messages').insert({
      conversation_id: selectedConvo.id,
      sender_id: userId,
      content,
      content_type: 'text',
    });
    if (!error) {
      await supabase.from('dm_conversations').update({
        last_message: content,
        last_message_sender_id: userId,
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConvo.id);
    }
    setSending(false);
  }

  // ── Send image ────────────────────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    if (!userId || !selectedConvo) return;
    setUploadingImage(true);
    const ext = file.name.split('.').pop();
    const path = `dm/${selectedConvo.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file);
    if (uploadError) { toast.error('Upload failed'); setUploadingImage(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
    const isVideo = file.type.startsWith('video');
    await supabase.from('direct_messages').insert({
      conversation_id: selectedConvo.id,
      sender_id: userId,
      content_type: isVideo ? 'video' : 'image',
      media_url: publicUrl,
    });
    await supabase.from('dm_conversations').update({
      last_message: isVideo ? '📹 Video' : '📷 Photo',
      last_message_sender_id: userId,
      last_message_at: new Date().toISOString(),
    }).eq('id', selectedConvo.id);
    setUploadingImage(false);
  }

  // ── Invite helpers ────────────────────────────────────────────────────────
  async function shareInvite() {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://safepin.app';
    const text = `Join me on SafePin — a community safety app. ${url}`;
    if (navigator.share) {
      await navigator.share({ title: 'SafePin', text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Invite link copied!');
    }
  }

  async function pickContacts() {
    if (!('contacts' in navigator)) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(['name', 'email'], { multiple: true });
      if (!contacts?.length) return;
      const emails = contacts.flatMap((c: { email?: string[] }) => c.email ?? []).filter(Boolean);
      if (!emails.length) { toast('No email addresses found in selected contacts'); return; }
      const subject = encodeURIComponent('Join me on SafePin');
      const body = encodeURIComponent(`Hey! I'm using SafePin, a community safety app. Join me: ${window.location.origin}`);
      window.open(`mailto:${emails.join(',')}?subject=${subject}&body=${body}`);
    } catch { /* denied */ }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Chat view ─────────────────────────────────────────────────────────────
  if (view === 'chat' && selectedConvo) {
    const partnerInitial = (selectedConvo.partner_name?.[0] ?? '?').toUpperCase();
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => { setView('list'); setSelectedConvo(null); setMessages([]); }}
            className="text-xl hover:opacity-60" style={{ color: 'var(--text-muted)' }}>←</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
            {partnerInitial}
          </div>
          <p className="font-black text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
            {selectedConvo.partner_name ?? 'Anonymous'}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                {partnerInitial}
              </div>
              <p className="text-sm font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {selectedConvo.partner_name ?? 'Anonymous'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Say hello 👋</p>
            </div>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender_id === userId;
            const prevMsg = messages[i - 1];
            const showTime = !prevMsg || new Date(m.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300_000;
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
                    }}
                  >
                    {m.content_type === 'image' && m.media_url && (
                      <img src={m.media_url} alt="Photo" className="rounded-xl max-h-52 w-full object-cover mb-1" />
                    )}
                    {m.content_type === 'video' && m.media_url && (
                      <video src={m.media_url} controls className="rounded-xl max-h-40 w-full mb-1" />
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {uploadingImage ? <span className="text-xs animate-spin">↻</span> : '📎'}
          </button>
          <input
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
      </div>
    );
  }

  // ── Search / new DM view ──────────────────────────────────────────────────
  if (view === 'search') {
    const hasContactPicker = typeof window !== 'undefined' && 'contacts' in navigator;
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setView('list')} className="text-xl hover:opacity-60" style={{ color: 'var(--text-muted)' }}>←</button>
          <h2 className="text-lg font-black flex-1" style={{ color: 'var(--text-primary)' }}>New Message</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[440px] mx-auto w-full px-4 pt-4 flex flex-col gap-3">
            {/* Search input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by display name…"
                autoFocus
                className="w-full text-sm rounded-xl pl-9 pr-4 py-3 outline-none"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Invite options */}
            <div className="flex gap-2">
              <button onClick={shareInvite}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                🔗 Share invite
              </button>
              {hasContactPicker && (
                <button onClick={pickContacts}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  📱 Contacts
                </button>
              )}
              <button
                onClick={() => {
                  const email = prompt('Enter email address to invite:');
                  if (!email) return;
                  const subject = encodeURIComponent('Join me on SafePin');
                  const body = encodeURIComponent(`Hey! Join me on SafePin: ${window.location.origin}`);
                  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                ✉️ Email invite
              </button>
            </div>

            {/* Results */}
            {searching && (
              <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Searching…</p>
            )}
            {!searching && searchResults.length > 0 && (
              <div>
                <p className="text-[0.7rem] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Users
                </p>
                <div className="flex flex-col gap-1">
                  {searchResults.map((u) => (
                    <button key={u.id}
                      onClick={() => openOrCreateConvo(u.id, u.display_name)}
                      className="flex items-center gap-3 p-3 rounded-xl transition active:opacity-70"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
                        {(u.display_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {u.display_name ?? 'Anonymous'}
                      </span>
                    </button>
                  ))}
                </div>
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

  // ── Conversation list ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="shrink-0 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[440px] mx-auto w-full flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <button onClick={() => setView('search')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            ✏️ New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <span className="text-5xl">✉️</span>
            <div className="text-center px-8">
              <p className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Start a private conversation or invite friends
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[260px]">
              <button onClick={() => setView('search')}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                Start a conversation
              </button>
              <button onClick={shareInvite}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                🔗 Invite friends
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-[440px] mx-auto w-full">
            {conversations.map((c) => (
              <ConvoCard
                key={c.id}
                convo={c}
                onOpen={() => {
                  setSelectedConvo(c);
                  setView('chat');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
