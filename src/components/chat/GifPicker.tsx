'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { useIsDark } from '@/hooks/useIsDark';

interface GiphyGif {
  id: string;
  images: {
    fixed_height: { url: string };
    fixed_height_still: { url: string };
  };
  title: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const TABS = [
  { id: 'trending', label: '🔥 Trending' },
  { id: 'reactions', label: '😄 Réactions' },
  { id: 'celebrate', label: '🥳 Fête' },
  { id: 'love', label: '💙 Love' },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_QUERIES: Record<TabId, string | null> = {
  trending: null,
  reactions: 'reactions',
  celebrate: 'celebrate',
  love: 'love',
};

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? '';

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const isDark = useIsDark();
  const [activeTab, setActiveTab] = useState<TabId>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg = isDark ? '#0F1E2E' : '#FFFFFF';
  const surface = isDark ? '#1A2E42' : '#F1F5F9';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const text1 = isDark ? '#E8F0F8' : '#0F1F35';
  const text3 = isDark ? '#4A6278' : '#94A3B8';
  const teal = '#3BB4C1';
  const tealSoft = isDark ? 'rgba(59,180,193,0.15)' : 'rgba(59,180,193,0.10)';

  const fetchGifs = useCallback(async (query: string | null, tab: TabId) => {
    if (!API_KEY) return;
    setLoading(true);
    try {
      const base = 'https://api.giphy.com/v1/gifs';
      const endpoint = query
        ? `${base}/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : TAB_QUERIES[tab]
        ? `${base}/search?api_key=${API_KEY}&q=${encodeURIComponent(TAB_QUERIES[tab]!)}&limit=24&rating=g`
        : `${base}/trending?api_key=${API_KEY}&limit=24&rating=g`;
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const json = await res.json() as { data: GiphyGif[] };
      setGifs(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        fetchGifs(searchQuery.trim(), activeTab);
      }, 400);
    } else {
      fetchGifs(null, activeTab);
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, activeTab, fetchGifs]);

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      background: bg,
      borderTop: `1px solid ${border}`,
      borderRadius: '16px 16px 0 0',
      padding: '12px 12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
      zIndex: 50,
      animation: 'gifPickerUp 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes gifPickerUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: text1, letterSpacing: '0.01em' }}>GIF</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>via Giphy</span>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: surface, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <X size={12} color={text3} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            style={{
              padding: '4px 10px', borderRadius: 9999, flexShrink: 0,
              fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              fontFamily: 'inherit',
              background: activeTab === tab.id ? tealSoft : 'transparent',
              borderColor: activeTab === tab.id ? 'rgba(59,180,193,0.35)' : border,
              color: activeTab === tab.id ? teal : text3,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={13} color={text3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher un GIF…"
          style={{
            width: '100%', padding: '7px 12px 7px 30px',
            borderRadius: 9999, border: `1px solid ${border}`,
            background: surface, fontSize: 11.5, color: text1,
            fontFamily: 'inherit', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,180,193,0.4)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = border; }}
        />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4,
        maxHeight: 168, overflowY: 'auto', scrollbarWidth: 'none',
      }}>
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 8,
                background: surface, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))
          : gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.fixed_height.url)}
                style={{
                  aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                  background: surface, border: `1px solid ${border}`,
                  cursor: 'pointer', padding: 0, transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <img
                  src={gif.images.fixed_height_still.url}
                  alt={gif.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))
        }
      </div>
    </div>
  );
}
