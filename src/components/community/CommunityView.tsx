// src/components/community/CommunityView.tsx — Parent container for Community tab

'use client';

import { useState } from 'react';
import { useTheme } from '@/stores/useTheme';
import Header from './CommunityHeader';
import TabBar from './tab-bar';
import FilTab from './fil-tab';
import CercleTab from './cercle-tab';
import GroupesTab from './groupes-tab';
import MessagesTab from './messages-tab';
import ComposeModal from './compose-modal';
import StoryViewer from './story-viewer';

interface CommunityViewProps {
  onClose: () => void;
}

export default function CommunityView({ onClose }: CommunityViewProps) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const toggleTheme = useTheme((s) => s.toggleTheme);

  const [activeTab, setActiveTab] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);

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
            onStoryClick={(i) => {
              setStoryIndex(i);
              setShowStoryViewer(true);
            }}
          />
        )}
        {activeTab === 1 && <CercleTab isDark={isDark} />}
        {activeTab === 2 && <GroupesTab isDark={isDark} />}
        {activeTab === 3 && <MessagesTab isDark={isDark} />}
      </div>

      {showCompose && (
        <ComposeModal isDark={isDark} onClose={() => setShowCompose(false)} />
      )}

      {showStoryViewer && (
        <StoryViewer
          isDark={isDark}
          storyIndex={storyIndex}
          onClose={() => setShowStoryViewer(false)}
          onNavigate={setStoryIndex}
        />
      )}
    </div>
  );
}
