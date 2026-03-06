"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Send, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isDark: boolean;
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

type SearchMode = "email" | "phone";

interface FoundProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const COUNTRY_CODES = [
  { flag: "\u{1F1EB}\u{1F1F7}", code: "+33", label: "France" },
  { flag: "\u{1F1E7}\u{1F1EA}", code: "+32", label: "Belgique" },
  { flag: "\u{1F1E8}\u{1F1ED}", code: "+41", label: "Suisse" },
  { flag: "\u{1F1F2}\u{1F1E6}", code: "+212", label: "Maroc" },
  { flag: "\u{1F1F8}\u{1F1F3}", code: "+221", label: "Senegal" },
];

export default function AddCircleContactModal({ isDark, open, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<SearchMode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+33");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searched, setSearched] = useState(false);
  const [found, setFound] = useState<FoundProfile | null>(null);

  const reset = () => {
    setEmail("");
    setPhone("");
    setSearched(false);
    setFound(null);
    setSearching(false);
    setAdding(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
        setFound(data.profile);
      }
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!found) return;
    setAdding(true);
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
      setAdding(false);
    }
  };

  const handleInvite = async () => {
    if (mode === "phone") {
      toast.info("Invitation par SMS bientot disponible");
      return;
    }
    toast.info("Invitation envoyee !");
    // Fire-and-forget email invite for non-users
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
                Ajouter au cercle
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
                {(["email", "phone"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setSearched(false); setFound(null); }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 14,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: mode === m ? (isDark ? "#1E293B" : "#F1F5F9") : "transparent",
                      color: mode === m ? "#3BB4C1" : textSecondary,
                      transition: "all 0.2s",
                    }}
                  >
                    {m === "email" ? <Mail size={15} /> : <Phone size={15} />}
                    {m === "email" ? "Email" : "Telephone"}
                  </button>
                ))}
              </div>

              {/* Search input */}
              {mode === "email" ? (
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
              ) : (
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

              {/* Results */}
              {searching && (
                <div style={{ textAlign: "center", padding: 20, color: textSecondary, fontSize: 14 }}>
                  Recherche...
                </div>
              )}

              {searched && !searching && found && (
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
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAdd}
                    disabled={adding}
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
                      cursor: adding ? "wait" : "pointer",
                      opacity: adding ? 0.6 : 1,
                    }}
                  >
                    <UserPlus size={16} />
                    Ajouter
                  </motion.button>
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
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>
                    {"\u{1F50D}"}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>
                    Pas encore sur Breveil
                  </p>
                  <p style={{ fontSize: 13, color: textSecondary, margin: "0 0 16px" }}>
                    Envoyez-lui une invitation pour rejoindre votre cercle
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInvite}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
