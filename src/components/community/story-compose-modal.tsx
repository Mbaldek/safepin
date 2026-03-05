"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const T = {
  surfaceBase: "#0F172A",
  surfaceCard: "#1E293B",
  surfaceElevated: "#334155",
  surfaceBaseL: "#F8FAFC",
  surfaceCardL: "#FFFFFF",
  surfaceElevatedL: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textPrimaryL: "#0F172A",
  textSecondary: "#94A3B8",
  textSecondaryL: "#475569",
  textTertiary: "#64748B",
  textTertiaryL: "#94A3B8",
  textInverse: "#0F172A",
  textInverseL: "#FFFFFF",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderSubtleL: "rgba(15,23,42,0.06)",
  borderDefault: "rgba(255,255,255,0.12)",
  borderDefaultL: "rgba(15,23,42,0.10)",
  interactiveHover: "rgba(255,255,255,0.05)",
  interactiveHoverL: "rgba(15,23,42,0.04)",
  gradientStart: "#3BB4C1",
  radiusMd: "12px",
  radiusXl: "24px",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

interface StoryComposeModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
  onPublished: () => void;
}

interface CommunityOption {
  id: string;
  name: string;
}

export default function StoryComposeModal({
  isDark,
  userId,
  onClose,
  onPublished,
}: StoryComposeModalProps) {
  const d = isDark;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [publishing, setPublishing] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Format non supporte");
      return;
    }
    setFile(f);
    setMediaType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(f));
  };

  const handlePublish = async () => {
    if (!file || !selectedCommunityId || !userId) return;
    setPublishing(true);

    const ext = file.name.split(".").pop();
    const path = `stories/${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, file);
    if (uploadError) {
      toast.error("Erreur d'upload");
      setPublishing(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(path);

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const { error } = await supabase.from("community_stories").insert({
      community_id: selectedCommunityId,
      user_id: userId,
      display_name: profile?.display_name || null,
      media_url: urlData.publicUrl,
      media_type: mediaType,
      caption: caption.trim() || null,
    });

    if (error) {
      toast.error("Erreur lors de la publication");
    } else {
      toast.success("Story publiee !");
      onPublished();
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
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
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
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: d ? T.surfaceBase : T.surfaceBaseL,
          borderTopLeftRadius: T.radiusXl,
          borderTopRightRadius: T.radiusXl,
          borderTop: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
          maxHeight: "90%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: d ? T.borderDefault : T.borderDefaultL,
            margin: "12px auto 0",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: d ? T.interactiveHover : T.interactiveHoverL,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X
              size={18}
              strokeWidth={1.5}
              color={d ? T.textPrimary : T.textPrimaryL}
            />
          </button>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: d ? T.textPrimary : T.textPrimaryL,
            }}
          >
            Nouvelle Story
          </span>
          <button
            onClick={handlePublish}
            disabled={publishing || !file || !selectedCommunityId}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor:
                !file || !selectedCommunityId
                  ? d
                    ? T.surfaceElevated
                    : "#E2E8F0"
                  : T.gradientStart,
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: !file ? "default" : "pointer",
              opacity: publishing ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {publishing && (
              <Loader2
                size={14}
                strokeWidth={1.5}
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {publishing ? "..." : "Publier"}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Community selector */}
          {communities.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: d ? T.textTertiary : T.textTertiaryL,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  display: "block",
                }}
              >
                Publier dans
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                  backgroundColor: d ? T.surfaceCard : T.surfaceCardL,
                  color: d ? T.textPrimary : T.textPrimaryL,
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

          {/* Media upload area */}
          <div style={{ marginBottom: 16 }}>
            {!preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  aspectRatio: "9/16",
                  maxHeight: 320,
                  borderRadius: T.radiusMd,
                  border: `2px dashed ${d ? T.borderDefault : T.borderDefaultL}`,
                  background: d ? T.interactiveHover : T.interactiveHoverL,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Camera
                  size={32}
                  strokeWidth={1.5}
                  color={T.gradientStart}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.gradientStart,
                  }}
                >
                  Choisir une photo ou video
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: d ? T.textTertiary : T.textTertiaryL,
                  }}
                >
                  Max 10 Mo
                </span>
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                {mediaType === "video" ? (
                  <video
                    src={preview}
                    controls
                    style={{
                      width: "100%",
                      maxHeight: 320,
                      borderRadius: T.radiusMd,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: 320,
                      borderRadius: T.radiusMd,
                      objectFit: "cover",
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} strokeWidth={1.5} color="#FFFFFF" />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* Caption */}
          <textarea
            placeholder="Ajoute un texte a ta story..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            rows={3}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: T.radiusMd,
              border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
              backgroundColor: d ? T.surfaceCard : T.surfaceCardL,
              color: d ? T.textPrimary : T.textPrimaryL,
              fontSize: 14,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ height: 20 }} />
      </motion.div>
    </motion.div>
  );
}
