"use client";

import { motion } from "framer-motion";
import { X, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from '@/hooks/useToast';
import EmojiPickerButton from "@/components/ui/EmojiPickerButton";
import { HashtagComposer } from "@/components/map/hashtags";
import { attachHashtags } from "@/hooks/useHashtags";
import type { Hashtag } from "@/types";

interface ComposeModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
  onPublished?: () => void;
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

export default function ComposeModal({ isDark, userId, onClose, onPublished }: ComposeModalProps) {
  const toast = useToast();
  const [selectedType, setSelectedType] = useState("post");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"public" | "followers" | "cercle">("public");
  const [publishing, setPublishing] = useState(false);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [postTags, setPostTags] = useState<Hashtag[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

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

  const handleMediaPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 10 Mo)");
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!content.trim() || !selectedCommunityId || !userId) return;
    setPublishing(true);

    // Get display_name from store or profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    // Upload media if selected
    let mediaUrl: string | null = null;
    if (mediaFile) {
      setUploadingMedia(true);
      const ext = mediaFile.name.split(".").pop() || "jpg";
      const path = `posts/${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, mediaFile);
      setUploadingMedia(false);
      if (upErr) {
        toast.error("Erreur upload média");
        setPublishing(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    // NOTE: media_url column must exist on community_messages table
    const { data: inserted, error } = await supabase.from("community_messages").insert({
      community_id: selectedCommunityId,
      user_id: userId,
      display_name: profile?.display_name || null,
      content: content.trim(),
      visibility: audience,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
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
      clearMedia();
      onPublished?.();
      onClose();
    }
    setPublishing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
          borderRadius: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "85dvh",
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
            {uploadingMedia ? "Upload…" : publishing ? "…" : "Publier"}
          </motion.button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }} className="scrollbar-hidden">
        {/* Community auto-selected (no UI) */}

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
          <div style={{ position: 'relative' }}>
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
            <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
              <EmojiPickerButton onSelect={e => setContent(p => p + e)} isDark={isDark} />
            </div>
          </div>

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
          {/* Visibility selector — 3 levels */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {([
              { id: "public" as const, icon: "🌍", label: "Public", desc: "Visible par tous", color: "#3BB4C1" },
              { id: "followers" as const, icon: "👥", label: "Abonnés", desc: "Mes abonnés", color: "#F5C341" },
              { id: "cercle" as const, icon: "🤝", label: "Cercle", desc: "Mon cercle", color: "#A78BFA" },
            ]).map((opt) => {
              const selected = audience === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAudience(opt.id)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "10px 8px",
                    borderRadius: 12,
                    border: selected
                      ? `2px solid ${opt.color}`
                      : `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                    backgroundColor: selected
                      ? `${opt.color}15`
                      : isDark ? "#1E293B" : "#FFFFFF",
                    cursor: "pointer",
                    background: selected ? `${opt.color}15` : undefined,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{opt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selected ? opt.color : (isDark ? "#FFFFFF" : "#0F172A") }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: 10, color: isDark ? "#64748B" : "#94A3B8" }}>
                    {opt.desc}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Add photo / video */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaPick}
            style={{ display: "none" }}
          />

          {mediaPreview ? (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
              {mediaFile?.type.startsWith("video") ? (
                <video
                  src={mediaPreview}
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12 }}
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt=""
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12 }}
                />
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearMedia}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} color="#FFFFFF" />
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
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
              <ImageIcon size={18} />
              <span>Ajouter une photo</span>
            </motion.button>
          )}
        </div>

        </div>{/* end scrollable content */}

        {/* Safe area spacer */}
        <div style={{ height: 20 }} />
      </motion.div>
    </motion.div>
  );
}
