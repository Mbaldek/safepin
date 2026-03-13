"use client";

import { motion } from "framer-motion";
import { Check, Shield, Clock, Send, Share2, Activity, X } from "lucide-react";
import type React from "react";
import { avatarColor } from "@/lib/escorteHelpers";

/* ── tokens ── */
const C = {
  teal: "#3BB4C1",
  green: "#34D399",
  warn: "#FBBF24",
  danger: "#EF4444",
  purple: "#A78BFA",
  gold: "#F5C341",
  sheet:   { dark: "#131F30", light: "#FFFFFF" },
  surface: { dark: "#1A2840", light: "#F1F6FA" },
  t1: { dark: "#FFFFFF", light: "#0D1626" } as Record<string, string>,
  t2: { dark: "#94A3B8", light: "#4A5C6E" } as Record<string, string>,
  t3: { dark: "#546070", light: "#8FA0AE" } as Record<string, string>,
  bd: { dark: "rgba(255,255,255,0.09)", light: "rgba(13,22,38,0.09)" } as Record<string, string>,
  bdS: { dark: "rgba(255,255,255,0.16)", light: "rgba(13,22,38,0.16)" } as Record<string, string>,
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ── */
interface TripSummaryModalProps {
  isOpen: boolean;
  destination: string;
  tripSummary: { duration_s: number; distance_m: number; score: number } | null;
  elapsedSeconds: number;
  distanceM: number;
  incidentsAvoided: number;
  isDark: boolean;
  circleMembers?: { id: string; name: string }[];
  onClose: () => void;
}

/* ── score helpers ── */
function getScoreLevel(score: number) {
  if (score >= 75) return { label: "Trajet sûr", cls: "safe" as const, color: C.green };
  if (score >= 40) return { label: "Trajet modéré", cls: "med" as const, color: C.warn };
  return { label: "Trajet risqué", cls: "risky" as const, color: C.danger };
}

/* ── component ── */
export default function TripSummaryModal({
  destination,
  tripSummary,
  elapsedSeconds,
  distanceM,
  incidentsAvoided,
  isDark,
  circleMembers,
  onClose,
}: TripSummaryModalProps) {
  const th = isDark ? "dark" : "light";
  const score = tripSummary?.score ?? 80;
  const sl = getScoreLevel(score);
  const durationMin = Math.round((tripSummary?.duration_s ?? elapsedSeconds) / 60);
  const distKm = ((tripSummary?.distance_m ?? distanceM) / 1000).toFixed(1);
  const activeMembers = circleMembers?.filter(m => m.name) ?? [];

  const icBtnStyle: React.CSSProperties = {
    width: 32, height: 32, borderRadius: "50%",
    border: `1px solid ${C.bd[th]}`, background: C.surface[th],
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", flexDirection: "column",
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      {/* Map area (top half — transparent, just catches taps to close) */}
      <div
        onClick={onClose}
        style={{ flex: "0 0 35%", pointerEvents: "auto" }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flex: 1,
          background: C.sheet[th],
          borderRadius: "28px 28px 0 0",
          borderTop: `1px solid ${C.bd[th]}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Handle + icons row */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: C.bdS[th] }} />
          </div>
          <div style={{ position: "absolute", top: 8, right: 14, display: "flex", gap: 4, alignItems: "center" }}>
            <div style={icBtnStyle}><Activity size={16} color={C.t3[th]} /></div>
            <div style={icBtnStyle}><Share2 size={16} color={C.t3[th]} /></div>
            <div style={{ ...icBtnStyle }} onClick={onClose}><X size={16} color={C.t2[th]} /></div>
          </div>
        </div>

        {/* Check hero */}
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 16px", flexShrink: 0 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="trip-check-ring"
            style={{
              width: 68, height: 68, borderRadius: "50%",
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0.06) 100%)`,
              border: `2px solid rgba(52,211,153,0.3)`,
            }}
          >
            <Check size={28} strokeWidth={2.8} color={C.green} />
          </motion.div>
        </div>

        {/* Title block */}
        <div style={{ textAlign: "center", padding: "0 24px 16px", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.t1[th], letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6 }}>
            Vous êtes arrivée !
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.t2[th], marginBottom: 3 }}>
            {destination || "Destination"}
          </div>
          <div style={{ fontSize: 12, color: C.t3[th] }}>
            Trajet enregistré · {durationMin} min · {distKm} km
          </div>
        </div>

        {/* Score badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, flexShrink: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 9999,
            fontSize: 12, fontWeight: 600,
            background: `${sl.color}18`,
            color: sl.color,
            border: `1px solid ${sl.color}38`,
          }}>
            <Shield size={12} />
            <span>{sl.label}</span>
          </div>
        </div>

        {/* Circle notification */}
        {activeMembers.length > 0 && (
          <div style={{
            margin: "0 20px 16px",
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px", borderRadius: 14,
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.15)",
            flexShrink: 0,
          }}>
            {/* Stacked avatars */}
            <div style={{ display: "flex" }}>
              {activeMembers.slice(0, 2).map((m, i) => {
                const col = avatarColor(m.name);
                return (
                  <div key={m.id} style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${col}, ${isDark ? "#1E3A5F" : "#E8EFF5"})`,
                    border: `2px solid ${C.sheet[th]}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "white",
                    marginLeft: i > 0 ? -8 : 0,
                    flexShrink: 0,
                  }}>
                    {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.green, lineHeight: 1.3 }}>
                {activeMembers.slice(0, 2).map(m => m.name).join(" et ")} {activeMembers.length === 1 ? "a" : "ont"} été notifiée{activeMembers.length > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: C.t3[th], marginTop: 1 }}>
                Ton cercle sait que tu es bien arrivée
              </div>
            </div>
            <Check size={16} color={C.green} />
          </div>
        )}

        {/* Stats cards with gold shimmer */}
        <div style={{ display: "flex", gap: 8, padding: "0 20px", marginBottom: 16, flexShrink: 0 }}>
          {[
            { icon: <Clock size={16} color={C.teal} />, value: String(durationMin), unit: "min", accent: false, delay: 0 },
            { icon: <Send size={16} color={C.purple} />, value: distKm, unit: "km", accent: false, delay: 0.05 },
            { icon: <Shield size={16} color={C.green} />, value: String(incidentsAvoided), unit: "évités", accent: true, delay: 0.1 },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay, ...spring }}
              className="trip-stat-card"
              style={{
                flex: 1,
                background: C.surface[th],
                borderRadius: 11,
                padding: "9px 6px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                position: "relative",
                overflow: "hidden",
                "--trip-stat-bg": C.surface[th],
              } as React.CSSProperties}
            >
              <div style={{ position: "relative", zIndex: 2, marginBottom: 1 }}>{stat.icon}</div>
              <div style={{
                position: "relative", zIndex: 2,
                fontSize: 17, fontWeight: 700,
                color: stat.accent ? C.green : C.t1[th],
                letterSpacing: "-0.02em", lineHeight: 1.1,
              }}>
                {stat.value}
              </div>
              <div style={{ position: "relative", zIndex: 2, fontSize: 10, fontWeight: 500, color: C.t3[th] }}>
                {stat.unit}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
