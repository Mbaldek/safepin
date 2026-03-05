"use client";

import { motion } from "framer-motion";
import { X, Heart, Send, Share2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
}: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guard: no stories
  useEffect(() => {
    if (!stories.length) onClose();
  }, [stories.length, onClose]);

  const story = stories[storyIndex] || stories[0];

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          placeholder="Envoyer un message..."
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
          <Heart size={24} strokeWidth={1.5} color="#FFFFFF" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
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
        <motion.button
          whileTap={{ scale: 0.95 }}
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
          }}
        >
          <Send size={18} strokeWidth={1.5} color="#FFFFFF" />
        </motion.button>
      </div>
    </motion.div>
  );
}
