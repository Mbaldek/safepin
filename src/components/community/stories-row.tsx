"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface StoriesRowProps {
  isDark: boolean;
  onStoryClick: (index: number) => void;
}

const stories = [
  {
    id: 0,
    isAdd: true,
    name: "+ Publier",
    avatar: "V",
  },
  {
    id: 1,
    name: "anna_r",
    avatar: "A",
    unread: true,
    type: "alerte",
    gradientColors: ["#3BB4C1", "#A78BFA"],
  },
  {
    id: 2,
    name: "julien_m",
    avatar: "J",
    unread: true,
    type: "bonplan",
    gradientColors: ["#3BB4C1", "#A78BFA"],
  },
  {
    id: 3,
    name: "emma_p",
    avatar: "E",
    unread: false,
    type: "evenement",
    gradientColors: ["#64748B", "#94A3B8"],
  },
  {
    id: 4,
    name: "lucas_d",
    avatar: "L",
    unread: true,
    type: "alerte",
    gradientColors: ["#3BB4C1", "#A78BFA"],
  },
  {
    id: 5,
    name: "marie_k",
    avatar: "M",
    unread: false,
    gradientColors: ["#64748B", "#94A3B8"],
  },
];

const typeIndicators: Record<string, { color: string; emoji: string }> = {
  alerte: { color: "#EF4444", emoji: "🚨" },
  bonplan: { color: "#F5C341", emoji: "📍" },
  evenement: { color: "#A78BFA", emoji: "🎉" },
};

export default function StoriesRow({ isDark, onStoryClick }: StoriesRowProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 16px",
        overflowX: "auto",
      }}
    >
      {stories.map((story, index) => (
        <motion.button
          key={story.id}
          onClick={() => !story.isAdd && onStoryClick(index - 1)}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            minWidth: 64,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 56,
              height: 56,
              borderRadius: "50%",
              padding: 2,
              background: story.isAdd
                ? "transparent"
                : story.unread
                ? `linear-gradient(135deg, ${story.gradientColors?.[0]}, ${story.gradientColors?.[1]})`
                : isDark
                ? "#334155"
                : "#CBD5E1",
              border: story.isAdd ? `2px dashed #3BB4C1` : "none",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: story.isAdd ? 18 : 20,
                fontWeight: 600,
                color: isDark ? "#FFFFFF" : "#0F172A",
              }}
            >
              {story.isAdd ? (
                <Plus size={20} style={{ color: "#3BB4C1" }} />
              ) : (
                story.avatar
              )}
            </div>

            {/* Type indicator */}
            {story.type && typeIndicators[story.type] && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: typeIndicators[story.type].color,
                  border: `2px solid ${isDark ? "#0F172A" : "#F8FAFC"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              color: isDark ? "#94A3B8" : "#64748B",
              maxWidth: 64,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {story.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
