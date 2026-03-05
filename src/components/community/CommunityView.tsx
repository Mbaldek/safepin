// src/components/community/CommunityView.tsx — Parent container for Community tab

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/stores/useTheme';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
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
}

export default function CommunityView({ onClose }: CommunityViewProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const toggleTheme = useTheme((s) => s.toggleTheme);
  const userId = useStore((s) => s.userId);

  const [activeTab, setActiveTab] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showStoryCompose, setShowStoryCompose] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [dbStories, setDbStories] = useState<DBStory[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

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
        setIsDark={(v) => { if (v !== isDark) toggleTheme(); }}
        onCompose={() => setShowCompose(true)}
        onClose={onClose}
      />

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
      />

      <div style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hidden">
        {activeTab === 0 && (
          <FilTab
            isDark={isDark}
            userId={userId}
            onStoryClick={(i) => {
              setStoryIndex(i);
              setShowStoryViewer(true);
            }}
            onPublish={() => setShowStoryCompose(true)}
          />
        )}
        {activeTab === 1 && <CercleTab isDark={isDark} userId={userId} />}
        {activeTab === 2 && (
          <GroupesTab
            isDark={isDark}
            userId={userId}
            onCreateGroup={() => setShowCreateGroup(true)}
          />
        )}
        {activeTab === 3 && <MessagesTab isDark={isDark} userId={userId} />}
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
    </div>
  );
}
