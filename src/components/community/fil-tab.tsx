"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StoriesRow from "./stories-row";
import PostCard from "./post-card";
import { SOSPostCard } from "./CommunityHub";

interface FilTabProps {
  isDark: boolean;
  userId: string | null;
  onStoryClick: (index: number) => void;
  onPublish: () => void;
  onSafetyFilter?: (tag: string) => void;
  searchQuery?: string;
  onHashtagClick?: (tag: string) => void;
  onHashtagsReady?: (tags: Map<string, number>) => void;
}

const GRADIENTS = [
  ["#A78BFA", "#8B5CF6"],
  ["#3BB4C1", "#06B6D4"],
  ["#F5C341", "#F59E0B"],
  ["#34D399", "#10B981"],
  ["#EF4444", "#DC2626"],
];

function pickGradient(id: string): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

export default function FilTab({ isDark, userId, onStoryClick, onPublish, onSafetyFilter, searchQuery, onHashtagClick, onHashtagsReady }: FilTabProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [sosPosts, setSosPosts] = useState<any[]>([]);
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [sosTab, setSosTab] = useState<'active' | 'resolved' | 'notifs'>('active');

  const handleHide = useCallback((postId: string) => {
    setHiddenIds((prev) => new Set(prev).add(postId));
  }, []);

  // Extract hashtags from loaded posts and notify parent
  useEffect(() => {
    if (!onHashtagsReady) return;
    const tagCounts = new Map<string, number>();
    for (const p of posts) {
      const matches = p.content?.match(/#[\wÀ-ÿ]+/g) ?? [];
      for (const tag of matches) {
        const lower = tag.toLowerCase();
        tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
      }
    }
    onHashtagsReady(tagCounts);
  }, [posts, onHashtagsReady]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);

      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      const ids = memberships?.map((m) => m.community_id) ?? [];
      setCommunityIds(ids);

      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data: messages } = await supabase
        .from("community_messages")
        .select("id, content, created_at, user_id, display_name, community_id")
        .in("community_id", ids)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!messages?.length) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(messages.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, username, avatar_emoji, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Fetch comment counts for all posts
      const postIds = messages.map((m) => m.id);
      const { data: commentRows } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentRows || []).forEach((r: any) =>
        commentCountMap.set(r.post_id, (commentCountMap.get(r.post_id) || 0) + 1)
      );

      setPosts(
        messages.map((m) => {
          const p = profileMap.get(m.user_id);
          const name = p?.display_name || p?.first_name || p?.username || m.display_name || "Anonyme";
          const avatar = p?.avatar_emoji || name.charAt(0).toUpperCase();
          return {
            id: m.id,
            type: "quartier" as const,
            user: {
              name,
              avatar,
              avatarUrl: p?.avatar_url || null,
              gradientColors: pickGradient(m.user_id),
            },
            time: timeAgo(m.created_at),
            title: "",
            content: m.content,
            comments: commentCountMap.get(m.id) || 0,
            userId: m.user_id,
            _createdAt: m.created_at,
          };
        })
      );

      // Fetch SOS community posts (graceful — table may not exist yet)
      try {
        const { data: sosRows } = await supabase
          .from("community_posts")
          .select("*")
          .eq("type", "sos_alert")
          .order("created_at", { ascending: false })
          .limit(20);

        if (sosRows?.length) {
          // Filter circle posts: only visible if current user is in circleMembers
          const visible = sosRows.filter((s: any) => {
            if (s.visibility === 'community') return true;
            if (s.visibility === 'circle') {
              return s.author_id === userId || (s.metadata?.circleMembers ?? []).includes(userId);
            }
            return false;
          });

          // Enrich with author profiles
          const sosAuthorIds = [...new Set(visible.map((s: any) => s.author_id))];
          const { data: sosProfiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_emoji")
            .in("id", sosAuthorIds);
          const sosProfileMap = new Map((sosProfiles || []).map((p: any) => [p.id, p]));

          setSosPosts(visible.map((s: any) => {
            const prof = sosProfileMap.get(s.author_id);
            return {
              ...s,
              author_name: s.is_anonymous ? null : (prof?.display_name ?? null),
              author_emoji: s.is_anonymous ? null : (prof?.avatar_emoji ?? null),
              _isSos: true,
              _createdAt: s.created_at,
            };
          }));
        }
      } catch {
        // community_posts table may not exist — silent
      }

      setLoading(false);
    })();
  }, [userId]);

  // Realtime for new posts
  useEffect(() => {
    if (!userId || !communityIds.length) return;
    const channel = supabase
      .channel("community-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        async (payload) => {
          const m = payload.new as any;
          if (!communityIds.includes(m.community_id)) return;
          // Fetch profile for richer display
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, first_name, username, avatar_emoji, avatar_url")
            .eq("id", m.user_id)
            .maybeSingle();
          const name = prof?.display_name || prof?.first_name || prof?.username || m.display_name || "Anonyme";
          const avatar = prof?.avatar_emoji || name.charAt(0).toUpperCase();
          setPosts((prev) => [
            {
              id: m.id,
              type: "quartier" as const,
              user: {
                name,
                avatar,
                avatarUrl: prof?.avatar_url || null,
                gradientColors: pickGradient(m.user_id),
              },
              time: timeAgo(m.created_at),
              title: "",
              content: m.content,
              userId: m.user_id,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, communityIds]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 13 }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <StoriesRow isDark={isDark} userId={userId} communityIds={communityIds} onStoryClick={onStoryClick} onPublish={onPublish} />

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* SOS filter tabs — only shown when SOS posts exist */}
        {sosPosts.length > 0 && (
          <div style={{ display: 'flex', gap: 5 }}>
            {([
              { key: 'active' as const,   icon: '\uD83D\uDEA8', label: 'SOS actif',  color: 'var(--semantic-danger, #F04060)',       softBg: 'rgba(240,64,96,0.10)',    softBorder: 'rgba(240,64,96,0.22)' },
              { key: 'resolved' as const, icon: '\u2713',        label: 'R\u00e9solu', color: 'var(--semantic-success, #34D399)',      softBg: 'rgba(52,211,153,0.10)',   softBorder: 'rgba(52,211,153,0.22)' },
              { key: 'notifs' as const,    icon: '\uD83D\uDD14', label: 'Re\u00e7ues', color: '#3BB4C1',                               softBg: 'rgba(59,180,193,0.10)',   softBorder: 'rgba(59,180,193,0.22)' },
            ]).map((tab) => {
              const active = sosTab === tab.key;
              const circleNotifs = tab.key === 'notifs' ? sosPosts.filter(p => p.visibility === 'circle' && p.author_id !== userId).length : 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSosTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                    background: active ? tab.softBg : (isDark ? 'var(--surface-elevated, #273449)' : '#F1F5F9'),
                    border: `1px solid ${active ? tab.softBorder : (isDark ? 'var(--border-default, rgba(255,255,255,0.08))' : '#E2E8F0')}`,
                    color: active ? tab.color : (isDark ? 'var(--text-tertiary, #64748B)' : '#94A3B8'),
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.key === 'notifs' && circleNotifs > 0 && (
                    <span style={{
                      minWidth: 14, height: 14, borderRadius: 7,
                      backgroundColor: '#EF4444', color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                    }}>{circleNotifs}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(() => {
          const allPosts = [
            ...posts.map(p => ({ ...p, _isSos: false })),
            ...sosPosts,
          ].sort((a, b) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime());

          // Apply SOS tab filter when SOS posts exist
          const filtered = sosPosts.length > 0
            ? allPosts.filter(p => {
                if (sosTab === 'active') {
                  return !p._isSos || p.status === 'active';
                }
                if (sosTab === 'resolved') {
                  return p._isSos && p.status === 'resolved';
                }
                // 'notifs' — circle posts where user is NOT the author
                return p._isSos && p.visibility === 'circle' && p.author_id !== userId;
              })
            : allPosts;

          // Deduplicate SOS posts by sos_id (keep first = most recent)
          const seenSosIds = new Set<string>();
          const deduped = filtered.filter(p => {
            if (!p._isSos || !p.sos_id) return true;
            if (seenSosIds.has(p.sos_id)) return false;
            seenSosIds.add(p.sos_id);
            return true;
          });

          let visible = deduped.filter((p) => !hiddenIds.has(p.id));

          // Search filter
          if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            visible = visible.filter((p) => {
              if (p.content?.toLowerCase().includes(q)) return true;
              const hashtags = p.content?.match(/#[\wÀ-ÿ]+/g) ?? [];
              return hashtags.some((h: string) => h.toLowerCase().includes(q));
            });
          }

          if (visible.length === 0) {
            if (searchQuery && searchQuery.trim()) {
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 8 }}>
                  <span style={{ fontSize: 32 }}>🔍</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
                    Aucun post pour &quot;{searchQuery.trim()}&quot;
                  </p>
                  <button
                    onClick={() => onHashtagClick?.('')}
                    style={{
                      marginTop: 4, padding: "6px 16px", borderRadius: 20,
                      background: isDark ? "#243050" : "#F1F5F9",
                      border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B",
                    }}
                  >
                    Effacer
                  </button>
                </div>
              );
            }
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 8 }}>
                <span style={{ fontSize: 32 }}>{sosPosts.length > 0 ? '🔍' : '📝'}</span>
                <p style={{ fontSize: 14, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
                  {sosPosts.length > 0 ? 'Aucun post dans ce filtre' : 'Aucun post pour l\u0027instant'}
                </p>
                <p style={{ fontSize: 12, color: isDark ? "#64748B" : "#94A3B8" }}>
                  {sosPosts.length > 0 ? 'Changez d\u0027onglet pour voir d\u0027autres posts' : 'Rejoignez un groupe et publiez !'}
                </p>
              </div>
            );
          }

          return visible.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.04 }}
            >
              {post._isSos ? (
                <SOSPostCard post={post} currentUserId={userId} />
              ) : (
                <PostCard post={post} isDark={isDark} currentUserId={userId} onHide={handleHide} onSafetyFilter={onSafetyFilter} onHashtagClick={onHashtagClick} />
              )}
            </motion.div>
          ));
        })()}
      </div>
    </div>
  );
}
