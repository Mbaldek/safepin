"use client";

import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Community } from "@/types";

interface GroupesTabProps {
  isDark: boolean;
  userId: string | null;
}

export default function GroupesTab({ isDark, userId }: GroupesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [myGroups, setMyGroups] = useState<Community[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [{ data: items }, { data: members }] = await Promise.all([
        supabase
          .from("communities")
          .select("*")
          .is("parent_community_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", userId),
      ]);

      const memberSet = new Set((members || []).map((m) => m.community_id));
      setJoinedIds(memberSet);

      const all = items || [];
      setMyGroups(all.filter((c) => memberSet.has(c.id)));
      setDiscoverGroups(all.filter((c) => !memberSet.has(c.id)));
      setLoading(false);
    })();
  }, [userId]);

  const handleJoin = async (communityId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: userId });
    if (error) {
      toast.error("Impossible de rejoindre");
      return;
    }
    setJoinedIds((prev) => new Set([...prev, communityId]));
    const joined = discoverGroups.find((c) => c.id === communityId);
    if (joined) setMyGroups((p) => [...p, joined]);
    setDiscoverGroups((p) => p.filter((c) => c.id !== communityId));
    toast.success("Groupe rejoint !");
  };

  const q = searchQuery.toLowerCase();
  const filteredMy = myGroups.filter(
    (g) => !q || g.name.toLowerCase().includes(q)
  );
  const filteredDiscover = discoverGroups.filter(
    (g) => !q || g.name.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
          fontSize: 13,
        }}
      >
        Chargement…
      </div>
    );
  }

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
        <Search
          size={18}
          style={{ color: isDark ? "#64748B" : "#94A3B8" }}
        />
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
        {filteredMy.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "32px 0",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>👥</span>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isDark ? "#94A3B8" : "#64748B",
              }}
            >
              Aucun groupe rejoint
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {filteredMy.map((group, index) => (
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {group.avatar_emoji || "👥"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isDark ? "#FFFFFF" : "#0F172A",
                      }}
                    >
                      {group.name}
                    </h4>
                    <span
                      style={{
                        fontSize: 12,
                        color: isDark ? "#64748B" : "#94A3B8",
                      }}
                    >
                      {group.member_count || 0} membres
                    </span>
                  </div>
                </div>
                {group.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: isDark ? "#94A3B8" : "#64748B",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 8,
                    }}
                  >
                    {group.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Découvrir Section */}
      {filteredDiscover.length > 0 && (
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
            Découvrir
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {filteredDiscover.map((group, index) => (
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
                    height: 48,
                    background:
                      "linear-gradient(135deg, #3BB4C1, #06B6D4)",
                  }}
                />
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>
                      {group.avatar_emoji || "👥"}
                    </span>
                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isDark ? "#FFFFFF" : "#0F172A",
                      }}
                    >
                      {group.name}
                    </h4>
                  </div>
                  {group.description && (
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
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Users
                        size={14}
                        style={{
                          color: isDark ? "#64748B" : "#94A3B8",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: isDark ? "#64748B" : "#94A3B8",
                        }}
                      >
                        {group.member_count || 0} membres
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoin(group.id)}
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
      )}
    </div>
  );
}
