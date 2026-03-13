"use client";

import Link from "next/link";

const mockups = [
  { href: "/mockup/trip-summary", label: "Trip Summary Modal", description: "End-of-trip arrival modal with stats" },
  { href: "/mockup/trip-hud", label: "Unified Trip HUD", description: "ActiveHUD — merged TripHUD + TripActiveHUD with live timer, Julia, circle, SOS" },
];

export default function MockupIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#fff", padding: "40px 24px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 8 }}>Breveil Mockups</h1>
      <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 32 }}>Component previews for testing in isolation.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        {mockups.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            style={{
              display: "block",
              padding: "16px 20px",
              borderRadius: 14,
              backgroundColor: "#1E293B",
              border: "1px solid rgba(255,255,255,0.06)",
              textDecoration: "none",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{m.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
