"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Search, ArrowLeft, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import ChatView from "@/components/chat/ChatView";
import { useUiStore } from "@/stores/uiStore";

interface MessagesTabProps {
  isDark: boolean;
  userId: string | null;
  pendingDm?: DMRow | null;
  onPendingDmConsumed?: () => void;
}

interface DMRow {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  is_unread: boolean;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "Maintenant";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

/* ── Swipeable conversation row (Apple Mail style) ─────────── */
function SwipeableConvoRow({
  convo, index, isDark, onSelect, onDelete,
}: {
  convo: DMRow; index: number; isDark: boolean;
  onSelect: () => void; onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const trashOpacity = useTransform(x, [-80, -30], [1, 0]);
  const [swiped, setSwiped] = useState(false);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -120 || (info.offset.x < -50 && info.velocity.x < -500)) {
      // Full swipe → delete immediately
      onDelete();
    } else if (info.offset.x < -50) {
      setSwiped(true);
    } else {
      setSwiped(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: "auto" }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}
    >
      {/* Red trash background */}
      <motion.div
        style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0,
          width: 80,
          background: "#EF4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "0 12px 12px 0",
          cursor: "pointer",
          opacity: trashOpacity,
        }}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 size={20} color="#FFFFFF" />
      </motion.div>

      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={{ x: swiped ? -80 : 0 }}
        style={{
          x,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 12,
          cursor: "pointer",
          backgroundColor: isDark ? "transparent" : "transparent",
          position: "relative",
          zIndex: 1,
          background: isDark ? "#0F172A" : "#FFFFFF",
        }}
        whileHover={!swiped ? { backgroundColor: isDark ? "#1E293B" : "#F1F5F9", x: 3 } : undefined}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(59,180,193,0.25)';
          (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.background = isDark ? '#0F172A' : '#FFFFFF';
          (e.currentTarget as HTMLElement).style.transform = '';
        }}
        onClick={() => { if (!swiped) onSelect(); else setSwiped(false); }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "#FFFFFF",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {convo.partner_avatar ? (
            <img
              src={convo.partner_avatar}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            convo.partner_name.charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: convo.is_unread ? 700 : 600, color: isDark ? "#FFFFFF" : "#0F172A" }}>
              {convo.partner_name}
            </span>
            <span style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
              {timeAgo(convo.last_message_at)}
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: isDark ? "#94A3B8" : "#64748B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}>
            {convo.last_message || "Nouvelle conversation"}
          </p>
        </div>
        {convo.is_unread && (
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            backgroundColor: "#3BB4C1", flexShrink: 0,
            animation: "badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        )}
      </motion.div>
    </motion.div>
  );
}

export default function MessagesTab({ isDark, userId, pendingDm, onPendingDmConsumed }: MessagesTabProps) {
  const openProfile = useUiStore((s) => s.openProfile);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<DMRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<DMRow | null>(null);

  // Auto-open conversation from circle tab
  useEffect(() => {
    if (pendingDm) {
      setSelectedConvo(pendingDm);
      onPendingDmConsumed?.();
    }
  }, [pendingDm, onPendingDmConsumed]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: convos } = await supabase
        .from("dm_conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (!convos?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const partnerIds = convos.map((c) =>
        c.user1_id === userId ? c.user2_id : c.user1_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", partnerIds);

      const pMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      setConversations(
        convos.map((c) => {
          const pid =
            c.user1_id === userId ? c.user2_id : c.user1_id;
          const p = pMap.get(pid);
          const readAt =
            c.user1_id === userId
              ? c.user1_last_read_at
              : c.user2_last_read_at;
          return {
            id: c.id,
            user1_id: c.user1_id,
            user2_id: c.user2_id,
            last_message: c.last_message ?? null,
            last_message_at: c.last_message_at || c.created_at,
            partner_id: pid,
            partner_name: p?.display_name || "Utilisateur",
            partner_avatar: p?.avatar_url || null,
            is_unread:
              !readAt ||
              new Date(c.last_message_at) > new Date(readAt),
          };
        })
      );
      setLoading(false);
    })();
  }, [userId]);

  // Realtime: refresh conversation list on new messages
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("dm_list_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_conversations",
        },
        (payload) => {
          const row = payload.new as any;
          if (row.user1_id !== userId && row.user2_id !== userId) return;
          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id !== row.id) return c;
              const readAt = row.user1_id === userId ? row.user1_last_read_at : row.user2_last_read_at;
              return {
                ...c,
                last_message: row.last_message ?? null,
                last_message_at: row.last_message_at || row.created_at,
                is_unread: !readAt || new Date(row.last_message_at) > new Date(readAt),
              };
            });
            return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleDeleteConvo = useCallback(async (convoId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convoId));
    await supabase.from("direct_messages").delete().eq("conversation_id", convoId);
    await supabase.from("dm_conversations").delete().eq("id", convoId);
  }, []);

  // If a conversation is selected, show ChatView
  if (selectedConvo && userId) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: `1px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedConvo(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isDark ? "#FFFFFF" : "#0F172A",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div
            onClick={() => openProfile(selectedConvo.partner_id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              flex: 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "#FFFFFF",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {selectedConvo.partner_avatar ? (
                <img
                  src={selectedConvo.partner_avatar}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                selectedConvo.partner_name.charAt(0).toUpperCase()
              )}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isDark ? "#FFFFFF" : "#0F172A",
              }}
            >
              {selectedConvo.partner_name}
            </span>
          </div>
        </div>

        {/* ChatView */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <ChatView
            conversationId={selectedConvo.id}
            currentUserId={userId}
            sendAsUserId={userId}
            partnerName={selectedConvo.partner_name}
            colors={{
              myBg: "#3BB4C1",
              myText: "#FFFFFF",
              partnerBg: isDark ? "#1E293B" : "#F1F5F9",
              partnerText: isDark ? "#FFFFFF" : "#0F172A",
              timestamp: isDark ? "#64748B" : "#94A3B8",
            }}
            inputBg={isDark ? "#0F172A" : "#F8FAFC"}
            inputBorder={isDark ? "#1E293B" : "#E2E8F0"}
            inputText={isDark ? "#FFFFFF" : "#0F172A"}
            buttonBg="#3BB4C1"
            isDark={isDark}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          fontSize: 12,
        }}
      >
        Chargement…
      </div>
    );
  }

  const q = searchQuery.toLowerCase();
  const filtered = conversations.filter(
    (c) => !q || c.partner_name.toLowerCase().includes(q)
  );

  return (
    <div style={{ padding: "16px", paddingBottom: 80 }}>
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderRadius: 12,
          border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
          marginBottom: 24,
        }}
      >
        <Search
          size={18}
          style={{ color: isDark ? "#64748B" : "#94A3B8" }}
        />
        <input
          type="text"
          placeholder="Rechercher une conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 13,
            color: isDark ? "#FFFFFF" : "#0F172A",
            outline: "none",
          }}
        />
      </div>

      {/* Conversations */}
      {filtered.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 0",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 32 }}>💬</span>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: isDark ? "#94A3B8" : "#64748B",
            }}
          >
            Aucun message pour l&apos;instant
          </p>
          <p
            style={{
              fontSize: 11,
              color: isDark ? "#64748B" : "#94A3B8",
            }}
          >
            Vos conversations apparaîtront ici
          </p>
        </div>
      ) : (
        <div>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: isDark ? "#64748B" : "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 16,
            }}
          >
            Récents
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <AnimatePresence initial={false}>
            {filtered.map((convo, index) => (
              <SwipeableConvoRow
                key={convo.id}
                convo={convo}
                index={index}
                isDark={isDark}
                onSelect={() => setSelectedConvo(convo)}
                onDelete={() => handleDeleteConvo(convo.id)}
              />
            ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
