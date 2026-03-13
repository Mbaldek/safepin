"use client";

/**
 * MOCKUP — Funnel A: EscorteSheet hub + trip-form
 *
 * Source: src/components/EscorteSheet.tsx (1226 LOC)
 * Data: useFavoris → favoris_trajets, useRecents → trajets_recents
 */

import { useState } from "react";

const PURPLE = "#A78BFA";
const TEAL = "#3BB4C1";
const GOLD = "#F5C341";
const RED = "#EF4444";
const GREEN = "#34D399";

const MOCK_FAVORIS = [
  { id: "1", label: "Maison", dest_lat: 48.86, dest_lng: 2.34 },
  { id: "2", label: "Bureau", dest_lat: 48.87, dest_lng: 2.35 },
  { id: "3", label: "Pernod Ricard", dest_lat: 48.88, dest_lng: 2.29 },
];

const MOCK_RECENTS = [
  { id: "1", dest_name: "Gare du Nord", used_at: "2026-03-12T18:00:00Z", duration_min: 18, dest_address: "18 Rue de Dunkerque" },
  { id: "2", dest_name: "Châtelet – Les Halles", used_at: "2026-03-10T14:00:00Z", duration_min: 24, dest_address: "Place du Châtelet" },
  { id: "3", dest_name: "Pernod Ricard", used_at: "2026-03-07T09:00:00Z", duration_min: 18, dest_address: "5 Cours Paul Ricard" },
];

const MOCK_SEARCH = [
  { name: "Gare de Lyon", address: "Place Louis Armand, 75012", icon: "🚉" },
  { name: "République", address: "Place de la République, 75011", icon: "📍" },
  { name: "Bastille", address: "Place de la Bastille, 75011", icon: "📍" },
];

export default function FunnelEscorteMockup() {
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState<"hub" | "trip-form">("hub");
  const [query, setQuery] = useState("");
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<"walk" | "transit" | "bike" | "car">("walk");

  const t1 = isDark ? "#FFFFFF" : "#0F172A";
  const t2 = isDark ? "#94A3B8" : "#475569";
  const t3 = isDark ? "#64748B" : "#94A3B8";
  const bg = isDark ? "#131F30" : "#FFFFFF";
  const mapBg = isDark ? "#101c2c" : "#C0D0DC";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const elBg = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";

  const filteredSearch = query.length > 0
    ? MOCK_SEARCH.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080F1C" : "#C8D8E4", display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px 48px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, background: isDark ? "rgba(8,15,28,0.88)" : "rgba(200,216,228,0.9)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: "0.05em" }}>FUNNEL A — EscorteSheet</span>
        <div style={{ width: 1, height: 20, background: border, margin: "0 8px" }} />
        <span style={{ fontSize: 11, color: t3 }}>1226 LOC · favoris_trajets + trajets_recents</span>
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
          height: view === "hub" ? "64%" : "28%",
          background: mapBg,
          transition: "height 0.5s cubic-bezier(0.32,0.72,0,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: TEAL, border: "2.5px solid white", boxShadow: "0 0 0 7px rgba(59,180,193,0.18)" }} />
        </div>

        {/* Panel */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: view === "hub" ? "38%" : "75%",
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

          {/* Hub view */}
          {view === "hub" && (
            <div style={{ padding: "6px 18px 18px", flex: 1, overflowY: "auto" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 2 }}>Mon trajet</div>
                  <div style={{ fontSize: 12, color: t3 }}>🕐 9:41 · Paris</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: elBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: t3 }}>✕</span>
                </div>
              </div>

              {/* CTA 1 — Marche avec moi */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, background: isDark ? "rgba(59,180,193,0.08)" : "rgba(59,180,193,0.07)", border: `1px solid ${TEAL}35`, borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(59,180,193,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>👥</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 2 }}>Marche avec moi</div>
                    <div style={{ fontSize: 11, color: t3 }}>Ton cercle alerté · sans destination</div>
                  </div>
                  <div style={{ background: "rgba(59,180,193,0.10)", border: `1px solid ${TEAL}30`, borderRadius: 100, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: TEAL }}>1 TAP</span>
                  </div>
                </div>
                {/* History pill */}
                <div style={{ width: 62, borderRadius: 12, background: "rgba(59,180,193,0.08)", border: "1px solid rgba(59,180,193,0.20)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>🕐</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: TEAL, textTransform: "uppercase" as const }}>Historique</span>
                </div>
              </div>

              {/* CTA 2 — Trajet avec destination */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div onClick={() => setView("trip-form")} style={{ flex: 1, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.20)", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>✈️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 2 }}>Trajet avec destination</div>
                    <div style={{ fontSize: 11, color: t3 }}>Itinéraire protégé · arrivée tracée</div>
                  </div>
                  <span style={{ color: PURPLE, fontSize: 16 }}>›</span>
                </div>
                {/* History pill */}
                <div style={{ width: 62, borderRadius: 12, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>🕐</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: PURPLE, textTransform: "uppercase" as const }}>Historique</span>
                </div>
              </div>

              <div style={{ height: 1, background: border, marginBottom: 10 }} />

              {/* Favoris row */}
              <div style={{ width: "100%", background: "rgba(245,195,65,0.06)", border: "1px solid rgba(245,195,65,0.18)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9, marginBottom: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 14 }}>⭐</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: GOLD }}>Mes favoris</span>
                <span style={{ background: "rgba(245,195,65,0.15)", color: GOLD, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{MOCK_FAVORIS.length}</span>
                <span style={{ color: GOLD, fontSize: 12 }}>›</span>
              </div>

              {/* Récents */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: t3 }}>Récents</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: TEAL, cursor: "pointer" }}>Voir tout</span>
              </div>

              {MOCK_RECENTS.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", marginBottom: 1, cursor: "pointer" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: elBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11 }}>🕐</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{r.dest_name}</div>
                    <div style={{ fontSize: 9, color: t3 }}>{r.duration_min} min</div>
                  </div>
                  <span style={{ color: t3, fontSize: 11 }}>›</span>
                </div>
              ))}
            </div>
          )}

          {/* Trip form view */}
          {view === "trip-form" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "9px 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div onClick={() => { setView("hub"); setQuery(""); setSelectedDest(null); }} style={{ width: 26, height: 26, borderRadius: "50%", background: elBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 10, color: t2 }}>‹</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t1, flex: 1 }}>Trajet avec destination</span>
                  {selectedDest && (
                    <div style={{ background: t1, color: bg, padding: "8px 16px", borderRadius: 99, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                      18 min →
                    </div>
                  )}
                </div>

                {/* Départ → Destination card */}
                <div style={{ background: elBg, border: `1px solid ${border}`, borderRadius: 12, padding: "9px 11px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} />
                    <div style={{ width: 1, height: 14, background: border }} />
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: RED }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: t2 }}>Ma position</div>
                    <div style={{ height: 1, background: border }} />
                    <input
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSelectedDest(null); }}
                      placeholder="Rechercher une destination"
                      style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: t1, fontFamily: "inherit" }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Search results */}
                {filteredSearch.length > 0 && (
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
                    {filteredSearch.map((r, i) => (
                      <div key={r.name} onClick={() => { setQuery(r.name); setSelectedDest(r.name); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderBottom: i < filteredSearch.length - 1 ? `1px solid ${border}` : "none", cursor: "pointer" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59,180,193,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{r.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: t3 }}>{r.address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mode pills */}
                {selectedDest && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, borderBottom: `1px solid ${border}`, paddingBottom: 8 }}>
                      {([["walk", "🚶", "À pied"], ["transit", "🚇", "Transports"], ["bike", "🚲", "Vélo"], ["car", "🚗", "Voiture"]] as const).map(([id, emoji, label]) => (
                        <div key={id} onClick={() => setRouteMode(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", borderRadius: 10, cursor: "pointer", background: routeMode === id ? "rgba(59,180,193,0.15)" : "transparent" }}>
                          <span style={{ fontSize: 16 }}>{emoji}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, color: routeMode === id ? TEAL : t3 }}>{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Mock route cards */}
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: t3, textAlign: "center", padding: "4px 0" }}>Itinéraires</div>
                    {[
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
                    ))}
                  </>
                )}

                {/* Favoris + Récents when no query */}
                {!query && !selectedDest && (
                  <>
                    {/* Favoris chips */}
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                      {MOCK_FAVORIS.map(f => (
                        <div key={f.id} onClick={() => { setQuery(f.label); setSelectedDest(f.label); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, border: `1px solid ${border}`, background: cardBg, cursor: "pointer", flexShrink: 0 }}>
                          <span style={{ fontSize: 11 }}>⭐</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: t1, whiteSpace: "nowrap" }}>{f.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Recent list */}
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: t3, marginTop: 4 }}>Récents</div>
                    {MOCK_RECENTS.map(r => (
                      <div key={r.id} onClick={() => { setQuery(r.dest_name); setSelectedDest(r.dest_name); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", borderBottom: `1px solid ${border}` }}>
                        <span style={{ fontSize: 14 }}>🕐</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{r.dest_name}</div>
                          <div style={{ fontSize: 10, color: t3 }}>{r.dest_address}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
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
        <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 8 }}>Funnel A — EscorteSheet</div>
        <div style={{ fontSize: 12, color: t3, lineHeight: 1.6 }}>
          • Source: EscorteSheet.tsx (1226 LOC)<br />
          • DB: <b style={{ color: GOLD }}>favoris_trajets</b> + <b style={{ color: TEAL }}>trajets_recents</b><br />
          • Hub: 2 CTAs + history pills + favoris row (link) + récents list<br />
          • Trip form: Départ/dest card, mode pills, 3 route options, scoring<br />
          • Gère aussi: escorte immédiate, escorte live, arrived modal
        </div>
      </div>
    </div>
  );
}
