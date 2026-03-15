"use client";

/**
 * MOCKUP — Escorte Live View
 * Pixel-match of escorte-live-redesign.html
 * Walk mode: destination card, next step (turn direction), HUD timer, audio bar, participants
 * Transit mode: destination card, next step (metro/transit), HUD timer, audio bar, participants
 */

import { useState, useEffect, useRef } from "react";

// ── Tokens ──

const tk = (d: boolean) => ({
  teal: "#3BB4C1", teal12: "rgba(59,180,193,0.12)", teal24: "rgba(59,180,193,0.24)",
  green: "#34D399", green12: "rgba(52,211,153,0.12)", green30: "rgba(52,211,153,0.30)",
  red: "#EF4444", red12: "rgba(239,68,68,0.12)",
  purple: "#A78BFA",
  bg: d ? "#050A14" : "#C8D8E8",
  s0: d ? "#08111E" : "#F0F6FA",
  s1: d ? "rgba(10,18,32,0.96)" : "rgba(248,250,252,0.97)",
  s2: d ? "rgba(18,28,48,0.85)" : "rgba(241,246,250,0.90)",
  selev: d ? "#1E293B" : "#F1F5F9",
  t1: d ? "#FFF" : "#0A1220",
  t2: d ? "#94A3B8" : "#3A5068",
  t3: d ? "#4A5E72" : "#7A96AA",
  b1: d ? "rgba(255,255,255,0.04)" : "rgba(10,18,32,0.04)",
  b2: d ? "rgba(255,255,255,0.08)" : "rgba(10,18,32,0.08)",
  b3: d ? "rgba(255,255,255,0.14)" : "rgba(10,18,32,0.14)",
  mapBg: d ? "#06111E" : "#C8D8E6",
  mapRoad: d ? "rgba(30,58,95,0.9)" : "rgba(255,255,255,0.55)",
  mapRoadMain: d ? "rgba(59,100,150,0.85)" : "rgba(255,255,255,0.92)",
  mapWater: d ? "#071828" : "#B0C8DC",
  mapPark: d ? "#081A10" : "#BDD0C8",
  mapBuilding: d ? "#0C1626" : "#C0D0DE",
  sheetBg: d ? "rgba(10,18,32,0.96)" : "rgba(255,255,255,0.92)",
  sheetBorder: d ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
  sbColor: d ? "white" : "#1a2a3a",
  toolbarBg: d ? "rgba(5,10,20,0.92)" : "rgba(192,214,230,0.92)",
  toolbarBorder: d ? "rgba(255,255,255,0.06)" : "rgba(10,18,32,0.08)",
  tbColor: d ? "rgba(255,255,255,0.4)" : "#3A5068",
  tbBorder: d ? "rgba(255,255,255,0.12)" : "rgba(10,18,32,0.14)",
  phoneShadow: d
    ? "0 32px 80px rgba(0,0,0,0.4), 0 0 0 5px rgba(255,255,255,0.025)"
    : "0 32px 80px rgba(0,0,0,0.12), 0 0 0 5px rgba(255,255,255,0.5)",
  mapFade: d ? "#08111E" : "#F0F6FA",
});

// ── StatusBar ──

function StatusBar({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px 0", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="13" height="10" viewBox="0 0 16 12" fill={color}><rect x="0" y="4" width="2.5" height="8" rx="1" opacity=".35" /><rect x="4.5" y="2.5" width="2.5" height="9.5" rx="1" opacity=".6" /><rect x="9" y="1" width="2.5" height="11" rx="1" opacity=".85" /><rect x="13.5" y="0" width="2.5" height="12" rx="1" /></svg>
        <svg width="22" height="10" viewBox="0 0 26 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke={color} opacity=".38" /><rect x="2" y="2" width="17" height="9" rx="2" fill={color} /><path d="M24 4.5v4a2 2 0 000-4z" fill={color} opacity=".45" /></svg>
      </div>
    </div>
  );
}

// ── Map SVG ──

function MapSvg({ t }: { t: ReturnType<typeof tk> }) {
  return (
    <svg viewBox="0 0 320 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="320" height="200" fill={t.mapBg} />
      <path fill={t.mapWater} d="M0 130Q40 122 80 128Q120 134 160 124Q200 114 240 122Q280 130 320 120L320 150Q280 142 240 138Q200 134 160 144Q120 154 80 148Q40 142 0 150Z" />
      <ellipse fill={t.mapPark} cx="55" cy="80" rx="40" ry="26" />
      <rect fill={t.mapBuilding} x="120" y="30" width="22" height="16" rx="2" />
      <rect fill={t.mapBuilding} x="146" y="25" width="15" height="20" rx="2" />
      <rect fill={t.mapBuilding} x="200" y="28" width="18" height="22" rx="2" />
      {/* road glow */}
      <line stroke="rgba(59,180,193,0.06)" strokeWidth="8" strokeLinecap="round" x1="0" y1="100" x2="320" y2="96" style={{ filter: "blur(2px)" }} />
      {/* roads */}
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="0" y1="72" x2="320" y2="69" />
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="80" y1="0" x2="78" y2="120" />
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="220" y1="0" x2="218" y2="120" />
      <line stroke={t.mapRoadMain} strokeWidth="3.5" strokeLinecap="round" x1="0" y1="100" x2="320" y2="96" />
      <line stroke={t.mapRoadMain} strokeWidth="3.5" strokeLinecap="round" x1="160" y1="0" x2="162" y2="120" />
      {/* animated route */}
      <path fill="none" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="8 4" d="M80 165 L80 100 L160 96 L218 96 L218 30" style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.5))" }}>
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
      </path>
      {/* origin dot */}
      <circle cx="80" cy="165" r="5" fill="#34D399" stroke="white" strokeWidth="2" />
      {/* dest dot */}
      <circle cx="218" cy="30" r="5" fill="#A78BFA" stroke="white" strokeWidth="2" />
      {/* user pin */}
      <circle cx="80" cy="165" r="14" fill="rgba(59,180,193,0.08)" />
      <circle cx="80" cy="165" r="6" fill="white" stroke="#3BB4C1" strokeWidth="2.5" />
      {/* ETA progress overlay */}
      <path fill="none" stroke="rgba(52,211,153,0.25)" strokeWidth="3.5" strokeLinecap="round" d="M80 165 L80 100 L130 97" />
    </svg>
  );
}

// ── SVG Icons ──

const IcSend = ({ size = 16, color = "#A78BFA" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(167,139,250,0.2)" />
  </svg>
);

const IcCheck = ({ size = 14, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IcShare = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const IcStop = ({ size = 14, color = "#EF4444" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const IcChevronR = ({ size = 9, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IcArrowR = ({ size = 9, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="12 5 19 12 12 19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── BottomNav ──

function BottomNav({ t }: { t: ReturnType<typeof tk> }) {
  const items = [
    { label: "Communaut\u00e9", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.t3} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
    { label: "Cercle", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.t3} strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg> },
    { label: "Trajet", active: true, icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.teal} strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(59,180,193,0.15)" /></svg> },
    { label: "Julia", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.t3} strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 8px 20px", borderTop: `1px solid ${t.b1}`, background: t.s0, flexShrink: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 8px", cursor: "pointer" }}>
          <div style={{ position: "relative", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.icon}</div>
          <span style={{ fontSize: 9, fontWeight: 500, color: it.active ? t.teal : t.t3 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── WaveBars ──

function WaveBars({ t }: { t: ReturnType<typeof tk> }) {
  const heights = [6, 14, 20, 12, 8];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 16 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 2.5, borderRadius: 2, background: t.teal, height: h,
          animation: `wv 1.1s ease-in-out infinite ${i * 0.12}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main ──

export default function EscorteLiveMockup() {
  const [isDark, setIsDark] = useState(true);
  const [isTransit, setIsTransit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = tk(isDark);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 16px 48px", gap: 16, transition: "background .4s" }}>

      {/* Keyframe styles */}
      <style>{`
        @keyframes shimmer { 0%,100%{left:-60%} 50%{left:120%} }
        @keyframes pdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.55)} }
        @keyframes wv { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
        @keyframes routeDash { to{stroke-dashoffset:-20} }
      `}</style>

      {/* Toolbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 52,
        background: t.toolbarBg, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${t.toolbarBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <button onClick={() => setIsDark(!isDark)} style={tbStyle(t, true)}>
          {isDark ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
        </button>
        <div style={{ width: 1, height: 18, background: t.b2 }} />
        <button onClick={() => setIsTransit(!isTransit)} style={tbStyle(t, true)}>
          {isTransit ? "\uD83D\uDE87 Transit" : "\uD83D\uDEB6 Marche"}
        </button>
        <div style={{ width: 1, height: 18, background: t.b2 }} />
        <a href="/mockup" style={{ ...tbStyle(t, false), textDecoration: "none" }}>\u2190 Back</a>
      </nav>

      {/* Phone frame */}
      <div style={{
        width: 320, borderRadius: 48, overflow: "hidden", position: "relative",
        background: t.s0, border: `1px solid ${t.b2}`,
        boxShadow: t.phoneShadow,
        display: "flex", flexDirection: "column",
      }}>
        <StatusBar color={t.sbColor} />

        {/* Map area */}
        <div style={{ height: 200, position: "relative", overflow: "hidden", flexShrink: 0, background: t.mapBg }}>
          <MapSvg t={t} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, pointerEvents: "none", background: `linear-gradient(0deg, ${t.mapFade} 0%, transparent 100%)` }} />
        </div>

        {/* Sheet */}
        <div style={{
          background: t.sheetBg, backdropFilter: "blur(32px) saturate(180%)",
          borderRadius: "24px 24px 0 0", borderTop: `1px solid ${t.sheetBorder}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
        }}>
          {/* teal accent line */}
          <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 1, background: "linear-gradient(90deg,transparent,rgba(59,180,193,0.35),rgba(255,255,255,0.2),rgba(59,180,193,0.35),transparent)" }} />
          {/* handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", flexShrink: 0 }}>
            <div style={{ width: 34, height: 4, borderRadius: 9999, background: t.b3 }} />
          </div>

          {/* Scroll body */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>

            {/* ── Destination card ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 16,
              border: `1px solid ${t.b2}`, background: t.s2, position: "relative", overflow: "hidden",
            }}>
              {/* shimmer */}
              <div style={{ position: "absolute", top: 0, left: "-100%", width: "55%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.04),transparent)", animation: "shimmer 5s ease-in-out infinite 1s" }} />
              {/* icon */}
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IcSend size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.t1 }}>Maison &middot; Rue de la Paix</div>
                <div style={{ fontSize: 11, color: t.t2, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green, animation: "pdot 2s ease-in-out infinite" }} />
                  <span>~39 min restantes</span>
                  <span style={{ color: t.t3 }}>&middot;</span>
                  <span style={{ color: t.t3 }}>3.2 km</span>
                </div>
              </div>
              {/* circular progress */}
              <div style={{ width: 36, height: 36, position: "relative", flexShrink: 0 }}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke={t.b2} strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#34D399" strokeWidth="3"
                    strokeDasharray="87.96" strokeDashoffset="52.8" strokeLinecap="round"
                    transform="rotate(-90 18 18)" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: t.green }}>40%</div>
              </div>
            </div>

            {/* ── Next step — Walk ── */}
            {!isTransit && (
              <div style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 16,
                border: `1px solid ${t.teal24}`,
                background: "linear-gradient(135deg,rgba(59,180,193,0.08),rgba(59,180,193,0.03))",
                position: "relative", overflow: "hidden",
              }}>
                {/* shimmer */}
                <div style={{ position: "absolute", top: 0, left: "-100%", width: "55%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(59,180,193,0.06),transparent)", animation: "shimmer 5s ease-in-out infinite 2s" }} />
                {/* direction icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  background: "rgba(59,180,193,0.14)", border: `1px solid ${t.teal24}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 12px rgba(59,180,193,0.12)",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3BB4C1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.t1, lineHeight: 1.2 }}>Tourner \u00e0 droite</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.teal, marginTop: 2 }}>dans 500m &middot; Rue de Rivoli</div>
                  <div style={{ fontSize: 10, color: t.t3, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <IcArrowR size={9} color={t.t3} />
                    Ensuite &middot; continuer tout droit 1.2km
                  </div>
                </div>
                {/* step progress bar */}
                <div style={{ width: 3, height: 42, borderRadius: 9999, background: t.b2, position: "relative", flexShrink: 0, overflow: "hidden" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: t.teal, borderRadius: 9999 }} />
                </div>
              </div>
            )}

            {/* ── Next step — Transit ── */}
            {isTransit && (
              <div style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 16,
                border: "1px solid rgba(167,139,250,0.25)",
                background: "linear-gradient(135deg,rgba(167,139,250,0.08),rgba(167,139,250,0.03))",
              }}>
                {/* metro badge */}
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "white",
                  background: "linear-gradient(135deg,#A78BFA,#4A2C5A)",
                }}>M3</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA", lineHeight: 1.2 }}>Direction Gallieni</div>
                  <div style={{ fontSize: 11, color: t.t2, marginTop: 2 }}>3 arr\u00eats restants</div>
                  <div style={{ fontSize: 10, color: t.t3, marginTop: 3 }}>Prochain arr\u00eat &middot; Arts et M\u00e9tiers</div>
                </div>
                {/* stop dots */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#A78BFA", opacity: 1 }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#A78BFA", opacity: 0.5 }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#A78BFA", opacity: 0.25 }} />
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.b2, opacity: 1 }} />
                </div>
              </div>
            )}

            {/* ── HUD row ── */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 10,
                padding: "10px 13px", borderRadius: 14,
                border: `1px solid ${t.b2}`, background: t.s2,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: t.t1, lineHeight: 1 }}>{mm}:{ss}</div>
                  <div style={{ fontSize: 9, color: t.red, marginTop: 2, display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.red, animation: "pdot 1.2s ease-in-out infinite" }} />
                    REC
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 20,
                  background: t.green12, border: `1px solid ${t.green30}`,
                  color: t.green, fontSize: 10, fontWeight: 700,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green, animation: "pdot 2s ease-in-out infinite" }} />
                  En marche
                </div>
              </div>
            </div>

            {/* ── Audio bar ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 12,
              background: `linear-gradient(135deg,${t.teal12},rgba(59,180,193,0.05))`,
              border: `1px solid ${t.teal24}`,
            }}>
              <WaveBars t={t} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>Canal audio actif</div>
                <div style={{ fontSize: 10, color: t.t2, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                  <span style={{ color: t.teal }}>{mm}:{ss}</span>
                  <span>&middot;</span>
                  <span>2 participants</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {/* Mute */}
                <button style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `1px solid ${t.b2}`, background: t.b1 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.t2} strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8" /></svg>
                </button>
                {/* Hangup */}
                <button style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "1px solid rgba(239,68,68,.2)", background: t.red12 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 2 2 0 01-.45-2.11" /><line x1="23" y1="1" x2="1" y2="23" /></svg>
                </button>
              </div>
            </div>

            {/* ── Participants ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: -2 }}>Participants</div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, marginTop: 6 }}>
                {[
                  { initials: "V", name: "Vous", bg: `linear-gradient(135deg,${t.teal},#1E3A5F)` },
                  { initials: "MC", name: "Marie", bg: `linear-gradient(135deg,${t.green},#1E3A5F)` },
                  { initials: "SL", name: "Sophie", bg: `linear-gradient(135deg,${t.purple},#4A2C5A)` },
                ].map((p, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", borderRadius: 10, background: t.selev, border: `1px solid ${t.b1}`, minWidth: 50, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", background: p.bg, position: "relative" }}>
                      {p.initials}
                      <div style={{ position: "absolute", bottom: -1, right: -1, width: 7, height: 7, borderRadius: "50%", background: t.green, border: `2px solid ${t.selev}` }} />
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: t.t2 }}>{p.name}</div>
                  </div>
                ))}
                {/* Invite card */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", borderRadius: 10, background: t.selev, border: `1.5px dashed ${t.b2}`, minWidth: 50, flexShrink: 0, cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.teal12, border: `1.5px dashed ${t.teal24}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.teal, fontSize: 18 }}>+</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: t.teal }}>Inviter</div>
                </div>
              </div>
            </div>

          </div>{/* /body */}

          {/* ── Bottom actions ── */}
          <div style={{ flexShrink: 0, padding: "8px 14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Arrived CTA */}
            <button style={{
              flex: 1, height: 42, borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#34D399,#2aaa82)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              fontFamily: "inherit",
            }}>
              <IcCheck /> Je suis arriv\u00e9e
            </button>
            {/* Share */}
            <button style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: t.s2, border: `1px solid ${t.b2}`,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <IcShare color={t.t2} />
            </button>
            {/* Cancel */}
            <button style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: t.red12, border: "1px solid rgba(239,68,68,.2)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <IcStop />
            </button>
          </div>

        </div>{/* /sheet */}

        <BottomNav t={t} />

      </div>{/* /phone */}
    </div>
  );
}

// ── Toolbar button style ──

function tbStyle(t: ReturnType<typeof tk>, on: boolean): React.CSSProperties {
  return {
    height: 30, padding: "0 13px", borderRadius: 9999,
    border: on ? `1px solid ${t.teal}` : `1px solid ${t.tbBorder}`,
    background: on ? t.teal : "transparent",
    color: on ? "#fff" : t.tbColor,
    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "all .2s",
  };
}
