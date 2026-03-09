"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, MessageCircle, UserPlus, UserCheck, Heart, Pencil, Copy, Send, Mail, Share2, Shield, MapPin, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/stores/useTheme";
import { useUiStore } from "@/stores/uiStore";
import { bToast } from "@/components/GlobalToast";

interface ProfileData {
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  city: string | null;
  created_at: string;
  bio: string | null;
  is_public: boolean;
  visibility: Record<string, string> | null;
}

function canSeeField(
  level: string | undefined,
  isOwnProfile: boolean,
  viewerFollows: boolean,
  viewerInCircle: boolean,
): boolean {
  if (isOwnProfile) return true;
  if (!level || level === 'public') return true;
  if (level === 'followers') return viewerFollows || viewerInCircle;
  if (level === 'circle') return viewerInCircle;
  return false; // 'private'
}

interface GroupRow {
  id: string;
  name: string;
  avatar_emoji: string | null;
}

interface ContributionRow {
  id: string;
  category: string;
  created_at: string;
}

type CircleStatus = "none" | "pending" | "member";

const CATEGORY_ICONS: Record<string, string> = {
  harcelement: "\uD83D\uDEA8",
  eclairage: "\uD83D\uDCA1",
  insecurite: "\u26A0\uFE0F",
  agressions: "\uD83D\uDD34",
  vol: "\uD83D\uDC5C",
  default: "\uD83D\uDCCD",
};

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["jan.", "fev.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "a l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const PROFILE_KEYFRAMES = `
  @keyframes bv-profile-follow-glow { 0%,100%{box-shadow:0 2px 8px rgba(241,245,249,0.15);} 50%{box-shadow:0 4px 20px rgba(241,245,249,0.2), 0 0 0 4px rgba(255,255,255,0.04);} }
  @keyframes bv-profile-shimmer { 0%{left:-80%;} 65%,100%{left:140%;} }
  @keyframes bv-profile-msg-breathe { 0%,100%{box-shadow:0 0 0 0 rgba(59,180,193,0);} 50%{box-shadow:0 0 0 4px rgba(59,180,193,0.12);} }
  @keyframes bv-profile-share-breathe { 0%,100%{box-shadow:0 0 0 0 rgba(165,139,250,0);} 50%{box-shadow:0 0 0 4px rgba(165,139,250,0.12);} }
  @keyframes bv-profile-chip-pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.65);} }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserProfileModal() {
  const userId = useUiStore((s) => s.activeProfileUserId);
  const closeProfile = useUiStore((s) => s.closeProfile);
  const setOpenMyProfile = useUiStore((s) => s.setOpenMyProfile);
  const openCommunityDM = useUiStore((s) => s.openCommunityDM);
  const isDark = useTheme((s) => s.theme) === "dark";

  const C = isDark
    ? {
        bg: "#0F172A", card: "#1E293B", elev: "#283548",
        inputBg: "rgba(255,255,255,0.06)",
        text: "#FFFFFF", sub: "#94A3B8", muted: "#64748B",
        border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.20)",
        teal: "#3BB4C1", gold: "#F5C341",
        statBg: "rgba(255,255,255,0.04)", statBorder: "rgba(255,255,255,0.07)",
        primaryBtnBg: "#F1F5F9", primaryBtnColor: "#0F172A",
        secBtnBg: "rgba(255,255,255,0.07)", secBtnBorder: "rgba(255,255,255,0.12)",
        secBtnStroke: "rgba(255,255,255,0.7)",
        backdropBg: "rgba(10,16,30,0.55)",
        modalShadow: "0 -12px 48px rgba(0,0,0,0.4)",
        chipTealBg: "rgba(59,180,193,0.12)", chipTealBorder: "rgba(59,180,193,0.24)",
        chipGoldBg: "rgba(245,195,65,0.12)", chipGoldBorder: "rgba(245,195,65,0.30)",
        chipGreenBg: "rgba(52,211,153,0.12)", chipGreenBorder: "rgba(52,211,153,0.30)",
      }
    : {
        bg: "#FFFFFF", card: "#FFFFFF", elev: "#F1F5F9",
        inputBg: "rgba(15,23,42,0.04)",
        text: "#0F172A", sub: "#94A3B8", muted: "#94A3B8",
        border: "rgba(15,23,42,0.08)", borderStrong: "rgba(15,23,42,0.18)",
        teal: "#3BB4C1", gold: "#F5C341",
        statBg: "#F8FAFC", statBorder: "rgba(15,23,42,0.07)",
        primaryBtnBg: "#0F172A", primaryBtnColor: "#FFFFFF",
        secBtnBg: "#F1F5F9", secBtnBorder: "rgba(15,23,42,0.08)",
        secBtnStroke: "rgba(15,23,42,0.6)",
        backdropBg: "rgba(180,195,215,0.45)",
        modalShadow: "0 -12px 48px rgba(15,23,42,0.12)",
        chipTealBg: "rgba(59,180,193,0.12)", chipTealBorder: "rgba(59,180,193,0.24)",
        chipGoldBg: "rgba(245,195,65,0.12)", chipGoldBorder: "rgba(245,195,65,0.30)",
        chipGreenBg: "rgba(52,211,153,0.12)", chipGreenBorder: "rgba(52,211,153,0.30)",
      };

  const [snapPoint, setSnapPoint] = useState<"peek" | "expanded">("peek");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [circleStatus, setCircleStatus] = useState<CircleStatus>("none");
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [wh, setWh] = useState(typeof window !== "undefined" ? window.innerHeight : 800);

  useEffect(() => {
    const onResize = () => setWh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset snap when opening
  useEffect(() => {
    if (userId) { setSnapPoint("peek"); setShowShare(false); }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id ?? null;
      if (!cancelled) setCurrentUserId(myId);

      const [
        profileRes, followersRes, followingRes, reportsRes,
        circleCountRes, groupsRes, contribRes, isFollowingRes,
        circleAcceptedRes, circlePendingRes,
      ] = await Promise.all([
        supabase.from("profiles").select("username, display_name, first_name, last_name, avatar_url, verified, city, created_at, bio, is_public, visibility").eq("id", userId).single(),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("pins").select("id", { count: "exact", head: true }).eq("user_id", userId),
        // Circle count: accepted invitations for this user
        supabase.from("circle_invitations").select("id", { count: "exact", head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted"),
        supabase.from("community_members").select("community_id, communities(id, name, avatar_emoji)").eq("user_id", userId).limit(8),
        supabase.from("pins").select("id, category, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        myId ? supabase.from("follows").select("id").eq("follower_id", myId).eq("following_id", userId).maybeSingle() : Promise.resolve({ data: null }),
        // Circle: accepted
        myId ? supabase.from("trusted_contacts").select("id").or(`and(user_id.eq.${myId},contact_id.eq.${userId}),and(user_id.eq.${userId},contact_id.eq.${myId})`).eq("status", "accepted").maybeSingle() : Promise.resolve({ data: null }),
        // Circle: pending
        myId ? supabase.from("circle_invitations").select("id").eq("sender_id", myId).eq("receiver_id", userId).eq("status", "pending").maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      setProfile(profileRes.data as ProfileData | null);
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setReportsCount(reportsRes.count ?? 0);
      setCircleCount(circleCountRes.count ?? 0);

      const grpRows = (groupsRes.data || [])
        .map((m: Record<string, unknown>) => {
          const c = m.communities as Record<string, unknown> | null;
          if (!c) return null;
          return { id: c.id as string, name: c.name as string, avatar_emoji: (c.avatar_emoji as string) ?? null };
        })
        .filter(Boolean) as GroupRow[];
      setGroups(grpRows);

      setContributions((contribRes.data || []) as ContributionRow[]);
      setIsFollowing(!!isFollowingRes.data);
      setFollowId((isFollowingRes.data as { id: string } | null)?.id ?? null);

      if (circleAcceptedRes.data) setCircleStatus("member");
      else if (circlePendingRes.data) setCircleStatus("pending");
      else setCircleStatus("none");

      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleFollow = useCallback(async () => {
    if (!currentUserId || !userId || followLoading) return;
    setFollowLoading(true);

    if (isFollowing && followId) {
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) { setIsFollowing(true); setFollowersCount((c) => c + 1); bToast.danger({ title: "Erreur" }, isDark); }
      else setFollowId(null);
    } else {
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      const { data, error } = await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId }).select("id").single();
      if (error) { setIsFollowing(false); setFollowersCount((c) => Math.max(0, c - 1)); bToast.danger({ title: error.code === "23505" ? "Deja abonne" : "Erreur" }, isDark); }
      else setFollowId(data.id);
    }
    setFollowLoading(false);
  }, [currentUserId, userId, followLoading, isFollowing, followId, isDark]);

  const handleMessage = useCallback(() => {
    if (!currentUserId || !userId) return;
    const userName = profile?.display_name || profile?.username || 'Utilisateur';
    openCommunityDM({ userId, userName });
    closeProfile();
  }, [currentUserId, userId, profile, openCommunityDM, closeProfile]);

  const handleCircleInvite = useCallback(async () => {
    if (!currentUserId || !userId || circleStatus !== "none") return;
    try {
      const { error: invErr } = await supabase.from("circle_invitations").insert({
        sender_id: currentUserId,
        receiver_id: userId,
        status: "pending",
      });
      if (invErr) throw invErr;

      await supabase.from("trusted_contacts").insert({
        user_id: currentUserId,
        contact_id: userId,
        contact_name: profile?.display_name ?? profile?.first_name ?? profile?.username ?? "Contact",
        status: "pending",
      });

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "circle_invite",
        title: "Invitation cercle",
        body: `${profile?.display_name ?? profile?.username ?? "Quelqu'un"} vous invite dans son cercle`,
        data: { sender_id: currentUserId },
      });

      setCircleStatus("pending");
      bToast.success({ title: "Invitation envoyee" }, isDark);
    } catch {
      bToast.danger({ title: "Erreur" }, isDark);
    }
  }, [currentUserId, userId, circleStatus, profile, isDark]);

  if (!userId) return null;

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || profile.username || "Utilisateur"
    : "";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const isOwnProfile = currentUserId === userId;

  const peekH = wh * 0.5;
  const expandedH = wh * 0.86;
  const sheetH = snapPoint === "peek" ? peekH : expandedH;

  return (
    <AnimatePresence>
      {userId && (
        <>
          <style>{PROFILE_KEYFRAMES}</style>

          {/* BACKDROP — blur overlay */}
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeProfile}
            style={{
              position: "fixed", inset: 0, zIndex: 199,
              background: C.backdropBg,
              backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            }}
          />

          {/* SHEET */}
          <motion.div
            key="profile-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0, height: sheetH }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", bottom: 64, left: 0, right: 0,
              zIndex: 200,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              background: C.card,
              borderTop: `1px solid ${C.border}`,
              boxShadow: C.modalShadow,
              display: "flex", flexDirection: "column",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
          >
            {/* HANDLE */}
            <div
              onClick={() => setSnapPoint((p) => p === "peek" ? "expanded" : "peek")}
              style={{
                display: "flex", justifyContent: "center", cursor: "pointer",
                paddingTop: 12, paddingBottom: 0,
              }}
            >
              <div style={{
                width: 36, height: 4, borderRadius: 99,
                background: C.borderStrong,
              }} />
            </div>

            {/* HEADER */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px 0",
            }}>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={closeProfile}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: C.inputBg, border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.muted, flexShrink: 0, padding: 0,
                }}
              >
                <X size={11} strokeWidth={2.5} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowShare((v) => !v)}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: C.inputBg, border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.muted, flexShrink: 0, padding: 0,
                }}
              >
                <MoreHorizontal size={13} />
              </motion.button>
            </div>

            {/* SHARE SHEET */}
            <AnimatePresence>
              {showShare && (
                <>
                  <motion.div
                    key="share-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowShare(false)}
                    style={{
                      position: "absolute", inset: 0, zIndex: 10,
                      background: "rgba(0,0,0,0.25)", borderTopLeftRadius: 28, borderTopRightRadius: 28,
                    }}
                  />
                  <motion.div
                    key="share-menu"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", top: 50, right: 16, zIndex: 11,
                      background: C.bg, borderRadius: 14,
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                      padding: "6px 0", minWidth: 220,
                    }}
                  >
                    {[
                      {
                        icon: <Copy size={16} />, label: "Copier le lien",
                        action: () => {
                          const url = `${window.location.origin}/profil/@${profile?.username ?? userId}`;
                          navigator.clipboard.writeText(url).then(() => bToast.success({ title: "Lien copie !" }, isDark)).catch(() => bToast.danger({ title: "Erreur" }, isDark));
                        },
                      },
                      {
                        icon: <Share2 size={16} />, label: "WhatsApp",
                        action: () => {
                          const url = `${window.location.origin}/profil/@${profile?.username ?? userId}`;
                          const text = `Decouvre le profil de ${displayName} sur Breveil ! ${url}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        },
                      },
                      {
                        icon: <Send size={16} />, label: "Telegram",
                        action: () => {
                          const url = `${window.location.origin}/profil/@${profile?.username ?? userId}`;
                          const text = `Decouvre le profil de ${displayName} sur Breveil !`;
                          window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
                        },
                      },
                      {
                        icon: <Mail size={16} />, label: "Email",
                        action: () => {
                          const url = `${window.location.origin}/profil/@${profile?.username ?? userId}`;
                          const subject = `Profil de ${displayName} sur Breveil`;
                          const body = `Decouvre le profil de ${displayName} sur Breveil !\n${url}`;
                          window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                        },
                      },
                      {
                        icon: <MessageCircle size={16} />, label: "Envoyer par message",
                        action: () => { handleMessage(); },
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { item.action(); setShowShare(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "10px 16px",
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 500, color: C.text,
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = C.inputBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        <span style={{ color: C.muted, display: "flex", alignItems: "center" }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* SCROLLABLE CONTENT */}
            <div
              style={{
                flex: 1,
                overflow: snapPoint === "expanded" ? "auto" : "hidden",
                padding: "0 18px",
              }}
              className="scrollbar-hidden"
            >
              {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>Chargement...</div>
              ) : !profile ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>Profil introuvable</div>
              ) : (
                <>
                  {/* === PROFILE SECTION — horizontal layout (mockup) === */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0 0" }}>
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 68, height: 68, borderRadius: "50%",
                        background: profile.avatar_url ? "none" : "linear-gradient(135deg, #3BB4C1 0%, #1E3A5F 60%, #4A2C5A 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 26, fontWeight: 800, color: "#FFFFFF", overflow: "hidden",
                        border: "3px solid rgba(255,255,255,0.15)",
                      }}>
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : initials}
                      </div>
                      {profile.verified && (
                        <div style={{
                          position: "absolute", bottom: -1, right: -2,
                          width: 20, height: 20, borderRadius: "50%",
                          background: C.gold, border: `2px solid ${C.card}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: "#0F172A", fontWeight: 800,
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    {/* Name + username + city */}
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3, color: C.text }}>{displayName}</div>
                      {profile.username && (
                        <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2, color: C.sub }}>@{profile.username}</div>
                      )}
                      {profile.city && canSeeField(profile.visibility?.city, isOwnProfile, isFollowing, circleStatus === "member") && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <MapPin size={10} strokeWidth={2} color={C.sub} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>{profile.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STATS — separate rounded boxes */}
                  <div style={{ display: "flex", gap: 8, padding: "14px 0 0" }}>
                    {[
                      { label: "Signalements", value: reportsCount },
                      { label: "Followers", value: followersCount },
                      { label: "Following", value: followingCount },
                    ].map((s) => (
                      <motion.div
                        key={s.label}
                        whileHover={{ scale: 1.04 }}
                        style={{
                          flex: 1, padding: "10px 8px", borderRadius: 14, textAlign: "center",
                          background: C.statBg, border: `1px solid ${C.statBorder}`,
                        }}
                      >
                        <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: C.text }}>{s.value}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 3, color: C.muted }}>{s.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* BIO */}
                  {profile.bio && canSeeField(profile.visibility?.bio, isOwnProfile, isFollowing, circleStatus === "member") && (
                    <div style={{ padding: "12px 0 0", fontSize: 12, lineHeight: 1.55, color: isDark ? "#94A3B8" : "#475569" }}>
                      {profile.bio}
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  {!isOwnProfile && (
                    <div style={{ padding: "14px 0 0" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {/* Follow — shimmer + glow */}
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={handleFollow}
                          disabled={followLoading}
                          style={{
                            flex: 1, height: 40, borderRadius: 12,
                            border: isFollowing ? `1px solid rgba(59,180,193,0.3)` : "none",
                            background: isFollowing ? "rgba(59,180,193,0.15)" : C.primaryBtnBg,
                            color: isFollowing ? C.teal : C.primaryBtnColor,
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            opacity: followLoading ? 0.6 : 1,
                            position: "relative", overflow: "hidden",
                            animation: isFollowing ? "none" : "bv-profile-follow-glow 3s ease-in-out infinite",
                          }}
                        >
                          {/* Shimmer overlay */}
                          {!isFollowing && (
                            <div style={{
                              position: "absolute", top: 0, left: "-80%", width: "55%", height: "100%",
                              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
                              animation: "bv-profile-shimmer 3.5s ease-in-out infinite",
                              pointerEvents: "none",
                            }} />
                          )}
                          {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                          {isFollowing ? "Suivi \u2713" : "Suivre"}
                        </motion.button>

                        {/* Message — breathe glow */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={handleMessage}
                          style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            border: `1px solid ${C.secBtnBorder}`,
                            background: C.secBtnBg, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0,
                            animation: "bv-profile-msg-breathe 4s ease-in-out infinite",
                          }}
                        >
                          <MessageCircle size={16} strokeWidth={2} color={C.secBtnStroke} />
                        </motion.button>

                        {/* Share — breathe glow purple */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setShowShare((v) => !v)}
                          style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            border: `1px solid ${C.secBtnBorder}`,
                            background: C.secBtnBg, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0,
                            animation: "bv-profile-share-breathe 4s ease-in-out infinite 1.3s",
                          }}
                        >
                          <Share2 size={16} strokeWidth={2} color={C.secBtnStroke} />
                        </motion.button>
                      </div>

                      {/* Circle status label */}
                      {circleStatus === "pending" && (
                        <div style={{ fontSize: 11, color: C.gold, textAlign: "center", marginTop: 6 }}>
                          Invitation envoyee · En attente
                        </div>
                      )}
                      {circleStatus === "member" && (
                        <div style={{ fontSize: 11, color: C.gold, textAlign: "center", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Heart size={11} fill={C.gold} color={C.gold} />
                          Dans ton cercle
                        </div>
                      )}
                    </div>
                  )}

                  {/* Own profile edit */}
                  {isOwnProfile && (
                    <div style={{ padding: "14px 0 0" }}>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { closeProfile(); setOpenMyProfile(true); }}
                        style={{
                          width: "100%", height: 40, borderRadius: 12,
                          border: `1px solid ${C.border}`, background: "transparent",
                          color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        }}
                      >
                        <Pencil size={13} />
                        Modifier mon profil
                      </motion.button>
                    </div>
                  )}

                  {/* CONTRIBUTION CHIPS */}
                  <div style={{ padding: "14px 0 0" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                      Contributions
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {/* Reports chip */}
                      <div style={{
                        padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        display: "flex", alignItems: "center", gap: 5,
                        background: C.chipTealBg, border: `1px solid ${C.chipTealBorder}`, color: C.teal,
                      }}>
                        <Shield size={10} strokeWidth={2.5} color={C.teal} />
                        {reportsCount} signalements
                      </div>
                      {/* Verified chip */}
                      {profile.verified && (
                        <div style={{
                          padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 5,
                          background: C.chipGoldBg, border: `1px solid ${C.chipGoldBorder}`, color: isDark ? "#F5C341" : "#B45309",
                        }}>
                          <Star size={10} strokeWidth={2.5} color={isDark ? "#F5C341" : "#B45309"} />
                          Verifiee
                        </div>
                      )}
                      {/* Circle chip */}
                      {(profile.is_public || circleStatus === "member") && (
                        <div style={{
                          padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 5,
                          background: C.chipGreenBg, border: `1px solid ${C.chipGreenBorder}`, color: isDark ? "#34D399" : "#059669",
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%", background: "currentColor",
                            animation: "bv-profile-chip-pulse 2s ease-in-out infinite",
                          }} />
                          Cercle actif
                        </div>
                      )}
                    </div>
                  </div>

                  {/* === EXPANDED CONTENT === */}

                  {/* Divider */}
                  <div style={{ height: 1, background: C.border, margin: "14px 0 0" }} />

                  {/* Member since */}
                  <div style={{ textAlign: "center", padding: "12px 0 0", fontSize: 10, color: C.muted }}>
                    Membre depuis {formatMemberSince(profile.created_at)}
                  </div>

                  {/* GROUPS */}
                  {groups.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                        Groupes ({groups.length})
                      </h4>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="scrollbar-hidden">
                        {groups.map((g) => (
                          <div key={g.id} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
                            background: C.inputBg, fontSize: 12, color: C.text, flexShrink: 0,
                          }}>
                            <span>{g.avatar_emoji ?? "\uD83D\uDC65"}</span>
                            <span style={{ fontWeight: 500 }}>{g.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CONTRIBUTIONS LIST */}
                  {contributions.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                        Contributions recentes
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {contributions.map((c, i) => (
                          <div key={c.id}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "9px 0",
                            }}>
                              <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[c.category] ?? CATEGORY_ICONS.default}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, textTransform: "capitalize" }}>{c.category.replace(/_/g, " ")}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{timeAgo(c.created_at)}</div>
                              </div>
                            </div>
                            {i < contributions.length - 1 && (
                              <div style={{ height: 1, background: C.border }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PRIVATE NOTICE */}
                  {!profile.is_public && !isOwnProfile && circleStatus !== "member" && (
                    <div style={{ textAlign: "center", padding: "20px 16px", color: C.muted, fontSize: 13, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                      Ce profil est prive
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
