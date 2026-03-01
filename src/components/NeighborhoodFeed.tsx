// src/components/NeighborhoodFeed.tsx — S46: Neighborhood Chat

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { MapPin, Send, Users, Loader2 } from 'lucide-react';

type NeighborhoodCommunity = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_m: number | null;
};

type Message = {
  id: string;
  community_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
};

import { timeAgo, haversineKm } from '@/lib/utils';

export default function NeighborhoodFeed() {
  const { userId, userLocation, userProfile } = useStore();
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodCommunity[]>([]);
  const [selected, setSelected] = useState<NeighborhoodCommunity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load neighborhood communities near user
  const loadNeighborhoods = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('communities')
      .select('id, name, description, member_count, geo_lat, geo_lng, geo_radius_m')
      .eq('community_subtype', 'neighborhood');

    if (data) {
      let items = data as NeighborhoodCommunity[];
      // Sort by distance if user location available
      if (userLocation) {
        items = items
          .filter((n) => n.geo_lat && n.geo_lng)
          .sort((a, b) => {
            const da = haversineKm(userLocation, { lat: a.geo_lat!, lng: a.geo_lng! });
            const db = haversineKm(userLocation, { lat: b.geo_lat!, lng: b.geo_lng! });
            return da - db;
          });
      }
      setNeighborhoods(items);
      // Auto-select closest
      if (items.length > 0 && !selected) setSelected(items[0]);
    }
    setLoading(false);
  }, [userLocation, selected]);

  useEffect(() => { loadNeighborhoods(); }, [loadNeighborhoods]);

  // Load messages for selected neighborhood
  useEffect(() => {
    if (!selected) return;
    supabase
      .from('community_messages')
      .select('*')
      .eq('community_id', selected.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages((data ?? []) as Message[]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
      });

    // Realtime
    const ch = supabase
      .channel(`neighborhood-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${selected.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  // Auto-join closest neighborhood
  useEffect(() => {
    if (!userId || !selected) return;
    supabase.from('community_members').upsert(
      { community_id: selected.id, user_id: userId, role: 'member' },
      { onConflict: 'community_id,user_id' }
    ).then(() => {});
  }, [userId, selected?.id]);

  async function sendMessage() {
    if (!newMsg.trim() || !userId || !selected) return;
    setSending(true);
    const displayName = (userProfile as Record<string, unknown>)?.display_name as string | null;
    const { error } = await supabase.from('community_messages').insert({
      community_id: selected.id,
      user_id: userId,
      display_name: displayName,
      content: newMsg.trim(),
    });
    if (error) toast.error('Failed to send');
    else setNewMsg('');
    setSending(false);
  }

  // Create a neighborhood (if none nearby)
  async function createNeighborhood() {
    if (!userId || !userLocation) { toast.error('Location required'); return; }
    const name = `Neighborhood ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data, error } = await supabase.from('communities').insert({
      name,
      description: 'Auto-created neighborhood based on your location',
      is_private: false,
      owner_id: userId,
      avatar_emoji: '🏘️',
      community_type: 'community',
      community_subtype: 'neighborhood',
      geo_lat: userLocation.lat,
      geo_lng: userLocation.lng,
      geo_radius_m: 1000,
      member_count: 1,
    }).select().single();
    if (error) { toast.error('Failed to create'); return; }
    toast.success(`Created ${name}`);
    const item = data as NeighborhoodCommunity;
    setNeighborhoods((prev) => [item, ...prev]);
    setSelected(item);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Neighborhood selector */}
      <div className="flex gap-2 px-1 pb-2 overflow-x-auto shrink-0">
        {neighborhoods.map((n) => (
          <button
            key={n.id}
            onClick={() => setSelected(n)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition"
            style={{
              backgroundColor: selected?.id === n.id ? 'var(--accent)' : 'var(--bg-card)',
              color: selected?.id === n.id ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <MapPin size={12} />
            {n.name}
            <span className="opacity-60">({n.member_count})</span>
          </button>
        ))}
        <button
          onClick={createNeighborhood}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
        >
          + New
        </button>
      </div>

      {/* Messages */}
      {selected ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 space-y-2 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hi!</p>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.user_id === userId;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] rounded-2xl px-3 py-2"
                    style={{
                      backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-card)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {!isMe && (
                      <p className="text-[0.6rem] font-bold mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        {m.display_name ?? 'Anonymous'}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: isMe ? '#fff' : 'var(--text-primary)' }}>{m.content}</p>
                    <p className="text-[0.5rem] mt-0.5 text-right" style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                      {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compose */}
          <div className="shrink-0 flex gap-2 pt-2 px-1">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message your neighborhood..."
              className="flex-1 px-3 py-2.5 rounded-xl text-xs"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMsg.trim()}
              className="p-2.5 rounded-xl text-white disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun quartier ici encore — soyez le premier ! 🏘️</p>
        </div>
      )}
    </div>
  );
}
