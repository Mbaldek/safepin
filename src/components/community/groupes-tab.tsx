"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Plus, ArrowLeft, Send, MoreHorizontal, Phone } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Community } from "@/types";
import EmojiPickerButton from "@/components/ui/EmojiPickerButton";

interface GroupesTabProps {
  isDark: boolean;
  userId: string | null;
  onCreateGroup: () => void;
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string | null;
  avatar_emoji?: string | null;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "maintenant";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

function dateDivider(d: string) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default function GroupesTab({ isDark, userId, onCreateGroup }: GroupesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [myGroups, setMyGroups] = useState<Community[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [{ data: items }, { data: members }, { data: allMembers }] = await Promise.all([
        supabase
          .from("communities")
          .select("*")
          .is("parent_community_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", userId),
        supabase
          .from("community_members")
          .select("community_id"),
      ]);

      // Build member count map
      const countMap = new Map<string, number>();
      (allMembers || []).forEach((r: any) =>
        countMap.set(r.community_id, (countMap.get(r.community_id) || 0) + 1));

      const memberSet = new Set((members || []).map((m) => m.community_id));
      setJoinedIds(memberSet);

      const all = (items || []).map(c => ({ ...c, member_count: countMap.get(c.id) || 0 }));
      setMyGroups(all.filter((c) => memberSet.has(c.id)));
      setDiscoverGroups(all.filter((c) => !memberSet.has(c.id)));
      setLoading(false);
    })();
  }, [userId]);

  // Fetch messages when a group is opened
  useEffect(() => {
    if (!activeGroup) { setMessages([]); return; }
    setChatLoading(true);
    (async () => {
      const { data: msgs } = await supabase
        .from("community_messages")
        .select("id, user_id, content, created_at, display_name")
        .eq("community_id", activeGroup)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!msgs?.length) { setMessages([]); setChatLoading(false); return; }

      // Enrich with profiles
      const userIds = [...new Set(msgs.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_emoji")
        .in("id", userIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));

      setMessages(msgs.map(m => {
        const p = pMap.get(m.user_id);
        return {
          ...m,
          display_name: p?.display_name || m.display_name || "Membre",
          avatar_emoji: p?.avatar_emoji || null,
        };
      }));
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    })();
  }, [activeGroup]);

  // Realtime subscription for chat
  useEffect(() => {
    if (!activeGroup) return;
    const channel = supabase
      .channel(`group-chat-${activeGroup}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" },
        async (payload) => {
          const m = payload.new as any;
          if (m.community_id !== activeGroup) return;
          // Replace optimistic message or skip true duplicates
          setMessages(prev => {
            const withoutOpt = prev.filter(p =>
              !(p.id.startsWith('opt-') && p.user_id === m.user_id && p.content === m.content));
            if (withoutOpt.some(p => p.id === m.id)) return prev;
            return [...withoutOpt, {
              id: m.id,
              user_id: m.user_id,
              content: m.content,
              created_at: m.created_at,
              display_name: m.display_name || "Membre",
              avatar_emoji: null,
            }];
          });
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeGroup]);

  const handleJoin = async (communityId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: userId });
    if (error) { toast.error("Impossible de rejoindre"); return; }
    setJoinedIds((prev) => new Set([...prev, communityId]));
    const joined = discoverGroups.find((c) => c.id === communityId);
    if (joined) setMyGroups((p) => [...p, joined]);
    setDiscoverGroups((p) => p.filter((c) => c.id !== communityId));
    toast.success("Groupe rejoint !");
  };

  const handleSend = useCallback(async () => {
    if (!msgInput.trim() || !activeGroup || !userId || sending) return;
    const content = msgInput.trim();
    setSending(true);
    setMsgInput("");

    // Optimistic message
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      display_name: "Moi",
      avatar_emoji: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);

    const { error } = await supabase.from("community_messages").insert({
      community_id: activeGroup,
      user_id: userId,
      content,
    });
    if (error) toast.error("Erreur d'envoi");
    setSending(false);
  }, [msgInput, activeGroup, userId, sending]);

  const q = searchQuery.toLowerCase();
  const filteredMy = myGroups.filter((g) => !q || g.name.toLowerCase().includes(q));
  const filteredDiscover = discoverGroups.filter((g) => !q || g.name.toLowerCase().includes(q));

  const activeGroupData = myGroups.find(g => g.id === activeGroup);

  // ─── Chat view ───────────────────────────────────────────────────────
  if (activeGroup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Chat header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        }}>
          <button
            onClick={() => setActiveGroup(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: isDark ? '#94A3B8' : '#64748B', padding: 4,
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3BB4C1, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, flexShrink: 0,
          }}>
            {activeGroupData?.avatar_emoji || '\uD83D\uDC65'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, margin: 0,
              color: isDark ? '#FFFFFF' : '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {activeGroupData?.name || 'Groupe'}
            </p>
            <p style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', margin: 0 }}>
              {activeGroupData?.member_count || 0} membres
            </p>
          </div>
          <button
            onClick={() => toast("Appel de groupe — bientôt disponible")}
            style={{
              background: 'none', border: 'none', cursor: 'default',
              color: isDark ? '#475569' : '#CBD5E1', padding: 4, opacity: 0.5,
            }}
          >
            <Phone size={18} />
          </button>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isDark ? '#64748B' : '#94A3B8', padding: 4,
          }}>
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          {chatLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 12 }}>
              Chargement&hellip;
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
              <span style={{ fontSize: 32 }}>{'\uD83D\uDCAC'}</span>
              <p style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#94A3B8' : '#64748B' }}>
                Aucun message
              </p>
              <p style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8' }}>
                Envoyez le premier message !
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.user_id === userId;
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || dateDivider(msg.created_at) !== dateDivider(prevMsg.created_at);
              const showAuthor = !isMe && (!prevMsg || prevMsg.user_id !== msg.user_id || showDate);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{
                      textAlign: 'center', fontSize: 10, fontWeight: 600,
                      color: isDark ? '#64748B' : '#94A3B8',
                      padding: '8px 0', margin: '4px 0',
                    }}>
                      {dateDivider(msg.created_at)}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    marginTop: showAuthor ? 8 : 2,
                  }}>
                    {showAuthor && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        marginBottom: 2, paddingLeft: 4,
                      }}>
                        <span style={{ fontSize: 11 }}>{msg.avatar_emoji || '\uD83D\uDC64'}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8' }}>
                          {msg.display_name}
                        </span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? '#3BB4C1' : (isDark ? '#1E293B' : '#F1F5F9'),
                      border: isMe ? 'none' : `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                      color: isMe ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155'),
                      fontSize: 12, lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                      <span style={{
                        display: 'block', fontSize: 9,
                        color: isMe ? 'rgba(255,255,255,0.6)' : (isDark ? '#64748B' : '#94A3B8'),
                        textAlign: 'right', marginTop: 2,
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px 12px',
          borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        }}>
          <EmojiPickerButton onSelect={e => setMsgInput(p => p + e)} isDark={isDark} />
          <input
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message\u2026"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 99,
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              background: isDark ? '#1E293B' : '#F8FAFC',
              color: isDark ? '#FFFFFF' : '#0F172A',
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!msgInput.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: msgInput.trim() ? '#3BB4C1' : (isDark ? '#334155' : '#E2E8F0'),
              border: 'none', cursor: msgInput.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <Send size={16} style={{ color: msgInput.trim() ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8') }} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Group list view ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 12 }}>
        Chargement&hellip;
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: 80 }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
        marginBottom: 24,
      }}>
        <Search size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
        <input
          type="text"
          placeholder="Rechercher un groupe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1, border: "none", background: "transparent",
            fontSize: 13, color: isDark ? "#FFFFFF" : "#0F172A", outline: "none",
          }}
        />
      </div>

      {/* Create group button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onCreateGroup}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px 16px", borderRadius: 12, backgroundColor: "#3BB4C1", border: "none",
          color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 24,
        }}
      >
        <Plus size={18} strokeWidth={1.5} />
        Creer un groupe
      </motion.button>

      {/* Mes Groupes */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontSize: 12, fontWeight: 600, color: isDark ? "#64748B" : "#94A3B8",
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16,
        }}>
          Mes Groupes
        </h3>
        {filteredMy.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 8 }}>
            <span style={{ fontSize: 32 }}>{'\uD83D\uDC65'}</span>
            <p style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
              Aucun groupe rejoint
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredMy.map((group, index) => (
              <motion.button
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveGroup(group.id)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(59,180,193,0.06)' : 'rgba(59,180,193,0.04)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isDark ? '#1E293B' : '#FFFFFF';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(59,180,193,0.25)';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  background: isDark ? '#1E293B' : '#FFFFFF',
                  borderRadius: 16, padding: '12px 13px',
                  border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #3BB4C1, #06B6D4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, overflow: 'hidden',
                }}>
                  {group.avatar_url ? (
                    <img src={group.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    group.avatar_emoji || '\uD83D\uDC65'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, margin: 0,
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {group.name}
                  </p>
                  {group.description ? (
                    <p style={{
                      fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', margin: '2px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {group.description}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', margin: '2px 0 0' }}>
                      Aucun message
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} style={{ color: isDark ? '#64748B' : '#94A3B8' }} />
                  <span style={{ fontSize: 10, color: isDark ? '#64748B' : '#94A3B8' }}>
                    {group.member_count || 0}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Découvrir */}
      {filteredDiscover.length > 0 && (
        <div>
          <h3 style={{
            fontSize: 12, fontWeight: 600, color: isDark ? "#64748B" : "#94A3B8",
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16,
          }}>
            D&eacute;couvrir
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredDiscover.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                style={{
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16, overflow: "hidden",
                  border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                }}
              >
                <div style={{ height: 48, background: "linear-gradient(135deg, #3BB4C1, #06B6D4)" }} />
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt=""
                          style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", verticalAlign: "middle" }} />
                      ) : (group.avatar_emoji || '\uD83D\uDC65')}
                    </span>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                      {group.name}
                    </h4>
                  </div>
                  {group.description && (
                    <p style={{
                      fontSize: 12, color: isDark ? "#94A3B8" : "#64748B", marginBottom: 12,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {group.description}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={14} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
                      <span style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
                        {group.member_count || 0} membres
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoin(group.id)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, backgroundColor: "#3BB4C1",
                        border: "none", color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Rejoindre
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
