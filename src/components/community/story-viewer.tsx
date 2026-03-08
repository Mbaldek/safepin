"use client";

import { motion } from "framer-motion";
import { X, Heart, Send, Share2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useUiStore } from "@/stores/uiStore";

export interface DBStory {
  id: string;
  user_id: string;
  display_name: string;
  avatar: string;
  avatarUrl: string | null;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  gradientColors: string[];
}

interface StoryViewerProps {
  isDark: boolean;
  storyIndex: number;
  stories: DBStory[];
  onClose: () => void;
  onNavigate: (index: number) => void;
  userId?: string | null;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "maintenant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

export default function StoryViewer({
  storyIndex,
  stories,
  onClose,
  onNavigate,
  userId,
}: StoryViewerProps) {
  const openProfile = useUiStore((s) => s.openProfile);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [storyTags, setStoryTags] = useState<{ tag: string; display: string; color: string | null }[]>([]);
  const [storyMentions, setStoryMentions] = useState<{ name: string; userId: string }[]>([]);

  // Guard: no stories
  useEffect(() => {
    if (!stories.length) onClose();
  }, [stories.length, onClose]);

  const story = stories[storyIndex] || stories[0];

  // Load like state when story changes
  useEffect(() => {
    if (!story) return;
    setLiked(false);
    setLikeCount(0);
    setSent(false);
    setMessage("");
    // Fetch like count
    supabase
      .from("story_likes")
      .select("id, user_id", { count: "exact" })
      .eq("story_id", story.id)
      .then(({ count, data, error }) => {
        if (error) { console.error("[story-likes]", error.message); return; }
        setLikeCount(count ?? 0);
        if (userId && data) {
          setLiked(data.some((r) => r.user_id === userId));
        }
      });
  }, [story?.id, userId]);

  // Fetch hashtags + mentions for current story
  useEffect(() => {
    if (!story?.id) { setStoryTags([]); setStoryMentions([]); return; }
    supabase
      .from("content_hashtags")
      .select("hashtags(tag, display, color)")
      .eq("content_id", story.id)
      .eq("content_type", "story")
      .then(({ data }) => {
        setStoryTags(
          (data || [])
            .map((r: Record<string, unknown>) => {
              const h = r.hashtags as { tag: string; display: string; color: string | null } | null;
              return h ? { tag: h.tag, display: h.display || `#${h.tag}`, color: h.color } : null;
            })
            .filter(Boolean) as { tag: string; display: string; color: string | null }[]
        );
      });
    supabase
      .from("content_mentions")
      .select("mentioned_user_id, profiles:mentioned_user_id(display_name, username)")
      .eq("content_id", story.id)
      .eq("content_type", "story")
      .then(({ data }) => {
        setStoryMentions(
          (data || []).map((r: Record<string, unknown>) => {
            const p = r.profiles as { display_name: string | null; username: string | null } | null;
            return { name: p?.display_name || p?.username || "?", userId: r.mentioned_user_id as string };
          })
        );
      });
  }, [story?.id]);

  const toggleLike = useCallback(async () => {
    if (!story || !userId) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", userId);
      if (error) { setLiked(true); setLikeCount((c) => c + 1); }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase.from("story_likes").insert({ story_id: story.id, user_id: userId });
      if (error) { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
    }
  }, [story, userId, liked]);

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !story || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from("story_messages").insert({
      story_id: story.id,
      sender_id: userId,
      content: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Erreur d\u2019envoi");
      return;
    }
    setMessage("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }, [message, story, userId, sending]);

  const handleShare = useCallback(async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title: "Breveil Story", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  // Reset progress on navigate
  useEffect(() => {
    setProgress(0);
  }, [storyIndex]);

  // Auto-advance for images (5s = 50 ticks * 100ms)
  useEffect(() => {
    if (!story || story.media_type === "video") return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (storyIndex < stories.length - 1) {
            onNavigate(storyIndex + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [storyIndex, story?.media_type, stories.length, onNavigate, onClose]);

  if (!story) return null;

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRight = x > rect.width / 2;

    if (isRight) {
      if (storyIndex < stories.length - 1) {
        onNavigate(storyIndex + 1);
      } else {
        onClose();
      }
    } else {
      if (storyIndex > 0) {
        onNavigate(storyIndex - 1);
      }
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#0F172A",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={handleTap}
    >
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px 8px" }}>
        {stories.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "#FFFFFF",
                width:
                  i < storyIndex
                    ? "100%"
                    : i === storyIndex
                    ? `${progress}%`
                    : "0%",
                transition: i === storyIndex ? "none" : "width 0.2s",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px 16px",
        }}
      >
        <div
          onClick={() => { openProfile(story.user_id); onClose(); }}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${story.gradientColors[0]}, ${story.gradientColors[1]})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {story.avatarUrl ? (
              <img
                src={story.avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}
              >
                {story.avatar}
              </span>
            )}
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
              {story.display_name}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                marginLeft: 8,
              }}
            >
              {timeAgo(story.created_at)}
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.1)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} strokeWidth={1.5} color="#FFFFFF" />
        </motion.button>
      </div>

      {/* Media */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {story.media_type === "video" ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            muted
            playsInline
            onEnded={() => {
              if (storyIndex < stories.length - 1) {
                onNavigate(storyIndex + 1);
              } else {
                onClose();
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <img
            src={story.media_url}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Hashtag pills overlay — top */}
        {storyTags.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 8, left: 12, right: 12,
              display: "flex", gap: 5, flexWrap: "wrap",
              zIndex: 2,
            }}
          >
            {storyTags.map((t) => (
              <span
                key={t.tag}
                style={{
                  padding: "3px 9px", borderRadius: 100,
                  background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                  fontSize: 11, fontWeight: 600,
                  color: t.color || "#fff",
                }}
              >
                {t.display}
              </span>
            ))}
          </div>
        )}

        {/* Mentions overlay — above caption */}
        {storyMentions.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: story.caption ? 80 : 16, left: 16, right: 16,
              zIndex: 2,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", fontWeight: 500 }}>
              avec {storyMentions.map((m) => `@${m.name}`).join(", ")}
            </span>
          </div>
        )}

        {/* Caption overlay */}
        {story.caption && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "40px 24px 24px",
              background:
                "linear-gradient(transparent, rgba(0,0,0,0.7))",
            }}
          >
            <p
              style={{
                fontSize: 16,
                color: "#FFFFFF",
                textAlign: "center",
                lineHeight: 1.5,
                margin: 0,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {story.caption}
            </p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          backgroundColor: "rgba(30,41,59,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder={sent ? "Envoyé !" : "Envoyer un message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
          disabled={sending}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.1)",
            border: "none",
            color: "#FFFFFF",
            fontSize: 14,
            outline: "none",
          }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleLike}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Heart
            size={24}
            strokeWidth={1.5}
            color={liked ? "#EF4444" : "#FFFFFF"}
            fill={liked ? "#EF4444" : "none"}
          />
          {likeCount > 0 && (
            <span style={{ position: "absolute", marginTop: 32, fontSize: 10, color: "#fff", fontWeight: 600 }}>
              {likeCount}
            </span>
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Share2 size={22} strokeWidth={1.5} color="#FFFFFF" />
        </motion.button>
        {message.trim().length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#3BB4C1",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: sending ? 0.5 : 1,
            }}
          >
            <Send size={18} strokeWidth={1.5} color="#FFFFFF" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
