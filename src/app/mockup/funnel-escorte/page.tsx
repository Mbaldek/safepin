"use client";

/**
 * MOCKUP — Funnel Escorte: Hub + Destination
 * Pixel-match of trajet-panels-v2.html
 */

import { useState, useEffect, useRef } from "react";

// ── Tokens (matching HTML CSS vars) ──

const tokens = (isDark: boolean) => ({
  teal: "#3BB4C1",
  tealS: "rgba(59,180,193,0.12)",
  green: "#34D399",
  greenS: "rgba(52,211,153,0.10)",
  greenB: "rgba(52,211,153,0.22)",
  purple: "#A78BFA",
  purpleS: "rgba(167,139,250,0.10)",
  purpleB: "rgba(167,139,250,0.22)",
  gold: "#F5C341",
  warn: "#FBBF24",
  danger: "#EF4444",

  bg: isDark ? "#080F1C" : "#C8D8E4",
  s0: isDark ? "#0D1626" : "#EFF4F8",
  s1: isDark ? "#131F30" : "#FFFFFF",
  s2: isDark ? "#1A2840" : "#F3F7FA",
  s3: isDark ? "#223050" : "#E8EFF5",

  t1: isDark ? "#FFFFFF" : "#0D1626",
  t2: isDark ? "#94A3B8" : "#4A5C6E",
  t3: isDark ? "#546070" : "#8FA0AE",

  b1: isDark ? "rgba(255,255,255,0.05)" : "rgba(13,22,38,0.05)",
  b2: isDark ? "rgba(255,255,255,0.09)" : "rgba(13,22,38,0.09)",
  b3: isDark ? "rgba(255,255,255,0.15)" : "rgba(13,22,38,0.14)",

  mapBg: isDark ? "#101c2c" : "#C0D0DC",
  mapRoad: isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.6)",
});

// ── SVG Icons (exact from HTML) ──

const IcUsers = ({ color = "#34D399" }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IcSend = ({ color = "#A78BFA" }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IcChevronRight = ({ color = "var(--green)" }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IcChevronLeft = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IcSearch = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IcNavSend = ({ color, size = 14 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IcStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F5C341" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Bottom nav icons
const IcChat = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const IcHeart = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const IcTrajet = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(59,180,193,0.15)" />
  </svg>
);
const IcJulia = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Status bar icons
const IcSignal = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
    <rect x="0" y="4" width="2.5" height="8" rx="1" opacity="0.35" />
    <rect x="4" y="2.5" width="2.5" height="9.5" rx="1" opacity="0.6" />
    <rect x="8" y="1" width="2.5" height="11" rx="1" opacity="0.85" />
    <rect x="12" y="0" width="2.5" height="12" rx="1" />
  </svg>
);
const IcWifi = () => (
  <svg width="15" height="11" viewBox="0 0 24 17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
    <path d="M1 5s5-4 11-4 11 4 11 4" opacity="0.38" />
    <path d="M4.5 9s3.5-2.5 7.5-2.5S19.5 9 19.5 9" opacity="0.65" />
    <path d="M8 13s2-1 4-1 4 1 4 1" />
    <circle cx="12" cy="16" r="1.5" fill="white" stroke="none" />
  </svg>
);
const IcBattery = () => (
  <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
    <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="white" opacity="0.38" />
    <rect x="2" y="2" width="17" height="9" rx="2" fill="white" />
    <path d="M24 4.5v4a2 2 0 000-4z" fill="white" opacity="0.45" />
  </svg>
);

// ── Mock data ──

const MOCK_FAVORIS = [
  { id: "1", label: "Maison", color: "#34D399", distKm: "1,2" },
  { id: "2", label: "Bureau", color: "#3BB4C1", distKm: "3,4" },
  { id: "3", label: "Pernod Ricard", color: "#A78BFA", distKm: "2,1" },
  { id: "4", label: "Palais Royal", color: "#F5C341", distKm: "4,8" },
];

const MOCK_RECENTS: {
  id: string; name: string; meta: string;
  safety: "Sûr" | "Modéré"; iconColor: string; iconBg: string;
}[] = [
  { id: "1", name: "Gare du Nord", meta: "Hier · 18 min · 1,8 km", safety: "Sûr", iconColor: "#A78BFA", iconBg: "rgba(167,139,250,0.1)" },
  { id: "2", name: "Châtelet – Les Halles", meta: "Lundi · 24 min · 2,3 km", safety: "Modéré", iconColor: "#3BB4C1", iconBg: "rgba(59,180,193,0.1)" },
  { id: "3", name: "Pernod Ricard", meta: "Vendredi · 18 min · 1,2 km", safety: "Sûr", iconColor: "#34D399", iconBg: "rgba(52,211,153,0.1)" },
  { id: "4", name: "Opéra Garnier", meta: "Mercredi · 31 min · 3,1 km", safety: "Sûr", iconColor: "#F5C341", iconBg: "rgba(245,195,65,0.1)" },
];

const PLACES = [
  "Gare de Lyon", "Gare Montparnasse", "République", "Nation",
  "Oberkampf", "Bastille", "Louvre", "Place d'Italie",
  "Odéon", "Saint-Sulpice", "Pigalle", "Montmartre",
  "Belleville", "Ménilmontant", "La Villette", "Vincennes",
];

// ── Component ──

export default function FunnelEscorteMockup() {
  const [isDark, setIsDark] = useState(true);
  const [state, setState] = useState<1 | 3>(1);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const tk = tokens(isDark);

  // Focus search on dest open
  useEffect(() => {
    if (state === 3) {
      const t = setTimeout(() => searchRef.current?.focus(), 520);
      return () => clearTimeout(t);
    }
  }, [state]);

  const hits = query.length > 0
    ? PLACES.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const go = (n: 1 | 3) => {
    if (n === state) return;
    setState(n);
    if (n === 1) { setQuery(""); setShowResults(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "72px 24px 48px",
      fontFamily: "'Inter', -apple-system, sans-serif",
      transition: "background 0.35s",
    }}>
      {/* ── TOOLBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: isDark ? "rgba(8,15,28,0.88)" : "rgba(200,216,228,0.9)",
        backdropFilter: "blur(18px) saturate(1.5)",
        WebkitBackdropFilter: "blur(18px) saturate(1.5)",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(13,22,38,0.08)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <TbBtn active={state === 1} onClick={() => go(1)} isDark={isDark} tk={tk}>⓪ Repos</TbBtn>
          <TbBtn active={state === 3} onClick={() => go(3)} isDark={isDark} tk={tk} activeColor={tk.purple}>② Destination</TbBtn>
        </div>
        <div style={{ width: 1, height: 20, background: tk.b2, margin: "0 6px" }} />
        <button onClick={() => setIsDark(!isDark)} style={{
          height: 32, padding: "0 14px", borderRadius: 9999,
          border: `1px solid ${tk.b2}`, background: tk.s2, color: tk.t2,
          fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>
          {isDark ? "☀️ Light" : "🌙 Dark"}
        </button>
        <a href="/mockup" style={{
          height: 32, padding: "0 14px", borderRadius: 9999,
          border: `1px solid ${tk.b2}`, background: "transparent", color: tk.t3,
          fontSize: 12, fontWeight: 500, textDecoration: "none", fontFamily: "inherit",
          display: "flex", alignItems: "center",
        }}>← Back</a>
      </nav>

      {/* ── PHONE FRAME ── */}
      <div style={{
        position: "relative", width: 375, height: 720,
        borderRadius: 50, overflow: "hidden",
        background: tk.s0, border: `1px solid ${tk.b2}`,
        boxShadow: isDark
          ? "0 0 0 6px rgba(255,255,255,0.025), 0 40px 120px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.3)"
          : "0 0 0 6px rgba(255,255,255,0.4), 0 40px 120px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.1)",
        userSelect: "none",
      }}>

        {/* STATUS BAR */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 26px 0", pointerEvents: "none",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "white" : tk.s0, letterSpacing: "-0.01em" }}>9:41</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <IcSignal /><IcWifi /><IcBattery />
          </div>
        </div>

        {/* MAP */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: tk.mapBg,
          height: state === 1 ? "64%" : "28%",
          transition: "height 0.5s cubic-bezier(0.32,0.72,0,1)",
          overflow: "hidden",
        }}>
          {/* Grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(${tk.mapRoad} 1px, transparent 1px), linear-gradient(90deg, ${tk.mapRoad} 1px, transparent 1px)`,
            backgroundSize: "40px 40px", opacity: 0.6,
          }} />
          {/* Streets */}
          <div style={{ position: "absolute", left: 0, right: 0, top: "26%", height: 18, background: tk.mapRoad, borderRadius: 2, transform: "rotate(-3deg)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 11, background: tk.mapRoad, borderRadius: 2, transform: "rotate(2.5deg)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "70%", height: 8, background: tk.mapRoad, borderRadius: 2, transform: "rotate(-5deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "25%", width: 16, background: tk.mapRoad, borderRadius: 2, transform: "rotate(4deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "56%", width: 11, background: tk.mapRoad, borderRadius: 2, transform: "rotate(-2.5deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "76%", width: 7, background: tk.mapRoad, borderRadius: 2, transform: "rotate(6deg)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "38%", height: 5, background: tk.mapRoad, borderRadius: 2, opacity: 0.5, transform: "rotate(1deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "40%", width: 5, background: tk.mapRoad, borderRadius: 2, opacity: 0.5, transform: "rotate(-3deg)" }} />
          {/* User dot */}
          <div style={{
            position: "absolute", top: "43%", left: "50%", transform: "translate(-50%,-50%)",
            width: 14, height: 14, borderRadius: "50%", background: tk.teal,
            border: "2.5px solid white",
            boxShadow: "0 0 0 7px rgba(59,180,193,0.18), 0 0 0 16px rgba(59,180,193,0.07)",
            zIndex: 2,
          }} />
          {/* Map header */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 3,
            padding: "44px 20px 20px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            background: isDark
              ? "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 70%, transparent 100%)"
              : "linear-gradient(180deg, rgba(192,208,220,0.72) 0%, rgba(192,208,220,0.2) 70%, transparent 100%)",
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", color: isDark ? "white" : tk.s0 }}>BREVEIL</span>
            <div style={{ display: "flex", gap: 6 }}>
              <MapPill color={tk.teal} label="Position active" isDark={isDark} />
              <MapPill color={tk.warn} label="4 incidents" isDark={isDark} />
            </div>
          </div>
          {/* Bottom gradient bleed */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 72,
            background: `linear-gradient(0deg, ${tk.s1} 0%, transparent 100%)`,
            pointerEvents: "none",
          }} />
        </div>

        {/* ── PANEL ── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
          background: tk.s1,
          borderRadius: "28px 28px 0 0",
          borderTop: `1px solid ${tk.b2}`,
          height: state === 1 ? "38%" : "75%",
          transition: "height 0.5s cubic-bezier(0.32,0.72,0,1)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Handle */}
          <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 9999, background: tk.b3 }} />
          </div>

          {/* ════════ STATE 1: REPOS ════════ */}
          {state === 1 && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ padding: "6px 20px 0", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: tk.t3,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  padding: "6px 0 2px",
                }}>Mon trajet</div>

                {/* MAM button */}
                <div onClick={() => {}} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 16px", borderRadius: 18,
                  background: `linear-gradient(135deg, ${tk.greenS}, rgba(52,211,153,0.04))`,
                  border: `1.5px solid ${tk.greenB}`,
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: "rgba(52,211,153,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcUsers />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: tk.green }}>Marche avec moi</div>
                    <div style={{ fontSize: 12, color: tk.t2, marginTop: 3, lineHeight: 1.4 }}>Cercle alerté · sans destination</div>
                  </div>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: tk.b2,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcChevronRight color={tk.green} />
                  </div>
                </div>

                {/* DEST button */}
                <div onClick={() => go(3)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 16px", borderRadius: 18,
                  background: `linear-gradient(135deg, ${tk.purpleS}, rgba(167,139,250,0.04))`,
                  border: `1.5px solid ${tk.purpleB}`,
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: "rgba(167,139,250,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcSend />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: tk.purple }}>Trajet avec destination</div>
                    <div style={{ fontSize: 12, color: tk.t2, marginTop: 3, lineHeight: 1.4 }}>Itinéraire protégé · arrivée tracée</div>
                  </div>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: tk.b2,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcChevronRight color={tk.purple} />
                  </div>
                </div>
              </div>

              <BottomNav tk={tk} />
            </div>
          )}

          {/* ════════ STATE 3: DESTINATION ════════ */}
          {state === 3 && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
              {/* Search results overlay */}
              {showResults && hits.length > 0 && (
                <div style={{
                  position: "absolute", top: 60, left: 20, right: 20, zIndex: 10,
                  background: tk.s1, border: `1px solid ${tk.b2}`, borderRadius: 16,
                  overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}>
                  {hits.map((p, i) => (
                    <div key={p} style={{
                      display: "flex", alignItems: "center", gap: 11,
                      padding: "12px 14px",
                      borderBottom: i < hits.length - 1 ? `1px solid ${tk.b1}` : "none",
                      cursor: "pointer",
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: tk.tealS,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <IcSearch color={tk.teal} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: tk.t1 }}>{p}</div>
                        <div style={{ fontSize: 11, color: tk.t3, marginTop: 1 }}>Paris · calcul en cours…</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: "6px 20px 0", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                {/* Back + Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexShrink: 0 }}>
                  <div onClick={() => go(1)} style={{
                    width: 46, height: 46, borderRadius: 14,
                    border: `1.5px solid ${tk.b2}`, background: tk.s2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                  }}>
                    <IcChevronLeft color={tk.t2} />
                  </div>
                  <div style={{ position: "relative", flex: 1 }}>
                    <div style={{
                      position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                      pointerEvents: "none", display: "flex", color: tk.t3,
                    }}>
                      <IcSearch color={tk.t3} />
                    </div>
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                      onFocus={() => setShowResults(true)}
                      onBlur={() => setTimeout(() => setShowResults(false), 200)}
                      placeholder="Où allez-vous ?"
                      autoComplete="off"
                      style={{
                        width: "100%", height: 46,
                        padding: "0 14px 0 40px",
                        borderRadius: 14, border: `1.5px solid ${tk.b2}`,
                        background: tk.s2, color: tk.t1,
                        fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400,
                        outline: "none", WebkitAppearance: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Favoris */}
                <div style={{
                  fontSize: 11, fontWeight: 600, color: tk.t3,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  display: "flex", alignItems: "center", gap: 5,
                  marginBottom: 10, flexShrink: 0,
                }}>
                  <IcStar /> Favoris
                </div>
                <div style={{
                  display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2,
                  flexShrink: 0, marginBottom: 14,
                  scrollbarWidth: "none",
                }}>
                  {MOCK_FAVORIS.map(f => (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                      padding: "9px 13px", borderRadius: 13,
                      border: `1px solid ${tk.b2}`, background: tk.s2,
                      cursor: "pointer",
                    }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: tk.t1, whiteSpace: "nowrap" }}>{f.label}</div>
                        <div style={{ fontSize: 11, color: tk.t3, whiteSpace: "nowrap" }}>{f.distKm} km</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Récents header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexShrink: 0, marginBottom: 2,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: tk.t3,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>Récents</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: tk.teal, cursor: "pointer" }}>Voir tout</span>
                </div>

                {/* Récents list */}
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarWidth: "none" }}>
                  {MOCK_RECENTS.map((r, i) => {
                    const isSafe = r.safety === "Sûr";
                    return (
                      <div key={r.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 0",
                        borderBottom: i < MOCK_RECENTS.length - 1 ? `1px solid ${tk.b1}` : "none",
                        cursor: "pointer",
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 11,
                          background: r.iconBg,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <IcNavSend color={r.iconColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: tk.t1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3,
                          }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: tk.t3, marginTop: 2 }}>{r.meta}</div>
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 9999,
                          whiteSpace: "nowrap", flexShrink: 0,
                          background: isSafe ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                          color: isSafe ? tk.green : tk.warn,
                          border: `1px solid ${isSafe ? "rgba(52,211,153,0.18)" : "rgba(251,191,36,0.18)"}`,
                        }}>
                          {r.safety}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <BottomNav tk={tk} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function TbBtn({ children, active, onClick, isDark, tk, activeColor }: {
  children: React.ReactNode; active: boolean; onClick: () => void;
  isDark: boolean; tk: ReturnType<typeof tokens>; activeColor?: string;
}) {
  const ac = activeColor || tk.teal;
  return (
    <button onClick={onClick} style={{
      height: 32, padding: "0 14px", borderRadius: 9999,
      border: `1px solid ${active ? ac : tk.b2}`,
      background: active ? ac : "transparent",
      color: active ? "#fff" : tk.t3,
      fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
      whiteSpace: "nowrap",
    }}>
      {children}
    </button>
  );
}

function MapPill({ color, label, isDark }: { color: string; label: string; isDark: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "5px 11px", borderRadius: 9999,
      background: isDark ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.55)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.75)"}`,
      fontSize: 10, fontWeight: 600, color: isDark ? "white" : "#0D1626",
      whiteSpace: "nowrap",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </div>
  );
}

function BottomNav({ tk }: { tk: ReturnType<typeof tokens> }) {
  return (
    <div style={{
      flexShrink: 0, display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "10px 8px 20px", borderTop: `1px solid ${tk.b1}`, background: tk.s1,
    }}>
      <NavItem icon={<IcChat color={tk.t3} />} label="Communauté" tk={tk} dot />
      <NavItem icon={<IcHeart color={tk.t3} />} label="Cercle" tk={tk} />
      <NavItem icon={<IcTrajet color={tk.teal} />} label="Trajet" tk={tk} active />
      <NavItem icon={<IcJulia color={tk.t3} />} label="Julia" tk={tk} />
    </div>
  );
}

function NavItem({ icon, label, tk, active, dot }: {
  icon: React.ReactNode; label: string; tk: ReturnType<typeof tokens>;
  active?: boolean; dot?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 10px", cursor: "pointer" }}>
      <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
        {dot && <div style={{
          position: "absolute", top: -1, right: -1,
          width: 7, height: 7, borderRadius: "50%",
          background: tk.danger, border: `1.5px solid ${tk.s1}`,
        }} />}
      </div>
      <span style={{ fontSize: 10, fontWeight: 500, color: active ? tk.teal : tk.t3 }}>{label}</span>
    </div>
  );
}
