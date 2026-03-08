"use client";

import { motion } from "framer-motion";
import { X, Camera, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { T, springConfig } from "@/lib/tokens";
import { toast } from "sonner";
import { SAFETY_TAG_COLORS } from "@/lib/hashtagTokens";
import { useHashtagSearch, upsertHashtag, attachHashtags } from "@/hooks/useHashtags";
import { useMentionSearch, insertMentions } from "@/hooks/useMentionSearch";
import type { MentionProfile } from "@/hooks/useMentionSearch";
import type { Hashtag, StoryVisibility } from "@/types";

const SPRING = springConfig;

const VISIBILITY_OPTIONS: { id: StoryVisibility; icon: string; label: string; desc: string; color: string }[] = [
  { id: "public", icon: "\uD83C\uDF0D", label: "Public", desc: "Visible par tous", color: "#3BB4C1" },
  { id: "followers", icon: "\uD83D\uDC65", label: "Abonnés", desc: "Mes abonnés", color: "#F5C341" },
  { id: "cercle", icon: "\uD83E\uDD1D", label: "Cercle", desc: "Mon cercle", color: "#A78BFA" },
];

interface StoryComposeModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
  onPublished: () => void;
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
  const [publishing, setPublishing] = useState(false);
  const [storyTags, setStoryTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<StoryVisibility>("public");

  // Mentions
  const [mentions, setMentions] = useState<MentionProfile[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const { results: mentionResults, search: searchMentions, clear: clearMentions } = useMentionSearch();

  // Free hashtags
  const [customTags, setCustomTags] = useState<Hashtag[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const { results: tagResults, search: searchTags, clear: clearTags } = useHashtagSearch();

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
    if (!file || !userId) return;
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

    const displayName = profile?.display_name || null;

    const { data: inserted, error } = await supabase.from("community_stories").insert({
      community_id: null,
      user_id: userId,
      display_name: displayName,
      media_url: urlData.publicUrl,
      media_type: mediaType,
      caption: caption.trim() || null,
      visibility,
    }).select("id").single();

    if (error) {
      toast.error("Erreur lors de la publication");
      setPublishing(false);
      return;
    }

    // Attach safety tags + custom tags
    const allSafetyTagNames = storyTags;
    const safetyTagRows: Hashtag[] = [];
    if (allSafetyTagNames.length > 0) {
      const { data } = await supabase
        .from("hashtags")
        .select("*")
        .in("tag", allSafetyTagNames);
      if (data) safetyTagRows.push(...(data as Hashtag[]));
    }

    const allTags = [...safetyTagRows, ...customTags];
    // Deduplicate by id
    const uniqueTags = [...new Map(allTags.map(t => [t.id, t])).values()];
    if (uniqueTags.length > 0) {
      await attachHashtags({
        tags: uniqueTags,
        contentType: "story",
        contentId: inserted.id,
        userId,
      });
    }

    // Insert mentions + notifications
    if (mentions.length > 0) {
      await insertMentions({
        contentType: "story",
        contentId: inserted.id,
        mentionerId: userId,
        mentionerName: displayName || "Quelqu\u2019un",
        mentionedUsers: mentions,
      });
    }

    // Notify cercle members
    if (visibility === "cercle" || visibility === "public") {
      const [{ data: c1 }, { data: c2 }] = await Promise.all([
        supabase.from("trusted_contacts").select("contact_id").eq("user_id", userId).eq("status", "accepted"),
        supabase.from("trusted_contacts").select("user_id").eq("contact_id", userId).eq("status", "accepted"),
      ]);
      const cercleIds = [...new Set([...(c1 || []).map((r: { contact_id: string }) => r.contact_id), ...(c2 || []).map((r: { user_id: string }) => r.user_id)])];
      if (cercleIds.length) {
        await supabase.from("notifications").insert(cercleIds.map(uid => ({
          user_id: uid, type: "story" as const,
          title: `${displayName || "Quelqu\u2019un"} a publie une story`,
          payload: { senderId: userId, senderName: displayName, storyId: inserted.id },
        })));
      }
    }

    // Notify followers
    if (visibility === "followers" || visibility === "public") {
      const { data: followers } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
      const followerIds = (followers || []).map((r: { follower_id: string }) => r.follower_id).filter(id => id !== userId);
      if (followerIds.length) {
        await supabase.from("notifications").insert(followerIds.map(uid => ({
          user_id: uid, type: "story" as const,
          title: `${displayName || "Quelqu\u2019un"} a publie une story`,
          payload: { senderId: userId, senderName: displayName, storyId: inserted.id },
        })));
      }
    }

    toast.success("Story publiee !");
    onPublished();
    onClose();
    setPublishing(false);
  };

  const addMention = (profile: MentionProfile) => {
    if (mentions.length >= 10) return;
    if (mentions.some(m => m.id === profile.id)) return;
    setMentions(prev => [...prev, profile]);
    setMentionQuery("");
    clearMentions();
  };

  const removeMention = (id: string) => {
    setMentions(prev => prev.filter(m => m.id !== id));
  };

  const addCustomTag = async (raw: string) => {
    const clean = raw.replace(/^#/, "").trim();
    if (!clean) return;
    if (customTags.some(t => t.tag === clean.toLowerCase())) return;
    const tag = await upsertHashtag(clean);
    if (tag) {
      setCustomTags(prev => [...prev, tag]);
      setTagQuery("");
      clearTags();
    }
  };

  const removeCustomTag = (id: string) => {
    setCustomTags(prev => prev.filter(t => t.id !== id));
  };

  // Shared styles
  const pillStyle = (color: string, bg: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 10px", borderRadius: 100,
    fontSize: 12, fontWeight: 600,
    background: bg, color,
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 10,
    border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
    backgroundColor: d ? T.surfaceCard : T.surfaceCardL,
    color: d ? T.textPrimary : T.textPrimaryL,
    fontSize: 16, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute", left: 0, right: 0, top: "100%", zIndex: 10,
    background: d ? T.surfaceCard : T.surfaceCardL,
    border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
    borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: "auto",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px", cursor: "pointer", border: "none",
    background: "none", width: "100%", textAlign: "left" as const,
    fontSize: 14, color: d ? T.textPrimary : T.textPrimaryL,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".08em", color: d ? T.textTertiary : T.textTertiaryL, marginBottom: 6,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end",
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
          borderTopLeftRadius: T.radiusXl, borderTopRightRadius: T.radiusXl,
          borderTop: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
          maxHeight: "90%", display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: d ? T.borderDefault : T.borderDefaultL, margin: "12px auto 0" }} />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
        }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: d ? T.interactiveHover : T.interactiveHoverL,
            border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={18} strokeWidth={1.5} color={d ? T.textPrimary : T.textPrimaryL} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
            Nouvelle Story
          </span>
          <button
            onClick={handlePublish}
            disabled={publishing || !file}
            style={{
              padding: "8px 16px", borderRadius: 8,
              backgroundColor: !file ? (d ? T.surfaceElevated : "#E2E8F0") : T.gradientStart,
              border: "none", color: "#FFFFFF", fontSize: 14, fontWeight: 600,
              cursor: !file ? "default" : "pointer",
              opacity: publishing ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {publishing && <Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />}
            {publishing ? "..." : "Publier"}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Media upload area */}
          <div style={{ marginBottom: 16 }}>
            {!preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%", aspectRatio: "9/16", maxHeight: 280,
                  borderRadius: T.radiusMd,
                  border: `2px dashed ${d ? T.borderDefault : T.borderDefaultL}`,
                  background: d ? T.interactiveHover : T.interactiveHoverL,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 12, cursor: "pointer", padding: 0,
                }}
              >
                <Camera size={32} strokeWidth={1.5} color={T.gradientStart} />
                <span style={{ fontSize: 14, fontWeight: 600, color: T.gradientStart }}>
                  Choisir une photo ou video
                </span>
                <span style={{ fontSize: 12, color: d ? T.textTertiary : T.textTertiaryL }}>
                  Max 10 Mo
                </span>
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                {mediaType === "video" ? (
                  <video src={preview} controls style={{ width: "100%", maxHeight: 280, borderRadius: T.radiusMd, objectFit: "cover" }} />
                ) : (
                  <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 280, borderRadius: T.radiusMd, objectFit: "cover" }} />
                )}
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  style={{
                    position: "absolute", top: 8, right: 8, width: 28, height: 28,
                    borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={14} strokeWidth={1.5} color="#FFFFFF" />
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileChange} />
          </div>

          {/* Caption */}
          <textarea
            placeholder="Ajoute un texte a ta story..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            rows={3}
            style={{
              ...inputStyle,
              resize: "none" as const, lineHeight: 1.5,
              padding: 12,
            }}
          />

          {/* ── Mentions — "Tag tes amies !" ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle}>Tag tes amies !</div>

            {/* Selected pills */}
            {mentions.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {mentions.map(m => (
                  <span key={m.id} style={pillStyle(T.gradientStart, d ? "rgba(59,180,193,0.15)" : "rgba(59,180,193,0.10)")}>
                    @{m.display_name || m.username}
                    <button
                      onClick={() => removeMention(m.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "inherit", fontSize: 11 }}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            <div style={{ position: "relative" }}>
              <input
                value={mentionQuery}
                onChange={(e) => { setMentionQuery(e.target.value); searchMentions(e.target.value); }}
                placeholder="@ Rechercher un profil..."
                style={inputStyle}
              />
              {mentionResults.length > 0 && mentionQuery.trim() && (
                <div style={dropdownStyle}>
                  {mentionResults.map(p => (
                    <button key={p.id} onClick={() => addMention(p)} style={dropdownItemStyle}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "linear-gradient(135deg, #3BB4C1, #A78BFA)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.display_name || p.username}</div>
                        {p.username && <div style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL }}>@{p.username}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Safety chips ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle}>Contexte safety</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(Object.entries(SAFETY_TAG_COLORS) as [string, { color: string; bg: string; border: string }][]).slice(0, 7).map(([tag, meta]) => {
                const isSelected = storyTags.includes(tag);
                const display = "#" + tag.charAt(0).toUpperCase() + tag.slice(1);
                return (
                  <button
                    key={tag}
                    onClick={() => setStoryTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 100,
                      fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                      background: isSelected ? meta.color : meta.bg,
                      color: isSelected ? "#fff" : meta.color,
                      border: `1px solid ${meta.border}`,
                      transition: "all 150ms",
                    }}
                  >
                    {isSelected && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {display}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Visibility ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle}>Qui peut voir ?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {VISIBILITY_OPTIONS.map((opt) => {
                const selected = visibility === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVisibility(opt.id)}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 4, padding: "10px 8px", borderRadius: 12,
                      border: selected ? `2px solid ${opt.color}` : `1px solid ${d ? "#334155" : "#E2E8F0"}`,
                      backgroundColor: selected ? `${opt.color}15` : d ? "#1E293B" : "#FFFFFF",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: selected ? opt.color : d ? T.textSecondary : T.textSecondaryL }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: 9, color: d ? T.textTertiary : T.textTertiaryL }}>
                      {opt.desc}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Hashtags — DB + libre ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle}>Hashtags</div>

            {/* Selected pills */}
            {customTags.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {customTags.map(t => (
                  <span key={t.id} style={pillStyle(t.color || "#8B5CF6", d ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.10)")}>
                    {t.display || `#${t.tag}`}
                    <button
                      onClick={() => removeCustomTag(t.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "inherit", fontSize: 11 }}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            <div style={{ position: "relative" }}>
              <input
                value={tagQuery}
                onChange={(e) => { setTagQuery(e.target.value); searchTags(e.target.value.replace(/^#/, "")); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag(tagQuery);
                  }
                }}
                placeholder="# Rechercher ou creer..."
                style={inputStyle}
              />
              {tagResults.length > 0 && tagQuery.trim() && (
                <div style={dropdownStyle}>
                  {tagResults.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (!customTags.some(ct => ct.id === t.id)) {
                          setCustomTags(prev => [...prev, t]);
                        }
                        setTagQuery("");
                        clearTags();
                      }}
                      style={dropdownItemStyle}
                    >
                      <span style={{ fontWeight: 600, color: t.color || (d ? T.textPrimary : T.textPrimaryL) }}>
                        {t.display || `#${t.tag}`}
                      </span>
                      <span style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL, marginLeft: "auto" }}>
                        {t.uses_count ?? 0} uses
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: 20 }} />
      </motion.div>
    </motion.div>
  );
}
