"use client";

/**
 * MOCKUP — Chat v2 + GIF picker
 * Pixel-match of chat-v2-gif.html
 * 3 phones side-by-side: DM (picker closed), DM (picker open), Group (picker open)
 */

import { useState } from "react";

// ── Tokens ──

const tk = (d: boolean) => ({
  teal: "#3BB4C1", tealSoft: "rgba(59,180,193,.12)", tealMid: "rgba(59,180,193,.22)",
  navy: "#1E3A5F", purple: "#A78BFA", green: "#34D399", greenSoft: "rgba(52,211,153,.12)",
  bg: d ? "#06111E" : "#F0F4F8",
  phoneBg: d ? "#0A1620" : "#F8FAFC",
  phoneBorder: d ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.08)",
  headerBg: d ? "rgba(10,22,32,.94)" : "rgba(248,250,252,.94)",
  msgBg: d ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.052)",
  msgBorder: d ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.07)",
  msgUserBg: "#1E3A5F",
  msgUserShadow: d ? "0 3px 16px rgba(0,0,0,.5)" : "0 3px 12px rgba(30,58,95,.28)",
  inputBg: d ? "rgba(10,22,32,.98)" : "rgba(248,250,252,.97)",
  inputFieldBg: d ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)",
  inputFieldBorder: d ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.08)",
  t1: d ? "#E8F0F8" : "#0F1F35",
  t2: d ? "#7E97B0" : "#475569",
  t3: d ? "#4A6278" : "#94A3B8",
  sep: d ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.06)",
  richBg: d ? "#132030" : "#FFFFFF",
  richBorder: d ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.07)",
  richShadow: d ? "0 2px 16px rgba(0,0,0,.4)" : "0 2px 12px rgba(0,0,0,.07)",
  typingBg: d ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.05)",
  phoneShadow: d
    ? "0 28px 56px rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.07)"
    : "0 28px 56px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.08)",
});

// ── StatusBar ──

function StatusBar({ t }: { t: ReturnType<typeof tk> }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 4px", flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: t.t1 }}>21:05</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
          <rect x=".5" y=".5" width="18" height="9" rx="2" stroke={t.t1} strokeOpacity=".4" />
          <rect x="1.5" y="1.5" width="16" height="7" rx="1.3" fill={t.t1} />
          <path d="M20 3.5v3c.8-.4 1.3-1 1.3-1.5S20.8 3.9 20 3.5z" fill={t.t1} opacity=".4" />
        </svg>
      </div>
    </div>
  );
}

// ── Header ──

function Header({ t, avatar, name, sub, subOnline, actions, avatarBg }: {
  t: ReturnType<typeof tk>; avatar: string; name: string; sub: string;
  subOnline?: boolean; actions: React.ReactNode; avatarBg: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 14px 10px", flexShrink: 0,
      background: t.headerBg, backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${t.sep}`,
    }}>
      <div style={hdrIcoStyle(t)}>{"\u2039"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: avatar.length > 2 ? 13 : 12, fontWeight: 700, color: "#fff", flexShrink: 0, background: avatarBg }}>{avatar}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.t1, letterSpacing: "-.01em" }}>{name}</div>
          <div style={{ fontSize: 10, color: subOnline ? t.green : t.t3, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>{actions}</div>
    </div>
  );
}

function hdrIcoStyle(t: ReturnType<typeof tk>): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, color: t.t2, background: t.msgBg, cursor: "pointer", flexShrink: 0,
  };
}

// ── Typing indicator ──

function TypingDots({ t }: { t: ReturnType<typeof tk> }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4, padding: "10px 13px",
      borderRadius: "4px 18px 18px 18px", background: t.typingBg,
      border: `1px solid ${t.msgBorder}`, width: "fit-content",
    }}>
      {[0, 0.18, 0.36].map((d, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: t.t3,
          animation: `tdB 1.2s ease-in-out infinite ${d}s`,
        }} />
      ))}
    </div>
  );
}

// ── GIF picker ──

function GifPicker({ t }: { t: ReturnType<typeof tk> }) {
  const gifs = ["\uD83D\uDE02", "\uD83D\uDE4C", "\uD83D\uDCAA", "\uD83E\uDD73", "\uD83E\uDEF6", "\uD83D\uDC4F", "\uD83E\uDD29", "\uD83D\uDE0D", "\uD83D\uDE4F"];
  const tabs = [
    { label: "\uD83D\uDD25 Trending", on: true },
    { label: "\uD83D\uDE04 R\u00e9actions", on: false },
    { label: "\uD83E\uDD73 F\u00eates", on: false },
    { label: "\uD83D\uDC99 Love", on: false },
  ];
  return (
    <div style={{
      position: "absolute", bottom: "100%", left: 0, right: 0,
      background: t.richBg, borderTop: `1px solid ${t.sep}`,
      borderRadius: "16px 16px 0 0", padding: "10px 12px 12px",
      display: "flex", flexDirection: "column", gap: 9,
      boxShadow: "0 -8px 28px rgba(0,0,0,.15)",
      animation: "gifUp .22s cubic-bezier(.16,1,.3,1)", zIndex: 10,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.t1, letterSpacing: ".01em" }}>Choisir un GIF</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: t.t3, fontWeight: 600 }}>via Tenor</span>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.msgBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.t2, cursor: "pointer" }}>{"\u2715"}</div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {tabs.map((tab, i) => (
          <div key={i} style={{
            padding: "4px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${tab.on ? t.tealMid : t.msgBorder}`,
            color: tab.on ? t.teal : t.t2,
            background: tab.on ? t.tealSoft : "transparent",
            transition: "all .15s",
          }}>{tab.label}</div>
        ))}
      </div>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none", opacity: 0.5 }}>{"\uD83D\uDD0D"}</span>
        <input readOnly style={{
          width: "100%", padding: "7px 12px 7px 32px", borderRadius: 9999,
          border: `1px solid ${t.inputFieldBorder}`, background: t.inputFieldBg,
          fontSize: 11.5, color: t.t1, outline: "none", fontFamily: "'Inter', sans-serif",
        }} placeholder="Rechercher un GIF\u2026" />
      </div>
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, maxHeight: 140, overflowY: "auto" }}>
        {gifs.map((g, i) => (
          <div key={i} style={{
            aspectRatio: "1", borderRadius: 8, overflow: "hidden",
            background: t.msgBg, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, transition: "opacity .15s", border: `1px solid ${t.msgBorder}`,
          }}>{g}</div>
        ))}
      </div>
    </div>
  );
}

// ── Input bar ──

function InputBar({ t, placeholder, sendBg, sendShadow, gifActive, showPicker }: {
  t: ReturnType<typeof tk>; placeholder: string; sendBg: string; sendShadow: string;
  gifActive?: boolean; showPicker?: boolean;
}) {
  return (
    <div style={{ flexShrink: 0, position: "relative" }}>
      {showPicker && <GifPicker t={t} />}
      <div style={{
        background: t.inputBg, backdropFilter: "blur(20px)",
        borderTop: `1px solid ${t.sep}`, padding: "10px 14px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
          {/* Attach */}
          <div style={attachStyle(t)}>+</div>
          {/* GIF btn */}
          <div style={{
            ...attachStyle(t),
            fontSize: 9.5, fontWeight: 700, letterSpacing: ".04em",
            color: gifActive ? "#fff" : t.teal,
            borderColor: gifActive ? t.teal : "rgba(59,180,193,.3)",
            background: gifActive ? t.teal : t.tealSoft,
          }}>GIF</div>
          {/* Field */}
          <textarea readOnly rows={1} placeholder={placeholder} style={{
            flex: 1, minHeight: 33, padding: "8px 12px",
            borderRadius: 17, border: `1px solid ${t.inputFieldBorder}`,
            background: t.inputFieldBg,
            fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: t.t1,
            resize: "none", lineHeight: 1.4, outline: "none",
          }} />
          {/* Send */}
          <button style={{
            width: 33, height: 33, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer", flexShrink: 0,
            background: sendBg, boxShadow: sendShadow,
          }}>{"\u2191"}</button>
        </div>
      </div>
    </div>
  );
}

function attachStyle(t: ReturnType<typeof tk>): React.CSSProperties {
  return {
    width: 33, height: 33, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: t.msgBg, border: `1px solid ${t.msgBorder}`,
    fontSize: 15, cursor: "pointer", flexShrink: 0, color: t.t2,
  };
}

// ── Rich card ──

function RichCard({ t, icon, title, sub, iconBg }: {
  t: ReturnType<typeof tk>; icon: string; title: string; sub: React.ReactNode; iconBg: string;
}) {
  return (
    <div style={{
      background: t.richBg, border: `1px solid ${t.richBorder}`, borderRadius: 13,
      padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, marginTop: 5,
      boxShadow: t.richShadow,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: iconBg }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.t1 }}>{title}</div>
        <div style={{ fontSize: 10, color: t.t3, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Phone wrapper ──

function Phone({ t, label, labelColor, children }: {
  t: ReturnType<typeof tk>; label: string; labelColor: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
        padding: "3px 12px", borderRadius: 9999,
        border: `1px solid ${labelColor}33`, color: labelColor, background: t.richBg,
      }}>{label}</div>
      <div style={{
        width: 300, height: 600, borderRadius: 42, overflow: "hidden",
        position: "relative", display: "flex", flexDirection: "column",
        background: t.phoneBg,
        boxShadow: t.phoneShadow,
        transition: "background .3s, box-shadow .3s",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Message components ──

function Separator({ t, text }: { t: ReturnType<typeof tk>; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: t.sep }} />
      <span style={{ fontSize: 10, color: t.t3, fontWeight: 500, whiteSpace: "nowrap" }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: t.sep }} />
    </div>
  );
}

function BubbleMe({ t, text, time }: { t: ReturnType<typeof tk>; text: string; time: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "82%", alignSelf: "flex-end", alignItems: "flex-end" }}>
      <div style={{
        padding: "9px 13px", fontSize: 12.5, lineHeight: 1.55,
        background: t.msgUserBg, color: "#fff",
        borderRadius: "18px 4px 18px 18px", boxShadow: t.msgUserShadow,
      }}>{text}</div>
      <div style={{ fontSize: 10, color: t.t3, marginTop: 3, paddingRight: 3, textAlign: "right" }}>{time}</div>
    </div>
  );
}

function BubbleThem({ t, text, time, avBg, avInitial, sender, children }: {
  t: ReturnType<typeof tk>; text?: string; time?: string; avBg: string; avInitial: string;
  sender?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, background: avBg }}>{avInitial}</div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "82%", alignItems: "flex-start" }}>
        {sender && <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 3, padding: "0 3px", color: avBg }}>{sender}</div>}
        {text && (
          <div style={{
            padding: "9px 13px", fontSize: 12.5, lineHeight: 1.55,
            background: t.msgBg, color: t.t1,
            border: `1px solid ${t.msgBorder}`, borderRadius: "4px 18px 18px 18px",
          }}>{text}</div>
        )}
        {children}
        {time && <div style={{ fontSize: 10, color: t.t3, marginTop: 3, paddingLeft: 3 }}>{time}</div>}
      </div>
    </div>
  );
}

// ── Main ──

export default function ChatV2Mockup() {
  const [isDark, setIsDark] = useState(true);
  const t = tk(isDark);

  const sophieBg = "linear-gradient(135deg,#F87171,#A78BFA)";
  const dmSendBg = "linear-gradient(135deg,#F87171,#A78BFA)";
  const dmSendShadow = "0 3px 12px rgba(248,113,113,.3)";

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      fontFamily: "'Inter', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 16px 56px", gap: 22, transition: "background .3s",
    }}>
      {/* Keyframes */}
      <style>{`
        @keyframes tdB { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-4px);opacity:1} }
        @keyframes gifUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Control bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => setIsDark(false)} style={ctrlStyle(t, !isDark)}>{"\u2600"} Light</button>
        <button onClick={() => setIsDark(true)} style={ctrlStyle(t, isDark)}>{"\u25D1"} Dark</button>
        <a href="/mockup" style={{ ...ctrlStyle(t, false), textDecoration: "none" }}>{"\u2190"} Back</a>
      </div>

      <p style={{ fontSize: 11, color: t.t3, textAlign: "center", letterSpacing: ".02em" }}>
        Le bouton <b style={{ color: t.teal }}>GIF</b> ouvre le picker (phones 2 et 3)
      </p>

      {/* ── 3 phones ── */}
      <div style={{ display: "flex", gap: 28, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ─ Phone 1: DM picker closed ─ */}
        <Phone t={t} label={"\uD83D\uDC8C DM \u00B7 Picker ferm\u00e9"} labelColor="#F87171">
          <StatusBar t={t} />
          <Header t={t} avatar="SL" name="Sophie L." sub={"\u25CF En ligne"} subOnline avatarBg={sophieBg}
            actions={<><div style={hdrIcoStyle(t)}><span style={{ color: t.teal }}>{"\uD83D\uDCDE"}</span></div><div style={hdrIcoStyle(t)}><span style={{ color: t.t3 }}>{"\u22EF"}</span></div></>} />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Separator t={t} text="Aujourd'hui" />
              <BubbleThem t={t} text={'Je lance "Marche avec moi" ? \uD83D\uDC40'} time="21:00" avBg={sophieBg} avInitial="S" />
              <BubbleMe t={t} text={"Oui fais \u00e7a ! Merci \uD83E\uDD0D"} time="21:01" />
              <BubbleThem t={t} avBg={sophieBg} avInitial="S" time="21:01">
                <RichCard t={t} icon={"\uD83D\uDC65"} title="Session MAM ouverte" sub={<>Sophie te suit &middot; Code : <b>A3F</b></>} iconBg={t.tealSoft} />
              </BubbleThem>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, background: sophieBg }}>S</div>
                <TypingDots t={t} />
              </div>
            </div>
          </div>
          <InputBar t={t} placeholder="Message \u00e0 Sophie\u2026" sendBg={dmSendBg} sendShadow={dmSendShadow} />
        </Phone>

        {/* ─ Phone 2: DM picker open ─ */}
        <Phone t={t} label={"\uD83D\uDC8C DM \u00B7 Picker ouvert"} labelColor="#3BB4C1">
          <StatusBar t={t} />
          <Header t={t} avatar="SL" name="Sophie L." sub={"\u25CF En ligne"} subOnline avatarBg={sophieBg}
            actions={<><div style={hdrIcoStyle(t)}><span style={{ color: t.teal }}>{"\uD83D\uDCDE"}</span></div><div style={hdrIcoStyle(t)}><span style={{ color: t.t3 }}>{"\u22EF"}</span></div></>} />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Separator t={t} text="Aujourd'hui" />
              <BubbleThem t={t} text={'Je lance "Marche avec moi" ? \uD83D\uDC40'} time="21:00" avBg={sophieBg} avInitial="S" />
              <BubbleMe t={t} text={"Oui fais \u00e7a ! Merci \uD83E\uDD0D"} time="21:01" />
            </div>
          </div>
          <InputBar t={t} placeholder="Message \u00e0 Sophie\u2026" sendBg={dmSendBg} sendShadow={dmSendShadow} gifActive showPicker />
        </Phone>

        {/* ─ Phone 3: Group picker open ─ */}
        <Phone t={t} label={"\uD83D\uDCAC Groupe \u00B7 Picker ouvert"} labelColor="#A78BFA">
          <StatusBar t={t} />
          <Header t={t} avatar={"\uD83C\uDFD9"} name="Paris 15e \u00B7 S\u00e9curit\u00e9" sub="247 membres \u00B7 12 en ligne" avatarBg="linear-gradient(135deg,#A78BFA,#4A2C5A)"
            actions={<div style={hdrIcoStyle(t)}><span style={{ color: t.t3 }}>{"\u22EF"}</span></div>} />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Separator t={t} text="Aujourd'hui \u00B7 21h" />
              <BubbleThem t={t} text={"Attention rue de la Convention \u26A0\uFE0F"} time="21:02" avBg="#3BB4C1" avInitial="M" sender="Marie_C" />
              <BubbleMe t={t} text={"Idem, j'\u00e9vite cette rue ce soir"} time="21:05" />
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, background: "#A78BFA" }}>S</div>
                <TypingDots t={t} />
              </div>
            </div>
          </div>
          <InputBar t={t} placeholder="Message au groupe\u2026" sendBg="#A78BFA" sendShadow="0 3px 12px rgba(167,139,250,.3)" gifActive showPicker />
        </Phone>

      </div>

      {/* Tech note */}
      <div style={{ maxWidth: 700, textAlign: "center", padding: "14px 20px", background: t.richBg, border: `1px solid ${t.msgBorder}`, borderRadius: 14 }}>
        <p style={{ fontSize: 11, color: t.t2, lineHeight: 1.7 }}>
          <b style={{ color: t.t1 }}>Int&eacute;gration Tenor API</b> &mdash; cl&eacute; gratuite (1k req/jour),
          pas de d&eacute;pendance npm, fetch direct c&ocirc;t&eacute; client.
          <br />Julia AI &rarr; <b>pas de GIF</b> (contexte s&eacute;curit&eacute;, reste sobre).
          Cercle &rarr; GIF activ&eacute;. DM + Groupe &rarr; GIF activ&eacute;.
        </p>
      </div>
    </div>
  );
}

// ── Control button style ──

function ctrlStyle(t: ReturnType<typeof tk>, on: boolean): React.CSSProperties {
  return {
    padding: "7px 16px", borderRadius: 9999,
    border: `1px solid ${on ? t.teal : t.msgBorder}`,
    background: on ? t.teal : t.richBg,
    color: on ? "#fff" : t.t2,
    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "all .2s",
  };
}
