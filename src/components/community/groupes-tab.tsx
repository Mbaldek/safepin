"use client";

import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { useState } from "react";

interface GroupesTabProps {
  isDark: boolean;
}

const myGroups = [
  {
    id: 1,
    name: "Paris 15e — Sécurité",
    members: 247,
    activeNow: 12,
    unread: 3,
    lastMessage: "Rue Lecourbe — attention ce soir",
    avatars: ["M", "S", "A"],
  },
  {
    id: 2,
    name: "Marches nocturnes Paris",
    members: 89,
    activeNow: 5,
    unread: 1,
    lastMessage: "Prochaine marche samedi 20h",
    avatars: ["J", "L"],
  },
];

const discoverGroups = [
  {
    id: 1,
    name: "Femmes du 15e",
    description: "Entraide et partage entre femmes du quartier. Bienveillance et sécurité.",
    members: 156,
    gradient: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
  },
  {
    id: 2,
    name: "Safe Spots Paris",
    description: "Partagez et découvrez les lieux sûrs de la capitale.",
    members: 423,
    gradient: "linear-gradient(135deg, #A78BFA, #8B5CF6)",
  },
  {
    id: 3,
    name: "Étudiantes Paris",
    description: "Réseau d'entraide pour les étudiantes parisiennes.",
    members: 312,
    gradient: "linear-gradient(135deg, #F5C341, #F59E0B)",
  },
];

export default function GroupesTab({ isDark }: GroupesTabProps) {
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
          placeholder="Rechercher un groupe..."
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

      {/* Mes Groupes Section */}
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
          Mes Groupes
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex" }}>
                    {group.avatars.map((avatar, i) => (
                      <div
                        key={i}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${i === 0 ? "#3BB4C1" : i === 1 ? "#A78BFA" : "#F5C341"}, ${i === 0 ? "#06B6D4" : i === 1 ? "#8B5CF6" : "#F59E0B"})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#FFFFFF",
                          marginLeft: i > 0 ? -10 : 0,
                          border: `2px solid ${isDark ? "#1E293B" : "#FFFFFF"}`,
                        }}
                      >
                        {avatar}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isDark ? "#FFFFFF" : "#0F172A",
                      }}
                    >
                      {group.name}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                        {group.members} membres
                      </span>
                      <span style={{ fontSize: 12, color: "#34D399" }}>
                        🟢 {group.activeNow} actifs
                      </span>
                    </div>
                  </div>
                </div>
                {group.unread > 0 && (
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
                    {group.unread}
                  </motion.div>
                )}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: isDark ? "#94A3B8" : "#64748B",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {group.lastMessage}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Découvrir Section */}
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
          Découvrir — Près de vous
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {discoverGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
              }}
            >
              <div
                style={{
                  height: 60,
                  background: group.gradient,
                }}
              />
              <div style={{ padding: 16 }}>
                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    marginBottom: 4,
                  }}
                >
                  {group.name}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: isDark ? "#94A3B8" : "#64748B",
                    marginBottom: 12,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {group.description}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={14} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
                    <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                      {group.members} membres
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      backgroundColor: "#3BB4C1",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Rejoindre
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
