"use client";

/**
 * MOCKUP — Funnel Escorte: Hub + Destination
 * Design ref: trajet-panels-v2.html
 */

import { useState } from "react";

const TEAL = "#3BB4C1";

const MOCK_FAVORIS = [
  { id: "1", label: "Maison", color: "#3B82F6", distKm: 2.1 },
  { id: "2", label: "Bureau", color: "#8B5CF6", distKm: 4.3 },
  { id: "3", label: "Salle de sport", color: "#EC4899", distKm: 1.8 },
];

const MOCK_RECENTS: { id: string; dest_name: string; day: string; duration: string; dist: string; safety: "Sûr" | "Modéré" }[] = [
  { id: "1", dest_name: "Gare du Nord", day: "Hier", duration: "18 min", dist: "1,8 km", safety: "Sûr" },
  { id: "2", dest_name: "Châtelet – Les Halles", day: "Lundi", duration: "24 min", dist: "3,2 km", safety: "Modéré" },
  { id: "3", dest_name: "Place de la République", day: "Samedi", duration: "12 min", dist: "0,9 km", safety: "Sûr" },
];

// --- Inline SVG icons ---

const IconUsers = ({ size = 24, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconNavigation = ({ size = 24, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M3.27 2.04a1 1 0 0 1 1.09-.21l16.5 7.5a1 1 0 0 1 .01 1.82l-6.7 3.08-3.08 6.7a1 1 0 0 1-1.82-.01l-7.5-16.5a1 1 0 0 1 .21-1.09l.29-.29z" />
  </svg>
);

const IconChevronLeft = ({ size = 20, color = "#94A3B8" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconSearch = ({ size = 18, color = "#64748B" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconArrowRight = ({ size = 16, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconNavPin = ({ size = 16, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);

// --- Component ---

export default function FunnelEscorteMockup() {
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState<"hub" | "destination">("hub");
  const [query, setQuery] = useState("");

  const t1 = isDark ? "#FFFFFF" : "#0F172A";
  const t2 = isDark ? "#94A3B8" : "#475569";
  const t3 = isDark ? "#64748B" : "#94A3B8";
  const bg = isDark ? "#131F30" : "#FFFFFF";
  const mapBg = isDark ? "#101c2c" : "#C0D0DC";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080F1C" : "#C8D8E4", display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px 48px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, background: isDark ? "rgba(8,15,28,0.88)" : "rgba(200,216,228,0.9)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: "0.05em" }}>FUNNEL ESCORTE</span>
        <div style={{ width: 1, height: 20, background: border, margin: "0 8px" }} />
        <button onClick={() => setView("hub")} style={{ padding: "4px 12px", borderRadius: 99, border: `1px solid ${view === "hub" ? TEAL : border}`, background: view === "hub" ? "rgba(59,180,193,0.12)" : "transparent", color: view === "hub" ? TEAL : t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Hub</button>
        <button onClick={() => setView("destination")} style={{ padding: "4px 12px", borderRadius: 99, border: `1px solid ${view === "destination" ? TEAL : border}`, background: view === "destination" ? "rgba(59,180,193,0.12)" : "transparent", color: view === "destination" ? TEAL : t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Destination</button>
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

          {/* ══════════ HUB VIEW ══════════ */}
          {view === "hub" && (
            <div style={{ padding: "14px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>Mon trajet</div>
                <div style={{ fontSize: 11, color: t3 }}>🕐 9:41 · Paris</div>
              </div>

              {/* 2 Big buttons */}
              <div style={{ display: "flex", gap: 10, flex: 1 }}>
                {/* MAM */}
                <div style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                  borderRadius: 20,
                  padding: "16px 14px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 110,
                }}>
                  {/* Subtle glow */}
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconUsers size={22} />
                    </div>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconArrowRight size={14} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>Marche avec moi</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Ton cercle alerté</div>
                  </div>
                </div>

                {/* Destination */}
                <div onClick={() => { setView("destination"); setQuery(""); }} style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)",
                  borderRadius: 20,
                  padding: "16px 14px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 110,
                }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconNavigation size={20} />
                    </div>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconArrowRight size={14} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>Destination</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Itinéraire protégé</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ DESTINATION VIEW ══════════ */}
          {view === "destination" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Back + Search row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div onClick={() => setView("hub")} style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                    border: `1px solid ${border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                  }}>
                    <IconChevronLeft size={22} color={t2} />
                  </div>
                  <div style={{
                    flex: 1, height: 46, borderRadius: 14,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                    border: `1px solid ${border}`,
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "0 14px",
                  }}>
                    <IconSearch size={18} color={t3} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Où allez-vous ?"
                      style={{
                        background: "none", border: "none", outline: "none",
                        fontSize: 14, color: t1, fontFamily: "inherit",
                        flex: 1, height: "100%",
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Favoris chips */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: t3, marginBottom: 8 }}>Favoris</div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                    {MOCK_FAVORIS.map(f => (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", borderRadius: 12,
                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
                        border: `1px solid ${border}`,
                        cursor: "pointer", flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{f.label}</span>
                        <span style={{ fontSize: 11, color: t3 }}>{f.distKm} km</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Récents */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: t3, marginBottom: 8 }}>Récents</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {MOCK_RECENTS.map(r => {
                      const isSafe = r.safety === "Sûr";
                      const badgeColor = isSafe ? "#22C55E" : "#F59E0B";
                      const badgeBg = isSafe ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)";
                      return (
                        <div key={r.id} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 8px",
                          borderRadius: 12,
                          cursor: "pointer",
                        }}>
                          {/* Nav icon */}
                          <div style={{
                            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                            background: isDark ? "rgba(59,180,193,0.10)" : "rgba(59,180,193,0.08)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <IconNavPin size={16} color={TEAL} />
                          </div>
                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 2 }}>{r.dest_name}</div>
                            <div style={{ fontSize: 11, color: t3 }}>{r.day} · {r.duration} · {r.dist}</div>
                          </div>
                          {/* Safety badge */}
                          <div style={{
                            padding: "4px 10px", borderRadius: 99, flexShrink: 0,
                            background: badgeBg,
                            fontSize: 11, fontWeight: 600,
                            color: badgeColor,
                          }}>
                            {r.safety}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom nav */}
          <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 8px 20px", borderTop: `1px solid ${border}` }}>
            {([["💬", "Communauté", false], ["❤️", "Cercle", false], ["✈️", "Trajet", true], ["⭐", "Julia", false]] as const).map(([icon, label, active]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: active ? TEAL : t3 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, textAlign: "center", maxWidth: 375 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t1, marginBottom: 8 }}>Funnel Escorte — Design V2</div>
        <div style={{ fontSize: 12, color: t3, lineHeight: 1.6 }}>
          Hub: 2 gradient buttons (MAM vert + Dest violet)<br />
          Destination: back 46px + search pill + favoris chips + récents avec badges Sûr/Modéré
        </div>
      </div>
    </div>
  );
}
