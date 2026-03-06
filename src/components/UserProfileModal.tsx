"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreHorizontal, MessageCircle, Heart, UserPlus, UserCheck, MapPin, AlertTriangle, Users, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/stores/useTheme";
import { toast } from "sonner";

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onMessage?: (partnerId: string, partnerName: string, partnerAvatar: string | null) => void;
}

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

const CATEGORY_ICONS: Record<string, string> = {
  harcelement: "🚨",
  eclairage: "💡",
  insecurite: "⚠️",
  agressions: "🔴",
  vol: "👜",
  default: "📍",
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

export default function UserProfileModal({ userId, onClose, onMessage }: UserProfileModalProps) {
  const isDark = useTheme((s) => s.theme) === "dark";
  const C = isDark
    ? { bg: "#0F172A", card: "#1E293B", text: "#FFFFFF", sub: "#94A3B8", muted: "#64748B", border: "rgba(255,255,255,0.08)", teal: "#3BB4C1" }
    : { bg: "#FFFFFF", card: "#F8FAFC", text: "#0F172A", sub: "#475569", muted: "#94A3B8", border: "rgba(15,23,42,0.08)", teal: "#3BB4C1" };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [trajetsCount, setTrajetsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [inCircle, setInCircle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id ?? null;
      if (!cancelled) setCurrentUserId(myId);

      const [
        profileRes,
        followersRes,
        followingRes,
        trajetsRes,
        reportsRes,
        groupsRes,
        contribRes,
        isFollowingRes,
        circleRes,
      ] = await Promise.all([
        // 1. Profile
        supabase
          .from("profiles")
          .select("username, display_name, first_name, last_name, avatar_url, verified, city, created_at, bio, is_public")
          .eq("id", userId)
          .single(),
        // 2. Followers count
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId),
        // 3. Following count
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId),
        // 4. Trajets count
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        // 5. Reports count
        supabase
          .from("pins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        // 6. Groups
        supabase
          .from("community_members")
          .select("community_id, communities(id, name, avatar_emoji)")
          .eq("user_id", userId)
          .limit(8),
        // 7. Contributions
        supabase
          .from("pins")
          .select("id, category, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        // 8. Is following
        myId
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", myId)
              .eq("following_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // 9. In circle
        myId
          ? supabase
              .from("trusted_contacts")
              .select("id")
              .or(
                `and(user_id.eq.${myId},contact_id.eq.${userId}),and(user_id.eq.${userId},contact_id.eq.${myId})`
              )
              .eq("status", "accepted")
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      setProfile(profileRes.data as ProfileData | null);
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setTrajetsCount(trajetsRes.count ?? 0);
      setReportsCount(reportsRes.count ?? 0);

      // Groups — extract nested community data
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
      setInCircle(!!circleRes.data);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return;
    setFollowLoading(true);

    if (isFollowing && followId) {
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) {
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
        toast.error("Erreur");
      } else {
        setFollowId(null);
      }
    } else {
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      const { data, error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: userId })
        .select("id")
        .single();
      if (error) {
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
        if (error.code === "23505") {
          toast.info("Deja abonne");
        } else {
          toast.error("Erreur");
        }
      } else {
        setFollowId(data.id);
      }
    }
    setFollowLoading(false);
  };

  const handleMessage = () => {
    if (!profile || !onMessage) return;
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || profile.username || "Utilisateur";
    onMessage(userId, name, profile.avatar_url);
    onClose();
  };

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || profile.username || "Utilisateur"
    : "";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isOwnProfile = currentUserId === userId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          backgroundColor: C.bg,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.text, display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={22} />
          </motion.button>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {profile?.username ? `@${profile.username}` : "Profil"}
          </span>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center" }}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* ── CONTENT ───────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }} className="scrollbar-hidden">
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
              Chargement...
            </div>
          ) : !profile ? (
            <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>
              Profil introuvable
            </div>
          ) : (
            <>
              {/* ── AVATAR + NAME ───────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: profile.avatar_url ? "none" : "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      initials
                    )}
                  </div>
                  {profile.verified && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: -2,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#34D399",
                        border: `2px solid ${C.bg}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, textAlign: "center" }}>
                  {displayName}
                </div>

                {profile.bio && (
                  <div style={{ fontSize: 13, color: C.sub, textAlign: "center", marginTop: 4, maxWidth: 280 }}>
                    {profile.bio}
                  </div>
                )}

                <div style={{ fontSize: 12, color: C.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {profile.city && <span>{profile.city}</span>}
                  {profile.city && <span>·</span>}
                  <span>Membre depuis {formatMemberSince(profile.created_at)}</span>
                </div>
              </div>

              {/* ── STATS ROW ───────────────────────── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 32,
                  marginBottom: 20,
                  padding: "12px 0",
                }}
              >
                {[
                  { label: "Abonnes", value: followersCount, icon: <Users size={14} style={{ color: C.teal }} /> },
                  { label: "Abonnements", value: followingCount, icon: <UserPlus size={14} style={{ color: C.teal }} /> },
                  { label: "Trajets", value: trajetsCount, icon: <MapPin size={14} style={{ color: C.teal }} /> },
                  { label: "Signalements", value: reportsCount, icon: <AlertTriangle size={14} style={{ color: C.teal }} /> },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    {s.icon}
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{s.value}</span>
                    <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* ── ACTION BUTTONS ──────────────────── */}
              {!isOwnProfile && (
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {/* Follow / Unfollow */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFollow}
                    disabled={followLoading}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: isFollowing ? `1px solid ${C.border}` : "none",
                      background: isFollowing ? "transparent" : C.teal,
                      color: isFollowing ? C.text : "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: followLoading ? 0.6 : 1,
                    }}
                  >
                    {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                    {isFollowing ? "Abonne" : "Suivre"}
                  </motion.button>

                  {/* Message */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleMessage}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      background: "transparent",
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <MessageCircle size={15} />
                    Message
                  </motion.button>

                  {/* Circle indicator */}
                  {inCircle && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        border: `1px solid ${C.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      title="Dans votre cercle"
                    >
                      <Shield size={18} style={{ color: "#34D399" }} />
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── GROUPES ─────────────────────────── */}
              {groups.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                    Groupes ({groups.length})
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {groups.map((g) => (
                      <div
                        key={g.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 20,
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                          fontSize: 13,
                          color: C.text,
                        }}
                      >
                        <span>{g.avatar_emoji ?? "👥"}</span>
                        <span style={{ fontWeight: 500 }}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CONTRIBUTIONS ────────────────────── */}
              {contributions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                    Contributions recentes
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {contributions.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.02)",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {CATEGORY_ICONS[c.category] ?? CATEGORY_ICONS.default}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, textTransform: "capitalize" }}>
                            {c.category.replace(/_/g, " ")}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            {timeAgo(c.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PRIVATE PROFILE NOTICE ───────────── */}
              {!profile.is_public && !isOwnProfile && !inCircle && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: C.muted,
                    fontSize: 13,
                    borderTop: `1px solid ${C.border}`,
                    marginTop: 8,
                  }}
                >
                  🔒 Ce profil est prive
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
