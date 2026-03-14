"use client";

/**
 * MOCKUP — Route Detail Sheet
 * Pixel-match of route-detail-sheet.html
 * Walk mode: hero avoided, stats, incidents list, walk steps
 * Transit mode: hero avoided, stats, segment timeline
 */

import { useState } from "react";

// ── Tokens ──

const tk = (d: boolean) => ({
  teal: "#3BB4C1", teal12: "rgba(59,180,193,0.12)", teal24: "rgba(59,180,193,0.24)",
  green: "#34D399", green12: "rgba(52,211,153,0.12)", green24: "rgba(52,211,153,0.24)",
  amber: "#FBBF24", amber10: "rgba(251,191,36,0.10)", amber24: "rgba(251,191,36,0.24)",
  red: "#EF4444", red12: "rgba(239,68,68,0.12)",
  purple: "#A78BFA",
  bg: d ? "#050A14" : "#C8D8E8",
  s0: d ? "#08111E" : "#F0F6FA",
  s1: d ? "rgba(10,18,32,0.96)" : "rgba(248,250,252,0.97)",
  s2: d ? "rgba(18,28,48,0.85)" : "rgba(241,246,250,0.90)",
  s3: d ? "#1A2840" : "#EFF4F8",
  t1: d ? "#FFF" : "#0A1220",
  t2: d ? "#94A3B8" : "#3A5068",
  t3: d ? "#4A5E72" : "#7A96AA",
  b1: d ? "rgba(255,255,255,0.04)" : "rgba(10,18,32,0.04)",
  b2: d ? "rgba(255,255,255,0.08)" : "rgba(10,18,32,0.08)",
  b3: d ? "rgba(255,255,255,0.14)" : "rgba(10,18,32,0.14)",
  mapBg: d ? "#06111E" : "#C8D8E6",
  mapRoad: d ? "rgba(30,58,95,0.9)" : "rgba(255,255,255,0.55)",
  mapRoadMain: d ? "rgba(59,100,150,0.8)" : "rgba(255,255,255,0.9)",
  mapWater: d ? "#071828" : "#B0C8DC",
  mapPark: d ? "#081A10" : "#BDD0C8",
  mapBuilding: d ? "#0C1626" : "#C0D0DE",
  mapFade: d ? "#08111E" : "#F0F6FA",
  sheetBg: d ? "rgba(10,18,32,0.96)" : "rgba(255,255,255,0.92)",
  sheetBorder: d ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
  toolbarBg: d ? "rgba(5,10,20,0.92)" : "rgba(192,214,230,0.92)",
  toolbarBorder: d ? "rgba(255,255,255,0.06)" : "rgba(10,18,32,0.08)",
  tbColor: d ? "rgba(255,255,255,0.4)" : "#3A5068",
  tbBorder: d ? "rgba(255,255,255,0.12)" : "rgba(10,18,32,0.14)",
  sbColor: d ? "white" : "#1a2a3a",
  pillBg: d ? "rgba(10,18,32,0.7)" : "rgba(255,255,255,0.85)",
  pillBorder: d ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
  pillShadow: d ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
  phoneShadow: d
    ? "0 32px 80px rgba(0,0,0,0.4), 0 0 0 5px rgba(255,255,255,0.025)"
    : "0 32px 80px rgba(0,0,0,0.12), 0 0 0 5px rgba(255,255,255,0.5)",
});

// ── SVG Icons ──

const IcShield = ({ size = 10, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IcClock = ({ size = 10, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IcSend = ({ size = 16, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(255,255,255,0.2)" />
  </svg>
);

const IcChevronR = ({ size = 12, color = "#3BB4C1" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IcChevronD = ({ size = 12, color = "#3BB4C1" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IcBolt = ({ size = 9, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const IcAlert = ({ size = 10, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IcBack = ({ color }: { color: string }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

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

function MapSvg({ t, isTransit }: { t: ReturnType<typeof tk>; isTransit: boolean }) {
  return (
    <svg viewBox="0 0 320 280" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="320" height="280" fill={t.mapBg} />
      {/* water */}
      <path fill={t.mapWater} d="M0 195Q40 185 80 192Q120 200 160 188Q200 176 240 185Q280 193 320 182L320 220Q280 215 240 208Q200 200 160 210Q120 220 80 215Q40 210 0 220Z" />
      {/* park */}
      <ellipse fill={t.mapPark} cx="55" cy="110" rx="44" ry="30" />
      {/* buildings */}
      <rect fill={t.mapBuilding} x="118" y="35" width="22" height="18" rx="2" />
      <rect fill={t.mapBuilding} x="144" y="30" width="16" height="22" rx="2" />
      <rect fill={t.mapBuilding} x="164" y="40" width="20" height="14" rx="2" />
      <rect fill={t.mapBuilding} x="198" y="32" width="20" height="22" rx="2" />
      <rect fill={t.mapBuilding} x="222" y="40" width="14" height="16" rx="2" />
      <rect fill={t.mapBuilding} x="18" y="155" width="18" height="14" rx="1" />
      <rect fill={t.mapBuilding} x="40" y="150" width="14" height="20" rx="1" />
      <rect fill={t.mapBuilding} x="198" y="148" width="25" height="20" rx="2" />
      <rect fill={t.mapBuilding} x="228" y="143" width="18" height="28" rx="2" />
      {/* secondary roads */}
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="0" y1="78" x2="320" y2="75" />
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="80" y1="0" x2="78" y2="185" />
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="220" y1="0" x2="218" y2="185" />
      <line stroke={t.mapRoad} strokeWidth="2" strokeLinecap="round" x1="0" y1="165" x2="320" y2="160" />
      {/* main roads */}
      <line stroke={t.mapRoadMain} strokeWidth="3.5" strokeLinecap="round" x1="0" y1="105" x2="320" y2="100" />
      <line stroke={t.mapRoadMain} strokeWidth="3.5" strokeLinecap="round" x1="160" y1="0" x2="162" y2="185" />
      <path stroke={t.mapRoadMain} strokeWidth="3" strokeLinecap="round" fill="none" d="M0 55L130 170L190 170L320 55" />
      {/* bridge */}
      <line stroke={t.mapRoadMain} strokeWidth="4" strokeLinecap="round" x1="120" y1="192" x2="122" y2="215" />
      <line stroke={t.mapRoadMain} strokeWidth="4" strokeLinecap="round" x1="200" y1="185" x2="202" y2="210" />

      {/* WALK route lines */}
      {!isTransit && (
        <g>
          <path fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="4" strokeLinecap="round" d="M80 245 L80 165 L80 105 L160 100 L160 55" />
          <path fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="4" strokeLinecap="round" d="M80 245 L130 170 L160 100 L220 75 L220 55" />
          <path fill="none" stroke="#34D399" strokeWidth="5" strokeLinecap="round" d="M80 245 L80 165 L160 160 L218 100 L218 55" style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.5))" }} />
          <circle cx="80" cy="245" r="5" fill="#34D399" stroke="white" strokeWidth="2" />
          <circle cx="218" cy="55" r="5" fill="#34D399" stroke="white" strokeWidth="2" />
          <circle cx="132" cy="142" r="6" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="155" cy="118" r="6" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />
        </g>
      )}

      {/* TRANSIT route lines */}
      {isTransit && (
        <g>
          <path fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" d="M80 245 L80 165 L80 105" />
          <path fill="none" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" d="M80 105 L160 100 L218 100" />
          <path fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" d="M218 100 L218 55" />
          <circle cx="80" cy="105" r="5" fill="#A78BFA" stroke="white" strokeWidth="2" />
          <circle cx="218" cy="100" r="5" fill="#A78BFA" stroke="white" strokeWidth="2" />
          <circle cx="80" cy="245" r="5" fill="#3BB4C1" stroke="white" strokeWidth="2" />
          <circle cx="218" cy="55" r="5" fill="#3BB4C1" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="103" r="6" fill="rgba(251,191,36,0.15)" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="2 2" />
          {/* metro station icons */}
          <circle cx="80" cy="105" r="8" fill={t.mapBg} stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
          <text x="80" y="108" textAnchor="middle" fontSize="7" fontWeight="700" fill="#A78BFA">M</text>
          <circle cx="218" cy="100" r="8" fill={t.mapBg} stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
          <text x="218" y="103" textAnchor="middle" fontSize="7" fontWeight="700" fill="#A78BFA">M</text>
        </g>
      )}

      {/* user pin */}
      <circle cx="80" cy="245" r="18" fill="rgba(59,180,193,0.08)" />
      <circle cx="80" cy="245" r="7" fill="white" stroke="#3BB4C1" strokeWidth="3" />
    </svg>
  );
}

// ── Walk Content ──

function WalkContent({ t }: { t: ReturnType<typeof tk> }) {
  return (
    <>
      {/* Hero avoided */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 16, position: "relative", overflow: "hidden",
        background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)",
        boxShadow: "0 4px 16px rgba(52,211,153,0.07)",
      }}>
        <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, color: t.green, flexShrink: 0 }}>3</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.t1 }}>incidents évités</div>
          <div style={{ fontSize: 11, color: t.t2, marginTop: 2 }}>par rapport aux autres itinéraires</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, marginTop: 5,
            padding: "3px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            width: "fit-content",
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: t.green,
          }}>
            <IcShield size={10} color={t.green} />
            Itinéraire le plus sûr
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { val: "1h03", lbl: "Durée" },
          { val: "5.2", lbl: "km" },
          { val: "0", lbl: "sur ce trajet", valColor: t.green },
        ].map((s) => (
          <div key={s.lbl} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 18, fontWeight: 300, color: s.valColor ?? t.t1, letterSpacing: "-0.02em" }}>{s.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Incidents évités */}
      <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Incidents évités</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { dot: "#EF4444", name: "Agression signalée", addr: "Rue de Rivoli · il y a 2h", sev: "Élevé", sevBg: "rgba(239,68,68,0.1)", sevColor: "#EF4444" },
          { dot: "#FBBF24", name: "Harcèlement de rue", addr: "Bd Haussmann · il y a 45min", sev: "Moyen", sevBg: "rgba(251,191,36,0.1)", sevColor: "#FBBF24" },
          { dot: "#FBBF24", name: "Zone peu éclairée", addr: "Passage Jouffroy · il y a 3h", sev: "Moyen", sevBg: "rgba(251,191,36,0.1)", sevColor: "#FBBF24" },
        ].map((p) => (
          <div key={p.name} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.t1 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: t.t3 }}>{p.addr}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: p.sevBg, color: p.sevColor }}>{p.sev}</div>
          </div>
        ))}
      </div>

      {/* Itinéraire */}
      <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Itinéraire</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { street: "Av. de l\u2019Opéra", dist: "420m", icon: "right" },
          { street: "Rue de Rivoli", dist: "1.2km", icon: "right", safe: true },
          { street: "Bd de Sébastopol", dist: "800m", icon: "down", safe: true },
          { street: "Rue du Temple", dist: "650m", icon: "right" },
        ].map((s) => (
          <div key={s.street} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "5px 0",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: t.teal12, border: `1px solid ${t.teal24}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {s.icon === "down" ? <IcChevronD size={12} color={t.teal} /> : <IcChevronR size={12} color={t.teal} />}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.t1, flex: 1 }}>{s.street}</div>
            <div style={{ fontSize: 10, color: t.t3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s.dist}</div>
            {s.safe && <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.green, flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Transit Content ──

function TransitContent({ t }: { t: ReturnType<typeof tk> }) {
  return (
    <>
      {/* Hero avoided */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 16, position: "relative", overflow: "hidden",
        background: "rgba(59,180,193,0.07)", border: "1px solid rgba(59,180,193,0.2)",
        boxShadow: "0 4px 16px rgba(59,180,193,0.07)",
      }}>
        <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, color: t.teal, flexShrink: 0 }}>2</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.t1 }}>incidents évités</div>
          <div style={{ fontSize: 11, color: t.t2, marginTop: 2 }}>par rapport aux autres itinéraires</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, marginTop: 5,
            padding: "3px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            width: "fit-content",
            background: "rgba(59,180,193,0.1)", border: "1px solid rgba(59,180,193,0.2)", color: t.teal,
          }}>
            <IcClock size={10} color={t.teal} />
            Plus rapide · 38min
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { val: <>38<span style={{ fontSize: 12, fontWeight: 500 }}>min</span></>, lbl: "Durée" },
          { val: "3.8", lbl: "km" },
          { val: <>1<span style={{ fontSize: 12, fontWeight: 500 }}> corresp.</span></>, lbl: "Correspondance" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 18, fontWeight: 300, color: t.t1, letterSpacing: "-0.02em" }}>{s.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Détail du trajet */}
      <div style={{ fontSize: 10, fontWeight: 700, color: t.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>Détail du trajet</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Walk 1 — Départ */}
        <SegmentRow
          t={t}
          dotColor={t.green}
          connectorColor="rgba(52,211,153,0.3)"
          station="Départ · Rue de la Paix"
          chip={{ label: "À pied", color: t.green, bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", icon: <IcBolt size={9} color={t.green} /> }}
          duration="4min · 320m"
        />
        {/* Metro — Opéra */}
        <SegmentRow
          t={t}
          dotColor={t.purple}
          dotShadow="0 0 0 3px rgba(167,139,250,0.2)"
          connectorColor="rgba(167,139,250,0.4)"
          station="Opéra"
          chip={{ label: "M 3", color: t.purple, bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.2)" }}
          direction="dir. Gallieni"
          duration="6 arrêts · 12min"
          alert="1 incident signalé sur cette ligne · Pickpocket"
        />
        {/* RER — République */}
        <SegmentRow
          t={t}
          dotColor={t.teal}
          dotShadow="0 0 0 3px rgba(59,180,193,0.2)"
          connectorColor="rgba(59,180,193,0.4)"
          station="République · Correspondance"
          chip={{ label: "RER A", color: t.teal, bg: "rgba(59,180,193,0.12)", border: "rgba(59,180,193,0.2)" }}
          direction="dir. Cergy"
          duration="3 arrêts · 8min"
        />
        {/* Walk 2 — Arrivée */}
        <SegmentRow
          t={t}
          dotColor={t.green}
          station="Arrivée · Destination"
          chip={{ label: "À pied", color: t.green, bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", icon: <IcBolt size={9} color={t.green} /> }}
          duration="2min · 180m"
          isLast
        />
      </div>
    </>
  );
}

// ── Segment Row ──

function SegmentRow({ t, dotColor, dotShadow, connectorColor, station, chip, direction, duration, alert, isLast }: {
  t: ReturnType<typeof tk>;
  dotColor: string;
  dotShadow?: string;
  connectorColor?: string;
  station: string;
  chip: { label: string; color: string; bg: string; border: string; icon?: React.ReactNode };
  direction?: string;
  duration: string;
  alert?: string;
  isLast?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
      {/* Line column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%", border: "2px solid white", flexShrink: 0,
          background: dotColor, boxShadow: dotShadow ?? `0 0 0 2px ${dotColor}`, marginTop: 3,
        }} />
        {!isLast && connectorColor && (
          <div style={{ width: 2, flex: 1, minHeight: 20, margin: "2px 0", background: connectorColor }} />
        )}
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>{station}</div>
        <div style={{ fontSize: 11, color: t.t2, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            padding: "2px 7px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
          }}>
            {chip.icon}{chip.label}
          </span>
          {direction && <span style={{ color: t.t2 }}>{direction}</span>}
          <span style={{ fontSize: 10, color: t.t3, fontVariantNumeric: "tabular-nums" }}>{duration}</span>
        </div>
        {alert && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4, marginTop: 4,
            padding: "4px 8px", borderRadius: 7, fontSize: 10, fontWeight: 600,
            background: t.amber10, border: `1px solid ${t.amber24}`, color: t.amber,
          }}>
            <IcAlert size={10} color={t.amber} />
            {alert}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──

export default function RouteDetailMockup() {
  const [dark, setDark] = useState(true);
  const [mode, setMode] = useState<"walk" | "transit">("walk");
  const t = tk(dark);
  const isTransit = mode === "transit";
  const accentColor = isTransit ? t.teal : t.green;

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "64px 16px 48px", gap: 16,
      fontFamily: "'Inter', -apple-system, sans-serif",
      transition: "background 0.4s",
    }}>
      {/* Toolbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 52,
        background: t.toolbarBg, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${t.toolbarBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <button onClick={() => setDark(!dark)} style={{
          height: 30, padding: "0 13px", borderRadius: 9999,
          border: `1px solid ${t.teal}`, background: t.teal, color: "#fff",
          fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          {dark ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
        </button>
        <div style={{ width: 1, height: 18, background: dark ? "rgba(255,255,255,0.08)" : "rgba(10,18,32,0.1)" }} />
        <button onClick={() => setMode("walk")} style={{
          height: 30, padding: "0 13px", borderRadius: 9999,
          border: `1px solid ${!isTransit ? "rgba(52,211,153,0.3)" : t.tbBorder}`,
          background: !isTransit ? "rgba(52,211,153,0.15)" : "transparent",
          color: !isTransit ? t.green : t.tbColor,
          fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          \uD83D\uDEB6 Marche
        </button>
        <button onClick={() => setMode("transit")} style={{
          height: 30, padding: "0 13px", borderRadius: 9999,
          border: `1px solid ${isTransit ? "rgba(59,180,193,0.3)" : t.tbBorder}`,
          background: isTransit ? "rgba(59,180,193,0.15)" : "transparent",
          color: isTransit ? t.teal : t.tbColor,
          fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          \uD83D\uDE8A Transit
        </button>
      </nav>

      {/* Phone */}
      <div style={{
        width: 320, borderRadius: 48, overflow: "hidden", position: "relative",
        background: t.mapBg, border: `1px solid ${t.b2}`,
        boxShadow: t.phoneShadow,
        display: "flex", flexDirection: "column",
      }}>
        {/* Status bar */}
        <StatusBar color={t.sbColor} />

        {/* Map area */}
        <div style={{ height: 280, position: "relative", overflow: "hidden", flexShrink: 0, background: t.mapBg }}>
          <MapSvg t={t} isTransit={isTransit} />
          {/* Map header pills */}
          <div style={{
            position: "absolute", top: 44, left: 14, right: 14, zIndex: 5,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 9999,
              fontSize: 11, fontWeight: 600, color: t.t1,
              backdropFilter: "blur(12px)",
              background: t.pillBg, border: `1px solid ${t.pillBorder}`, boxShadow: t.pillShadow,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.green }} />
              Position active
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 9999,
              fontSize: 11, fontWeight: 600, color: t.t1,
              backdropFilter: "blur(12px)",
              background: t.pillBg, border: `1px solid ${t.pillBorder}`, boxShadow: t.pillShadow,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.amber }} />
              4 incidents
            </div>
          </div>
          {/* Map fade */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60, pointerEvents: "none",
            background: `linear-gradient(0deg, ${t.mapFade} 0%, transparent 100%)`,
          }} />
        </div>

        {/* Mini bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: t.s1, backdropFilter: "blur(32px)",
          borderTop: `1px solid ${t.b2}`, borderBottom: `1px solid ${t.b1}`,
          flexShrink: 0, position: "relative",
        }}>
          {/* teal glow line */}
          <div style={{
            position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(59,180,193,0.3), transparent)",
          }} />
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `1px solid ${t.b2}`, background: t.b1,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <IcBack color={t.t2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.t1 }}>
              {isTransit ? "Transit · Plus rapide" : "Route · Plus sûre"}
            </div>
            <div style={{ fontSize: 10, color: t.t2 }}>
              {isTransit ? "38min · 3.8 km" : "1h03 · 5.2 km"}
            </div>
          </div>
          <button style={{
            height: 32, padding: "0 12px", borderRadius: 9999, border: "none",
            fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0,
            fontFamily: "inherit",
            background: accentColor,
            color: "white",
          }}>
            Démarrer →
          </button>
        </div>

        {/* Detail sheet */}
        <div style={{
          background: t.sheetBg, backdropFilter: "blur(32px) saturate(180%)",
          borderTop: `1px solid ${t.sheetBorder}`,
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
          position: "relative",
        }}>
          {/* teal highlight line */}
          <div style={{
            position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(59,180,193,0.35), rgba(255,255,255,0.2), rgba(59,180,193,0.35), transparent)",
          }} />
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "14px 14px 20px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {isTransit ? <TransitContent t={t} /> : <WalkContent t={t} />}
          </div>

        </div>
      </div>
    </div>
  );
}
