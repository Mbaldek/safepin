"use client";

import { motion } from "framer-motion";
import { X, Globe, Lock, Share2, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
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
  semanticSuccess: "#34D399",
  semanticSuccessSoft: "rgba(52,211,153,0.15)",
  radiusMd: "12px",
  radiusXl: "24px",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

const EMOJI_OPTIONS = [
  "👥", "🏃", "🌙", "👶", "🎓", "💪",
  "🏘️", "🎨", "🌳", "🔒", "💼", "🎶",
];

interface CreateGroupModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "form" | "success";

export default function CreateGroupModal({
  isDark,
  userId,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const d = isDark;

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
        owner_id: userId,
        avatar_emoji: emoji,
        community_type: "group",
      })
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Erreur lors de la creation");
      setCreating(false);
      return;
    }

    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: userId,
    });

    setCreatedGroupId(data.id);
    setStep("success");
    setCreating(false);
    onCreated();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/join/${createdGroupId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Rejoins ${name} sur SafePin !`,
          url,
        });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copie !");
      setTimeout(() => setCopied(false), 2000);
    }
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
          maxHeight: "85%",
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

        {step === "form" ? (
          <>
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
                Nouveau groupe
              </span>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  backgroundColor:
                    !name.trim()
                      ? d
                        ? T.surfaceElevated
                        : "#E2E8F0"
                      : T.gradientStart,
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !name.trim() ? "default" : "pointer",
                  opacity: creating ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {creating && (
                  <Loader2
                    size={14}
                    strokeWidth={1.5}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {creating ? "..." : "Creer"}
              </button>
            </div>

            <div
              style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}
            >
              {/* Emoji picker */}
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
                Icone
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                  marginBottom: 20,
                }}
              >
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border:
                        emoji === e
                          ? `2px solid ${T.gradientStart}`
                          : `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      backgroundColor:
                        emoji === e
                          ? "rgba(59,180,193,0.1)"
                          : d
                          ? T.interactiveHover
                          : T.interactiveHoverL,
                      fontSize: 20,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Name */}
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
                Nom du groupe
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marche du soir 15e"
                maxLength={50}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: T.radiusMd,
                  border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                  backgroundColor: d ? T.surfaceCard : T.surfaceCardL,
                  color: d ? T.textPrimary : T.textPrimaryL,
                  fontSize: 15,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginBottom: 20,
                }}
              />

              {/* Description */}
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
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Decris ton groupe en quelques mots..."
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
                  marginBottom: 20,
                }}
              />

              {/* Public / Private toggle */}
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
                Visibilite
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {([
                  {
                    key: false,
                    Icon: Globe,
                    label: "Public",
                    desc: "Tout le monde peut trouver et rejoindre",
                  },
                  {
                    key: true,
                    Icon: Lock,
                    label: "Prive",
                    desc: "Uniquement sur invitation",
                  },
                ] as const).map((opt) => {
                  const sel = isPrivate === opt.key;
                  return (
                    <button
                      key={String(opt.key)}
                      onClick={() => setIsPrivate(opt.key)}
                      style={{
                        flex: 1,
                        padding: "14px 12px",
                        borderRadius: T.radiusMd,
                        border: sel
                          ? `2px solid ${T.gradientStart}`
                          : `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                        backgroundColor: sel
                          ? "rgba(59,180,193,0.08)"
                          : d
                          ? T.interactiveHover
                          : T.interactiveHoverL,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        textAlign: "center",
                      }}
                    >
                      <opt.Icon
                        size={20}
                        strokeWidth={1.5}
                        color={
                          sel
                            ? T.gradientStart
                            : d
                            ? T.textSecondary
                            : T.textSecondaryL
                        }
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: sel
                            ? T.gradientStart
                            : d
                            ? T.textPrimary
                            : T.textPrimaryL,
                        }}
                      >
                        {opt.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: d ? T.textTertiary : T.textTertiaryL,
                          lineHeight: 1.3,
                        }}
                      >
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 20 }} />
          </>
        ) : (
          /* ─── SUCCESS STEP ─── */
          <div
            style={{
              padding: "40px 20px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: T.semanticSuccessSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check
                size={28}
                strokeWidth={2}
                color={T.semanticSuccess}
              />
            </motion.div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: d ? T.textPrimary : T.textPrimaryL,
                  marginBottom: 6,
                }}
              >
                Groupe cree !
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: d ? T.textSecondary : T.textSecondaryL,
                }}
              >
                {emoji} {name}
              </div>
            </div>

            <button
              onClick={handleShare}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                backgroundColor: T.gradientStart,
                border: "none",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              {copied ? (
                <Check size={18} strokeWidth={1.5} />
              ) : (
                <Share2 size={18} strokeWidth={1.5} />
              )}
              {copied ? "Lien copie !" : "Partager le lien d'invitation"}
            </button>

            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${createdGroupId}`;
                navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success("Lien copie !");
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "transparent",
                border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                color: d ? T.textSecondary : T.textSecondaryL,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Copy size={16} strokeWidth={1.5} />
              Copier le lien
            </button>

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: d ? T.textTertiary : T.textTertiaryL,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
