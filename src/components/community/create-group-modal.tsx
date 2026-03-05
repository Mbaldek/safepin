"use client";

import { motion } from "framer-motion";
import {
  X,
  Globe,
  Lock,
  Share2,
  Copy,
  Check,
  Loader2,
  Camera,
  Search,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { T, springConfig } from "@/lib/tokens";
import { toast } from "sonner";

const SPRING = springConfig;

/* ─── Emoji categories ─── */
const EMOJI_CATEGORIES = [
  {
    label: "Populaire",
    emojis: [
      "👥","🏃","🌙","👶","🎓","💪",
      "🏘️","🎨","🌳","🔒","💼","🎶",
    ],
  },
  {
    label: "Personnes",
    emojis: [
      "👨‍👩‍👧","👩‍👧","👫","🧑‍🤝‍🧑","🧕","👩‍🎓",
      "👷","🧑‍💻","🏋️","🚴","🧘","🤝",
    ],
  },
  {
    label: "Activites",
    emojis: [
      "⚽","🎭","🎮","📚","🎵","🎬",
      "🏊","🧗","🎯","🎲","🎤","📷",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌸","🌻","🍀","🌊","⛰️","🌅",
      "🐾","🦋","🌈","☀️","🌙","⭐",
    ],
  },
  {
    label: "Lieux",
    emojis: [
      "🏠","🏫","🏥","🏢","🏖️","🏕️",
      "🛕","🏟️","🏪","🌆","🗺️","📍",
    ],
  },
  {
    label: "Objets",
    emojis: [
      "🛡️","💡","🔑","📱","🚗","🚲",
      "✈️","🎒","☕","🍕","🎁","💐",
    ],
  },
  {
    label: "Symboles",
    emojis: [
      "❤️","💛","💚","💙","💜","🤍",
      "✨","🔥","💎","🕊️","☮️","♾️",
    ],
  },
];

/* ─── Types ─── */
interface CreateGroupModalProps {
  isDark: boolean;
  userId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "form" | "invite" | "success";

interface ContactForInvite {
  id: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
}

/* ─── Component ─── */
export default function CreateGroupModal({
  isDark,
  userId,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const d = isDark;

  /* Form state */
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Photo upload state */
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Invite state */
  const [cercleContacts, setCercleContacts] = useState<ContactForInvite[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [inviteSearch, setInviteSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [inviting, setInviting] = useState(false);

  /* Cleanup preview URL on unmount */
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  /* Fetch cercle contacts when entering invite step */
  useEffect(() => {
    if (step !== "invite" || !userId) return;
    setLoadingContacts(true);

    (async () => {
      const [{ data: myContacts }, { data: reverseContacts }] =
        await Promise.all([
          supabase
            .from("trusted_contacts")
            .select("contact_id, contact_name")
            .eq("user_id", userId)
            .eq("status", "accepted"),
          supabase
            .from("trusted_contacts")
            .select("user_id")
            .eq("contact_id", userId)
            .eq("status", "accepted"),
        ]);

      const contactIds = [
        ...(myContacts || []).map((c) => c.contact_id),
        ...(reverseContacts || []).map((c) => c.user_id),
      ].filter(Boolean);

      const uniqueIds = [...new Set(contactIds)];

      if (uniqueIds.length === 0) {
        setCercleContacts([]);
        setLoadingContacts(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", uniqueIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      setCercleContacts(
        uniqueIds.map((id) => {
          const p = profileMap.get(id);
          const n = p?.display_name || "Contact";
          return {
            id,
            name: n,
            avatar: n.charAt(0).toUpperCase(),
            avatarUrl: p?.avatar_url || null,
          };
        })
      );
      setLoadingContacts(false);
    })();
  }, [step, userId]);

  /* ─── Handlers ─── */

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier invalide — image uniquement");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde — 5 Mo maximum");
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function removePhoto() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
  }

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

    const communityId = data.id;

    /* Upload photo if selected */
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `communities/${communityId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("community-avatars")
        .upload(path, avatarFile, { upsert: true });

      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("community-avatars")
          .getPublicUrl(path);
        const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

        await supabase
          .from("communities")
          .update({ avatar_url: avatarUrl })
          .eq("id", communityId);

        setUploadedAvatarUrl(avatarUrl);
      }
    }

    /* Add creator as member */
    await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
    });

    setCreatedGroupId(communityId);
    setStep("invite");
    setCreating(false);
    onCreated();
  };

  const handleInvite = async () => {
    if (selectedContacts.size === 0 || !createdGroupId) return;
    setInviting(true);

    const rows = Array.from(selectedContacts).map((contactId) => ({
      community_id: createdGroupId,
      user_id: contactId,
    }));

    const { error } = await supabase.from("community_members").insert(rows);

    if (error) {
      toast.error("Erreur lors de l'invitation");
    } else {
      toast.success(
        `${selectedContacts.size} membre${selectedContacts.size > 1 ? "s" : ""} invite${selectedContacts.size > 1 ? "s" : ""} !`
      );
    }

    setInviting(false);
    setStep("success");
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  /* ─── Filtered invite contacts ─── */
  const q = inviteSearch.toLowerCase();
  const filteredContacts = cercleContacts.filter(
    (c) => !q || c.name.toLowerCase().includes(q)
  );

  /* ─── Shared styles ─── */
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: d ? T.textTertiary : T.textTertiaryL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    display: "block",
  };

  /* ─── Group avatar display helper ─── */
  const renderGroupAvatar = (size: number) => {
    if (avatarPreview || uploadedAvatarUrl) {
      return (
        <img
          src={avatarPreview || uploadedAvatarUrl || ""}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      );
    }
    return <span style={{ fontSize: size * 0.45 }}>{emoji}</span>;
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

        {/* ═══════════════ FORM STEP ═══════════════ */}
        {step === "form" && (
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
                <X size={18} strokeWidth={1.5} color={d ? T.textPrimary : T.textPrimaryL} />
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
                  backgroundColor: !name.trim()
                    ? d ? T.surfaceElevated : "#E2E8F0"
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

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* ─── Photo upload ─── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      border: `2px dashed ${d ? T.borderDefault : T.borderDefaultL}`,
                      background: avatarPreview
                        ? "transparent"
                        : `linear-gradient(135deg, ${T.gradientStart}, #06B6D4)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      overflow: "hidden",
                      padding: 0,
                    }}
                  >
                    {renderGroupAvatar(80)}
                  </button>
                  {/* Camera badge */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: T.gradientStart,
                      border: `2px solid ${d ? T.surfaceBase : T.surfaceBaseL}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={14} strokeWidth={1.5} color="#FFFFFF" />
                  </div>
                  {/* Remove photo button */}
                  {avatarPreview && (
                    <div
                      onClick={removePhoto}
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        backgroundColor: T.semanticDanger,
                        border: `2px solid ${d ? T.surfaceBase : T.surfaceBaseL}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <X size={12} strokeWidth={2} color="#FFFFFF" />
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: d ? T.textTertiary : T.textTertiaryL,
                    marginTop: 8,
                  }}
                >
                  {avatarPreview ? "Photo selectionnee" : "Ajouter une photo"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {/* ─── Emoji picker (categorized) ─── */}
              <label style={labelStyle}>
                {avatarPreview ? "Ou choisir une icone" : "Icone"}
              </label>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  marginBottom: 20,
                  borderRadius: T.radiusMd,
                  border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                  padding: "8px 8px 4px",
                }}
              >
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.label} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: d ? T.textTertiary : T.textTertiaryL,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        padding: "4px 0",
                        position: "sticky",
                        top: 0,
                        backgroundColor: d ? T.surfaceBase : T.surfaceBaseL,
                        zIndex: 1,
                      }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {cat.emojis.map((e) => (
                        <button
                          key={cat.label + e}
                          onClick={() => {
                            setEmoji(e);
                            if (avatarPreview) removePhoto();
                          }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            border:
                              emoji === e && !avatarPreview
                                ? `2px solid ${T.gradientStart}`
                                : `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                            backgroundColor:
                              emoji === e && !avatarPreview
                                ? "rgba(59,180,193,0.1)"
                                : d
                                ? T.interactiveHover
                                : T.interactiveHoverL,
                            fontSize: 18,
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
                  </div>
                ))}
              </div>

              {/* ─── Name ─── */}
              <label style={labelStyle}>Nom du groupe</label>
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

              {/* ─── Description ─── */}
              <label style={labelStyle}>Description (optionnel)</label>
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

              {/* ─── Public / Private toggle ─── */}
              <label style={labelStyle}>Visibilite</label>
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
        )}

        {/* ═══════════════ INVITE STEP ═══════════════ */}
        {step === "invite" && (
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus
                  size={20}
                  strokeWidth={1.5}
                  color={T.gradientStart}
                />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: d ? T.textPrimary : T.textPrimaryL,
                  }}
                >
                  Inviter des membres
                </span>
              </div>
              <button
                onClick={() => setStep("success")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                  color: d ? T.textSecondary : T.textSecondaryL,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Passer
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Search */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  backgroundColor: d ? T.surfaceCard : T.surfaceCardL,
                  borderRadius: T.radiusMd,
                  border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                  marginBottom: 16,
                }}
              >
                <Search
                  size={16}
                  strokeWidth={1.5}
                  color={d ? T.textTertiary : T.textTertiaryL}
                />
                <input
                  type="text"
                  placeholder="Rechercher un contact..."
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    fontSize: 14,
                    color: d ? T.textPrimary : T.textPrimaryL,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <label style={labelStyle}>Mon Cercle</label>

              {loadingContacts ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 32,
                    color: d ? T.textTertiary : T.textTertiaryL,
                    fontSize: 13,
                  }}
                >
                  Chargement…
                </div>
              ) : cercleContacts.length === 0 ? (
                /* Empty cercle state */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "32px 0",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 32 }}>💛</span>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: d ? T.textSecondary : T.textSecondaryL,
                    }}
                  >
                    Aucun contact dans votre cercle
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: d ? T.textTertiary : T.textTertiaryL,
                      textAlign: "center",
                    }}
                  >
                    Ajoutez des contacts de confiance pour les inviter
                  </p>
                  <button
                    onClick={() => setStep("success")}
                    style={{
                      marginTop: 12,
                      padding: "10px 24px",
                      borderRadius: 10,
                      backgroundColor: T.gradientStart,
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Continuer
                  </button>
                </div>
              ) : (
                /* Contact list */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {filteredContacts.map((contact) => {
                    const sel = selectedContacts.has(contact.id);
                    return (
                      <motion.button
                        key={contact.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleContact(contact.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: sel
                            ? `2px solid ${T.gradientStart}`
                            : `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                          backgroundColor: sel
                            ? "rgba(59,180,193,0.08)"
                            : d
                            ? T.surfaceCard
                            : T.surfaceCardL,
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${T.gradientStart}, #06B6D4)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#FFFFFF",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {contact.avatarUrl ? (
                            <img
                              src={contact.avatarUrl}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            contact.avatar
                          )}
                        </div>
                        {/* Name */}
                        <span
                          style={{
                            flex: 1,
                            fontSize: 15,
                            fontWeight: 500,
                            color: d ? T.textPrimary : T.textPrimaryL,
                          }}
                        >
                          {contact.name}
                        </span>
                        {/* Checkbox */}
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            border: sel
                              ? "none"
                              : `2px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                            backgroundColor: sel ? T.gradientStart : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {sel && (
                            <Check size={14} strokeWidth={2.5} color="#FFFFFF" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            {cercleContacts.length > 0 && (
              <div style={{ padding: "12px 20px 20px" }}>
                <button
                  onClick={handleInvite}
                  disabled={selectedContacts.size === 0 || inviting}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 12,
                    backgroundColor:
                      selectedContacts.size === 0
                        ? d
                          ? T.surfaceElevated
                          : "#E2E8F0"
                        : T.gradientStart,
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor:
                      selectedContacts.size === 0 ? "default" : "pointer",
                    opacity: inviting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {inviting ? (
                    <Loader2
                      size={16}
                      strokeWidth={1.5}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <ArrowRight size={16} strokeWidth={1.5} />
                  )}
                  {inviting
                    ? "Invitation..."
                    : selectedContacts.size > 0
                    ? `Inviter (${selectedContacts.size})`
                    : "Selectionner des contacts"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ SUCCESS STEP ═══════════════ */}
        {step === "success" && (
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
              <Check size={28} strokeWidth={2} color={T.semanticSuccess} />
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {uploadedAvatarUrl ? (
                  <img
                    src={uploadedAvatarUrl}
                    alt=""
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span>{emoji}</span>
                )}
                {name}
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
