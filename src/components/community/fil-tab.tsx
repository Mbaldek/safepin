"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Bookmark, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTrendingHashtags } from "@/hooks/useHashtags";
import { useStore } from "@/stores/useStore";
import { CATEGORY_DETAILS } from "@/types";
import StoriesRow from "./stories-row";
import PostCard from "./post-card";
import PinFeedCard from "./pin-feed-card";
import { SOSPostCard } from "./SOSPostCard";

interface FilTabProps {
  isDark: boolean;
  userId: string | null;
  onStoryClick: (index: number) => void;
  onPublish: () => void;
  onSafetyFilter?: (tag: string) => void;
  searchQuery?: string;
  onHashtagClick?: (tag: string) => void;
  onHashtagsReady?: (tags: Map<string, number>) => void;
  refreshKey?: number;
  onSearchToggle?: () => void;
  onPinClick?: (pinId: string) => void;
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

export default function FilTab({ isDark, userId, onStoryClick, onPublish, onSafetyFilter, searchQuery, onHashtagClick, onHashtagsReady, refreshKey, onSearchToggle, onPinClick }: FilTabProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [sosPosts, setSosPosts] = useState<any[]>([]);
  const [pinPosts, setPinPosts] = useState<any[]>([]);
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [sosTab, setSosTab] = useState<'active' | 'resolved' | 'notifs'>('active');
  const [showFavoris, setShowFavoris] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [activeHashtagFilter, setActiveHashtagFilter] = useState<string | null>(null);
  const [hashtagPinIds, setHashtagPinIds] = useState<Set<string>>(new Set());
  const [contentFilter, setContentFilter] = useState<Set<'post' | 'sos' | 'pin'>>(new Set(['post', 'sos', 'pin']));
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const { trending } = useTrendingHashtags();
  const userLocation = useStore((s) => s.userLocation);

  const handleHide = useCallback((postId: string) => {
    setHiddenIds((prev) => new Set(prev).add(postId));
  }, []);

  // Fetch saved post IDs when favoris filter is toggled on
  useEffect(() => {
    if (!showFavoris || !userId) { setSavedPostIds(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId);
      setSavedPostIds(new Set((data || []).map((r: any) => r.post_id)));
    })();
  }, [showFavoris, userId]);

  // Fetch pin IDs linked to active hashtag filter via content_hashtags
  useEffect(() => {
    if (!activeHashtagFilter) { setHashtagPinIds(new Set()); return; }
    (async () => {
      const { data: htRow } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', activeHashtagFilter.toLowerCase())
        .maybeSingle();
      if (!htRow) { setHashtagPinIds(new Set()); return; }
      const { data: links } = await supabase
        .from('content_hashtags')
        .select('content_id')
        .eq('hashtag_id', htRow.id)
        .eq('content_type', 'incident');
      setHashtagPinIds(new Set((links || []).map((l: any) => l.content_id)));
    })();
  }, [activeHashtagFilter]);

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

      // Pre-fetch viewer's social graph for visibility filtering
      const [{ data: myFollows }, { data: myCircle1 }, { data: myCircle2 }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase.from("trusted_contacts").select("contact_id").eq("user_id", userId).eq("status", "accepted"),
        supabase.from("trusted_contacts").select("user_id").eq("contact_id", userId).eq("status", "accepted"),
      ]);
      const followingSet = new Set((myFollows || []).map((f: any) => f.following_id));
      const circleSet = new Set([
        ...(myCircle1 || []).map((c: any) => c.contact_id),
        ...(myCircle2 || []).map((c: any) => c.user_id),
      ]);

      const { data: messages } = await supabase
        .from("community_messages")
        .select("id, content, created_at, user_id, display_name, community_id, visibility")
        .in("community_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!messages?.length) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Filter by visibility
      const visible = messages.filter((m) => {
        const vis = (m as any).visibility || "public";
        if (vis === "public") return true;
        if (m.user_id === userId) return true; // always see own posts
        if (vis === "followers") return followingSet.has(m.user_id);
        if (vis === "cercle") return circleSet.has(m.user_id);
        return true;
      });

      const userIds = [...new Set(visible.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, username, avatar_emoji, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Fetch comment counts for all posts
      const postIds = visible.map((m) => m.id);
      const { data: commentRows } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentRows || []).forEach((r: any) =>
        commentCountMap.set(r.post_id, (commentCountMap.get(r.post_id) || 0) + 1)
      );

      setPosts(
        visible.map((m) => {
          const p = profileMap.get(m.user_id);
          const displayName = p?.display_name || p?.first_name || m.display_name || "Anonyme";
          const name = p?.username || displayName;
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
            username: p?.username || null,
            displayName,
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

      // Fetch recent pins (nearby + social graph)
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const pinSelect = 'id, user_id, lat, lng, category, severity, description, photo_url, address, confirmations, created_at';

        const lat = userLocation?.lat ?? 48.8566;
        const lng = userLocation?.lng ?? 2.3522;
        const latDelta = 0.0045;   // ~500m
        const lngDelta = 0.0055;   // ~500m
        const socialIds = [...followingSet, ...circleSet];

        const [nearbyPinsRes, socialPinsRes] = await Promise.all([
          supabase.from('pins').select(pinSelect)
            .gte('created_at', sevenDaysAgo)
            .is('resolved_at', null)
            .gte('lat', lat - latDelta).lte('lat', lat + latDelta)
            .gte('lng', lng - lngDelta).lte('lng', lng + lngDelta)
            .order('created_at', { ascending: false })
            .limit(20),
          socialIds.length > 0
            ? supabase.from('pins').select(pinSelect)
                .gte('created_at', sevenDaysAgo)
                .is('resolved_at', null)
                .in('user_id', socialIds)
                .order('created_at', { ascending: false })
                .limit(15)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const allPins = [...(nearbyPinsRes.data ?? []), ...(socialPinsRes.data ?? [])];

        // Deduplicate
        const seenPinIds = new Set<string>();
        const uniquePins = allPins.filter(p => {
          if (seenPinIds.has(p.id)) return false;
          seenPinIds.add(p.id);
          return true;
        });

        // Enrich with profiles
        const pinAuthorIds = [...new Set(uniquePins.map(p => p.user_id))];
        let pinProfileMap = new Map<string, any>();
        if (pinAuthorIds.length > 0) {
          const { data: pinProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, username, avatar_emoji, avatar_url')
            .in('id', pinAuthorIds);
          pinProfileMap = new Map((pinProfiles || []).map((p: any) => [p.id, p]));
        }

        setPinPosts(uniquePins.map(pin => {
          const prof = pinProfileMap.get(pin.user_id);
          const displayName = prof?.display_name || prof?.first_name || 'Anonyme';
          const name = prof?.username || displayName;
          const avatar = prof?.avatar_emoji || name.charAt(0).toUpperCase();
          return {
            id: pin.id,
            type: 'pin' as const,
            _isPin: true,
            _isSos: false,
            _createdAt: pin.created_at,
            category: pin.category,
            severity: pin.severity,
            description: pin.description,
            address: pin.address,
            photo_url: pin.photo_url,
            confirmations: pin.confirmations || 0,
            lat: pin.lat,
            lng: pin.lng,
            userId: pin.user_id,
            user: { name, avatar, avatarUrl: prof?.avatar_url || null, gradientColors: pickGradient(pin.user_id) },
            content: pin.description || '',
          };
        }));
      } catch {
        // pins table query failed — silent
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
          const displayName = prof?.display_name || prof?.first_name || m.display_name || "Anonyme";
          const name = prof?.username || displayName;
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
              username: prof?.username || null,
              displayName,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 12 }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <StoriesRow isDark={isDark} userId={userId} communityIds={communityIds} onStoryClick={onStoryClick} onPublish={onPublish} refreshKey={refreshKey} activeHashtagFilter={activeHashtagFilter} />

      {/* Trending bar: search + favoris + hashtag pills */}
      <div
        className="scrollbar-hidden"
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 16px',
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        {/* Search pill */}
        <button
          onClick={() => onSearchToggle?.()}
          style={{
            width: 34, height: 34, minWidth: 34, borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? '#1E293B' : '#F1F5F9',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
            cursor: 'pointer',
          }}
        >
          <Search size={16} style={{ color: '#3BB4C1' }} />
        </button>

        {/* Filter pill */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowFilterMenu(f => !f)}
            style={{
              width: 34, height: 34, minWidth: 34, borderRadius: 99,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: contentFilter.size < 3
                ? (isDark ? 'rgba(59,180,193,0.15)' : 'rgba(59,180,193,0.10)')
                : (isDark ? '#1E293B' : '#F1F5F9'),
              border: `1px solid ${contentFilter.size < 3 ? '#3BB4C1' : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={15} style={{ color: contentFilter.size < 3 ? '#3BB4C1' : (isDark ? '#94A3B8' : '#64748B') }} />
          </button>
          {showFilterMenu && (
            <div style={{
              position: 'absolute', top: 40, left: 0, zIndex: 50,
              background: isDark ? '#1E293B' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`,
              borderRadius: 12, padding: '6px 0', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}>
              {([
                { key: 'post' as const, label: 'Publications', icon: '📝' },
                { key: 'sos' as const, label: 'Alertes SOS', icon: '🚨' },
                { key: 'pin' as const, label: 'Signalements', icon: '📍' },
              ]).map(opt => {
                const active = contentFilter.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setContentFilter(prev => {
                        const next = new Set(prev);
                        if (active && next.size > 1) next.delete(opt.key);
                        else next.add(opt.key);
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 14px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontSize: 11,
                      fontWeight: active ? 600 : 400, fontFamily: 'inherit',
                      color: active ? (isDark ? '#FFFFFF' : '#0F172A') : (isDark ? '#64748B' : '#94A3B8'),
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{opt.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                    {active && <span style={{ color: '#3BB4C1', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Favoris pill */}
        <button
          onClick={() => setShowFavoris(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 99, whiteSpace: 'nowrap',
            fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            cursor: 'pointer', transition: 'all 0.15s ease',
            background: showFavoris
              ? (isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.12)')
              : (isDark ? '#1E293B' : '#F1F5F9'),
            border: `1px solid ${showFavoris
              ? 'rgba(251,191,36,0.3)'
              : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
            color: showFavoris ? '#FBBF24' : (isDark ? '#94A3B8' : '#64748B'),
          }}
        >
          <Bookmark size={13} fill={showFavoris ? '#FBBF24' : 'none'} />
          <span>Favoris</span>
        </button>

        {/* Trending hashtag pills */}
        {trending.map((t) => {
          const isActive = activeHashtagFilter === t.tag;
          const tagColor = t.color || '#3BB4C1';
          return (
            <button
              key={t.id}
              onClick={() => {
                if (isActive) {
                  setActiveHashtagFilter(null);
                  onHashtagClick?.('');
                } else {
                  setActiveHashtagFilter(t.tag);
                  onHashtagClick?.(`#${t.tag}`);
                }
              }}
              style={{
                padding: '6px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: isActive ? `${tagColor}15` : (isDark ? '#1E293B' : '#F1F5F9'),
                border: `1px solid ${isActive ? tagColor : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
                color: isActive ? tagColor : (isDark ? '#94A3B8' : '#64748B'),
                animation: t.count > 10 ? 'hashtag-pulse 2s infinite' : undefined,
              }}
            >
              #{t.tag} · {t.count}
            </button>
          );
        })}
      </div>

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
            ...posts.map(p => ({ ...p, _isSos: false, _isPin: false })),
            ...sosPosts.map(p => ({ ...p, _isPin: false })),
            ...pinPosts,
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

          // Content type filter
          const typeFiltered = filtered.filter(p => {
            if (p._isPin) return contentFilter.has('pin');
            if (p._isSos) return contentFilter.has('sos');
            return contentFilter.has('post');
          });

          // Deduplicate SOS posts by sos_id (keep first = most recent)
          const seenSosIds = new Set<string>();
          const deduped = typeFiltered.filter(p => {
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
              if (hashtags.some((h: string) => h.toLowerCase().includes(q))) return true;
              if (p._isPin) {
                if (p.address?.toLowerCase().includes(q)) return true;
                const catLabel = CATEGORY_DETAILS[p.category]?.label?.toLowerCase();
                if (catLabel?.includes(q)) return true;
              }
              return false;
            });
          }

          // Hashtag filter (from trending bar)
          if (activeHashtagFilter) {
            const ht = activeHashtagFilter.toLowerCase();
            visible = visible.filter((p) => {
              const hashtags = p.content?.match(/#[\wÀ-ÿ]+/g) ?? [];
              if (hashtags.some((h: string) => h.replace(/^#/, '').toLowerCase() === ht)) return true;
              if (p._isPin && hashtagPinIds.has(p.id)) return true;
              return false;
            });
          }

          // Favoris filter
          if (showFavoris) {
            visible = visible.filter((p) => savedPostIds.has(p.id));
          }

          if (visible.length === 0) {
            if (showFavoris) {
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 8 }}>
                  <span style={{ fontSize: 32 }}>🔖</span>
                  <p style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
                    Aucun favori pour l&apos;instant
                  </p>
                  <p style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
                    Ajoutez des posts en favoris avec le bouton 🔖
                  </p>
                </div>
              );
            }
            if (searchQuery && searchQuery.trim()) {
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 8 }}>
                  <span style={{ fontSize: 32 }}>🔍</span>
                  <p style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
                    Aucun post pour &quot;{searchQuery.trim()}&quot;
                  </p>
                  <button
                    onClick={() => onHashtagClick?.('')}
                    style={{
                      marginTop: 4, padding: "6px 16px", borderRadius: 20,
                      background: isDark ? "#243050" : "#F1F5F9",
                      border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B",
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
                <p style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#94A3B8" : "#64748B" }}>
                  {sosPosts.length > 0 ? 'Aucun post dans ce filtre' : 'Aucun post pour l\u0027instant'}
                </p>
                <p style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8" }}>
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
              style={{ animation: `cardIn ${index * 70}ms cubic-bezier(0.16,1,0.3,1) both` }}
            >
              {post._isPin ? (
                <PinFeedCard pin={post} isDark={isDark} onClick={() => onPinClick?.(post.id)} />
              ) : post._isSos ? (
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
