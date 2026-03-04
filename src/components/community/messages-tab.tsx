"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";

interface MessagesTabProps {
  isDark: boolean;
}

const recentMessages = [
  {
    id: 1,
    name: "Marie Dupont",
    avatar: "M",
    lastMessage: "Ok je suis en route !",
    time: "2min",
    unread: 2,
    gradientColors: ["#A78BFA", "#8B5CF6"],
  },
  {
    id: 2,
    name: "Anaïs Petit",
    avatar: "A",
    lastMessage: "Merci pour le trajet 🙏",
    time: "1h",
    unread: 0,
    gradientColors: ["#3BB4C1", "#06B6D4"],
  },
  {
    id: 3,
    name: "Sofia B.",
    avatar: "S",
    lastMessage: "Tu connais ce café ?",
    time: "hier",
    unread: 0,
    gradientColors: ["#F5C341", "#F59E0B"],
  },
];

const suggestions = [
  {
    id: 1,
    name: "Julie Martin",
    avatar: "J",
    relation: "Votre contact de confiance",
    gradientColors: ["#34D399", "#10B981"],
  },
  {
    id: 2,
    name: "Emma Laurent",
    avatar: "E",
    relation: "Votre contact de confiance",
    gradientColors: ["#A78BFA", "#8B5CF6"],
  },
];

export default function MessagesTab({ isDark }: MessagesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div style={{ padding: "16px" }}>
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderRadius: 12,
          border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
          marginBottom: 24,
        }}
      >
        <Search size={18} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
        <input
          type="text"
          placeholder="Rechercher une conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 15,
            color: isDark ? "#FFFFFF" : "#0F172A",
            outline: "none",
          }}
        />
      </div>

      {/* Récents Section */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? "#64748B" : "#94A3B8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 16,
          }}
        >
          Récents
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recentMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                cursor: "pointer",
                backgroundColor: "transparent",
                transition: "background-color 0.2s",
              }}
              whileHover={{
                backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${message.gradientColors[0]}, ${message.gradientColors[1]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                {message.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: isDark ? "#FFFFFF" : "#0F172A",
                    }}
                  >
                    {message.name}
                  </span>
                  <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                    {message.time}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: isDark ? "#94A3B8" : "#64748B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {message.lastMessage}
                </p>
              </div>
              {message.unread > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#3BB4C1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    padding: "0 6px",
                  }}
                >
                  {message.unread}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Suggestions Section */}
      <div>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? "#64748B" : "#94A3B8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 16,
          }}
        >
          Suggestions — Votre cercle
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.15 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(241, 245, 249, 0.5)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${suggestion.gradientColors[0]}, ${suggestion.gradientColors[1]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                {suggestion.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: isDark ? "#FFFFFF" : "#0F172A",
                  }}
                >
                  {suggestion.name}
                </span>
                <p style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8", marginTop: 2 }}>
                  {suggestion.relation}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  border: `1px solid #3BB4C1`,
                  color: "#3BB4C1",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Écrire
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
