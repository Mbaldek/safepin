"use client";

/**
 * MOCKUP — MAM 3 États (Marche avec moi)
 * Pixel-match of mam-3states.html
 * State 0: Démarrer · State 1: En attente · State 2: Active
 */

import { useState } from "react";

// ── Tokens ──

const tk = (d: boolean) => ({
  teal: "#3BB4C1", teal12: "rgba(59,180,193,0.12)", teal24: "rgba(59,180,193,0.24)",
  green: "#34D399", green12: "rgba(52,211,153,0.12)", green30: "rgba(52,211,153,0.30)",
  amber: "#FBBF24", amber10: "rgba(251,191,36,0.10)", amber30: "rgba(251,191,36,0.30)",
  red: "#EF4444", red12: "rgba(239,68,68,0.12)",
  purple: "#A78BFA",
  bg: d ? "#050A14" : "#C8D8E8",
  s0: d ? "#08111E" : "#F0F6FA",
  s1: d ? "rgba(10,18,32,0.96)" : "rgba(248,250,252,0.97)",
  s2: d ? "rgba(18,28,48,0.80)" : "rgba(241,246,250,0.90)",
  s3: d ? "#1A2840" : "#EFF4F8",
  selev: d ? "#1E293B" : "#F1F5F9",
  t1: d ? "#FFF" : "#0A1220",
  t2: d ? "#94A3B8" : "#3A5068",
  t3: d ? "#4A5E72" : "#7A96AA",
  b1: d ? "rgba(255,255,255,0.04)" : "rgba(10,18,32,0.04)",
  b2: d ? "rgba(255,255,255,0.08)" : "rgba(10,18,32,0.08)",
  b3: d ? "rgba(255,255,255,0.14)" : "rgba(10,18,32,0.14)",
  handle: d ? "rgba(255,255,255,0.13)" : "rgba(10,18,32,0.13)",
  shadow: d
    ? "0 24px 64px rgba(0,0,0,0.55)"
    : "0 24px 64px rgba(10,18,32,0.14)",
  phoneBorder: d
    ? "0 0 0 5px rgba(255,255,255,0.025)"
    : "0 0 0 5px rgba(255,255,255,0.5)",
  mapBg: d ? "#06111E" : "#C8DAEA",
  mapFade: d ? "#08111E" : "#F0F6FA",
  toolbarBg: d ? "rgba(5,10,20,0.92)" : "rgba(192,214,230,0.92)",
  toolbarBorder: d ? "rgba(255,255,255,0.06)" : "rgba(10,18,32,0.08)",
  tbColor: d ? "rgba(255,255,255,0.4)" : undefined,
  tbBorder: d ? "rgba(255,255,255,0.12)" : "rgba(10,18,32,0.14)",
  sheetBorder: d ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
  sheetBg: d ? undefined : "rgba(255,255,255,0.92)",
});

// ── SVG Icons ──

const IcUsers = ({ size = 14, color = "#34D399" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const IcX = ({ color }: { color: string }) => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
  </svg>
);

const IcChevron = ({ color, size = 10 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IcBell = ({ color = "#FBBF24", size = 13 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const IcPhone = ({ color = "#3BB4C1", size = 13 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const IcStar = ({ color = "#A78BFA", size = 13 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IcCheck = ({ color = "#34D399", size = 10 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IcCopy = ({ color = "#3BB4C1" }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const IcShare = ({ color = "#3BB4C1" }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const IcMicOff = ({ color = "var(--t2)" }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8" />
  </svg>
);

const IcPhoneOff = ({ color = "#EF4444" }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

// Bottom nav icons
const IcChat = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const IcHeart = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const IcTrajet = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(59,180,193,0.15)" />
  </svg>
);
const IcJulia = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Status bar
const IcSignal = ({ dark }: { dark: boolean }) => (
  <svg width="13" height="10" viewBox="0 0 16 12" fill={dark ? "white" : "#1a2a3a"}>
    <rect x="0" y="4" width="2.5" height="8" rx="1" opacity=".35" />
    <rect x="4.5" y="2.5" width="2.5" height="9.5" rx="1" opacity=".6" />
    <rect x="9" y="1" width="2.5" height="11" rx="1" opacity=".85" />
    <rect x="13.5" y="0" width="2.5" height="12" rx="1" />
  </svg>
);
const IcWifi = ({ dark }: { dark: boolean }) => (
  <svg width="14" height="10" viewBox="0 0 24 17" fill="none" stroke={dark ? "white" : "#1a2a3a"} strokeWidth="2.2" strokeLinecap="round">
    <path d="M1 5s5-4 11-4 11 4 11 4" opacity=".38" />
    <path d="M4.5 9s3.5-2.5 7.5-2.5 7.5 2.5 7.5 2.5" opacity=".65" />
    <path d="M8 13s2-1 4-1 4 1 4 1" />
    <circle cx="12" cy="16" r="1.5" fill={dark ? "white" : "#1a2a3a"} stroke="none" />
  </svg>
);
const IcBattery = ({ dark }: { dark: boolean }) => (
  <svg width="22" height="10" viewBox="0 0 26 13" fill="none">
    <rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke={dark ? "white" : "#1a2a3a"} opacity=".38" />
    <rect x="2" y="2" width="17" height="9" rx="2" fill={dark ? "white" : "#1a2a3a"} />
    <path d="M24 4.5v4a2 2 0 000-4z" fill={dark ? "white" : "#1a2a3a"} opacity=".45" />
  </svg>
);

// ── Mock data ──

const AVATARS = [
  { initials: "MC", bg: "linear-gradient(135deg,#34D399,#1E3A5F)" },
  { initials: "SL", bg: "linear-gradient(135deg,#3BB4C1,#4A2C5A)" },
  { initials: "JD", bg: "linear-gradient(135deg,#A78BFA,#4A2C5A)" },
];

const LEVELS = [
  { tag: "N1", color: "#FBBF24", bg: "rgba(251,191,36,.10)", border: "rgba(251,191,36,.28)", icon: "bell" as const, title: "Notification push", desc: "Tout le cercle reçoit une alerte et te suit sur la carte" },
  { tag: "N2", color: "#3BB4C1", bg: "rgba(59,180,193,.12)", border: "rgba(59,180,193,.24)", icon: "phone" as const, title: "Canal audio privé", desc: "Ils rejoignent une room audio, vous parlez en direct" },
  { tag: "N3", color: "#A78BFA", bg: "rgba(167,139,250,.1)", border: "rgba(167,139,250,.2)", icon: "star" as const, title: "Julia intervient", desc: "L\u2019IA alerte les secours si aucune réponse sous 30 min", soon: true },
];

const WAVE_HEIGHTS = [6, 14, 20, 12, 8];

// ── Component ──

export default function MAMPanelMockup() {
  const [isDark, setIsDark] = useState(true);
  const [state, setState] = useState<0 | 1 | 2>(1);
  const [code, setCode] = useState("");
  const t = tk(isDark);

  const levelIcon = (type: string, color: string) => {
    if (type === "bell") return <IcBell color={color} />;
    if (type === "phone") return <IcPhone color={color} />;
    return <IcStar color={color} />;
  };

  return (
    <>
      <style>{`
        @keyframes pulsedot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.55)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes wv{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        @keyframes shimmer{0%,100%{left:-60%}50%{left:120%}}
      `}</style>

      <div style={{
        minHeight: "100vh", background: t.bg,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "64px 16px 48px", gap: 16,
        fontFamily: "'Inter',-apple-system,sans-serif",
        transition: "background 0.4s",
      }}>

        {/* ── TOOLBAR ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 52,
          background: t.toolbarBg, backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.toolbarBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <TbBtn label="☀️ Light / 🌙 Dark" text={isDark ? "☀️ Light" : "🌙 Dark"} active onClick={() => setIsDark(!isDark)} t={t} />
          <div style={{ width: 1, height: 18, background: t.b2 }} />
          <TbBtn text="0 · Démarrer" active={state === 0} onClick={() => setState(0)} t={t} isState />
          <TbBtn text="1 · En attente" active={state === 1} onClick={() => setState(1)} t={t} isState />
          <TbBtn text="2 · Active" active={state === 2} onClick={() => setState(2)} t={t} isState />
        </nav>

        {/* ── PHONE ── */}
        <div style={{
          width: 320, borderRadius: 48, overflow: "hidden", position: "relative",
          background: t.s0,
          border: `1px solid ${t.b2}`,
          boxShadow: `${t.shadow}, ${t.phoneBorder}`,
          transition: "background 0.4s",
        }}>

          {/* STATUS BAR */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 22px 0", pointerEvents: "none",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "white" : "#1a2a3a" }}>9:41</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <IcSignal dark={isDark} /><IcWifi dark={isDark} /><IcBattery dark={isDark} />
            </div>
          </div>

          {/* MAP */}
          <div style={{ position: "relative", height: 200, overflow: "hidden", background: t.mapBg }}>
            <svg viewBox="0 0 320 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <rect width="320" height="200" fill={t.s3} />
              <path fill={isDark ? "#071828" : "#a0c4e0"} d="M0 130Q40 122 80 128Q120 134 160 124Q200 114 240 122Q280 130 320 120L320 150Q280 142 240 138Q200 134 160 144Q120 154 80 148Q40 142 0 150Z" />
              <ellipse fill={isDark ? "#081A10" : "#b0d8b0"} cx="55" cy="80" rx="40" ry="26" />
              {[[120,30,22,16],[146,25,15,20],[165,34,18,13],[200,28,18,22],[222,36,14,15]].map(([x,y,w,h], i) => (
                <rect key={i} fill={isDark ? "#0C1626" : "#d0dce8"} x={x} y={y} width={w} height={h} rx="2" />
              ))}
              {/* road glow */}
              <line stroke="rgba(59,180,193,.07)" strokeWidth="8" strokeLinecap="round" x1="0" y1="65" x2="320" y2="62" style={{ filter: "blur(2px)" }} />
              <line stroke="rgba(59,180,193,.05)" strokeWidth="6" strokeLinecap="round" x1="160" y1="0" x2="162" y2="120" style={{ filter: "blur(1px)" }} />
              {/* roads secondary */}
              <line stroke={isDark ? "rgba(30,58,95,.8)" : "rgba(160,190,220,.8)"} strokeWidth="2" strokeLinecap="round" x1="0" y1="48" x2="320" y2="46" />
              <line stroke={isDark ? "rgba(30,58,95,.8)" : "rgba(160,190,220,.8)"} strokeWidth="2" strokeLinecap="round" x1="80" y1="0" x2="78" y2="120" />
              <line stroke={isDark ? "rgba(30,58,95,.8)" : "rgba(160,190,220,.8)"} strokeWidth="2" strokeLinecap="round" x1="220" y1="0" x2="218" y2="120" />
              {/* roads main */}
              <line stroke={isDark ? "rgba(59,100,150,.9)" : "rgba(180,200,220,.9)"} strokeWidth="3.5" strokeLinecap="round" x1="0" y1="65" x2="320" y2="62" />
              <line stroke={isDark ? "rgba(59,100,150,.9)" : "rgba(180,200,220,.9)"} strokeWidth="3.5" strokeLinecap="round" x1="160" y1="0" x2="162" y2="120" />
              <path stroke={isDark ? "rgba(59,100,150,.9)" : "rgba(180,200,220,.9)"} strokeWidth="3" strokeLinecap="round" fill="none" d="M0 35L130 115L190 115L320 35" />
              {/* metro dot */}
              <circle cx="160" cy="62" r="4" fill="none" stroke="rgba(59,180,193,.6)" strokeWidth="1.5" />
              <circle cx="160" cy="62" r="2" fill="rgba(59,180,193,.8)" />
              {/* labels */}
              <text fill="rgba(59,180,193,.45)" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" x="126" y="57" textAnchor="middle">Av. de la Bourdonnais</text>
              <text fill="rgba(59,180,193,.35)" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" x="248" y="48">7e Arr.</text>
              <text fill="rgba(59,180,193,.35)" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="500" x="28" y="86" transform="rotate(-3,28,86)">Champ de Mars</text>
            </svg>
            {/* incident pins */}
            <div style={{ position: "absolute", top: "30%", left: "40%", width: 18, height: 18, borderRadius: "50%", background: "rgba(239,68,68,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,.3)", boxShadow: "0 0 8px rgba(239,68,68,.4)" }}>2</div>
            <div style={{ position: "absolute", top: "18%", left: "68%", width: 14, height: 14, borderRadius: "50%", background: "rgba(251,191,36,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,.3)", boxShadow: "0 0 8px rgba(251,191,36,.3)" }}>!</div>
            {/* user pin */}
            <div style={{ position: "absolute", top: "54%", left: "54%", transform: "translate(-50%,-50%)", zIndex: 3 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", border: "1.5px solid #3BB4C1", animation: "pulsedot 2.4s ease-out infinite" }} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", border: "1px solid #3BB4C1", animation: "pulsedot 2.4s ease-out infinite .9s" }} />
                <div style={{ width: 13, height: 13, borderRadius: "50%", background: t.teal, border: "2.5px solid white", position: "relative", zIndex: 2, boxShadow: "0 0 0 4px rgba(59,180,193,0.2)" }} />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(0deg, ${t.mapFade} 0%, transparent 100%)` }} />
          </div>

          {/* ── SHEET ── */}
          <div style={{
            background: t.sheetBg ?? t.s1, backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            borderRadius: "26px 26px 0 0",
            borderTop: `1px solid ${t.sheetBorder}`,
            boxShadow: isDark
              ? "0 -1px 0 rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.08),0 -20px 60px rgba(59,180,193,0.04)"
              : "0 -1px 0 rgba(255,255,255,0.95),inset 0 1px 0 rgba(255,255,255,0.95)",
            position: "relative",
          }}>
            {/* Teal glow line */}
            <div style={{
              position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
              background: "linear-gradient(90deg,transparent,rgba(59,180,193,0.4),rgba(255,255,255,0.25),rgba(59,180,193,0.4),transparent)",
              borderRadius: 9999,
            }} />

            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 34, height: 4, borderRadius: 9999, background: t.handle }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 12px rgba(52,211,153,0.12)",
                }}>
                  <IcUsers />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.t1, letterSpacing: "-0.02em" }}>Marche avec moi</span>
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                border: `1px solid ${t.b2}`, background: t.b1,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                color: t.t3,
              }}>
                <IcX color={t.t3} />
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: 9 }}>

              {/* ═══ STATE 0 — Démarrer ═══ */}
              {state === 0 && <>
                {/* Action row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14,
                  background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(52,211,153,0.07),inset 0 1px 0 rgba(52,211,153,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: "-100%", width: "55%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.06),transparent)", animation: "shimmer 5s ease-in-out infinite 1s" }} />
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcUsers />
                  </div>
                  <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
                    <div style={{ display: "flex" }}>
                      {AVATARS.map((av, i) => (
                        <div key={av.initials} style={{
                          width: 22, height: 22, borderRadius: "50%",
                          border: isDark ? "1.5px solid rgba(8,17,30,0.7)" : "1.5px solid rgba(255,255,255,0.8)",
                          background: av.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, fontWeight: 700, color: "white", flexShrink: 0,
                          marginLeft: i > 0 ? -6 : 0,
                        }}>
                          {av.initials}
                        </div>
                      ))}
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        border: isDark ? "1.5px solid rgba(8,17,30,0.7)" : "1.5px solid rgba(255,255,255,0.8)",
                        background: t.s3,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 7, fontWeight: 700, color: t.t2, flexShrink: 0,
                        marginLeft: -6,
                      }}>+7</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.green, marginLeft: 9, whiteSpace: "nowrap" }}>Démarrer</span>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(52,211,153,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcChevron color={t.green} />
                  </div>
                </div>

                {/* Separator */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: t.b2 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em" }}>ou rejoindre</span>
                  <div style={{ flex: 1, height: 1, background: t.b2 }} />
                </div>

                {/* Code row */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <input
                    value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8}
                    placeholder="Code (ex. A3F9)"
                    style={{
                      width: 128, height: 34, padding: "0 10px", borderRadius: 10,
                      border: `1px solid ${t.b2}`, background: t.s2, color: t.t1,
                      fontFamily: "inherit", fontSize: 12, fontWeight: 600, letterSpacing: ".12em",
                      textTransform: "uppercase", outline: "none",
                    }}
                  />
                  <button style={{
                    width: 34, height: 34, borderRadius: 10, border: "none", background: t.teal,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(59,180,193,0.28),0 0 18px rgba(59,180,193,0.12)",
                  }}>
                    <IcChevron color="white" size={13} />
                  </button>
                  <span style={{ fontSize: 10, color: t.t3, flex: 1 }}>8 caractères max</span>
                </div>

                {/* Levels label */}
                <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em" }}>
                  Marcher avec moi, c&apos;est quoi ?
                </div>

                {/* N1 / N2 / N3 rows */}
                {LEVELS.map((lvl) => (
                  <div key={lvl.tag} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 11px", borderRadius: 12,
                    background: t.selev, border: `1px solid ${t.b1}`,
                    opacity: lvl.soon ? 0.55 : 1,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 9,
                      background: lvl.bg, border: `1px solid ${lvl.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {levelIcon(lvl.icon, lvl.color)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: lvl.color, marginRight: 4 }}>{lvl.tag}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>{lvl.title}</span>
                        {lvl.soon && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 5,
                            background: t.teal12, color: t.teal, border: `1px solid ${t.teal24}`, marginLeft: 4,
                          }}>Bientôt</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: t.t2, marginTop: 2 }}>{lvl.desc}</div>
                    </div>
                  </div>
                ))}
              </>}

              {/* ═══ STATE 1 — En attente ═══ */}
              {state === 1 && <>
                {/* Status pill */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontSize: 12, color: t.t2,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.amber, animation: "pulsedot 1.6s ease-in-out infinite" }} />
                  Notification envoyée · en attente
                </div>

                {/* Participants section */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Participants</div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10,
                    background: t.selev, border: `1px solid ${t.b1}`,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "linear-gradient(135deg,#3BB4C1,#1E3A5F)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0,
                    }}>V</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>Toi (hôte)</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: t.green, marginTop: 1 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green, animation: "pulsedot 1.6s ease-in-out infinite" }} />
                        En ligne
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio compact */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 12,
                  background: t.teal12, border: `1px solid ${t.teal24}`,
                  boxShadow: "0 4px 14px rgba(59,180,193,0.07),inset 0 1px 0 rgba(59,180,193,0.06)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: "rgba(59,180,193,.14)", border: "1px solid rgba(59,180,193,.24)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcPhone />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.teal, display: "flex", alignItems: "center", gap: 6 }}>
                      Canal audio ouvert
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.teal, animation: "pulsedot 1.6s ease-in-out infinite" }} />
                    </div>
                    <div style={{ fontSize: 10, color: t.t2, marginTop: 1 }}>Ton cercle peut rejoindre dès maintenant</div>
                  </div>
                </div>

                {/* Code display */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 11,
                  background: t.s2, border: `1.5px dashed ${t.teal24}`, cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: t.t2 }}>Code d&apos;invitation</div>
                    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".2em", color: t.t1, fontVariantNumeric: "tabular-nums" }}>K0623R</div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: t.teal12, border: `1px solid ${t.teal24}`,
                    }}>
                      <IcCopy />
                    </div>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: t.teal12, border: `1px solid ${t.teal24}`,
                    }}>
                      <IcShare />
                    </div>
                  </div>
                </div>

                {/* Cancel button */}
                <button style={{
                  width: "100%", padding: 8, borderRadius: 9,
                  background: "transparent", border: `1px solid ${t.b2}`,
                  color: t.t3, fontSize: 11, fontWeight: 500, cursor: "pointer", textAlign: "center",
                  fontFamily: "inherit",
                }}>
                  Annuler la session
                </button>
              </>}

              {/* ═══ STATE 2 — Active ═══ */}
              {state === 2 && <>
                {/* HUD row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 16, border: `1px solid ${t.b2}`,
                  background: t.s2, backdropFilter: "blur(20px)",
                }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: t.t1, lineHeight: 1 }}>12:34</div>
                    <div style={{ fontSize: 9, color: t.t2, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.red, animation: "pulsedot 1.6s ease-in-out infinite" }} />
                      <span style={{ color: t.red, fontWeight: 700 }}>REC</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 20,
                    background: t.green12, border: `1px solid ${t.green30}`,
                    color: t.green, fontSize: 10, fontWeight: 700,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green, animation: "pulsedot 1.6s ease-in-out infinite" }} />
                    En marche
                  </div>
                </div>

                {/* Protection active */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Protection active</div>

                  {/* Cercle notifié */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10,
                    background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.15)", marginBottom: 4,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IcCheck />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.t1, flex: 1 }}>Cercle notifié · 3 contacts</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.green }}>Actif</div>
                  </div>

                  {/* Canal audio */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10,
                    background: t.teal12, border: `1px solid ${t.teal24}`, marginBottom: 4,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: t.teal12, border: `1px solid ${t.teal24}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IcPhone size={10} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.t1, flex: 1 }}>Canal audio · 2 personnes</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.teal }}>● Live</div>
                  </div>

                  {/* Julia veille */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10,
                    border: `1px solid ${t.b1}`, opacity: 0.3,
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: t.t2 }}>…</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.t1, flex: 1 }}>Julia (si pas de réponse)</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.t3 }}>Veille</div>
                  </div>
                </div>

                {/* Audio bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 12,
                  background: "linear-gradient(135deg,rgba(59,180,193,.1),rgba(59,180,193,.05))",
                  border: `1px solid ${t.teal24}`,
                }}>
                  {/* Waveform */}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, height: 16 }}>
                    {WAVE_HEIGHTS.map((h, i) => (
                      <div key={i} style={{
                        width: 2.5, height: h, borderRadius: 2, background: t.teal,
                        animation: `wv 1.1s ease-in-out infinite ${i * 0.12}s`,
                      }} />
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>Canal audio · 2 participants</div>
                    <div style={{ fontSize: 10, color: t.t2, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                      <span style={{ color: t.teal }}>12:34</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: t.b1, border: `1px solid ${t.b2}`,
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <IcMicOff color={t.t2} />
                    </button>
                    <button style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: t.red12, border: "1px solid rgba(239,68,68,.2)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}>
                      <IcPhoneOff />
                    </button>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Participants</div>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                    {/* You */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "6px 8px", borderRadius: 10, background: t.selev, border: `1px solid ${t.b1}`,
                      minWidth: 50, flexShrink: 0,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#3BB4C1,#1E3A5F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", position: "relative" }}>
                        V
                        <div style={{ position: "absolute", bottom: -1, right: -1, width: 7, height: 7, borderRadius: "50%", background: t.green, border: `2px solid ${t.selev}` }} />
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: t.t2 }}>Vous</div>
                    </div>

                    {/* Marie */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "6px 8px", borderRadius: 10, background: t.selev, border: `1px solid ${t.b1}`,
                      minWidth: 50, flexShrink: 0,
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#34D399,#1E3A5F)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", position: "relative" }}>
                        MC
                        <div style={{ position: "absolute", bottom: -1, right: -1, width: 7, height: 7, borderRadius: "50%", background: t.green, border: `2px solid ${t.selev}` }} />
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: t.t2 }}>Marie</div>
                    </div>

                    {/* Invite card */}
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "6px 8px", borderRadius: 10, background: t.selev,
                      border: `1.5px dashed ${t.b2}`, minWidth: 50, flexShrink: 0, cursor: "pointer",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: t.teal12, border: `1.5px dashed ${t.teal24}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: t.teal, fontSize: 18,
                      }}>+</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: t.teal }}>Inviter</div>
                    </div>
                  </div>
                </div>

                {/* End button */}
                <button style={{
                  width: "100%", padding: 9, borderRadius: 10,
                  background: "transparent", border: `1px solid ${t.b2}`,
                  color: t.t3, fontSize: 11, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  fontFamily: "inherit",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  Terminer la marche
                </button>
              </>}
            </div>
          </div>

          {/* BOTTOM NAV */}
          <div style={{
            display: "flex", justifyContent: "space-around", alignItems: "center",
            padding: "8px 8px 20px", borderTop: `1px solid ${t.b1}`,
            marginTop: 2, position: "relative", background: t.s0,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)" }} />
            <NavItem icon={<IcChat color={t.t3} />} label="Communauté" t={t} dot />
            <NavItem icon={<IcHeart color={t.t3} />} label="Cercle" t={t} />
            <NavItem icon={<IcTrajet color={t.teal} />} label="Trajet" t={t} active />
            <NavItem icon={<IcJulia color={t.t3} />} label="Julia" t={t} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Toolbar button ──

function TbBtn({ text, active, onClick, t, isState }: {
  text: string; label?: string; active?: boolean; onClick: () => void;
  t: ReturnType<typeof tk>; isState?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      height: 30, padding: "0 13px", borderRadius: 9999,
      border: `1px solid ${isState && active ? "rgba(52,211,153,0.3)" : active ? t.teal : t.tbBorder}`,
      background: isState && active
        ? "rgba(52,211,153,0.15)"
        : active ? t.teal : "transparent",
      color: isState && active ? "#34D399" : active ? "#fff" : (t.tbColor ?? t.t2),
      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      letterSpacing: ".02em", transition: "all .2s",
    }}>
      {text}
    </button>
  );
}

// ── Nav item ──

function NavItem({ icon, label, t: tok, active, dot }: {
  icon: React.ReactNode; label: string; t: ReturnType<typeof tk>;
  active?: boolean; dot?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 9, cursor: "pointer" }}>
      <div style={{ position: "relative", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
        {dot && <div style={{ position: "absolute", top: -2, right: -3, width: 7, height: 7, borderRadius: "50%", background: tok.red, border: `1.5px solid ${tok.s0}` }} />}
      </div>
      <span style={{ fontSize: 9, fontWeight: 500, color: active ? tok.teal : tok.t3 }}>{label}</span>
    </div>
  );
}
