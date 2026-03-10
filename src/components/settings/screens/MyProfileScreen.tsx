"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Search, UserCheck, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/stores/useTheme";
import { useStore } from "@/stores/useStore";
import { useUiStore } from "@/stores/uiStore";
import { bToast } from "@/components/GlobalToast";
import { getStreakEmoji } from "@/lib/streaks";
import SettingsToggle from "../components/SettingsToggle";
import AddCircleContactModal from "@/components/community/AddCircleContactModal";
import VisibilityScreen from "./compte/VisibilityScreen";
import type { AccountData } from "./compte/types";

// ── Types ──

interface ProfileFields {
  username: string;
  display_name: string;
  city: string;
  bio: string;
  avatar_url: string | null;
  is_public: boolean;
}

interface FollowUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  verified: boolean;
}

interface CircleMember {
  invitationId: string;
  userId: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: "accepted" | "pending";
}

type Tab = "profil" | "abonnes" | "abonnements" | "cercle";

// ── Colors ──

function getColors(isDark: boolean) {
  return isDark
    ? {
        bg: "#0F172A", card: "#1E293B", inputBg: "rgba(255,255,255,0.06)",
        t1: "#FFFFFF", t2: "#94A3B8", t3: "#64748B",
        border: "rgba(255,255,255,0.08)", teal: "#3BB4C1",
        gold: "#F5C341", success: "#34D399",
      }
    : {
        bg: "#FFFFFF", card: "#F8FAFC", inputBg: "rgba(15,23,42,0.04)",
        t1: "#0F172A", t2: "#475569", t3: "#94A3B8",
        border: "rgba(15,23,42,0.08)", teal: "#3BB4C1",
        gold: "#F5C341", success: "#34D399",
      };
}

// ── Component ──

interface MyProfileScreenProps {
  onClose: () => void;
}

export default function MyProfileScreen({ onClose }: MyProfileScreenProps) {
  const isDark = useTheme((s) => s.theme) === "dark";
  const C = getColors(isDark);
  const userId = useStore((s) => s.userId);
  const openProfile = useUiStore((s) => s.openProfile);

  const [tab, setTab] = useState<Tab>("profil");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subScreen, setSubScreen] = useState<"visibility" | null>(null);
  const [visibility, setVisibility] = useState<AccountData["visibility"]>({
    username: "public", city: "public", country: "private", birthDate: "private",
  });

  // Profile fields
  const [fields, setFields] = useState<ProfileFields>({
    username: "", display_name: "", city: "", bio: "",
    avatar_url: null, is_public: true,
  });
  const [dirty, setDirty] = useState(false);

  // Stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);

  // Followers tab
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followersSearch, setFollowersSearch] = useState("");
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());

  // Following tab
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followingSearch, setFollowingSearch] = useState("");
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [unfollowConfirm, setUnfollowConfirm] = useState<string | null>(null);

  // Circle tab
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [circleLoaded, setCircleLoaded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showAddCircle, setShowAddCircle] = useState(false);

  // Streak + contributions
  const [streakData, setStreakData] = useState({
    currentStreak: 0, longestStreak: 0, lastActiveDate: null as string | null,
    pinCount: 0, voteCount: 0, commentCount: 0, escortCount: 0,
  });

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load profile ──
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [profileRes, followersRes, followingRes, circleRes] = await Promise.all([
        supabase.from("profiles").select("username, display_name, city, bio, avatar_url, is_public, current_streak, longest_streak, last_active_date, pin_count, vote_count, comment_count, escort_count, visibility").eq("id", userId).single(),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("circle_invitations").select("id", { count: "exact", head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted"),
      ]);
      if (profileRes.data) {
        const p = profileRes.data;
        setFields({
          username: p.username ?? "",
          display_name: p.display_name ?? "",
          city: p.city ?? "",
          bio: p.bio ?? "",
          avatar_url: p.avatar_url ?? null,
          is_public: p.is_public ?? true,
        });
        setStreakData({
          currentStreak: p.current_streak ?? 0,
          longestStreak: p.longest_streak ?? 0,
          lastActiveDate: p.last_active_date ?? null,
          pinCount: p.pin_count ?? 0,
          voteCount: p.vote_count ?? 0,
          commentCount: p.comment_count ?? 0,
          escortCount: p.escort_count ?? 0,
        });
        const rawVis = p.visibility as Record<string, string> | null;
        if (rawVis) {
          setVisibility({
            username: (rawVis.username ?? "public") as AccountData["visibility"]["username"],
            city: (rawVis.city ?? "public") as AccountData["visibility"]["city"],
            country: (rawVis.country ?? "private") as AccountData["visibility"]["country"],
            birthDate: (rawVis.birthDate ?? "private") as AccountData["visibility"]["birthDate"],
          });
        }
      }
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setCircleCount(circleRes.count ?? 0);
      setLoading(false);
    })();
  }, [userId]);

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    if (!userId || !dirty || saving) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: fields.username || null,
      display_name: fields.display_name || null,
      city: fields.city || null,
      bio: fields.bio || null,
      is_public: fields.is_public,
    }).eq("id", userId);
    if (error) bToast.danger({ title: "Erreur lors de la sauvegarde" }, isDark);
    else { bToast.success({ title: "Profil mis a jour" }, isDark); setDirty(false); }
    setSaving(false);
  }, [userId, fields, dirty, saving]);

  // ── Avatar upload ──
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { bToast.danger({ title: "Format invalide" }, isDark); return; }
    if (file.size > 5 * 1024 * 1024) { bToast.danger({ title: "Fichier trop volumineux (max 5 Mo)" }, isDark); return; }

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { bToast.danger({ title: "Erreur upload" }, isDark); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl;

    const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    if (updateErr) { bToast.danger({ title: "Erreur mise a jour" }, isDark); return; }

    setFields((f) => ({ ...f, avatar_url: url }));
    const store = useStore.getState();
    if (store.userProfile) store.setUserProfile({ ...store.userProfile, avatar_url: url });
    bToast.success({ title: "Photo mise a jour" }, isDark);
  }, [userId]);

  // ── Field updater ──
  const updateField = (key: keyof ProfileFields, value: string | boolean) => {
    setFields((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  // ── Load followers tab ──
  useEffect(() => {
    if (tab !== "abonnes" || followersLoaded || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, city, verified)")
        .eq("following_id", userId);

      const users = (data || []).map((r: Record<string, unknown>) => {
        const p = r.profiles as Record<string, unknown>;
        return {
          id: p.id as string,
          username: p.username as string | null,
          display_name: p.display_name as string | null,
          avatar_url: p.avatar_url as string | null,
          city: p.city as string | null,
          verified: (p.verified as boolean) ?? false,
        };
      });
      setFollowers(users);

      // Check mutuals (users I also follow)
      const ids = users.map((u) => u.id);
      if (ids.length > 0) {
        const { data: myFollows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", ids);
        setMutualIds(new Set((myFollows || []).map((f) => f.following_id)));
      }
      setFollowersLoaded(true);
    })();
  }, [tab, followersLoaded, userId]);

  // ── Load following tab ──
  useEffect(() => {
    if (tab !== "abonnements" || followingLoaded || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("follows")
        .select("id, following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url, city, verified)")
        .eq("follower_id", userId);

      setFollowing((data || []).map((r: Record<string, unknown>) => {
        const p = r.profiles as Record<string, unknown>;
        return {
          id: p.id as string,
          username: p.username as string | null,
          display_name: p.display_name as string | null,
          avatar_url: p.avatar_url as string | null,
          city: p.city as string | null,
          verified: (p.verified as boolean) ?? false,
        };
      }));
      setFollowingLoaded(true);
    })();
  }, [tab, followingLoaded, userId]);

  // ── Load circle tab ──
  useEffect(() => {
    if (tab !== "cercle" || circleLoaded || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("circle_invitations")
        .select("id, sender_id, receiver_id, status")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .in("status", ["accepted", "pending"]);

      const otherIds = (data || []).map((r) =>
        r.sender_id === userId ? r.receiver_id : r.sender_id
      );

      let profileMap = new Map<string, Record<string, unknown>>();
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", otherIds);
        profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      }

      const members: CircleMember[] = (data || []).map((r) => {
        const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
        const p = profileMap.get(otherId);
        return {
          invitationId: r.id,
          userId: otherId,
          username: (p?.username as string) ?? null,
          display_name: (p?.display_name as string) ?? null,
          avatar_url: (p?.avatar_url as string) ?? null,
          status: r.status as "accepted" | "pending",
        };
      });

      setCircleMembers(members);
      setPendingCount(members.filter((m) => m.status === "pending").length);
      setCircleLoaded(true);
    })();
  }, [tab, circleLoaded, userId]);

  // ── Unfollow ──
  const handleUnfollow = useCallback(async (targetId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    if (error) { bToast.danger({ title: "Erreur" }, isDark); return; }
    setFollowing((prev) => prev.filter((u) => u.id !== targetId));
    setFollowingCount((c) => Math.max(0, c - 1));
    setUnfollowConfirm(null);
    bToast.success({ title: "Desabonne" }, isDark);
  }, [userId]);

  // ── Follow from followers tab ──
  const handleFollowBack = useCallback(async (targetId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
    if (error) {
      if (error.code === "23505") bToast.danger({ title: "Deja abonne" }, isDark);
      else bToast.danger({ title: "Erreur" }, isDark);
      return;
    }
    setMutualIds((prev) => new Set([...prev, targetId]));
    setFollowingCount((c) => c + 1);
  }, [userId]);

  // ── Visibility save ──
  const handleVisibilitySave = useCallback(async (v: AccountData["visibility"]) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ visibility: v }).eq("id", userId);
    if (error) { bToast.danger({ title: "Erreur lors de la sauvegarde" }, isDark); return; }
    setVisibility(v);
    bToast.success({ title: "Visibilité mise à jour" }, isDark);
    setSubScreen(null);
  }, [userId, isDark]);

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 210, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: C.t3, fontSize: 13 }}>Chargement...</span>
      </div>
    );
  }

  const initials = (fields.display_name || fields.username || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const TABS: { key: Tab; label: string }[] = [
    { key: "profil", label: "Profil" },
    { key: "abonnes", label: "Abonnes" },
    { key: "abonnements", label: "Abonnements" },
    { key: "cercle", label: "Cercle" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 210, background: C.bg,
      display: "flex", flexDirection: "column",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px", flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: C.inputBg, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t1,
          }}
        >
          <ArrowLeft size={18} />
        </motion.button>
        <span style={{ fontSize: 17, fontWeight: 700, color: C.t1 }}>Mon profil</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            background: "none", border: "none", cursor: dirty ? "pointer" : "default",
            fontSize: 14, fontWeight: 600, color: dirty ? C.teal : C.t3,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "..." : "Enregistrer"}
        </motion.button>
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${C.border}`,
        padding: "0 16px", flexShrink: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "8px 0 10px", background: "none", border: "none",
              fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? C.teal : C.t3,
              borderBottom: tab === t.key ? `2px solid ${C.teal}` : "2px solid transparent",
              cursor: "pointer", transition: "all 200ms",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto" }} className="scrollbar-hidden">
        {tab === "profil" && renderProfil()}
        {tab === "abonnes" && renderAbonnes()}
        {tab === "abonnements" && renderAbonnements()}
        {tab === "cercle" && renderCercle()}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />

      {/* Unfollow confirm dialog */}
      {unfollowConfirm && (
        <div
          onClick={() => setUnfollowConfirm(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 220,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card, borderRadius: 16, padding: 24, width: 280,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 4 }}>
              Se desabonner ?
            </div>
            <div style={{ fontSize: 12, color: C.t3, marginBottom: 16 }}>
              Vous ne suivrez plus cette personne
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setUnfollowConfirm(null)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.t2, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleUnfollow(unfollowConfirm)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: "#EF4444", border: "none",
                  color: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Se desabonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AddCircleContactModal */}
      <AddCircleContactModal
        isDark={isDark}
        open={showAddCircle}
        onClose={() => setShowAddCircle(false)}
        onAdded={() => { setCircleLoaded(false); setCircleCount((c) => c + 1); }}
      />

      {/* Visibility sub-screen */}
      {subScreen === "visibility" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 220, background: C.bg, display: "flex", flexDirection: "column" }}>
          <VisibilityScreen
            visibility={visibility}
            onSave={handleVisibilitySave}
            onBack={() => setSubScreen(null)}
          />
        </div>
      )}
    </div>
  );

  // ─── TAB: PROFIL ─────────────────────────────────────────────

  function renderProfil() {
    return (
      <div style={{ padding: "20px 16px" }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%",
              background: fields.avatar_url ? "none" : "linear-gradient(135deg, #3BB4C1, #06B6D4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, color: "#FFFFFF", overflow: "hidden",
            }}>
              {fields.avatar_url ? (
                <img src={fields.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : initials}
            </div>
            <div style={{
              position: "absolute", bottom: 0, right: -2,
              width: 24, height: 24, borderRadius: "50%",
              background: C.teal, border: `2px solid ${C.bg}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Pencil size={11} color="#FFFFFF" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          borderRadius: 14, background: C.inputBg, padding: "10px 0", marginBottom: 20,
        }}>
          {[
            { label: "Abonnes", value: followersCount },
            { label: "Abonnements", value: followingCount },
            { label: "Cercle", value: circleCount },
          ].map((s, i) => (
            <div key={s.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              borderRight: i < 2 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{s.value}</span>
              <span style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* View public profile button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { if (userId) openProfile(userId); }}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10,
            border: `1px solid ${C.teal}`, background: "transparent",
            color: C.teal, fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            marginBottom: 24,
          }}
        >
          👁 Voir mon profil public
        </motion.button>

        {/* ── Streak card + Week dots + Contributions ── */}
        {renderStreakBlock()}

        {/* Editable fields */}
        {renderField("Nom d'utilisateur", fields.username, (v) => updateField("username", v), "@pseudo")}
        {renderField("Nom complet", fields.display_name, (v) => updateField("display_name", v), "Votre nom")}
        {renderField("Ville", fields.city, (v) => updateField("city", v), "Votre ville")}
        {renderField("Bio", fields.bio, (v) => updateField("bio", v), "Ajouter une bio...", true)}

        {/* Public toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 0", borderTop: `1px solid ${C.border}`, marginTop: 8,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.t1 }}>Profil public</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Visible dans la communaute</div>
          </div>
          <SettingsToggle value={fields.is_public} onChange={(v) => updateField("is_public", v)} />
        </div>

        {/* Visibility row */}
        <button
          onClick={() => setSubScreen("visibility")}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0",
            background: "none", border: "none", borderTop: `1px solid ${C.border}`,
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.t1 }}>Visibilité du profil</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Choisir qui voit quoi</div>
          </div>
          <span style={{ fontSize: 16, color: C.t3 }}>›</span>
        </button>
      </div>
    );
  }

  function renderStreakBlock() {
    const { currentStreak, longestStreak, lastActiveDate, pinCount, voteCount, commentCount, escortCount } = streakData;
    const emoji = getStreakEmoji(currentStreak);

    // Week dots: 7 days L M M J V S D
    const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
    const today = new Date();
    const todayDow = today.getDay(); // 0=Sun
    // Map to Mon=0 ... Sun=6
    const todayIdx = todayDow === 0 ? 6 : todayDow - 1;

    // Build 7-day activity based on streak
    const dots = dayLabels.map((label, i) => {
      const daysAgo = todayIdx - i;
      let state: "done" | "today" | "empty" = "empty";
      if (daysAgo === 0) {
        state = "today";
      } else if (daysAgo > 0 && daysAgo <= currentStreak - (lastActiveDate === today.toISOString().slice(0, 10) ? 0 : 1)) {
        state = "done";
      }
      return { label, state };
    });

    const contribs = [
      { label: "Signalements", value: pinCount, color: "#EF4444" },
      { label: "Votes", value: voteCount, color: "#3BB4C1" },
      { label: "Trajets accompagnes", value: escortCount, color: "#A78BFA" },
      { label: "Commentaires", value: commentCount, color: "#F5C341" },
    ];

    return (
      <div style={{ marginBottom: 24 }}>
        {/* Streak card */}
        <div style={{
          borderRadius: 16,
          background: isDark ? "rgba(59,180,193,0.08)" : "rgba(59,180,193,0.06)",
          border: `1px solid ${isDark ? "rgba(59,180,193,0.18)" : "rgba(59,180,193,0.15)"}`,
          padding: "16px 18px",
          marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 2 }}>
                Streak actuelle
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.teal, lineHeight: 1.1 }}>
                {currentStreak} <span style={{ fontSize: 14, fontWeight: 500, color: C.t3 }}>jour{currentStreak !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div style={{ fontSize: 32 }}>{emoji}</div>
          </div>
          {longestStreak > 0 && (
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>
              Record : {longestStreak} jour{longestStreak !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Week dots */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "0 8px", marginBottom: 16,
        }}>
          {dots.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.t3 }}>{d.label}</span>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: d.state === "done" ? C.teal
                  : d.state === "today" ? C.gold
                  : isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
                boxShadow: d.state === "today" ? `0 0 6px ${C.gold}` : "none",
                animation: d.state === "today" ? "dottoday 2s ease-in-out infinite" : "none",
              }} />
            </div>
          ))}
        </div>

        {/* 2x2 Contribution grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        }}>
          {contribs.map((c) => (
            <div key={c.label} style={{
              borderRadius: 12,
              background: C.inputBg,
              padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: C.t3 }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Keyframe for today dot pulse */}
        <style>{`
          @keyframes dottoday {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

  function renderField(label: string, value: string, onChange: (v: string) => void, placeholder: string, multiline = false) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>
          {label}
        </label>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              background: C.inputBg, border: "none", color: C.t1,
              fontSize: 14, outline: "none", resize: "none",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              background: C.inputBg, border: "none", color: C.t1,
              fontSize: 14, outline: "none",
            }}
          />
        )}
      </div>
    );
  }

  // ─── TAB: ABONNES ────────────────────────────────────────────

  function renderAbonnes() {
    const q = followersSearch.toLowerCase();
    const filtered = followers.filter((u) =>
      !q || (u.display_name ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q)
    );

    return (
      <div style={{ padding: "16px" }}>
        {renderSearchBar(followersSearch, setFollowersSearch)}
        <div style={{ fontSize: 11, color: C.t3, marginBottom: 12 }}>{followersCount} abonnes</div>
        {!followersLoaded ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Aucun abonne</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}>
              {renderAvatar(u, 40)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>
                    {u.display_name || u.username || "Utilisateur"}
                  </span>
                  {u.verified && <span style={{ fontSize: 11, color: C.success }}>✓</span>}
                  {mutualIds.has(u.id) && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6,
                      background: C.inputBg, color: C.t3,
                    }}>
                      Mutuel
                    </span>
                  )}
                </div>
                {u.city && <span style={{ fontSize: 12, color: C.t3 }}>{u.city}</span>}
              </div>
              {!mutualIds.has(u.id) && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFollowBack(u.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: "transparent",
                    color: C.t1, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <UserPlus size={12} />
                  Suivre
                </motion.button>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // ─── TAB: ABONNEMENTS ────────────────────────────────────────

  function renderAbonnements() {
    const q = followingSearch.toLowerCase();
    const filtered = following.filter((u) =>
      !q || (u.display_name ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q)
    );

    return (
      <div style={{ padding: "16px" }}>
        {renderSearchBar(followingSearch, setFollowingSearch)}
        <div style={{ fontSize: 11, color: C.t3, marginBottom: 12 }}>{followingCount} abonnements</div>
        {!followingLoaded ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Aucun abonnement</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}>
              {renderAvatar(u, 40)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>
                    {u.display_name || u.username || "Utilisateur"}
                  </span>
                  {u.verified && <span style={{ fontSize: 11, color: C.success }}>✓</span>}
                </div>
                {u.city && <span style={{ fontSize: 12, color: C.t3 }}>{u.city}</span>}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setUnfollowConfirm(u.id)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.t3, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <UserCheck size={12} />
                Abonne·e
              </motion.button>
            </div>
          ))
        )}
      </div>
    );
  }

  // ─── TAB: CERCLE ─────────────────────────────────────────────

  function renderCercle() {
    const accepted = circleMembers.filter((m) => m.status === "accepted");
    const pending = circleMembers.filter((m) => m.status === "pending");

    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", minHeight: "100%" }}>
        <div style={{ fontSize: 11, color: C.t3, marginBottom: 12 }}>
          {accepted.length} membre{accepted.length !== 1 ? "s" : ""}
          {pendingCount > 0 && ` · ${pendingCount} en attente`}
        </div>

        {!circleLoaded ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Chargement...</div>
        ) : circleMembers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: C.t3, fontSize: 13 }}>Aucun membre dans votre cercle</div>
        ) : (
          <div style={{ flex: 1 }}>
            {[...accepted, ...pending].map((m) => (
              <div key={m.invitationId} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: `1px solid ${C.border}`,
              }}>
                {renderAvatar({ avatar_url: m.avatar_url, display_name: m.display_name, username: m.username } as FollowUser, 40)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>
                    {m.display_name || m.username || "Utilisateur"}
                  </span>
                </div>
                {m.status === "accepted" ? (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                    background: "rgba(52,211,153,0.12)", color: C.success,
                  }}>
                    💛 Cercle
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                    background: "rgba(245,195,65,0.10)", color: C.gold,
                  }}>
                    En attente
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddCircle(true)}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12,
            background: C.teal, border: "none",
            color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer",
            marginTop: 20,
          }}
        >
          + Inviter dans mon cercle
        </motion.button>
      </div>
    );
  }

  // ─── Shared helpers ──────────────────────────────────────────

  function renderSearchBar(value: string, onChange: (v: string) => void) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 10,
        background: C.inputBg, marginBottom: 12,
      }}>
        <Search size={14} color={C.t3} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher..."
          style={{
            flex: 1, border: "none", background: "transparent",
            color: C.t1, fontSize: 13, outline: "none",
          }}
        />
      </div>
    );
  }

  function renderAvatar(u: Pick<FollowUser, "avatar_url" | "display_name" | "username">, size: number) {
    const name = u.display_name || u.username || "U";
    const initial = name.charAt(0).toUpperCase();
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: u.avatar_url ? "none" : "linear-gradient(135deg, #3BB4C1, #06B6D4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600, color: "#FFFFFF", overflow: "hidden",
      }}>
        {u.avatar_url ? (
          <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initial}
      </div>
    );
  }
}
