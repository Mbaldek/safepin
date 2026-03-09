"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, CheckCircle, MapPin, Share2, Flag, EyeOff, Trash2, Send } from "lucide-react";
import { SAFETY_TAG_COLORS } from "@/lib/hashtagTokens";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import EmojiPickerButton from "@/components/ui/EmojiPickerButton";
import { useUiStore } from "@/stores/uiStore";

type PostComment = {
  id: string;
  author_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  _profile?: { display_name: string | null; avatar_emoji: string | null } | null;
};

function commentTimeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

interface Post {
  id: string;
  type: "alerte" | "bonplan" | "evenement" | "quartier";
  user: {
    name: string;
    avatar: string;
    avatarUrl?: string | null;
    gradientColors: string[];
    verified?: boolean;
  };
  userId?: string;
  username?: string;
  displayName?: string;
  time: string;
  location?: string;
  title: string;
  content: string;
  confirmations?: number;
  hasMap?: boolean;
  likes?: number;
  comments?: number;
  hasImage?: boolean;
  date?: string;
  participants?: number;
}

interface PostCardProps {
  post: Post;
  isDark: boolean;
  currentUserId?: string | null;
  onHide?: (postId: string) => void;
  onSafetyFilter?: (tag: string) => void;
  onHashtagClick?: (tag: string) => void;
}

const SAFETY_TAGS = new Set(['#sos', '#urgence', '#harcèlement', '#harcelement', '#unsafe', '#agression', '#alerte']);

const typeStyles = {
  alerte: {
    borderColor: "#EF4444",
    locationBg: "rgba(239, 68, 68, 0.15)",
    locationColor: "#EF4444",
  },
  bonplan: {
    borderColor: "#F5C341",
    locationBg: "rgba(245, 195, 65, 0.15)",
    locationColor: "#F5C341",
  },
  evenement: {
    borderColor: "#A78BFA",
    locationBg: "rgba(167, 139, 250, 0.15)",
    locationColor: "#A78BFA",
  },
  quartier: {
    borderColor: "transparent",
    locationBg: "transparent",
    locationColor: "#64748B",
  },
};

export default function PostCard({ post, isDark, currentUserId, onHide, onSafetyFilter, onHashtagClick }: PostCardProps) {
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const openProfile = useUiStore((s) => s.openProfile);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(post.confirmations || 0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(post.participants || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [cardPressed, setCardPressed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if post is bookmarked
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('post_id', post.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setBookmarked(true); });
  }, [currentUserId, post.id]);

  const handleBookmark = async () => {
    if (!currentUserId || bookmarkLoading) return;
    setBookmarkLoading(true);
    if (bookmarked) {
      setBookmarked(false);
      const { error } = await supabase.from('saved_posts').delete().eq('user_id', currentUserId).eq('post_id', post.id);
      if (error) { setBookmarked(true); toast.error('Erreur'); }
      else toast('Retire des favoris');
    } else {
      setBookmarked(true);
      const { error } = await supabase.from('saved_posts').insert({ user_id: currentUserId, post_id: post.id });
      if (error) { setBookmarked(false); toast.error(error.code === '23505' ? 'Deja en favoris' : 'Erreur'); }
      else toast('Ajoute aux favoris');
    }
    setBookmarkLoading(false);
  };

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, author_id, content, is_anonymous, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (!data) return;
    // Enrich with profiles
    const authorIds = [...new Set(data.map((c) => c.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, display_name, avatar_emoji").in("id", authorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setComments(
      data.map((c) => ({
        ...c,
        _profile: profileMap.get(c.author_id) ?? null,
      }))
    );
    setCommentsLoaded(true);
  }, [post.id]);

  const submitComment = async () => {
    if (!newComment.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: post.id,
        author_id: currentUserId,
        content: newComment.trim(),
        is_anonymous: false,
      })
      .select("id, author_id, content, is_anonymous, created_at")
      .single();
    if (!error && data) {
      // Fetch own profile for display
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_emoji")
        .eq("id", currentUserId)
        .maybeSingle();
      setComments((prev) => [...prev, { ...data, _profile: prof ?? null }]);
      setNewComment("");
    } else if (error) {
      console.error("[PostCard] comment insert error:", error.message);
    }
    setSubmitting(false);
  };

  // Load like state from DB
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from("post_likes")
      .select("id, user_id", { count: "exact" })
      .eq("post_id", post.id)
      .then(({ count, data }) => {
        setLikeCount(count ?? 0);
        if (data) setLiked(data.some((r) => r.user_id === currentUserId));
      });
  }, [post.id, currentUserId]);

  const isOwn = !!(currentUserId && post.userId === currentUserId);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const styles = typeStyles[post.type];

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
      setConfirmCount((c) => c + 1);
    }
  };

  const handleLike = async () => {
    if (!currentUserId || likeLoading) return;
    setLikeLoading(true);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
      if (error) { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
    }
    setLikeLoading(false);
  };

  const handleParticipate = () => {
    setParticipating(!participating);
    setParticipantCount((c) => (participating ? c - 1 : c + 1));
  };

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => { setCardHovered(false); setCardPressed(false); }}
      onMouseDown={() => setCardPressed(true)}
      onMouseUp={() => setCardPressed(false)}
      style={{
        backgroundColor: cardHovered
          ? (isDark ? "#1E293B" : "#F8FAFC")
          : (isDark ? "#1E293B" : "#FFFFFF"),
        borderRadius: 16,
        padding: 16,
        border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
        transition: "transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms cubic-bezier(0.16,1,0.3,1), background-color 200ms",
        transform: cardPressed
          ? "scale(0.98)"
          : cardHovered
          ? "translateY(-2px)"
          : "none",
        boxShadow: cardHovered
          ? "0 8px 28px rgba(0,0,0,0.12)"
          : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          onClick={(e) => { e.stopPropagation(); if (post.userId) { if (post.userId === currentUserId) openProfile(post.userId); else openContextMenu({ userId: post.userId, username: post.username || "", displayName: post.displayName || post.user.name }); } }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: post.userId ? "pointer" : "default",
            flex: 1,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${post.user.gradientColors[0]}, ${post.user.gradientColors[1]})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#FFFFFF",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {post.user.avatarUrl ? (
              <img src={post.user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              post.user.avatar
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "#FFFFFF" : "#0F172A",
                }}
              >
                {post.user.name}
              </span>
              {post.user.verified && (
                <CheckCircle size={14} style={{ color: "#3BB4C1" }} fill="#3BB4C1" />
              )}
            </div>
            <span style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
              {post.time}
            </span>
          </div>
        </div>
        {post.location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 12,
              backgroundColor: styles.locationBg,
            }}
          >
            <MapPin size={10} style={{ color: styles.locationColor }} />
            <span style={{ fontSize: 11, color: styles.locationColor, fontWeight: 500 }}>
              {post.location}
            </span>
          </div>
        )}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <MoreHorizontal size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 50,
                  minWidth: 180,
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 12,
                  padding: 4,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                }}
              >
                {[
                  { icon: Share2, label: "Partager", action: () => {
                    if (navigator.share) navigator.share({ text: post.content }).catch(() => {});
                    else { navigator.clipboard.writeText(post.content); toast.success("Copié !"); }
                    setMenuOpen(false);
                  }},
                  ...(!isOwn ? [
                    { icon: Flag, label: "Signaler", action: () => { toast("Signalement envoyé"); setMenuOpen(false); } },
                    { icon: EyeOff, label: "Masquer", action: () => { onHide?.(post.id); setMenuOpen(false); } },
                  ] : []),
                  ...(isOwn ? [
                    { icon: Trash2, label: "Supprimer", action: () => { toast("Post supprimé"); onHide?.(post.id); setMenuOpen(false); }, danger: true },
                  ] : []),
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      color: (item as any).danger ? "#EF4444" : isDark ? "#E2E8F0" : "#334155",
                      fontFamily: "inherit",
                    }}
                  >
                    <item.icon size={16} style={{ opacity: 0.7 }} />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          paddingLeft: post.type !== "quartier" ? 12 : 0,
          borderLeft: post.type !== "quartier" ? `3px solid ${styles.borderColor}` : "none",
          marginBottom: 12,
        }}
      >
        {post.title && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? "#FFFFFF" : "#0F172A",
              marginBottom: 4,
            }}
          >
            {post.title}
          </p>
        )}
        <p
          style={{
            fontSize: 12,
            color: isDark ? "#94A3B8" : "#475569",
            lineHeight: 1.5,
          }}
        >
          {post.content.split(/(#[\wÀ-ÿ]+)/g).map((part, i) => {
            if (part.startsWith('#')) {
              const tagName = part.slice(1).toLowerCase();
              const meta = SAFETY_TAG_COLORS[tagName];
              const isSafety = SAFETY_TAGS.has(part.toLowerCase());
              return (
                <span
                  key={i}
                  onClick={() => {
                    if (isSafety) onSafetyFilter?.(part);
                    else onHashtagClick?.(part);
                  }}
                  style={{
                    color: meta?.color ?? '#3BB4C1',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {part}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>

      {/* Map for alerte */}
      {post.hasMap && (
        <div
          style={{
            width: "100%",
            height: 120,
            borderRadius: 12,
            marginBottom: 12,
            background: `linear-gradient(135deg, ${isDark ? "#1E293B" : "#E2E8F0"}, ${isDark ? "#0F172A" : "#CBD5E1"})`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#EF4444",
              boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.3)",
            }}
          />
          {/* Grid lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, ${isDark ? "#334155" : "#CBD5E1"} 1px, transparent 1px),
                linear-gradient(to bottom, ${isDark ? "#334155" : "#CBD5E1"} 1px, transparent 1px)
              `,
              backgroundSize: "30px 30px",
              opacity: 0.3,
            }}
          />
        </div>
      )}

      {/* Image for bon plan */}
      {post.hasImage && (
        <div
          style={{
            width: "100%",
            height: 160,
            borderRadius: 12,
            marginBottom: 12,
            background: "linear-gradient(135deg, #F5C341, #F59E0B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          ☕
        </div>
      )}

      {/* Event card */}
      {post.type === "evenement" && (
        <div
          style={{
            backgroundColor: isDark ? "#243050" : "#F1F5F9",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                backgroundColor: "rgba(245, 195, 65, 0.2)",
              }}
            >
              <span style={{ fontSize: 11, color: "#F5C341", fontWeight: 600 }}>
                {post.date}
              </span>
            </div>
            <span style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
              {participantCount} participantes
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleParticipate}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              backgroundColor: participating ? "transparent" : "#3BB4C1",
              border: participating ? "1px solid #3BB4C1" : "none",
              color: participating ? "#3BB4C1" : "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {participating ? "Inscrit ✓" : "Je participe"}
          </motion.button>
        </div>
      )}

      {/* Confirmation badge for alerte */}
      {post.type === "alerte" && confirmCount > 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            backgroundColor: "rgba(52, 211, 153, 0.15)",
            marginBottom: 12,
          }}
        >
          <CheckCircle size={14} style={{ color: "#34D399" }} />
          <span style={{ fontSize: 11, color: "#34D399", fontWeight: 600, textTransform: "uppercase" }}>
            Confirmé par {confirmCount} membres
          </span>
        </motion.div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
        }}
      >
        {post.type === "alerte" ? (
          <>
            <span style={{ fontSize: 12, color: "#34D399" }}>
              {confirmCount} confirmations ✓
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                backgroundColor: confirmed ? "rgba(59, 180, 193, 0.15)" : "transparent",
                border: `1px solid ${confirmed ? "#3BB4C1" : isDark ? "#334155" : "#E2E8F0"}`,
                color: confirmed ? "#3BB4C1" : isDark ? "#94A3B8" : "#64748B",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {confirmed ? "Confirmé ✓" : "Signaler aussi"}
            </motion.button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Heart
                size={18}
                style={{ color: liked ? "#EF4444" : isDark ? "#64748B" : "#94A3B8" }}
                fill={liked ? "#EF4444" : "transparent"}
              />
              <span style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748B" }}>
                {likeCount}
              </span>
            </motion.button>
            <button
              onClick={() => { setCommentsOpen(!commentsOpen); if (!commentsLoaded) loadComments(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: commentsOpen ? "rgba(59,180,193,0.10)" : "none",
                border: commentsOpen ? "1px solid rgba(59,180,193,0.22)" : "1px solid transparent",
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              <MessageCircle size={18} style={{ color: commentsOpen ? "#3BB4C1" : isDark ? "#64748B" : "#94A3B8" }} />
              <span style={{ fontSize: 12, color: commentsOpen ? "#3BB4C1" : isDark ? "#94A3B8" : "#64748B" }}>
                {commentsLoaded ? comments.length : (post.comments || 0)}
              </span>
            </button>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleBookmark}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <Bookmark
            size={18}
            style={{ color: bookmarked ? "#F5C341" : isDark ? "#64748B" : "#94A3B8" }}
            fill={bookmarked ? "#F5C341" : "transparent"}
          />
        </motion.button>
      </div>

      {/* Inline comments */}
      <AnimatePresence>
        {commentsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                background: isDark ? "rgba(15,23,42,0.4)" : "#F8FAFC",
                padding: "8px 14px 10px",
                borderRadius: "0 0 16px 16px",
                marginTop: 8,
                marginLeft: -16,
                marginRight: -16,
                marginBottom: -16,
              }}
            >
              {/* Comments list */}
              {!commentsLoaded ? (
                <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
                  Chargement…
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
                  Aucun commentaire — sois le premier !
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {comments.map((c) => {
                    const name = c.is_anonymous ? "Anonyme" : (c._profile?.display_name || "Membre");
                    const emoji = c.is_anonymous ? "🌺" : (c._profile?.avatar_emoji || name.charAt(0).toUpperCase());
                    return (
                      <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "#E2E8F0" : "#334155" }}>
                              {name}
                            </span>
                            <span style={{ fontSize: 10, color: isDark ? "#64748B" : "#94A3B8" }}>
                              {commentTimeAgo(c.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#475569", lineHeight: 1.4, margin: "2px 0 0" }}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Comment input */}
              {currentUserId && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 8px" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3BB4C1, #0E7490)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#fff",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    ✦
                  </div>
                  <EmojiPickerButton onSelect={e => setNewComment(p => p + e)} isDark={isDark} size="sm" />
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    placeholder="Commenter…"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: "5px 10px",
                      borderRadius: 20,
                      border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                      background: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
                      color: isDark ? "#E2E8F0" : "#0F172A",
                      fontSize: 12,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <motion.button
                    whileTap={newComment.trim() ? { scale: 0.9 } : undefined}
                    onClick={submitComment}
                    disabled={submitting || !newComment.trim()}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#3BB4C1",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: newComment.trim() ? "pointer" : "default",
                      flexShrink: 0,
                      opacity: !newComment.trim() ? 0.35 : submitting ? 0.5 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <Send size={12} color="#FFFFFF" />
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
