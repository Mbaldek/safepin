"use client";

import { motion } from "framer-motion";
import { X, MapPin, Users, Lock, Image, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { HashtagComposer } from "@/components/hashtags";
import { attachHashtags } from "@/hooks/useHashtags";
import type { Hashtag } from "@/types";

interface ComposeModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
}

const postTypes = [
  { id: "alerte", label: "🚨 Alerte", color: "#EF4444" },
  { id: "bonplan", label: "📍 Bon plan", color: "#F5C341" },
  { id: "evenement", label: "🎉 Événement", color: "#A78BFA" },
  { id: "post", label: "💬 Post", color: "#3BB4C1" },
];

const placeholders: Record<string, string> = {
  alerte: "Décrivez la situation à signaler...",
  bonplan: "Partagez votre bon plan...",
  evenement: "Décrivez votre événement...",
  post: "Qu'avez-vous à partager ?",
};

interface CommunityOption {
  id: string;
  name: string;
}

export default function ComposeModal({ isDark, userId, onClose }: ComposeModalProps) {
  const [selectedType, setSelectedType] = useState("post");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"public" | "cercle">("public");
  const [publishing, setPublishing] = useState(false);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [postTags, setPostTags] = useState<Hashtag[]>([]);

  // Fetch user's communities for the publish target
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);
      const ids = memberships?.map((m) => m.community_id) ?? [];
      if (!ids.length) return;
      const { data: comms } = await supabase
        .from("communities")
        .select("id, name")
        .in("id", ids);
      const list = comms || [];
      setCommunities(list);
      if (list.length > 0) setSelectedCommunityId(list[0].id);
    })();
  }, [userId]);

  const activeColor = postTypes.find((t) => t.id === selectedType)?.color || "#3BB4C1";

  const handlePublish = async () => {
    if (!content.trim() || !selectedCommunityId || !userId) return;
    setPublishing(true);

    // Get display_name from store or profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const { data: inserted, error } = await supabase.from("community_messages").insert({
      community_id: selectedCommunityId,
      user_id: userId,
      display_name: profile?.display_name || null,
      content: content.trim(),
    }).select("id").single();

    if (error) {
      toast.error("Erreur lors de la publication");
    } else {
      if (inserted && postTags.length > 0) {
        await attachHashtags({
          tags: postTags,
          contentType: 'post',
          contentId: inserted.id,
          userId,
        });
      }
      toast.success("Publié !");
      setContent("");
      setPostTags([]);
      onClose();
    }
    setPublishing(false);
  };

  const selectedCommunityName =
    communities.find((c) => c.id === selectedCommunityId)?.name || "Choisir un groupe";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
          borderRadius: "24px 24px 0 0",
          height: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${isDark ? "#1E293B" : "#E2E8F0"}`,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: isDark ? "#243050" : "#F1F5F9",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} />
          </motion.button>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: isDark ? "#FFFFFF" : "#0F172A",
            }}
          >
            Nouveau post
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePublish}
            disabled={publishing || !content.trim() || !selectedCommunityId}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor:
                !content.trim() || !selectedCommunityId
                  ? isDark
                    ? "#334155"
                    : "#E2E8F0"
                  : activeColor,
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor:
                !content.trim() || !selectedCommunityId
                  ? "default"
                  : "pointer",
              opacity: publishing ? 0.6 : 1,
            }}
          >
            {publishing ? "…" : "Publier"}
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }} className="scrollbar-hidden">
        {/* Community selector */}
        {communities.length > 0 && (
          <div style={{ padding: "12px 20px 0" }}>
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                color: isDark ? "#FFFFFF" : "#0F172A",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Post type selector */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "16px 20px",
            overflowX: "auto",
          }}
        >
          {postTypes.map((type) => (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border:
                  selectedType === type.id
                    ? `2px solid ${type.color}`
                    : `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                backgroundColor:
                  selectedType === type.id
                    ? `${type.color}20`
                    : "transparent",
                color:
                  selectedType === type.id
                    ? type.color
                    : isDark
                    ? "#94A3B8"
                    : "#64748B",
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {type.label}
            </motion.button>
          ))}
        </div>

        {/* Content area */}
        <div style={{ padding: "0 20px", flex: 1 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholders[selectedType]}
            style={{
              width: "100%",
              minHeight: 120,
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              color: isDark ? "#FFFFFF" : "#0F172A",
              fontSize: 15,
              lineHeight: 1.6,
              resize: "none",
              outline: "none",
            }}
          />

          <div style={{ marginTop: 12 }}>
            <HashtagComposer
              isDark={isDark}
              selectedTags={postTags}
              onTagsChange={setPostTags}
              showSafetyChips={selectedType === "alerte"}
              maxFree={5}
            />
          </div>
        </div>

        {/* Options */}
        <div style={{ padding: "16px 20px" }}>
          {/* Audience */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderRadius: 12,
              marginBottom: 12,
              border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {audience === "public" ? (
                <Users size={18} style={{ color: "#3BB4C1" }} />
              ) : (
                <Lock size={18} style={{ color: "#A78BFA" }} />
              )}
              <span
                style={{
                  fontSize: 14,
                  color: isDark ? "#FFFFFF" : "#0F172A",
                }}
              >
                {audience === "public" ? "Tout le quartier" : "Mon cercle"}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                setAudience(audience === "public" ? "cercle" : "public")
              }
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                backgroundColor: isDark ? "#243050" : "#F1F5F9",
                border: "none",
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Changer
            </motion.button>
          </div>

          {/* Add photo */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              borderRadius: 12,
              border: `1px dashed ${isDark ? "#334155" : "#E2E8F0"}`,
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <Image size={18} />
            <span>Ajouter une photo</span>
          </motion.button>
        </div>

        </div>{/* end scrollable content */}

        {/* Safe area spacer */}
        <div style={{ height: 20 }} />
      </motion.div>
    </motion.div>
  );
}
