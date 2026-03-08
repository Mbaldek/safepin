// src/components/community/CommunityView.tsx — Parent container for Community tab

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversation } from '@/lib/dm';
import Header from './CommunityHeader';
import { Search, X } from 'lucide-react';
import TabBar from './tab-bar';
import FilTab from './fil-tab';
import GroupesTab from './groupes-tab';
import MessagesTab from './messages-tab';
import ComposeModal from './compose-modal';
import StoryViewer, { type DBStory } from './story-viewer';
import StoryComposeModal from './story-compose-modal';
import CreateGroupModal from './create-group-modal';
import { HashtagFeedSheet } from '@/components/hashtags';
import { AnimatePresence, motion } from 'framer-motion';
import type { Hashtag } from '@/types';

const GRADIENTS = [
  ['#A78BFA', '#8B5CF6'],
  ['#3BB4C1', '#06B6D4'],
  ['#F5C341', '#F59E0B'],
  ['#34D399', '#10B981'],
  ['#EF4444', '#DC2626'],
];

function pickGradient(id: string): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

interface CommunityViewProps {
  onClose: () => void;
  onSafetyFilter?: (tag: string) => void;
  dmTarget?: { userId: string; userName: string } | null;
  onDMOpened?: () => void;
}

export default function CommunityView({ onClose, onSafetyFilter, dmTarget, onDMOpened }: CommunityViewProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';

  const userId = useStore((s) => s.userId);

  const communityDefaultTab = useStore((s) => s.communityDefaultTab);
  const setCommunityDefaultTab = useStore((s) => s.setCommunityDefaultTab);

  const [activeTab, setActiveTab] = useState(0);
  const [ready, setReady] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [dbHashtags, setDbHashtags] = useState<{ tag: string; count: number; category?: string; color?: string }[]>([]);
  const [feedHashtags, setFeedHashtags] = useState<Map<string, number>>(new Map());

  // Fetch hashtags from DB once (deferred until animation done)
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const { data } = await supabase
        .from('hashtags')
        .select('tag, uses_count, category, color')
        .order('uses_count', { ascending: false })
        .limit(20);
      if (data) {
        setDbHashtags(data.map((h: any) => ({ tag: h.tag, count: h.uses_count ?? 0, category: h.category, color: h.color })));
      }
    })();
  }, [ready]);

  // Merge DB + feed hashtags, deduplicate, sort by frequency
  const mergedSuggestions = useMemo(() => {
    const map = new Map<string, { tag: string; count: number; category?: string; color?: string }>();
    // DB hashtags first
    for (const h of dbHashtags) {
      const key = (h.tag.startsWith('#') ? h.tag : `#${h.tag}`).toLowerCase();
      map.set(key, { tag: key, count: h.count, category: h.category, color: h.color });
    }
    // Feed hashtags — merge counts
    for (const [tag, count] of feedHashtags) {
      const key = tag.startsWith('#') ? tag.toLowerCase() : `#${tag}`.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += count;
      } else {
        map.set(key, { tag: key, count });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [dbHashtags, feedHashtags]);

  const SAFETY_TAGS_SET = useMemo(() => new Set([
    '#sos', '#urgence', '#harcelement', '#harcèlement',
    '#unsafe', '#agression', '#alerte',
  ]), []);

  // Filter suggestions by current query
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return mergedSuggestions.slice(0, 6);
    const q = searchQuery.trim().toLowerCase();
    return mergedSuggestions
      .filter((s) => s.tag.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, mergedSuggestions]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && activeTab === 0) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen, activeTab]);

  // Click outside dropdown → close it
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // Escape key → close search
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchOpen(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const handleSelectSuggestion = (tag: string) => {
    const isSafety = SAFETY_TAGS_SET.has(tag.toLowerCase());
    if (isSafety && onSafetyFilter) {
      onSafetyFilter(tag);
      setSearchQuery('');
      setSearchOpen(false);
      setShowDropdown(false);
    } else {
      setSearchQuery(tag);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (communityDefaultTab !== null) {
      setActiveTab(communityDefaultTab);
      setCommunityDefaultTab(null);
    }
  }, [communityDefaultTab, setCommunityDefaultTab]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showStoryCompose, setShowStoryCompose] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [dbStories, setDbStories] = useState<DBStory[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeHashtag, setActiveHashtag] = useState<Hashtag | null>(null);

  // DM opening from circle tab
  const [pendingDm, setPendingDm] = useState<{
    id: string;
    user1_id: string;
    user2_id: string;
    last_message: string | null;
    last_message_at: string;
    partner_id: string;
    partner_name: string;
    partner_avatar: string | null;
    is_unread: boolean;
  } | null>(null);

  // When dmTarget is set from CercleSheet, open the DM conversation
  useEffect(() => {
    if (!dmTarget || !userId) return;
    handleOpenConversation(dmTarget.userId, dmTarget.userName, null);
    onDMOpened?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmTarget]);

  const handleOpenConversation = useCallback(async (partnerId: string, partnerName: string, partnerAvatar: string | null) => {
    if (!userId) return;
    try {
      const convo = await getOrCreateConversation(userId, partnerId);
      setPendingDm({
        id: convo.id,
        user1_id: convo.user1_id,
        user2_id: convo.user2_id,
        last_message: convo.last_message,
        last_message_at: convo.last_message_at,
        partner_id: partnerId,
        partner_name: partnerName,
        partner_avatar: partnerAvatar,
        is_unread: false,
      });
      setActiveTab(2); // Messages tab
    } catch {
      // conversation creation failed silently
    }
  }, [userId]);

  const fetchStories = useCallback(async () => {
    if (!userId) return;

    // Get user's communities
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);
    const ids = memberships?.map((m) => m.community_id) ?? [];
    if (!ids.length) {
      setDbStories([]);
      return;
    }

    // Fetch stories from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('community_stories')
      .select('id, user_id, display_name, media_url, media_type, caption, created_at')
      .or(`community_id.is.null${ids.length ? `,community_id.in.(${ids.join(",")})` : ""}`)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data?.length) {
      setDbStories([]);
      return;
    }

    // Enrich with profiles
    const userIds = [...new Set(data.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);
    const pMap = new Map((profiles || []).map((p) => [p.id, p]));

    setDbStories(
      data.map((s) => {
        const p = pMap.get(s.user_id);
        const name = p?.username || p?.display_name || s.display_name || '?';
        return {
          id: s.id,
          user_id: s.user_id,
          display_name: name,
          avatar: name.charAt(0).toUpperCase(),
          avatarUrl: p?.avatar_url || null,
          media_url: s.media_url,
          media_type: s.media_type as 'image' | 'video',
          caption: s.caption,
          created_at: s.created_at,
          gradientColors: pickGradient(s.user_id),
        };
      })
    );
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    fetchStories();
  }, [ready, fetchStories, refreshKey]);

  const tabs = ['Fil', 'Groupes', 'Messages'];

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onAnimationComplete={() => setReady(true)}
      style={{
        willChange: 'transform',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85dvh',
        paddingBottom: 64,
        zIndex: 50,
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
      }}
    >
      <Header
        isDark={isDark}
        onCompose={() => setShowCompose(true)}
        onClose={onClose}
      />

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
      />

      {/* Search bar — only visible on Fil tab when searchOpen */}
      {searchOpen && activeTab === 0 && (
        <div
          ref={searchBarRef}
          style={{
            padding: '10px 16px 6px',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px',
            background: isDark ? '#1E293B' : '#F1F5F9',
            borderRadius: 12,
            border: `1px solid ${searchQuery.trim() ? '#3BB4C1' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)')}`,
            transition: 'border-color 200ms ease',
          }}>
            <Search size={15} style={{ color: isDark ? '#64748B' : '#94A3B8', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              autoFocus
              placeholder="Rechercher dans le fil..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(e.target.value.length >= 1);
              }}
              onFocus={() => { if (searchQuery.length >= 1) setShowDropdown(true); }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: isDark ? '#FFFFFF' : '#0F172A',
                flex: 1,
                minWidth: 0,
                padding: 0,
              }}
            />
            {searchQuery.trim() && (
              <button
                onClick={() => { setSearchQuery(''); setShowDropdown(false); searchInputRef.current?.focus(); }}
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={12} style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 6, paddingLeft: 2 }}>
              Resultats pour &quot;{searchQuery.trim()}&quot; dans le fil
            </div>
          )}

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showDropdown && filteredSuggestions.length > 0 && (
              <motion.div
                key="search-dropdown"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 12,
                  right: 12,
                  zIndex: 100,
                  background: isDark ? '#1E293B' : '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}
              >
                {filteredSuggestions.map((s) => {
                  const isSafety = SAFETY_TAGS_SET.has(s.tag.toLowerCase());
                  const tagColor = isSafety ? '#EF4444' : (s.color || '#3BB4C1');
                  return (
                    <button
                      key={s.tag}
                      onClick={() => handleSelectSuggestion(s.tag)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      {isSafety && <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>}
                      <span style={{ fontSize: 14, fontWeight: 700, color: tagColor }}>#</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A', flex: 1 }}>
                        {s.tag.replace(/^#/, '')}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 500, color: isDark ? '#64748B' : '#94A3B8',
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        padding: '2px 8px', borderRadius: 10,
                      }}>
                        {s.count} post{s.count !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="scrollbar-hidden">
        {!ready ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 13 }}>
            Chargement…
          </div>
        ) : activeTab === 0 ? (
          <FilTab
            isDark={isDark}
            userId={userId}
            onStoryClick={(i) => {
              setStoryIndex(i);
              setShowStoryViewer(true);
            }}
            onPublish={() => setShowStoryCompose(true)}
            onSafetyFilter={onSafetyFilter}
            searchQuery={searchQuery}
            onHashtagClick={(tag) => {
              setSearchQuery(tag);
              setSearchOpen(true);
            }}
            onHashtagsReady={setFeedHashtags}
            refreshKey={refreshKey}
            onSearchToggle={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearchQuery(''); setShowDropdown(false); } }}
          />
        )}
        ) : activeTab === 1 ? (
          <GroupesTab
            isDark={isDark}
            userId={userId}
            onCreateGroup={() => setShowCreateGroup(true)}
          />
        ) : activeTab === 2 ? (
          <MessagesTab isDark={isDark} userId={userId} pendingDm={pendingDm} onPendingDmConsumed={() => setPendingDm(null)} />
        ) : null}
      </div>

      {showCompose && (
        <ComposeModal isDark={isDark} userId={userId} onClose={() => setShowCompose(false)} />
      )}

      {showStoryViewer && (
        <StoryViewer
          isDark={isDark}
          storyIndex={storyIndex}
          stories={dbStories}
          onClose={() => setShowStoryViewer(false)}
          onNavigate={setStoryIndex}
          userId={userId}
        />
      )}

      {showStoryCompose && (
        <StoryComposeModal
          isDark={isDark}
          userId={userId}
          onClose={() => setShowStoryCompose(false)}
          onPublished={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          isDark={isDark}
          userId={userId}
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <AnimatePresence>
        {activeHashtag && (
          <HashtagFeedSheet
            hashtag={activeHashtag}
            isDark={isDark}
            onClose={() => setActiveHashtag(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
