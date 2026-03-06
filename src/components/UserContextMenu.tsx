"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/stores/useTheme";
import { useUiStore } from "@/stores/uiStore";
import { useStore } from "@/stores/useStore";
import { getOrCreateConversation } from "@/lib/dm";
import { toast } from "sonner";

export default function UserContextMenu() {
  const menuUser = useUiStore((s) => s.activeContextMenuUser);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openProfile = useUiStore((s) => s.openProfile);
  const setCommunityDefaultTab = useStore((s) => s.setCommunityDefaultTab);
  const isDark = useTheme((s) => s.theme) === "dark";

  const C = isDark
    ? { bg: "#1E293B", text: "#FFFFFF", sub: "#94A3B8", muted: "#64748B", border: "rgba(255,255,255,0.06)", chevron: "#475569" }
    : { bg: "#FFFFFF", text: "#0F172A", sub: "#64748B", muted: "#94A3B8", border: "rgba(15,23,42,0.06)", chevron: "#CBD5E1" };

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const userId = menuUser?.userId ?? "";
  const username = menuUser?.username ?? "";
  const city = menuUser?.city;
  const isVerified = menuUser?.isVerified;

  const initials = username
    .split(/[\s._-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  // Fetch initial states
  useEffect(() => {
    if (!menuUser) return;
    let cancelled = false;
    setIsFollowing(false);
    setFollowId(null);
    setInviteSent(false);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setCurrentUserId(user.id);

      const [followRes, inviteRes] = await Promise.all([
        supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", menuUser.userId).maybeSingle(),
        supabase.from("trusted_contacts").select("id").or(`and(user_id.eq.${user.id},contact_id.eq.${menuUser.userId}),and(user_id.eq.${menuUser.userId},contact_id.eq.${user.id})`).limit(1).maybeSingle(),
      ]);

      if (cancelled) return;
      setIsFollowing(!!followRes.data);
      setFollowId(followRes.data?.id ?? null);
      setInviteSent(!!inviteRes.data);
    })();
    return () => { cancelled = true; };
  }, [menuUser]);

  if (!menuUser) return null;

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return;
    setFollowLoading(true);

    if (isFollowing && followId) {
      setIsFollowing(false);
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) { setIsFollowing(true); toast.error("Erreur"); }
      else setFollowId(null);
    } else {
      setIsFollowing(true);
      const { data, error } = await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId }).select("id").single();
      if (error) { setIsFollowing(false); toast.error(error.code === "23505" ? "Deja abonne" : "Erreur"); }
      else setFollowId(data.id);
    }
    setFollowLoading(false);
  };

  const handleInviteCircle = async () => {
    if (!currentUserId || inviteLoading || inviteSent) return;
    setInviteLoading(true);

    const { error: tcErr } = await supabase.from("trusted_contacts").insert({
      user_id: currentUserId, contact_id: userId, contact_name: username, status: "pending",
    });

    if (tcErr) {
      if (tcErr.code === "23505") { toast.info("Invitation deja envoyee"); setInviteSent(true); }
      else toast.error("Erreur");
      setInviteLoading(false);
      return;
    }

    await supabase.from("circle_invitations").insert({ sender_id: currentUserId, receiver_id: userId });

    const { data: myProfile } = await supabase.from("profiles").select("display_name").eq("id", currentUserId).single();
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "circle_invitation",
      payload: { senderId: currentUserId, senderName: myProfile?.display_name ?? "Quelqu\u2019un" },
    });

    setInviteSent(true);
    toast.success("Invitation envoyee");
    setInviteLoading(false);
  };

  const handleOpenMessage = async () => {
    if (!currentUserId) return;
    try {
      await getOrCreateConversation(currentUserId, userId);
      setCommunityDefaultTab(3);
      closeContextMenu();
    } catch {
      toast.error("Erreur");
    }
  };

  const handleOpenProfile = () => {
    openProfile(userId);
    closeContextMenu();
  };

  const actions = [
    { emoji: "\uD83D\uDCAC", label: "Message", subtitle: "Ouvrir une conversation", onClick: handleOpenMessage },
    { emoji: isFollowing ? "\u2705" : "\u2795", label: isFollowing ? "Abonne\u00B7e \u2713" : "Suivre", subtitle: isFollowing ? "Ne plus suivre" : "Suivre cette personne", onClick: handleFollow, loading: followLoading },
    { emoji: "\uD83D\uDC64", label: "Voir le profil", subtitle: "Fiche publique complete", onClick: handleOpenProfile },
    { emoji: inviteSent ? "\uD83D\uDC9A" : "\uD83D\uDC9B", label: inviteSent ? "Invitation envoyee" : "Inviter dans mon cercle", subtitle: inviteSent ? "Demande deja envoyee" : "Demande de confiance", onClick: handleInviteCircle, loading: inviteLoading, disabled: inviteSent },
  ];

  return (
    <AnimatePresence>
      {menuUser && (
        <>
          <motion.div
            key="ctx-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeContextMenu}
            style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(0,0,0,0.4)" }}
          />
          <motion.div
            key="ctx-sheet"
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 191, background: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, boxShadow: "0 -10px 40px rgba(0,0,0,0.15)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)" }} />
            </div>

            {/* Mini profile */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 20px 14px" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #3BB4C1, #06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {initials}
                </div>
                {isVerified && (
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: "50%", background: "#34D399", border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#FFFFFF", fontWeight: 700 }}>
                    ✓
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</div>
                {city && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{city}</div>}
              </div>
            </div>

            <div style={{ height: 1, background: C.border, margin: "0 20px" }} />

            {/* Actions */}
            <div style={{ padding: "6px 0" }}>
              {actions.map((action, i) => (
                <div key={i}>
                  <button
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", background: "none", border: "none", cursor: action.disabled ? "default" : "pointer", opacity: action.disabled ? 0.5 : action.loading ? 0.6 : 1, textAlign: "left" }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{action.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{action.subtitle}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: C.chevron, flexShrink: 0 }} />
                  </button>
                  {i < actions.length - 1 && (
                    <div style={{ height: 1, background: C.border, margin: "0 20px 0 54px" }} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
