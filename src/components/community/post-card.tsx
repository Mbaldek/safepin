"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, CheckCircle, MapPin } from "lucide-react";

interface Post {
  id: number;
  type: "alerte" | "bonplan" | "evenement" | "quartier";
  user: {
    name: string;
    avatar: string;
    gradientColors: string[];
    verified?: boolean;
  };
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
}

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

export default function PostCard({ post, isDark }: PostCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(post.confirmations || 0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [participating, setParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(post.participants || 0);

  const styles = typeStyles[post.type];

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
      setConfirmCount((c) => c + 1);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleParticipate = () => {
    setParticipating(!participating);
    setParticipantCount((c) => (participating ? c - 1 : c + 1));
  };

  return (
    <div
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${post.user.gradientColors[0]}, ${post.user.gradientColors[1]})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "#FFFFFF",
          }}
        >
          {post.user.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                fontSize: 14,
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
          <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
            {post.time}
          </span>
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
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <MoreHorizontal size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
        </button>
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
              fontSize: 15,
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
            fontSize: 14,
            color: isDark ? "#94A3B8" : "#475569",
            lineHeight: 1.5,
          }}
        >
          {post.content}
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
              <span style={{ fontSize: 12, color: "#F5C341", fontWeight: 600 }}>
                {post.date}
              </span>
            </div>
            <span style={{ fontSize: 13, color: isDark ? "#94A3B8" : "#64748B" }}>
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
              fontSize: 13,
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
            <span style={{ fontSize: 13, color: "#34D399" }}>
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
                fontSize: 13,
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
              <span style={{ fontSize: 13, color: isDark ? "#94A3B8" : "#64748B" }}>
                {likeCount}
              </span>
            </motion.button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <MessageCircle size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
              <span style={{ fontSize: 13, color: isDark ? "#64748B" : "#94A3B8" }}>
                {post.comments || 0} commentaires
              </span>
            </button>
          </div>
        )}
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <Bookmark size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
        </button>
      </div>
    </div>
  );
}
