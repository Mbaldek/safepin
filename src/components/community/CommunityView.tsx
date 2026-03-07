// src/components/community/CommunityView.tsx — Parent container for Community tab

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversation } from '@/lib/dm';
import Header from './CommunityHeader';
import TabBar from './tab-bar';
import FilTab from './fil-tab';
import CercleTab from './cercle-tab';
import GroupesTab from './groupes-tab';
import MessagesTab from './messages-tab';
import ComposeModal from './compose-modal';
import StoryViewer, { type DBStory } from './story-viewer';
import StoryComposeModal from './story-compose-modal';
import CreateGroupModal from './create-group-modal';
import { TrendingHashtags, HashtagFeedSheet } from '@/components/hashtags';
import { AnimatePresence } from 'framer-motion';
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
}

export default function CommunityView({ onClose, onSafetyFilter }: CommunityViewProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';

  const userId = useStore((s) => s.userId);

  const communityDefaultTab = useStore((s) => s.communityDefaultTab);
  const setCommunityDefaultTab = useStore((s) => s.setCommunityDefaultTab);

  const [activeTab, setActiveTab] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

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
      setActiveTab(3); // Messages tab
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
      .in('community_id', ids)
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
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    const pMap = new Map((profiles || []).map((p) => [p.id, p]));

    setDbStories(
      data.map((s) => {
        const p = pMap.get(s.user_id);
        const name = p?.display_name || s.display_name || '?';
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
    fetchStories();
  }, [fetchStories, refreshKey]);

  const tabs = ['Fil', 'Cercle', 'Groupes', 'Messages'];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85dvh',
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
        onSearch={(q) => setSearchQuery(q)}
        forceOpen={searchOpen}
        searchValue={searchQuery}
      />

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
      />

      <div style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hidden">
        {activeTab === 0 && (
          <>
            <TrendingHashtags
              isDark={isDark}
              onTagPress={setActiveHashtag}
            />
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
            />
          </>
        )}
        {activeTab === 1 && <CercleTab isDark={isDark} userId={userId} onOpenConversation={handleOpenConversation} />}
        {activeTab === 2 && (
          <GroupesTab
            isDark={isDark}
            userId={userId}
            onCreateGroup={() => setShowCreateGroup(true)}
          />
        )}
        {activeTab === 3 && <MessagesTab isDark={isDark} userId={userId} pendingDm={pendingDm} onPendingDmConsumed={() => setPendingDm(null)} />}
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
    </div>
  );
}
