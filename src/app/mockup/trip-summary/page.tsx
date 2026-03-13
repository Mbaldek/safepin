"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TripSummaryModal from "@/components/trip/TripSummaryModal";

export default function TripSummaryMockup() {
  const [isOpen, setIsOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#0F172A" : "#F1F5F9", padding: 24, fontFamily: "system-ui" }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{ padding: "8px 16px", borderRadius: 8, background: "#3BB4C1", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          Open Modal
        </button>
        <button
          onClick={() => setIsDark(!isDark)}
          style={{ padding: "8px 16px", borderRadius: 8, background: isDark ? "#fff" : "#1E293B", color: isDark ? "#000" : "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          {isDark ? "Light mode" : "Dark mode"}
        </button>
        <a href="/mockup" style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: isDark ? "#94A3B8" : "#475569", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center" }}>
          ← Back
        </a>
      </div>

      <AnimatePresence>
        {isOpen && (
          <TripSummaryModal
            isOpen={isOpen}
            destination="Gare du Nord"
            tripSummary={{ duration_s: 1260, distance_m: 3400, score: 82 }}
            elapsedSeconds={1260}
            distanceM={3400}
            incidentsAvoided={3}
            isDark={isDark}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
