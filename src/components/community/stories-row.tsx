"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface StoriesRowProps {
  isDark: boolean;
  userId: string | null;
  communityIds: string[];
  onStoryClick: (index: number) => void;
  onPublish: () => void;
  refreshKey?: number;
  activeHashtagFilter?: string | null;
}

interface StoryItem {
  id: string;
  isAdd?: boolean;
  name: string;
  avatar: string;
  avatarUrl?: string | null;
  gradientColors: string[];
}

const GRADIENTS = [
  ["#3BB4C1", "#A78BFA"],
  ["#A78BFA", "#8B5CF6"],
  ["#F5C341", "#F59E0B"],
  ["#34D399", "#10B981"],
];

function pickGradient(id: string): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function StoriesRow({ isDark, userId, communityIds, onStoryClick, onPublish, refreshKey, activeHashtagFilter }: StoriesRowProps) {
  const [stories, setStories] = useState<StoryItem[]>([]);

  useEffect(() => {
    (async () => {
      // If hashtag filter active, resolve matching story IDs first
      let hashtagStoryIds: Set<string> | null = null;
      if (activeHashtagFilter) {
        const { data: htRow } = await supabase
          .from("hashtags")
          .select("id")
          .eq("tag", activeHashtagFilter.toLowerCase())
          .maybeSingle();
        if (htRow) {
          const { data: links } = await supabase
            .from("content_hashtags")
            .select("content_id")
            .eq("hashtag_id", htRow.id)
            .eq("content_type", "story");
          hashtagStoryIds = new Set((links || []).map((l: { content_id: string }) => l.content_id));
        } else {
          hashtagStoryIds = new Set();
        }
      }

      // Fetch recent stories (last 24h) — global + user's communities
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const filter = communityIds.length
        ? `community_id.is.null,community_id.in.(${communityIds.join(",")})`
        : "community_id.is.null";
      const { data } = await supabase
        .from("community_stories")
        .select("id, user_id, display_name, media_url, created_at")
        .or(filter)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      let filtered = data || [];
      if (hashtagStoryIds !== null) {
        filtered = filtered.filter((s) => hashtagStoryIds!.has(s.id));
      }

      if (!filtered.length) {
        setStories([]);
        return;
      }

      // Enrich with profiles
      const userIds = [...new Set(filtered.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, username, avatar_emoji, avatar_url")
        .in("id", userIds);
      const pMap = new Map((profiles || []).map((p) => [p.id, p]));

      setStories(
        filtered.map((s) => {
          const p = pMap.get(s.user_id);
          const name = p?.username || p?.display_name || p?.first_name || s.display_name || "Membre";
          return {
            id: s.id,
            name,
            avatar: p?.avatar_emoji || name.charAt(0).toUpperCase(),
            avatarUrl: p?.avatar_url || null,
            gradientColors: pickGradient(s.user_id),
          };
        })
      );
    })();
  }, [communityIds, refreshKey, activeHashtagFilter]);

  // Always prepend the "+ Publier" slot
  const allItems: StoryItem[] = [
    { id: "__add", isAdd: true, name: "+ Publier", avatar: "", gradientColors: [] },
    ...stories,
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 16px",
        overflowX: "auto",
      }}
    >
      {allItems.map((story, index) => (
        <motion.button
          key={story.id}
          onClick={() => story.isAdd ? onPublish() : onStoryClick(index - 1)}
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
                : `linear-gradient(135deg, ${story.gradientColors[0]}, ${story.gradientColors[1]})`,
              border: story.isAdd ? "2px dashed #3BB4C1" : "none",
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
                overflow: "hidden",
              }}
            >
              {story.isAdd ? (
                <Plus size={20} style={{ color: "#3BB4C1" }} />
              ) : story.avatarUrl ? (
                <img
                  src={story.avatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                story.avatar
              )}
            </div>
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
