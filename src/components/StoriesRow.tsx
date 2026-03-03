// src/components/StoriesRow.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { CommunityStory } from '@/types';
import { toast } from 'sonner';

// ─── Story viewer ─────────────────────────────────────────────────────────────

function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: CommunityStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const story = stories[index];
  const DURATION = story?.media_type === 'video' ? 15_000 : 5_000;

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const step = 100 / (DURATION / 50);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) {
          clearInterval(timerRef.current!);
          if (index < stories.length - 1) {
            setTimeout(() => setIndex((i) => i + 1), 50);
          } else {
            setTimeout(onClose, 100);
          }
          return 100;
        }
        return p + step;
      });
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index]);

  if (!story) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ backgroundColor: '#000' }}
      onClick={() => {
        if (index < stories.length - 1) setIndex((i) => i + 1);
        else onClose();
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
            <div
              className="h-full rounded-full transition-none"
              style={{
                backgroundColor: '#fff',
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent-gold), #B8923E)' }}>
            {(story.display_name?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-white text-xs font-bold">{story.display_name ?? 'Anonymous'}</p>
            <p className="text-white/60 text-[0.6rem]">
              {Math.round((Date.now() - new Date(story.created_at).getTime()) / 60_000)}m ago
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-white text-2xl w-9 h-9 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center">
        {story.media_type === 'video' ? (
          <video
            src={story.media_url}
            autoPlay
            muted={false}
            playsInline
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={story.media_url}
            alt="Story"
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {/* Caption */}
      {story.caption && (
        <div className="absolute bottom-12 left-0 right-0 px-6">
          <p className="text-white text-sm font-bold text-center drop-shadow-lg">
            {story.caption}
          </p>
        </div>
      )}

      {/* Tap zones */}
      <div className="absolute inset-0 flex" style={{ pointerEvents: 'none' }}>
        <div className="flex-1" style={{ pointerEvents: 'auto' }}
          onClick={(e) => { e.stopPropagation(); if (index > 0) setIndex((i) => i - 1); }} />
        <div className="flex-1" style={{ pointerEvents: 'auto' }}
          onClick={(e) => { e.stopPropagation(); if (index < stories.length - 1) setIndex((i) => i + 1); else onClose(); }} />
      </div>
    </div>
  );
}

// ─── Stories row ──────────────────────────────────────────────────────────────

export default function StoriesRow({ communityId }: { communityId: string }) {
  const { userId, userProfile } = useStore();
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stories (last 24h)
  useEffect(() => {
    const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString();
    supabase
      .from('community_stories')
      .select('*')
      .eq('community_id', communityId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .then(({ data }) => setStories((data ?? []) as CommunityStory[]));
  }, [communityId]);

  // Realtime new stories
  useEffect(() => {
    const ch = supabase
      .channel(`stories-${communityId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_stories', filter: `community_id=eq.${communityId}` },
        (payload) => setStories((prev) => [payload.new as CommunityStory, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [communityId]);

  // Group stories by user (latest per user)
  const storyByUser = new Map<string, CommunityStory>();
  stories.forEach((s) => { if (!storyByUser.has(s.user_id)) storyByUser.set(s.user_id, s); });
  const uniqueStories = [...storyByUser.values()];

  async function postStory() {
    if (!pendingFile || !userId) return;
    setUploading(true);
    const ext = pendingFile.name.split('.').pop();
    const path = `stories/${communityId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(path, pendingFile);
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
    await supabase.from('community_stories').insert({
      community_id: communityId,
      user_id: userId,
      display_name: userProfile?.display_name ?? null,
      media_url: publicUrl,
      media_type: pendingFile.type.startsWith('video') ? 'video' : 'image',
      caption: captionInput.trim() || null,
    });
    setPendingFile(null);
    setCaptionInput('');
    setUploading(false);
    toast.success('Story posted!');
  }

  return (
    <>
      {/* Caption input overlay when file selected */}
      {pendingFile && (
        <div className="fixed inset-0 z-[400] flex items-end"
          style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <div className="w-full max-w-[440px] mx-auto rounded-t-2xl p-5"
            style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {pendingFile.type.startsWith('video') ? '📹' : '📷'} {pendingFile.name}
            </p>
            <input
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Add a caption… (optional)"
              className="w-full text-sm rounded-xl px-4 py-3 outline-none mb-3"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setPendingFile(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={postStory} disabled={uploading}
                className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                {uploading ? 'Posting…' : 'Post Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {viewerOpen && (
        <StoryViewer
          stories={uniqueStories}
          startIndex={viewerStartIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Stories row */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 shrink-0 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Add story */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setPendingFile(e.target.files[0]); }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative"
            style={{ backgroundColor: 'var(--bg-card)', border: '2px dashed var(--border)' }}
          >
            <span className="text-2xl" style={{ color: 'var(--text-muted)' }}>+</span>
          </button>
          <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>Your story</span>
        </div>

        {/* Story circles */}
        {uniqueStories.map((s, i) => {
          const isMe = s.user_id === userId;
          return (
            <div key={s.user_id} className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => { setViewerStartIndex(i); setViewerOpen(true); }}
                className="w-14 h-14 rounded-full overflow-hidden relative"
                style={{ padding: '2px', background: 'linear-gradient(135deg, var(--accent-gold), #f59e0b)' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {s.media_type === 'image' ? (
                    <img src={s.media_url} alt="Story" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: '#111' }}>📹</div>
                  )}
                </div>
              </button>
              <span className="text-[0.6rem] font-bold max-w-[56px] truncate"
                style={{ color: 'var(--text-muted)' }}>
                {isMe ? 'You' : (s.display_name ?? 'User')}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
