"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Map,
  Star,
  Signal,
  Users,
  Clock,
  Shield,
  Search,
  AlertTriangle,
  Share2,
  Check,
} from "lucide-react";
import { useTheme } from "@/stores/useTheme";

// Brand colors
const colors = {
  sheet: { dark: "#1A2540", light: "#FFFFFF" },
  card: { dark: "#1E293B", light: "#F8FAFC" },
  elevated: { dark: "#243050", light: "#F1F5F9" },
  cyan: "#3BB4C1",
  gold: "#F5C341",
  success: "#34D399",
  danger: "#EF4444",
  purple: "#A78BFA",
  warning: "#FBBF24",
  textPrimary: { dark: "#FFFFFF", light: "#0F172A" },
  textSecondary: { dark: "#94A3B8", light: "#475569" },
  textTertiary: { dark: "#64748B", light: "#94A3B8" },
};

// Spring animation config
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// No scrollbar styles
const noScrollbar: React.CSSProperties = {
  overflow: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

type AppState = "idle" | "walk" | "planifier" | "active" | "arrived";
type WalkSubState = "intro" | "notifying" | "responding" | "active";

interface TripViewV2Props {
  onClose: () => void;
}

export default function TripViewV2({ onClose }: TripViewV2Props) {
  const isDark = useTheme((s) => s.theme) === "dark";
  const [state, setState] = useState<AppState>("idle");
  const [walkSubState, setWalkSubState] = useState<WalkSubState>("intro");
  const [circleEnabled, setCircleEnabled] = useState(true);
  const [destination, setDestination] = useState("");
  const [routeMode, setRouteMode] = useState<"safe" | "balanced" | "fast">("balanced");
  const [elapsedSeconds, setElapsedSeconds] = useState(53);
  const [countdownSeconds, setCountdownSeconds] = useState(107);
  const [contactStatuses, setContactStatuses] = useState({
    marie: "waiting",
    tom: "waiting",
    alex: "waiting",
    sara: "waiting",
  });

  const theme = isDark ? "dark" : "light";

  // Timer for active state
  useEffect(() => {
    if (state === "active") {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Countdown for notifying state
  useEffect(() => {
    if (walkSubState === "notifying" || walkSubState === "responding") {
      const interval = setInterval(() => {
        setCountdownSeconds((s) => Math.max(0, s - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [walkSubState]);

  // Simulate contact responses
  useEffect(() => {
    if (walkSubState === "notifying") {
      const timer1 = setTimeout(() => {
        setContactStatuses((prev) => ({ ...prev, marie: "following" }));
      }, 1500);
      const timer2 = setTimeout(() => {
        setContactStatuses((prev) => ({ ...prev, tom: "vocal" }));
        setWalkSubState("responding");
      }, 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [walkSubState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleWalkCTA = () => {
    if (walkSubState === "intro") {
      setWalkSubState("notifying");
      setCountdownSeconds(107);
      setContactStatuses({
        marie: "waiting",
        tom: "waiting",
        alex: "waiting",
        sara: "waiting",
      });
    } else if (walkSubState === "notifying" || walkSubState === "responding") {
      setWalkSubState("active");
    }
  };

  const resetWalk = () => {
    setWalkSubState("intro");
    setContactStatuses({
      marie: "waiting",
      tom: "waiting",
      alex: "waiting",
      sara: "waiting",
    });
    setCountdownSeconds(107);
  };

  // Shared styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.card[theme],
    borderRadius: 14,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };

  const elevatedStyle: React.CSSProperties = {
    backgroundColor: colors.elevated[theme],
    borderRadius: 14,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };

  // Render contact avatar
  const Avatar = ({ name, color, size = 36 }: { name: string; color: string; size?: number }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        color: color,
        border: `2px solid ${colors.sheet[theme]}`,
        flexShrink: 0,
      }}
    >
      {name[0]}
    </div>
  );

  // Render State 1 - Idle
  const renderIdle = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>Mon trajet</h1>
          <p style={{ fontSize: 13, color: colors.textTertiary[theme], margin: 0 }}>17:32 ☁️ 12°</p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.card[theme],
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} color={colors.textSecondary[theme]} />
        </button>
      </div>

      {/* Hero CTA - Marche avec moi */}
      <motion.button
        onClick={() => setState("walk")}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "14px 18px",
          borderRadius: 18,
          background: "linear-gradient(135deg, #F5C341, #E8A800)",
          boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={20} color="white" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Marche avec moi</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Votre cercle alerté en 1 tap</div>
          </div>
        </div>
        <ChevronRight size={22} color="white" />
      </motion.button>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setState("planifier")}
          style={{
            ...cardStyle,
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <Map size={20} color={colors.cyan} />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Planifier</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          style={{
            ...cardStyle,
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <Star size={20} color={colors.gold} />
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>Favoris</span>
          <span
            style={{
              marginLeft: "auto",
              backgroundColor: `${colors.cyan}20`,
              color: colors.cyan,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            2
          </span>
        </motion.button>
      </div>

      {/* Toggle row */}
      <div
        style={{
          ...cardStyle,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Signal size={18} color={colors.purple} />
          <span style={{ fontSize: 14, color: colors.textPrimary[theme] }}>Partage avec le Cercle</span>
        </div>
        <motion.button
          onClick={() => setCircleEnabled(!circleEnabled)}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            backgroundColor: circleEnabled ? colors.cyan : colors.card[theme],
            border: circleEnabled ? "none" : `1px solid ${colors.textTertiary[theme]}`,
            padding: 2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <motion.div
            animate={{ x: circleEnabled ? 18 : 0 }}
            transition={spring}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        </motion.button>
      </div>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textTertiary[theme], letterSpacing: 0.5 }}>
          TRAJETS RÉCENTS
        </span>
        <button style={{ fontSize: 13, color: colors.cyan, background: "none", border: "none", cursor: "pointer" }}>
          Voir tout ›
        </button>
      </div>

      {/* Recent trips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { emoji: "🚶", name: "Gare du Nord", sub: "Hier · 18min", score: 8 },
          { emoji: "🏛", name: "Châtelet", sub: "Lun. · 25min", score: 7 },
          { emoji: "🏠", name: "Domicile", sub: "Mer. · 12min", score: 3 },
        ].map((trip, i) => (
          <motion.div
            key={i}
            whileTap={{ scale: 0.98 }}
            style={{
              ...cardStyle,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.elevated[theme],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {trip.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary[theme] }}>{trip.name}</div>
              <div style={{ fontSize: 12, color: colors.textTertiary[theme] }}>{trip.sub}</div>
            </div>
            <span
              style={{
                backgroundColor: `${colors.cyan}20`,
                color: colors.cyan,
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 8,
              }}
            >
              {trip.score}
            </span>
            <ChevronRight size={16} color={colors.textTertiary[theme]} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  // Render State 2 - Walk (with sub-states)
  const renderWalk = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setState("idle");
            resetWalk();
          }}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: colors.card[theme],
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={20} color={colors.textPrimary[theme]} />
        </motion.button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>
            Marche avec moi
          </h1>
          <p style={{ fontSize: 12, color: colors.textSecondary[theme], margin: 0 }}>
            Votre cercle est alerté instantanément
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {walkSubState === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
          >
            {/* Icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  backgroundColor: `${colors.gold}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={32} color={colors.gold} />
              </div>
            </div>

            <h2
              style={{
                fontSize: 18,
                fontWeight: 300,
                color: colors.textPrimary[theme],
                textAlign: "center",
                margin: "0 0 6px",
              }}
            >
              Marchez ensemble en sécurité
            </h2>
            <p
              style={{
                fontSize: 12,
                color: colors.textSecondary[theme],
                textAlign: "center",
                lineHeight: 1.6,
                margin: "0 0 14px",
                padding: "0 10px",
              }}
            >
              Votre cercle reçoit une notification push. Ils peuvent vous suivre ou vous rejoindre en vocal.
            </p>

            {/* Explanation cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                {
                  emoji: "🔔",
                  level: "NIVEAU 1",
                  levelColor: colors.gold,
                  title: "Notification téléphone",
                  desc: "Tout le cercle reçoit une alerte push. En 1 tap, ils vous suivent.",
                },
                {
                  emoji: "🎙",
                  level: "NIVEAU 2",
                  levelColor: colors.cyan,
                  title: "Chat vocal dans l'app",
                  desc: "Ils rejoignent une room audio privée. Parlez en direct.",
                },
                {
                  emoji: "✨",
                  level: "SI PERSONNE (2 min)",
                  levelColor: colors.purple,
                  title: "Julia vous rejoint",
                  desc: "L'IA Julia reste avec vous jusqu'à votre arrivée.",
                  badge: "BIENTÔT",
                },
              ].map((card, i) => (
                <div key={i} style={{ ...cardStyle, padding: "12px 14px", display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{card.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: card.levelColor, letterSpacing: 0.5 }}>
                        {card.level}
                      </span>
                      {card.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: colors.purple,
                            backgroundColor: `${colors.purple}20`,
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary[theme], marginBottom: 1 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textSecondary[theme], lineHeight: 1.4 }}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Circle preview */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, justifyContent: "center", flexWrap: "wrap" }}
            >
              <span style={{ fontSize: 12, color: colors.textSecondary[theme] }}>Votre cercle (4) :</span>
              <div style={{ display: "flex", marginLeft: -6 }}>
                {[
                  { name: "Marie", color: colors.purple },
                  { name: "Tom", color: colors.cyan },
                  { name: "Alex", color: colors.gold },
                  { name: "Sara", color: colors.success },
                ].map((c, i) => (
                  <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                    <Avatar name={c.name} color={c.color} size={30} />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleWalkCTA}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #F5C341, #E8A800)",
                boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
              }}
            >
              Notifier mon cercle →
            </motion.button>
          </motion.div>
        )}

        {(walkSubState === "notifying" || walkSubState === "responding") && (
          <motion.div
            key="notifying"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
          >
            {/* Pulsing icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, position: "relative", height: 80 }}>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute",
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  backgroundColor: colors.gold,
                  top: 5,
                }}
              />
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  backgroundColor: `${colors.gold}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                  marginTop: 5,
                }}
              >
                <Users size={32} color={colors.gold} />
              </div>
            </div>

            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: colors.textPrimary[theme],
                textAlign: "center",
                margin: "0 0 4px",
              }}
            >
              Notification envoyée
            </h2>
            <p style={{ fontSize: 13, color: colors.textSecondary[theme], textAlign: "center", margin: "0 0 10px" }}>
              En attente de réponse de votre cercle
            </p>

            {/* Countdown */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div
                style={{
                  backgroundColor: countdownSeconds < 30 ? `${colors.purple}20` : `${colors.gold}20`,
                  color: countdownSeconds < 30 ? colors.purple : colors.gold,
                  padding: "6px 14px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Julia rejoint dans{" "}
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {formatTime(countdownSeconds)}
                </span>
              </div>
            </div>

            {/* Audio room banner */}
            {walkSubState === "responding" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: `${colors.cyan}15`,
                  border: `1px solid ${colors.cyan}40`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: colors.success,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.cyan }}>Room vocale active</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary[theme] }}>Tom vous écoute · Parlez librement</div>
                </div>
              </motion.div>
            )}

            {/* Contacts list */}
            <div style={{ ...cardStyle, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
              {[
                { name: "Marie", color: colors.purple, key: "marie" },
                { name: "Tom", color: colors.cyan, key: "tom" },
                { name: "Alex", color: colors.gold, key: "alex" },
                { name: "Sara", color: colors.success, key: "sara" },
              ].map((contact, i, arr) => {
                const status = contactStatuses[contact.key as keyof typeof contactStatuses];
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar name={contact.name} color={contact.color} size={34} />
                      {status !== "waiting" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={spring}
                          style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: status === "following" ? colors.success : colors.cyan,
                            border: `2px solid ${colors.card[theme]}`,
                          }}
                        />
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: colors.textPrimary[theme], minWidth: 0 }}>
                      {contact.name}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={status}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={spring}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 8,
                          backgroundColor:
                            status === "waiting"
                              ? colors.elevated[theme]
                              : status === "following"
                                ? `${colors.success}20`
                                : `${colors.cyan}20`,
                          color:
                            status === "waiting"
                              ? colors.textTertiary[theme]
                              : status === "following"
                                ? colors.success
                                : colors.cyan,
                          flexShrink: 0,
                        }}
                      >
                        {status === "waiting" ? "En attente" : status === "following" ? "Suit" : "🎙 Vocal"}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleWalkCTA}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #F5C341, #E8A800)",
                boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Démarrer le trajet →
            </motion.button>

            <button
              onClick={() => resetWalk()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                backgroundColor: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                color: colors.textSecondary[theme],
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </motion.div>
        )}

        {walkSubState === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
            style={{ textAlign: "center" }}
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: `${colors.success}20`,
                border: `2px solid ${colors.success}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Check size={28} color={colors.success} />
            </motion.div>

            <h2 style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary[theme], margin: "0 0 4px" }}>
              Votre cercle vous accompagne
            </h2>
            <p style={{ fontSize: 13, color: colors.textSecondary[theme], margin: "0 0 20px" }}>
              2 contacts actifs sur 4
            </p>

            {/* Active contacts */}
            <div style={{ ...cardStyle, borderRadius: 14, overflow: "hidden", marginBottom: 20, textAlign: "left" }}>
              {[
                { name: "Marie", color: colors.purple, status: "following" },
                { name: "Tom", color: colors.cyan, status: "vocal" },
              ].map((contact, i, arr) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: i < arr.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar name={contact.name} color={contact.color} size={34} />
                    <div
                      style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: contact.status === "following" ? colors.success : colors.cyan,
                        border: `2px solid ${colors.card[theme]}`,
                      }}
                    />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: colors.textPrimary[theme] }}>
                    {contact.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 8,
                      backgroundColor: contact.status === "following" ? `${colors.success}20` : `${colors.cyan}20`,
                      color: contact.status === "following" ? colors.success : colors.cyan,
                    }}
                  >
                    {contact.status === "following" ? "● Suit" : "🎙 Vocal"}
                  </span>
                </div>
              ))}
            </div>

            {/* Stop button */}
            <button
              onClick={() => {
                setState("idle");
                resetWalk();
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                backgroundColor: `${colors.danger}15`,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                color: colors.danger,
                cursor: "pointer",
              }}
            >
              Arrêter le partage
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Render State 3 - Planifier
  const renderPlanifier = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setState("idle")}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            backgroundColor: colors.card[theme],
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={20} color={colors.textPrimary[theme]} />
        </motion.button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary[theme], margin: 0 }}>
          Planifier un trajet
        </h1>
      </div>

      {/* Departure */}
      <div style={{ ...cardStyle, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: colors.success, flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: colors.textSecondary[theme] }}>Ma position actuelle</span>
      </div>

      {/* Destination */}
      <div
        style={{
          ...cardStyle,
          padding: "12px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: destination ? `1px solid ${colors.cyan}40` : undefined,
          boxShadow: destination ? `0 0 0 3px ${colors.cyan}15` : undefined,
        }}
      >
        <Search size={18} color={colors.textTertiary[theme]} style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Rechercher une destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: colors.textPrimary[theme],
            minWidth: 0,
          }}
        />
      </div>

      {/* Quick access */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { emoji: "🏠", name: "Domicile", time: "12min" },
          { emoji: "💼", name: "Bureau", time: "24min" },
        ].map((place, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.97 }}
            onClick={() => setDestination(place.name)}
            style={{
              ...cardStyle,
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>{place.emoji}</span>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary[theme] }}>{place.name}</div>
              <div style={{ fontSize: 11, color: colors.textTertiary[theme] }}>{place.time}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Route mode */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textTertiary[theme], letterSpacing: 0.5, display: "block", marginBottom: 10 }}>
          TYPE DE TRAJET
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { key: "safe", icon: Shield, label: "Plus sûr", color: colors.success },
            { key: "balanced", icon: Map, label: "Équilibré", color: colors.cyan },
            { key: "fast", icon: Clock, label: "Plus rapide", color: colors.gold },
          ].map((mode) => {
            const isActive = routeMode === mode.key;
            return (
              <motion.button
                key={mode.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setRouteMode(mode.key as "safe" | "balanced" | "fast")}
                style={{
                  padding: "12px 8px",
                  borderRadius: 12,
                  backgroundColor: isActive ? `${mode.color}15` : colors.card[theme],
                  border: isActive ? `1px solid ${mode.color}40` : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <mode.icon size={18} color={isActive ? mode.color : colors.textTertiary[theme]} />
                <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? mode.color : colors.textSecondary[theme] }}>
                  {mode.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => {
          if (destination) {
            setState("active");
            setElapsedSeconds(0);
          }
        }}
        whileHover={destination ? { scale: 1.01 } : {}}
        whileTap={destination ? { scale: 0.97 } : {}}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 14,
          background: destination ? colors.cyan : colors.elevated[theme],
          border: "none",
          fontSize: 15,
          fontWeight: 700,
          color: destination ? "white" : colors.textTertiary[theme],
          cursor: destination ? "pointer" : "default",
          opacity: destination ? 1 : 0.6,
        }}
      >
        Démarrer le trajet
      </motion.button>
    </motion.div>
  );

  // Render State 4 - Active HUD
  const renderActive = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px" }}
    >
      {/* Destination card */}
      <div style={{ ...cardStyle, padding: "14px", marginBottom: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary[theme], margin: "0 0 3px" }}>
              {destination || "Gare du Nord"}
            </h2>
            <p style={{ fontSize: 12, color: colors.warning, margin: 0 }}>~18 min · 1.2 km restants</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary[theme], fontVariantNumeric: "tabular-nums" }}>
              {formatElapsed(elapsedSeconds)}
            </div>
            <div style={{ fontSize: 10, color: colors.textTertiary[theme] }}>écoulé</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, backgroundColor: colors.elevated[theme], borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "35%" }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              height: "100%",
              background: `linear-gradient(90deg, ${colors.cyan}, ${colors.success})`,
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* Status chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {[
          { label: "2 incidents", color: colors.warning },
          { label: "3 proches", color: colors.purple },
          { label: "Zone calme", color: colors.success },
        ].map((chip, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: 16,
              backgroundColor: `${chip.color}15`,
              color: chip.color,
            }}
          >
            {chip.label}
          </span>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          style={{
            ...elevatedStyle,
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Share2 size={16} color={colors.textPrimary[theme]} />
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary[theme] }}>Partager</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          style={{
            padding: "12px",
            borderRadius: 14,
            backgroundColor: colors.danger,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <AlertTriangle size={16} color="white" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>SOS</span>
        </motion.button>
      </div>

      {/* Hero CTA */}
      <motion.button
        onClick={() => setState("arrived")}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #F5C341, #E8A800)",
          boxShadow: "0 4px 20px rgba(245,195,65,0.3)",
          border: "none",
          fontSize: 15,
          fontWeight: 700,
          color: "white",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Je suis arrivée ✓
      </motion.button>

      {/* Watchers */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>
          {[colors.purple, colors.cyan, colors.gold].map((color, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
              <Avatar name={["M", "T", "A"][i]} color={color} size={26} />
            </div>
          ))}
        </div>
        <span style={{ fontSize: 11, color: colors.textTertiary[theme] }}>Marie, Tom et 1 autre vous suivent</span>
      </div>
    </motion.div>
  );

  // Render State 5 - Arrived
  const renderArrived = () => (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      style={{ ...noScrollbar, height: "100%", padding: "0 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: `${colors.success}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Check size={36} color={colors.success} />
      </motion.div>

      <h1 style={{ fontSize: 22, fontWeight: 300, color: colors.textPrimary[theme], margin: "0 0 6px" }}>
        Vous êtes arrivée !
      </h1>
      <p style={{ fontSize: 14, color: colors.textSecondary[theme], margin: "0 0 4px" }}>
        {destination || "Gare du Nord"}
      </p>
      <p style={{ fontSize: 12, color: colors.textTertiary[theme], margin: "0 0 24px" }}>
        Trajet enregistré · 18 min · 1.2 km
      </p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, width: "100%", marginBottom: 24 }}>
        {[
          { value: "18", unit: "min", delay: 0 },
          { value: "1.2", unit: "km", delay: 0.05 },
          { value: "6.8", unit: "score", delay: 0.1 },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, ...spring }}
            style={{
              ...cardStyle,
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary[theme] }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: colors.textTertiary[theme] }}>{stat.unit}</div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => {
          setState("idle");
          setDestination("");
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 14,
          backgroundColor: colors.cyan,
          border: "none",
          fontSize: 15,
          fontWeight: 700,
          color: "white",
          cursor: "pointer",
        }}
      >
        Retour
      </motion.button>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={spring}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "72dvh",
        zIndex: 50,
        backgroundColor: colors.sheet[theme],
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
      }}
    >
      {/* Handle */}
      <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {state === "idle" && renderIdle()}
          {state === "walk" && renderWalk()}
          {state === "planifier" && renderPlanifier()}
          {state === "active" && renderActive()}
          {state === "arrived" && renderArrived()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
