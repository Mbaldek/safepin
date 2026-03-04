"use client";

import { motion } from "framer-motion";
import { X, Heart, Send, Share2 } from "lucide-react";
import { useState, useEffect } from "react";

interface StoryViewerProps {
  isDark: boolean;
  storyIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const stories = [
  {
    id: 1,
    user: "anna_r",
    avatar: "A",
    time: "il y a 2h",
    type: "alerte",
    title: "⚠️ Zone à éviter ce soir",
    content: "Plusieurs témoignages de comportements suspects près de la station Boucicaut. Soyez vigilantes.",
    segments: 3,
    gradientColors: ["#EF4444", "#DC2626"],
  },
  {
    id: 2,
    user: "julien_m",
    avatar: "J",
    time: "il y a 3h",
    type: "bonplan",
    title: "☕ Nouveau café safe !",
    content: "Je viens de découvrir un super spot rue du Commerce. Personnel très attentif, bonne ambiance.",
    segments: 2,
    gradientColors: ["#F5C341", "#F59E0B"],
  },
  {
    id: 3,
    user: "emma_p",
    avatar: "E",
    time: "il y a 5h",
    type: "evenement",
    title: "🎉 Marche solidaire demain",
    content: "N'oubliez pas la marche collective demain soir ! RDV place Balard à 20h.",
    segments: 1,
    gradientColors: ["#A78BFA", "#8B5CF6"],
  },
  {
    id: 4,
    user: "lucas_d",
    avatar: "L",
    time: "il y a 6h",
    type: "alerte",
    title: "🚨 Attention métro ligne 12",
    content: "Pickpockets repérés ce matin à la station Convention. Faites attention à vos affaires.",
    segments: 2,
    gradientColors: ["#EF4444", "#DC2626"],
  },
];

export default function StoryViewer({ storyIndex, onClose, onNavigate }: StoryViewerProps) {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);

  const story = stories[storyIndex] || stories[0];

  useEffect(() => {
    setCurrentSegment(0);
    setProgress(0);
  }, [storyIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (currentSegment < story.segments - 1) {
            setCurrentSegment((s) => s + 1);
            return 0;
          } else if (storyIndex < stories.length - 1) {
            onNavigate(storyIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return p + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentSegment, storyIndex, story.segments, onNavigate, onClose]);

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRight = x > rect.width / 2;

    if (isRight) {
      if (currentSegment < story.segments - 1) {
        setCurrentSegment((s) => s + 1);
        setProgress(0);
      } else if (storyIndex < stories.length - 1) {
        onNavigate(storyIndex + 1);
      } else {
        onClose();
      }
    } else {
      if (currentSegment > 0) {
        setCurrentSegment((s) => s - 1);
        setProgress(0);
      } else if (storyIndex > 0) {
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
      {/* Progress bars */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 16px 8px",
        }}
      >
        {Array.from({ length: story.segments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                height: "100%",
                backgroundColor: "#FFFFFF",
                width:
                  i < currentSegment ? "100%" : i === currentSegment ? `${progress}%` : "0%",
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
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
            }}
          >
            {story.avatar}
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
              {story.user}
            </span>
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)", marginLeft: 8 }}>
              {story.time}
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
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} style={{ color: "#FFFFFF" }} />
        </motion.button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 24px",
          background:
            story.type === "alerte"
              ? "linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0) 50%)"
              : story.type === "bonplan"
              ? "linear-gradient(180deg, rgba(245, 195, 65, 0.2) 0%, rgba(15, 23, 42, 0) 50%)"
              : "linear-gradient(180deg, rgba(167, 139, 250, 0.2) 0%, rgba(15, 23, 42, 0) 50%)",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {story.title}
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          {story.content}
        </p>

        {/* Map for alerte type */}
        {story.type === "alerte" && (
          <div
            style={{
              width: "100%",
              height: 120,
              borderRadius: 16,
              marginTop: 24,
              background: "linear-gradient(135deg, #1E293B, #0F172A)",
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
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                boxShadow: "0 0 0 6px rgba(239, 68, 68, 0.3)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
                opacity: 0.3,
              }}
            />
          </div>
        )}
      </div>

      {/* Confirm button for alerte */}
      {story.type === "alerte" && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            margin: "0 16px 16px",
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#EF4444",
            border: "none",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Confirmer ce signalement
        </motion.button>
      )}

      {/* Bottom input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          backgroundColor: "rgba(30, 41, 59, 0.8)",
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
            backgroundColor: "rgba(255, 255, 255, 0.1)",
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
          <Heart size={24} style={{ color: "#FFFFFF" }} />
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
          <Share2 size={22} style={{ color: "#FFFFFF" }} />
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
          <Send size={18} style={{ color: "#FFFFFF" }} />
        </motion.button>
      </div>
    </motion.div>
  );
}
