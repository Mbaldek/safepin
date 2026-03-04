"use client";

import { motion } from "framer-motion";
import { MapPin, Check, X, Users } from "lucide-react";

interface CercleTabProps {
  isDark: boolean;
}

const circleContacts = [
  {
    id: 1,
    name: "Marie",
    avatar: "M",
    status: "active",
    statusText: "En route",
    ringColor: "#34D399",
  },
  {
    id: 2,
    name: "Sophie",
    avatar: "S",
    status: "story",
    ringColor: "#F5C341",
  },
  {
    id: 3,
    name: "Julie",
    avatar: "J",
    status: "arrived",
    statusText: "Arrivée",
    ringColor: "#34D399",
  },
  {
    id: 4,
    name: "Léa",
    avatar: "L",
    status: "seen",
    ringColor: "#64748B",
  },
];

const activities = [
  {
    id: 1,
    type: "trip_complete",
    user: "Marie",
    avatar: "M",
    location: "Gare du Nord",
    time: "il y a 20 min",
    badge: "Arrivée en sécurité",
  },
  {
    id: 2,
    type: "trust_request",
    user: "Tom",
    avatar: "T",
    time: "il y a 1h",
  },
  {
    id: 3,
    type: "live_trip",
    user: "Anaïs",
    avatar: "A",
    time: "il y a 5 min",
  },
];

export default function CercleTab({ isDark }: CercleTabProps) {
  return (
    <div style={{ padding: "16px" }}>
      {/* Mon Cercle Section */}
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
          Mon Cercle
        </h3>
        <div
          style={{
            display: "flex",
            gap: 20,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {circleContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                minWidth: 70,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  padding: 3,
                  background: contact.ringColor,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 600,
                    color: isDark ? "#FFFFFF" : "#0F172A",
                  }}
                >
                  {contact.avatar}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isDark ? "#FFFFFF" : "#0F172A",
                  fontWeight: 500,
                }}
              >
                {contact.name}
              </span>
              {contact.statusText && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    borderRadius: 12,
                    backgroundColor: "rgba(52, 211, 153, 0.15)",
                  }}
                >
                  <div
                    className="animate-pulse-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#34D399",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "#34D399", fontWeight: 500 }}>
                    {contact.statusText}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activité Récente Section */}
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
          Activité Récente
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${isDark ? "#334155" : "#E2E8F0"}`,
              }}
            >
              {activity.type === "trip_complete" && (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #34D399, #10B981)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#FFFFFF",
                      }}
                    >
                      {activity.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                        <strong>{activity.user}</strong> a terminé son trajet
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <MapPin size={12} style={{ color: isDark ? "#64748B" : "#94A3B8" }} />
                        <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                          {activity.location} · {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      width: "100%",
                      height: 80,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${isDark ? "#1E293B" : "#E2E8F0"}, ${isDark ? "#0F172A" : "#CBD5E1"})`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `linear-gradient(to right, ${isDark ? "#334155" : "#CBD5E1"} 1px, transparent 1px), linear-gradient(to bottom, ${isDark ? "#334155" : "#CBD5E1"} 1px, transparent 1px)`,
                        backgroundSize: "25px 25px",
                        opacity: 0.3,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      backgroundColor: "rgba(52, 211, 153, 0.15)",
                    }}
                  >
                    <Check size={14} style={{ color: "#34D399" }} />
                    <span style={{ fontSize: 12, color: "#34D399", fontWeight: 500 }}>
                      {activity.badge}
                    </span>
                  </div>
                </>
              )}

              {activity.type === "trust_request" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Users size={18} style={{ color: "#FFFFFF" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                      <strong>{activity.user}</strong> vous a ajouté comme contact de confiance
                    </p>
                    <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                      {activity.time}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "rgba(52, 211, 153, 0.15)",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Check size={18} style={{ color: "#34D399" }} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <X size={18} style={{ color: "#EF4444" }} />
                    </motion.button>
                  </div>
                </div>
              )}

              {activity.type === "live_trip" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #F5C341, #F59E0B)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#FFFFFF",
                    }}
                  >
                    {activity.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 14, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                        <strong>{activity.user}</strong> partage un trajet en cours
                      </p>
                      <div
                        className="animate-pulse-dot"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#F5C341",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                      {activity.time}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      backgroundColor: "rgba(245, 195, 65, 0.15)",
                      border: "none",
                      color: "#F5C341",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Suivre le trajet
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
