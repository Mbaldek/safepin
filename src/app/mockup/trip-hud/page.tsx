"use client";

import { useState, useEffect, useRef } from "react";
import ActiveHUD from "@/mock/trip-unified/ActiveHUD";
import type { ActiveTrip } from "@/mock/trip-unified/types";

const MOCK_TRIP: ActiveTrip = {
  tripLogId: "mock-trip-001",
  escorteId: "mock-escorte-001",
  destination: "Gare du Nord",
  destLat: 48.8809,
  destLng: 2.3553,
  mode: "walk",
  coords: [],
  plannedDurationS: 1200, // 20 min
  distanceM: 1600,
  dangerScore: 42,
  state: "active",
  elapsedS: 0,
  walkedDistanceM: 0,
  circleNotified: true,
  isSharingLocation: true,
  juliaActive: false,
  juliaCdSeconds: 120,
  circleMembers: [
    { contactId: "1", name: "Marie", avatarUrl: null, status: "following", respondedAt: "2026-03-13T10:00:00Z" },
    { contactId: "2", name: "Lucas", avatarUrl: null, status: "following", respondedAt: "2026-03-13T10:01:00Z" },
    { contactId: "3", name: "Sarah", avatarUrl: null, status: "notified", respondedAt: null },
  ],
};

export default function TripHUDMockup() {
  const [isDark, setIsDark] = useState(true);
  const [trip, setTrip] = useState<ActiveTrip>(MOCK_TRIP);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate elapsed time ticking
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTrip((prev) => {
        const nextElapsed = prev.elapsedS + 1;
        const nextJuliaCd = Math.max(0, prev.juliaCdSeconds - 1);
        const juliaActive = prev.juliaActive || nextJuliaCd === 0;
        return { ...prev, elapsedS: nextElapsed, juliaCdSeconds: nextJuliaCd, juliaActive };
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = Math.min(100, trip.plannedDurationS > 0 ? (trip.elapsedS / trip.plannedDurationS) * 100 : 0);
  const etaMinutes = Math.max(0, Math.round((trip.plannedDurationS - trip.elapsedS) / 60));
  const remainingKm = Math.max(0, (trip.distanceM * (1 - progress / 100)) / 1000);

  const resetTrip = () => setTrip(MOCK_TRIP);
  const toggleSharing = () => setTrip((p) => ({ ...p, isSharingLocation: !p.isSharingLocation }));
  const toggleJulia = () => setTrip((p) => ({ ...p, juliaActive: !p.juliaActive, juliaCdSeconds: 0 }));
  const toggleCircle = () =>
    setTrip((p) => ({
      ...p,
      circleMembers: p.circleMembers.length > 0 ? [] : MOCK_TRIP.circleMembers,
    }));
  const triggerSOS = () => setTrip((p) => ({ ...p, state: "sos" }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#0F172A" : "#F1F5F9",
        fontFamily: "system-ui",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Fake map background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDark
            ? "radial-gradient(ellipse at 60% 40%, #1E293B 0%, #0F172A 70%)"
            : "radial-gradient(ellipse at 60% 40%, #E2E8F0 0%, #F1F5F9 70%)",
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 64,
          opacity: 0.15,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        🗺️
      </div>

      {/* Controls toolbar */}
      <div
        style={{
          position: "relative",
          zIndex: 300,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 16,
        }}
      >
        <button onClick={() => setIsDark(!isDark)} style={btnStyle(isDark)}>
          {isDark ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button onClick={resetTrip} style={btnStyle(isDark)}>
          🔄 Reset
        </button>
        <button onClick={toggleJulia} style={{ ...btnStyle(isDark), ...(trip.juliaActive ? activeStyle : {}) }}>
          ✨ Julia {trip.juliaActive ? "ON" : "OFF"}
        </button>
        <button onClick={toggleSharing} style={{ ...btnStyle(isDark), ...(trip.isSharingLocation ? activeStyle : {}) }}>
          📍 Share {trip.isSharingLocation ? "ON" : "OFF"}
        </button>
        <button onClick={toggleCircle} style={{ ...btnStyle(isDark), ...(trip.circleMembers.length > 0 ? activeStyle : {}) }}>
          👥 Circle {trip.circleMembers.length > 0 ? "ON" : "OFF"}
        </button>
        <button onClick={triggerSOS} style={{ ...btnStyle(isDark), background: "rgba(239,68,68,0.2)", color: "#EF4444" }}>
          🚨 SOS
        </button>
        <a
          href="/mockup"
          style={{
            ...btnStyle(isDark),
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          ← Back
        </a>
      </div>

      {/* State badge */}
      <div
        style={{
          position: "relative",
          zIndex: 300,
          textAlign: "center",
          padding: "8px 0",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 20,
            background: trip.state === "sos" ? "rgba(239,68,68,0.2)" : "rgba(59,180,193,0.15)",
            color: trip.state === "sos" ? "#EF4444" : "#3BB4C1",
          }}
        >
          state: {trip.state} · elapsed: {Math.floor(trip.elapsedS / 60)}:{(trip.elapsedS % 60).toString().padStart(2, "0")} · progress: {progress.toFixed(0)}%
        </span>
      </div>

      {/* Fake bottom nav bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {["🏠", "📍", "🔔", "👤"].map((icon, i) => (
          <span key={i} style={{ fontSize: 20, opacity: 0.3 }}>
            {icon}
          </span>
        ))}
      </div>

      {/* THE ACTUAL HUD */}
      <ActiveHUD
        trip={trip}
        isDark={isDark}
        progress={progress}
        etaMinutes={etaMinutes}
        remainingKm={remainingKm}
        onComplete={() => {
          setTrip((p) => ({ ...p, state: "arrived" }));
          alert("✅ Trip complete! (TripSummaryModal would show here)");
          resetTrip();
        }}
        onCancel={() => {
          alert("❌ Trip cancelled");
          resetTrip();
        }}
        onSOS={() => triggerSOS()}
        onToggleSharing={toggleSharing}
      />
    </div>
  );
}

// ── Styles ──

function btnStyle(isDark: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    color: isDark ? "#CBD5E1" : "#475569",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)"}`,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "system-ui",
  };
}

const activeStyle: React.CSSProperties = {
  background: "rgba(59,180,193,0.15)",
  borderColor: "rgba(59,180,193,0.3)",
  color: "#3BB4C1",
};
