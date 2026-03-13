"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TripSummaryModal from "@/components/trip/TripSummaryModal";

const TEAL = "#3BB4C1";

const SCORE_PRESETS = [
  { label: "Sûr", score: 88 },
  { label: "Modéré", score: 55 },
  { label: "Risqué", score: 25 },
] as const;

const MOCK_CIRCLE = [
  { id: "1", name: "Marie C." },
  { id: "2", name: "Sophie L." },
];

export default function TripSummaryMockup() {
  const [isOpen, setIsOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [scoreIdx, setScoreIdx] = useState(0);
  const [showCircle, setShowCircle] = useState(true);

  const t1 = isDark ? "#FFFFFF" : "#0F172A";
  const t2 = isDark ? "#94A3B8" : "#475569";
  const t3 = isDark ? "#64748B" : "#94A3B8";
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 9999,
    border: `1px solid ${active ? TEAL : border}`,
    background: active ? "rgba(59,180,193,0.15)" : "transparent",
    color: active ? TEAL : t2,
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080F1C" : "#C8D8E4", display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px 48px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 400, height: 52,
        background: isDark ? "rgba(8,15,28,0.88)" : "rgba(200,216,228,0.9)",
        backdropFilter: "blur(18px)",
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.05em" }}>TRIP SUMMARY</span>
        <div style={{ width: 1, height: 18, background: border, margin: "0 4px" }} />

        {/* Score presets */}
        {SCORE_PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => setScoreIdx(i)} style={btnStyle(scoreIdx === i)}>{p.label}</button>
        ))}

        <div style={{ width: 1, height: 18, background: border, margin: "0 4px" }} />

        {/* Circle toggle */}
        <button onClick={() => setShowCircle(!showCircle)} style={btnStyle(showCircle)}>
          {showCircle ? "Cercle ON" : "Cercle OFF"}
        </button>

        <div style={{ width: 1, height: 18, background: border, margin: "0 4px" }} />

        <button onClick={() => setIsDark(!isDark)} style={{ ...btnStyle(false), background: TEAL, borderColor: TEAL, color: "#fff" }}>
          {isDark ? "Light" : "Dark"}
        </button>

        {!isOpen && (
          <button onClick={() => setIsOpen(true)} style={{ ...btnStyle(false), background: TEAL, borderColor: TEAL, color: "#fff" }}>
            Ouvrir
          </button>
        )}

        <a href="/mockup" style={{ padding: "5px 14px", borderRadius: 9999, border: `1px solid ${border}`, background: "transparent", color: t3, fontSize: 12, textDecoration: "none", fontFamily: "inherit" }}>
          ← Back
        </a>
      </div>

      {/* Phone frame */}
      <div style={{
        position: "relative", width: 375, height: 720,
        borderRadius: 50, overflow: "hidden",
        background: isDark ? "#0D1626" : "#F8FAFC",
        border: `1px solid ${border}`,
        boxShadow: `0 40px 120px rgba(0,0,0,${isDark ? "0.55" : "0.18"})`,
      }}>
        {/* Map placeholder */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "55%",
          background: isDark ? "#101c2c" : "#C0D0DC",
          overflow: "hidden",
        }}>
          {/* Grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(rgba(59,180,193,${isDark ? "0.06" : "0.15"}) 1px, transparent 1px), linear-gradient(90deg, rgba(59,180,193,${isDark ? "0.06" : "0.15"}) 1px, transparent 1px)`,
            backgroundSize: "38px 38px",
          }} />
          {/* Route */}
          <div style={{
            position: "absolute", top: "20%", left: "18%", right: "22%", height: 3,
            background: `linear-gradient(90deg, ${TEAL}, #34D399)`,
            borderRadius: 9999, opacity: 0.6, transform: "rotate(-8deg)",
          }} />
          <div style={{ position: "absolute", top: "calc(20% - 3px)", left: "18%", width: 10, height: 10, borderRadius: "50%", background: TEAL, border: "2px solid white" }} />
          <div style={{ position: "absolute", top: "calc(20% - 3px)", right: "22%", width: 10, height: 10, borderRadius: "50%", background: "#34D399", border: "2px solid white", boxShadow: "0 0 0 5px rgba(52,211,153,0.2)" }} />
          {/* Fade */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(0deg, ${isDark ? "#0D1626" : "#F8FAFC"} 0%, transparent 100%)` }} />
        </div>

        {/* Summary modal inside phone */}
        <AnimatePresence>
          {isOpen && (
            <TripSummaryModal
              isOpen={isOpen}
              destination="Gare du Nord"
              tripSummary={{ duration_s: 1260, distance_m: 3400, score: SCORE_PRESETS[scoreIdx].score }}
              elapsedSeconds={1260}
              distanceM={3400}
              incidentsAvoided={3}
              isDark={isDark}
              circleMembers={showCircle ? MOCK_CIRCLE : []}
              onClose={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, textAlign: "center", maxWidth: 375 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 8 }}>Trip Summary — Design V2</div>
        <div style={{ fontSize: 12, color: t3, lineHeight: 1.6 }}>
          Bottom sheet · Check ring + ripple · Score badge dynamique<br />
          Cercle notification · Stats avec shimmer doré
        </div>
      </div>
    </div>
  );
}
