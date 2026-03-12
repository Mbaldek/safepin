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
import { timeAgo } from '@/lib/utils';

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
  renderSearchBar?: () => React.ReactNode;
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

export default function FilTab({ isDark, userId, onStoryClick, onPublish, onSafetyFilter, searchQuery, onHashtagClick, onHashtagsReady, refreshKey, onSearchToggle, onPinClick, renderSearchBar }: FilTabProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [sosPosts, setSosPosts] = useState<any[]>([]);
  const [pinPosts, setPinPosts] = useState<any[]>([]);
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [sosTab, setSosTab] = useState<'active' | 'resolved' | 'notifs' | null>(null);
  const [showFavoris, setShowFavoris] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [activeHashtagFilter, setActiveHashtagFilter] = useState<string | null>(null);
  const [hashtagPinIds, setHashtagPinIds] = useState<Set<string>>(new Set());
  const [contentFilter, setContentFilter] = useState<Set<'post' | 'sos' | 'pin'>>(new Set(['post', 'sos', 'pin']));
  const [filterMode, setFilterMode] = useState(false);
  const { trending } = useTrendingHashtags();
  const userLocation = useStore((s) => s.userLocation);
  const feedCache = useStore((s) => s.feedCache);
  const setFeedCache = useStore((s) => s.setFeedCache);

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

  // Hydrate from cache instantly on mount (stale-while-revalidate)
  const hydratedFromCache = useCallback(() => {
    if (!feedCache) return false;
    if (Date.now() - feedCache.fetchedAt > 5 * 60 * 1000) return false;
    setPosts(feedCache.posts);
    setSosPosts(feedCache.sosPosts);
    setPinPosts(feedCache.pinPosts);
    setCommunityIds(feedCache.communityIds);
    setLoading(false);
    return true;
  }, [feedCache]);

  useEffect(() => {
    if (!userId) return;

    const hadCache = hydratedFromCache();

    (async () => {
      if (!hadCache) setLoading(true);

      const lat = userLocation?.lat ?? 48.8566;
      const lng = userLocation?.lng ?? 2.3522;

      // Single RPC: social graph + posts + pins — 1 round-trip
      const [feedResult, sosResult] = await Promise.all([
        supabase.rpc("user_feed", { p_user_id: userId, p_lat: lat, p_lng: lng, p_limit: 50 }),
        supabase.from("community_posts").select("*").eq("type", "sos_alert").order("created_at", { ascending: false }).limit(20).then(r => r, () => ({ data: null })),
      ]);

      const feed = feedResult.data as any;
      if (!feed || feedResult.error) {
        if (!hadCache) setLoading(false);
        return;
      }

      const ids: string[] = feed.community_ids ?? [];
      setCommunityIds(ids);

      if (!ids.length) {
        setPosts([]); setSosPosts([]); setPinPosts([]);
        setFeedCache({ posts: [], sosPosts: [], pinPosts: [], communityIds: [], fetchedAt: Date.now() });
        setLoading(false);
        return;
      }

      // Process posts (visibility already filtered server-side)
      const processedPosts = (feed.posts ?? []).map((m: any) => {
        const displayName = m.author_display_name || m.author_first_name || m.display_name || "Anonyme";
        const name = m.author_username || displayName;
        const avatar = m.author_avatar_emoji || name.charAt(0).toUpperCase();
        return {
          id: m.id,
          type: "quartier" as const,
          user: { name, avatar, avatarUrl: m.author_avatar_url || null, gradientColors: pickGradient(m.user_id) },
          time: timeAgo(m.created_at),
          title: "",
          content: m.content,
          comments: Number(m.comment_count) || 0,
          userId: m.user_id,
          username: m.author_username || null,
          displayName,
          _createdAt: m.created_at,
        };
      });
      setPosts(processedPosts);

      // Process SOS posts
      let processedSos: any[] = [];
      try {
        const sosRows = (sosResult as any)?.data;
        if (sosRows?.length) {
          const visibleSos = sosRows.filter((s: any) => {
            if (s.visibility === 'community') return true;
            if (s.visibility === 'circle') {
              return s.author_id === userId || (s.metadata?.circleMembers ?? []).includes(userId);
            }
            return false;
          });

          const sosAuthorIds = [...new Set(visibleSos.map((s: any) => s.author_id))];
          const { data: sosProfiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_emoji")
            .in("id", sosAuthorIds);
          const sosProfileMap = new Map((sosProfiles || []).map((p: any) => [p.id, p]));

          processedSos = visibleSos.map((s: any) => {
            const prof = sosProfileMap.get(s.author_id);
            return {
              ...s,
              author_name: s.is_anonymous ? null : (prof?.display_name ?? null),
              author_emoji: s.is_anonymous ? null : (prof?.avatar_emoji ?? null),
              _isSos: true,
              _createdAt: s.created_at,
            };
          });
          setSosPosts(processedSos);
        }
      } catch {
        // community_posts table may not exist — silent
      }

      // Process pins (profiles already joined server-side, deduplicate nearby + social)
      const allPins = [...(feed.nearby_pins ?? []), ...(feed.social_pins ?? [])];
      const seenPinIds = new Set<string>();
      const uniquePins = allPins.filter((p: any) => {
        if (seenPinIds.has(p.id)) return false;
        seenPinIds.add(p.id);
        return true;
      });

      const processedPins = uniquePins.map((pin: any) => {
        const displayName = pin.display_name || pin.first_name || 'Anonyme';
        const name = pin.username || displayName;
        const avatar = pin.avatar_emoji || name.charAt(0).toUpperCase();
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
          user: { name, avatar, avatarUrl: pin.avatar_url || null, gradientColors: pickGradient(pin.user_id) },
          content: pin.description || '',
        };
      });
      setPinPosts(processedPins);

      // Write to cache for instant next open
      setFeedCache({
        posts: processedPosts,
        sosPosts: processedSos,
        pinPosts: processedPins,
        communityIds: ids,
        fetchedAt: Date.now(),
      });

      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

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
    const skBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    return (
      <div style={{ paddingBottom: 20 }}>
        {/* Stories skeleton */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', overflowX: 'hidden' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: '50%', background: skBg }} />
              <div className="animate-pulse" style={{ width: 36, height: 8, borderRadius: 4, background: skBg }} />
            </div>
          ))}
        </div>
        {/* Post card skeletons */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, padding: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="animate-pulse" style={{ width: 36, height: 36, borderRadius: '50%', background: skBg }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="animate-pulse" style={{ width: 100, height: 10, borderRadius: 5, background: skBg }} />
                  <div className="animate-pulse" style={{ width: 60, height: 8, borderRadius: 4, background: skBg }} />
                </div>
              </div>
              <div className="animate-pulse" style={{ width: '100%', height: 10, borderRadius: 5, background: skBg, marginBottom: 8 }} />
              <div className="animate-pulse" style={{ width: '75%', height: 10, borderRadius: 5, background: skBg, marginBottom: 8 }} />
              <div className="animate-pulse" style={{ width: '50%', height: 10, borderRadius: 5, background: skBg, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="animate-pulse" style={{ width: 48, height: 8, borderRadius: 4, background: skBg }} />
                <div className="animate-pulse" style={{ width: 48, height: 8, borderRadius: 4, background: skBg }} />
                <div className="animate-pulse" style={{ width: 48, height: 8, borderRadius: 4, background: skBg }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <StoriesRow isDark={isDark} userId={userId} communityIds={communityIds} onStoryClick={onStoryClick} onPublish={onPublish} refreshKey={refreshKey} activeHashtagFilter={activeHashtagFilter} />

      {renderSearchBar?.()}

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
            width: 32, height: 32, minWidth: 32, borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? '#1E293B' : '#F1F5F9',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
            cursor: 'pointer',
          }}
        >
          <Search size={14} style={{ color: '#3BB4C1' }} />
        </button>

        {/* Filter pill */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterMode(f => !f)}
            style={{
              width: 32, height: 32, minWidth: 32, borderRadius: 99,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: filterMode ? 'rgba(59,180,193,0.15)' : (isDark ? '#1E293B' : '#F1F5F9'),
              border: `1px solid ${filterMode || contentFilter.size < 3 ? '#3BB4C1' : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
              color: filterMode ? '#3BB4C1' : (isDark ? '#64748B' : '#94A3B8'),
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            <SlidersHorizontal size={13} style={{ color: filterMode || contentFilter.size < 3 ? '#3BB4C1' : (isDark ? '#94A3B8' : '#64748B') }} />
          </button>
          {contentFilter.size < 3 && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              width: 8, height: 8, borderRadius: '50%',
              background: '#3BB4C1',
              border: `2px solid ${isDark ? '#0F172A' : '#FFFFFF'}`,
            }} />
          )}
        </div>

        {filterMode ? (
          <>
            {[
              { key: 'all',          label: 'Tout',            color: '#3BB4C1' },
              { key: 'publications', label: '\uD83D\uDCAC Publications', color: '#A78BFA' },
              { key: 'sos',          label: '\uD83D\uDEA8 Alertes SOS',  color: '#EF4444' },
              { key: 'pins',         label: '\uD83D\uDCCD Signalements', color: '#F59E0B' },
            ].map(({ key, label, color }) => {
              const isAll = key === 'all';
              const active = isAll
                ? contentFilter.size === 3
                : contentFilter.has(key === 'publications' ? 'post' : key === 'sos' ? 'sos' : 'pin');
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isAll) {
                      setContentFilter(new Set(['post', 'sos', 'pin']));
                    } else {
                      const mapped = key === 'publications' ? 'post' as const : key === 'sos' ? 'sos' as const : 'pin' as const;
                      setContentFilter(prev => {
                        const next = new Set(prev);
                        if (next.has(mapped) && next.size > 1) next.delete(mapped);
                        else next.add(mapped);
                        return next;
                      });
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1px solid ${active ? color : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')}`,
                    background: active ? color : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    color: active ? '#fff' : (isDark ? '#94A3B8' : '#475569'),
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: active ? `0 4px 16px ${color}55` : 'none',
                    transform: active ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'all 220ms cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = active ? 'translateY(-2px) scale(1.05)' : 'translateY(-1px) scale(1.03)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = active ? 'translateY(-1px)' : 'translateY(0)'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </>
        ) : (
          <>
            {/* Favoris pill */}
            <button
              onClick={() => setShowFavoris(f => !f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
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
          </>
        )}
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
                  onClick={() => setSosTab(prev => prev === tab.key ? null : tab.key)}
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
          const filtered = sosPosts.length > 0 && sosTab !== null
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
                  <span style={{ fontSize: 24 }}>🔖</span>
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
                  <span style={{ fontSize: 24 }}>🔍</span>
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
                <span style={{ fontSize: 24 }}>{sosPosts.length > 0 ? '🔍' : '📝'}</span>
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
                <PinFeedCard pin={post} isDark={isDark} onClick={() => onPinClick?.(post.id)} onLocate={() => {
                  window.dispatchEvent(new CustomEvent('breveil:locate-pin', { detail: { lat: post.lat, lng: post.lng } }));
                }} />
              ) : post._isSos ? (
                <SOSPostCard post={post} currentUserId={userId} />
              ) : (
                <PostCard post={post} isDark={isDark} currentUserId={userId} onHide={handleHide} onSafetyFilter={onSafetyFilter} onHashtagClick={(tag) => { setActiveHashtagFilter(tag.replace(/^#/, '')); }} />
              )}
            </motion.div>
          ));
        })()}
      </div>
    </div>
  );
}
