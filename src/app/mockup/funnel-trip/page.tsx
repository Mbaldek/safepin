"use client";

/**
 * MOCKUP — Funnel B: TripView idle + planifier
 *
 * Source: src/components/trip/TripView.tsx (1137 LOC)
 * Data: trip_log (récents), saved_places (favoris)
 */

import { useState } from "react";

const PURPLE = "#A78BFA";
const TEAL = "#3BB4C1";
const GOLD = "#F5C341";
const RED = "#EF4444";
const GREEN = "#34D399";

const MOCK_SAVED_PLACES = [
  { id: "1", label: "Maison", icon: "🏠", lat: 48.86, lng: 2.34 },
  { id: "2", label: "Bureau", icon: "🏢", lat: 48.87, lng: 2.35 },
];

const MOCK_TRIPS = [
  { id: "1", to_label: "Gare du Nord", started_at: "2026-03-12T18:00:00Z", planned_duration_s: 1080, danger_score: 32, distance_m: 1800, mode: "walk" },
  { id: "2", to_label: "Châtelet – Les Halles", started_at: "2026-03-10T14:00:00Z", planned_duration_s: 1440, danger_score: 58, distance_m: 2300, mode: "walk" },
  { id: "3", to_label: "Pernod Ricard", started_at: "2026-03-07T09:00:00Z", planned_duration_s: 1080, danger_score: 22, distance_m: 1200, mode: "walk" },
];

export default function FunnelTripMockup() {
  const [isDark, setIsDark] = useState(true);
  const [state, setState] = useState<"idle" | "planifier">("idle");
  const [destination, setDestination] = useState("");
  const [circleEnabled, setCircleEnabled] = useState(false);
  const [transportMode, setTransportMode] = useState<"walk" | "transit" | "bike" | "car">("walk");

  const theme = isDark ? "dark" : "light";
  const t1 = isDark ? "#FFFFFF" : "#0F172A";
  const t2 = isDark ? "#94A3B8" : "#475569";
  const t3 = isDark ? "#64748B" : "#94A3B8";
  const bg = isDark ? "#131F30" : "#FFFFFF";
  const mapBg = isDark ? "#101c2c" : "#C0D0DC";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const elBg = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080F1C" : "#C8D8E4", display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px 48px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, background: isDark ? "rgba(8,15,28,0.88)" : "rgba(200,216,228,0.9)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: PURPLE, letterSpacing: "0.05em" }}>FUNNEL B — TripView</span>
        <div style={{ width: 1, height: 20, background: border, margin: "0 8px" }} />
        <span style={{ fontSize: 11, color: t3 }}>1137 LOC · saved_places + trip_log</span>
        <div style={{ width: 1, height: 20, background: border, margin: "0 8px" }} />
        <button onClick={() => setIsDark(!isDark)} style={{ padding: "4px 12px", borderRadius: 99, border: `1px solid ${border}`, background: "transparent", color: t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          {isDark ? "☀️" : "🌙"}
        </button>
        <a href="/mockup" style={{ padding: "4px 12px", borderRadius: 99, border: `1px solid ${border}`, background: "transparent", color: t3, fontSize: 12, textDecoration: "none", fontFamily: "inherit" }}>← Back</a>
      </div>

      {/* Phone frame */}
      <div style={{ position: "relative", width: 375, height: 720, borderRadius: 50, overflow: "hidden", background: bg, border: `1px solid ${border}`, boxShadow: `0 40px 120px rgba(0,0,0,${isDark ? "0.55" : "0.18"})`, userSelect: "none" }}>

        {/* Map area */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: state === "idle" ? "55%" : "28%",
          background: mapBg,
          transition: "height 0.5s cubic-bezier(0.32,0.72,0,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: TEAL, border: "2.5px solid white", boxShadow: "0 0 0 7px rgba(59,180,193,0.18)" }} />
        </div>

        {/* Panel */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: state === "idle" ? "48%" : "75%",
          background: bg,
          borderRadius: "28px 28px 0 0",
          borderTop: `1px solid ${border}`,
          transition: "height 0.5s cubic-bezier(0.32,0.72,0,1)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Handle */}
          <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.14)" }} />
          </div>

          {/* Idle view */}
          {state === "idle" && (
            <div style={{ padding: "6px 20px 20px", flex: 1, overflowY: "auto" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 600, color: t1, margin: 0 }}>Mon trajet</div>
                  <div style={{ fontSize: 13, color: t3 }}>9:41 ☁️</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16, color: t2 }}>✕</span>
                </div>
              </div>

              {/* Hero CTA — Marche avec moi (gold gradient) */}
              <div style={{ width: "100%", padding: "14px 18px", borderRadius: 18, background: "linear-gradient(135deg, #F5C341, #E8A800)", boxShadow: "0 4px 20px rgba(245,195,65,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>👥</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Marche avec moi</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Votre cercle alerté en 1 tap</div>
                  </div>
                </div>
                <span style={{ fontSize: 20, color: "white" }}>›</span>
              </div>

              {/* Planifier button (card style) */}
              <div onClick={() => setState("planifier")} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12 }}>
                <span style={{ fontSize: 18, color: TEAL }}>🗺️</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Planifier un trajet</span>
                <span style={{ marginLeft: "auto", color: t3, fontSize: 16 }}>›</span>
              </div>

              {/* Circle toggle (disabled) */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, color: t3 }}>📡</span>
                  <div>
                    <span style={{ fontSize: 14, color: t3 }}>Partage avec le Cercle</span>
                    <div style={{ fontSize: 11, color: t3, opacity: 0.7 }}>Disponible avec Marche avec moi</div>
                  </div>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 13, background: isDark ? "#334155" : "#CBD5E1", opacity: 0.4, position: "relative" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
              </div>

              <div style={{ height: 1, background: border, marginBottom: 12 }} />

              {/* Mes favoris */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 12 }}>
                <span style={{ fontSize: 16, color: GOLD }}>⭐</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Mes favoris</span>
                {MOCK_SAVED_PLACES.length > 0 && (
                  <span style={{ marginLeft: "auto", background: `${TEAL}20`, color: TEAL, fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>
                    {MOCK_SAVED_PLACES.length}
                  </span>
                )}
                <span style={{ color: t3, fontSize: 16, ...(MOCK_SAVED_PLACES.length > 0 ? {} : { marginLeft: "auto" }) }}>›</span>
              </div>

              <div style={{ height: 1, background: border, marginBottom: 12 }} />

              {/* Trajets récents */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t3, letterSpacing: "0.5px" }}>TRAJETS RÉCENTS</span>
                <span style={{ fontSize: 13, color: TEAL, cursor: "pointer" }}>Voir tout ›</span>
              </div>

              {MOCK_TRIPS.map(trip => {
                const date = new Date(trip.started_at);
                const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" });
                const durMin = Math.round(trip.planned_duration_s / 60);
                return (
                  <div key={trip.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: elBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚶</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{trip.to_label}</div>
                      <div style={{ fontSize: 12, color: t3 }}>{dayLabel} · {durMin}min</div>
                    </div>
                    <span style={{ background: `${TEAL}20`, color: TEAL, fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 8 }}>
                      {Math.round(trip.danger_score)}
                    </span>
                    <span style={{ color: t3, fontSize: 16 }}>›</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Planifier view */}
          {state === "planifier" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 20px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div onClick={() => { setState("idle"); setDestination(""); }} style={{ width: 34, height: 34, borderRadius: "50%", background: cardBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 16, color: t1 }}>‹</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: t1 }}>Trajet avec destination</span>
                </div>
                {destination && (
                  <div style={{ background: t1, color: bg, fontSize: 13, fontWeight: 500, padding: "6px 12px", borderRadius: 99, flexShrink: 0, marginLeft: 8 }}>
                    18 min →
                  </div>
                )}
              </div>

              {/* Origin / Destination card */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
                  <span style={{ fontSize: 14, color: t2 }}>Ma position actuelle</span>
                </div>
                <div style={{ height: 1, background: border, marginBottom: 10 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, flexShrink: 0 }} />
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Rechercher une destination"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: t1, fontFamily: "inherit" }}
                    autoFocus
                  />
                  {destination && (
                    <span style={{ fontSize: 14, color: GOLD, cursor: "pointer" }}>⭐</span>
                  )}
                </div>
              </div>

              {/* Transport modes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
                {([["walk", "🚶", "À pied"], ["transit", "🚇", "Transports"], ["bike", "🚲", "Vélo"], ["car", "🚗", "Voiture"]] as const).map(([id, emoji, label]) => (
                  <div key={id} onClick={() => setTransportMode(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 10, cursor: "pointer", background: transportMode === id ? "rgba(59,180,193,0.15)" : "transparent" }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: transportMode === id ? TEAL : t3 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Veille cercle toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", marginBottom: 8, borderBottom: `1px solid ${border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, color: t2 }}>👥</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: t1 }}>Veille cercle</span>
                </div>
                <div onClick={() => setCircleEnabled(!circleEnabled)} style={{ width: 44, height: 26, borderRadius: 13, position: "relative", background: circleEnabled ? TEAL : (isDark ? "#475569" : "#D1D5DB"), cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: circleEnabled ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
              </div>

              {/* Mock routes */}
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: t3, textAlign: "center", padding: "4px 0", marginBottom: 4 }}>Itinéraires</div>
              {destination ? (
                [
                  { label: "Plus sûre", dur: "22 min", dist: "1.8 km", score: 92, color: GREEN },
                  { label: "Équilibrée", dur: "18 min", dist: "1.6 km", score: 75, color: TEAL },
                  { label: "Plus rapide", dur: "15 min", dist: "1.4 km", score: 54, color: GOLD },
                ].map((route, i) => (
                  <div key={route.label} style={{ background: i === 1 ? `${TEAL}12` : cardBg, border: `1px solid ${i === 1 ? `${TEAL}30` : border}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 2 }}>{route.label}</div>
                      <div style={{ fontSize: 11, color: t3 }}>{route.dur} · {route.dist}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: `${route.color}15`, color: route.color, border: `1px solid ${route.color}25` }}>
                      {route.score}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: 20, color: t3, fontSize: 13 }}>
                  Entrez une destination pour voir les itinéraires
                </div>
              )}
            </div>
          )}

          {/* Bottom nav */}
          <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 8px 20px", borderTop: `1px solid ${border}` }}>
            {[["💬", "Communauté", false], ["❤️", "Cercle", false], ["✈️", "Trajet", true], ["⭐", "Julia", false]].map(([icon, label, active]) => (
              <div key={label as string} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>{icon as string}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: active ? TEAL : t3 }}>{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, textAlign: "center", maxWidth: 375 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 8 }}>Funnel B — TripView</div>
        <div style={{ fontSize: 12, color: t3, lineHeight: 1.6 }}>
          • Source: TripView.tsx (1137 LOC)<br />
          • DB: <b style={{ color: TEAL }}>saved_places</b> + <b style={{ color: PURPLE }}>trip_log</b><br />
          • Idle: Gold hero CTA + card "Planifier" + circle toggle (disabled) + favoris row + récents cards<br />
          • Planifier: Origin/dest card, AutocompleteInput, transport modes, circle toggle, route cards<br />
          • Gère aussi: TripActiveHUD, TripSummaryModal, FavorisSheet, TripHistoryView
        </div>
      </div>
    </div>
  );
}
