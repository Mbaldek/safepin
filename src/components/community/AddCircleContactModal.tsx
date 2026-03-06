"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Send, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/stores/notificationStore";

interface Props {
  isDark: boolean;
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

type SearchMode = "pseudo" | "email" | "phone";

interface FoundProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  first_name: string | null;
}

const COUNTRY_CODES = [
  { flag: "\u{1F1EB}\u{1F1F7}", code: "+33", label: "France" },
  { flag: "\u{1F1E7}\u{1F1EA}", code: "+32", label: "Belgique" },
  { flag: "\u{1F1E8}\u{1F1ED}", code: "+41", label: "Suisse" },
  { flag: "\u{1F1F2}\u{1F1E6}", code: "+212", label: "Maroc" },
  { flag: "\u{1F1F8}\u{1F1F3}", code: "+221", label: "Senegal" },
];

export default function AddCircleContactModal({ isDark, open, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<SearchMode>("pseudo");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pseudoQuery, setPseudoQuery] = useState("");
  const [countryCode, setCountryCode] = useState("+33");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<FoundProfile | null>(null);
  // Pseudo mode: multiple results
  const [pseudoResults, setPseudoResults] = useState<FoundProfile[]>([]);
  const [pseudoSearching, setPseudoSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushToast = useNotificationStore((s) => s.pushToast);

  // Fetch existing relationships on modal open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("trusted_contacts")
        .select("user_id, contact_id, status")
        .or(`user_id.eq.${user.id},contact_id.eq.${user.id}`);
      const members = new Set<string>();
      const pending = new Set<string>();
      for (const row of data || []) {
        const otherId = row.user_id === user.id ? row.contact_id : row.user_id;
        if (!otherId) continue;
        if (row.status === "accepted") members.add(otherId);
        else if (row.status === "pending") pending.add(otherId);
      }
      setMemberIds(members);
      setPendingIds(pending);
    })();
  }, [open]);

  const reset = () => {
    setEmail("");
    setPhone("");
    setPseudoQuery("");
    setSearched(false);
    setFound(null);
    setSearching(false);
    setAdding(null);
    setPseudoResults([]);
    setPseudoSearching(false);
    setSentIds(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Pseudo search with debounce ──────────────────────────────────────────
  const searchPseudo = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPseudoResults([]);
      setPseudoSearching(false);
      return;
    }
    setPseudoSearching(true);
    try {
      const clean = query.startsWith("@") ? query.slice(1) : query;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, first_name")
        .or(`username.ilike.${clean}%,display_name.ilike.%${clean}%,first_name.ilike.%${clean}%`)
        .limit(20);
      setPseudoResults(
        (data || []).map((p) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          first_name: p.first_name ?? null,
        }))
      );
    } catch {
      // silent
    } finally {
      setPseudoSearching(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "pseudo") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (pseudoQuery.length < 2) {
      setPseudoResults([]);
      return;
    }
    setPseudoSearching(true);
    debounceRef.current = setTimeout(() => searchPseudo(pseudoQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pseudoQuery, mode, searchPseudo]);

  // ── Email/Phone search ───────────────────────────────────────────────────
  const handleSearch = async () => {
    const value = mode === "email" ? email.trim() : `${countryCode}${phone.trim()}`;
    if (!value || (mode === "email" && !value.includes("@")) || (mode === "phone" && phone.trim().length < 6)) {
      toast.error(mode === "email" ? "Entrez un email valide" : "Entrez un numero valide");
      return;
    }

    setSearching(true);
    setSearched(false);
    setFound(null);

    try {
      const res = await fetch("/api/circle/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mode, value }),
      });
      const data = await res.json();
      setSearched(true);
      if (data.found) {
        setFound({ ...data.profile, username: null, first_name: null });
      }
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  // ── Send circle invitation (pseudo mode) ─────────────────────────────────
  const handleInvite = async (target: FoundProfile) => {
    setAdding(target.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non connecté"); return; }

      // Get my display name
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      // Insert invitation
      const { error: invErr } = await supabase
        .from("circle_invitations")
        .insert({ sender_id: user.id, receiver_id: target.id });

      if (invErr) {
        if (invErr.code === "23505") {
          toast.info("Invitation déjà envoyée");
        } else {
          toast.error(invErr.message);
        }
        return;
      }

      // Also create trusted_contacts row so receiver sees it in "Demandes en attente"
      await supabase.from("trusted_contacts").insert({
        user_id: user.id,
        contact_id: target.id,
        contact_name: target.display_name ?? target.first_name ?? target.username ?? "Contact",
        status: "pending",
      });

      // Insert notification for receiver
      await supabase.from("notifications").insert({
        user_id: target.id,
        type: "circle_invitation",
        payload: {
          senderId: user.id,
          senderName: myProfile?.display_name ?? "Quelqu\u2019un",
        },
      });

      setSentIds((prev) => new Set(prev).add(target.id));
      pushToast({
        type: "circle_invitation",
        message: "Invitation envoyée",
        subMessage: `${target.display_name ?? target.first_name ?? target.username ?? "Utilisateur"} recevra ta demande`,
        variant: "success",
      });
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAdding(null);
    }
  };

  // ── Legacy add (email/phone mode) ────────────────────────────────────────
  const handleAdd = async () => {
    if (!found) return;
    setAdding(found.id);
    try {
      const res = await fetch("/api/circle/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: found.id }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.info("Deja dans votre cercle");
      } else if (!res.ok) {
        toast.error(data.error || "Erreur");
      } else {
        toast.success(`${data.name} ajoute a votre cercle !`);
        onAdded?.();
        handleClose();
      }
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setAdding(null);
    }
  };

  const handleExternalInvite = async () => {
    if (mode === "phone") {
      toast.info("Invitation par SMS bientot disponible");
      return;
    }
    toast.info("Invitation envoyee !");
    try {
      await fetch("/api/circle/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // best-effort
    }
  };

  const bg = isDark ? "#0F172A" : "#FFFFFF";
  const border = isDark ? "#334155" : "#E2E8F0";
  const textPrimary = isDark ? "#FFFFFF" : "#0F172A";
  const textSecondary = isDark ? "#94A3B8" : "#64748B";
  const inputBg = isDark ? "#1E293B" : "#F1F5F9";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 998,
            }}
          />
          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 999,
              backgroundColor: bg,
              borderRadius: "20px 20px 0 0",
              border: `1px solid ${border}`,
              borderBottom: "none",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: `1px solid ${border}`,
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Inviter au cercle
              </h2>
              <button
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: textSecondary,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Toggle tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${border}`,
                  marginBottom: 20,
                }}
              >
                {(["pseudo", "email", "phone"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setSearched(false); setFound(null); setPseudoResults([]); }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 13,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      backgroundColor: mode === m ? (isDark ? "#1E293B" : "#F1F5F9") : "transparent",
                      color: mode === m ? "#3BB4C1" : textSecondary,
                      transition: "all 0.2s",
                    }}
                  >
                    {m === "pseudo" ? <User size={14} /> : m === "email" ? <Mail size={14} /> : <Phone size={14} />}
                    {m === "pseudo" ? "Pseudo" : m === "email" ? "Email" : "Tél."}
                  </button>
                ))}
              </div>

              {/* ── Pseudo mode ──────────────────────────────────────── */}
              {mode === "pseudo" && (
                <>
                  <div style={{ position: "relative", marginBottom: 16 }}>
                    <input
                      type="text"
                      value={pseudoQuery}
                      onChange={(e) => setPseudoQuery(e.target.value)}
                      placeholder="@pseudo ou nom..."
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        paddingRight: pseudoResults.length > 0 ? 48 : 14,
                        borderRadius: 12,
                        border: `1px solid ${border}`,
                        backgroundColor: inputBg,
                        color: textPrimary,
                        fontSize: 15,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {pseudoResults.length > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "#3BB4C1",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 10,
                          padding: "2px 7px",
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {pseudoResults.length}
                      </span>
                    )}
                  </div>

                  {pseudoQuery.length > 0 && pseudoQuery.length < 2 && (
                    <div style={{ textAlign: "center", padding: "12px 0", color: textSecondary, fontSize: 13 }}>
                      Tape 2 caractères minimum
                    </div>
                  )}

                  {/* Skeletons */}
                  {pseudoSearching && pseudoResults.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            borderRadius: 14,
                            backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: isDark ? "#334155" : "#E2E8F0",
                              animation: "pulse 1.5s ease-in-out infinite",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                width: 100 + i * 20,
                                height: 12,
                                borderRadius: 6,
                                background: isDark ? "#334155" : "#E2E8F0",
                                marginBottom: 6,
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            />
                            <div
                              style={{
                                width: 60,
                                height: 10,
                                borderRadius: 5,
                                background: isDark ? "#334155" : "#E2E8F0",
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results list */}
                  {pseudoResults.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pseudoResults.filter((u) => u.id !== currentUserId).map((user) => {
                        const isMember = memberIds.has(user.id);
                        const isPending = pendingIds.has(user.id) || sentIds.has(user.id);
                        return (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: 12,
                              borderRadius: 14,
                              backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                              border: `1px solid ${border}`,
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                                  {(user.display_name ?? user.first_name ?? user.username ?? "?").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>
                                  {user.display_name ?? user.first_name ?? user.username ?? "Utilisateur"}
                                </span>
                              </div>
                              {user.username && (
                                <span style={{ fontSize: 12, color: textSecondary }}>
                                  @{user.username}
                                </span>
                              )}
                            </div>
                            {isMember ? (
                              <span
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 10,
                                  backgroundColor: "rgba(59,180,193,0.12)",
                                  color: "#3BB4C1",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Membre
                              </span>
                            ) : isPending ? (
                              <span
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 10,
                                  backgroundColor: isDark ? "#334155" : "#E2E8F0",
                                  color: textSecondary,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                En attente
                              </span>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleInvite(user)}
                                disabled={adding === user.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "8px 14px",
                                  borderRadius: 10,
                                  border: "none",
                                  backgroundColor: "#34D399",
                                  color: "#FFFFFF",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: adding === user.id ? "wait" : "pointer",
                                  opacity: adding === user.id ? 0.6 : 1,
                                }}
                              >
                                <UserPlus size={14} />
                                Inviter
                              </motion.button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* No results */}
                  {pseudoQuery.length >= 2 && !pseudoSearching && pseudoResults.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px 16px",
                        borderRadius: 16,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                        border: `1px solid ${border}`,
                      }}
                    >
                      <p style={{ fontSize: 28, margin: "0 0 8px" }}>{"\u{1F50D}"}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>
                        Aucun résultat
                      </p>
                      <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
                        Essaie un autre pseudo ou nom
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Email mode ───────────────────────────────────────── */}
              {mode === "email" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="email@exemple.com"
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      backgroundColor: inputBg,
                      color: textPrimary,
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    style={{
                      padding: "0 16px",
                      borderRadius: 12,
                      border: "none",
                      backgroundColor: "#3BB4C1",
                      color: "#FFFFFF",
                      cursor: searching ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      opacity: searching ? 0.6 : 1,
                    }}
                  >
                    <Search size={18} />
                  </button>
                </div>
              )}

              {/* ── Phone mode ───────────────────────────────────────── */}
              {mode === "phone" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      backgroundColor: inputBg,
                      color: textPrimary,
                      fontSize: 15,
                      outline: "none",
                      width: 90,
                    }}
                  >
                    {COUNTRY_CODES.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="6 12 34 56 78"
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      backgroundColor: inputBg,
                      color: textPrimary,
                      fontSize: 15,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    style={{
                      padding: "0 16px",
                      borderRadius: 12,
                      border: "none",
                      backgroundColor: "#3BB4C1",
                      color: "#FFFFFF",
                      cursor: searching ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      opacity: searching ? 0.6 : 1,
                    }}
                  >
                    <Search size={18} />
                  </button>
                </div>
              )}

              {/* ── Email/Phone results ──────────────────────────────── */}
              {(mode === "email" || mode === "phone") && (
                <>
                  {searching && (
                    <div style={{ textAlign: "center", padding: 20, color: textSecondary, fontSize: 14 }}>
                      Recherche...
                    </div>
                  )}

                  {searched && !searching && found && found.id !== currentUserId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                        border: `1px solid ${border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {found.avatar_url ? (
                          <img
                            src={found.avatar_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                            {(found.display_name ?? "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: textPrimary }}>
                          {found.display_name ?? "Utilisateur"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: textSecondary }}>
                          Membre Breveil
                        </p>
                      </div>
                      {memberIds.has(found.id) ? (
                        <span
                          style={{
                            padding: "10px 16px",
                            borderRadius: 12,
                            backgroundColor: "rgba(59,180,193,0.12)",
                            color: "#3BB4C1",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Membre
                        </span>
                      ) : pendingIds.has(found.id) ? (
                        <span
                          style={{
                            padding: "10px 16px",
                            borderRadius: 12,
                            backgroundColor: isDark ? "#334155" : "#E2E8F0",
                            color: textSecondary,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          En attente
                        </span>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAdd}
                          disabled={adding === found.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "10px 16px",
                            borderRadius: 12,
                            border: "none",
                            backgroundColor: "#34D399",
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: adding === found.id ? "wait" : "pointer",
                            opacity: adding === found.id ? 0.6 : 1,
                          }}
                        >
                          <UserPlus size={16} />
                          Inviter
                        </motion.button>
                      )}
                    </motion.div>
                  )}

                  {searched && !searching && !found && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        textAlign: "center",
                        padding: "24px 16px",
                        borderRadius: 16,
                        backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                        border: `1px solid ${border}`,
                      }}
                    >
                      <p style={{ fontSize: 28, margin: "0 0 8px" }}>{"\u{1F50D}"}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>
                        Pas encore sur Breveil
                      </p>
                      <p style={{ fontSize: 13, color: textSecondary, margin: "0 0 16px" }}>
                        Envoyez-lui une invitation pour rejoindre votre cercle
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleExternalInvite}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "10px 20px",
                          borderRadius: 12,
                          border: "none",
                          backgroundColor: "#3BB4C1",
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Send size={15} />
                        Envoyer une invitation
                      </motion.button>
                    </motion.div>
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
