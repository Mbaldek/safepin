// src/components/CommentsSection.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Comment } from '@/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${hours}h ago`;
}

export default function CommentsSection({
  pinId,
  userId,
  displayName,
}: {
  pinId: string;
  userId: string | null;
  displayName: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('pin_comments')
      .select('*')
      .eq('pin_id', pinId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []));
  }, [pinId]);

  useEffect(() => {
    const ch = supabase
      .channel(`comments-${pinId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pin_comments', filter: `pin_id=eq.${pinId}` },
        (payload) => setComments((prev) => [...prev, payload.new as Comment])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pinId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function submitComment() {
    if (!input.trim() || !userId || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('pin_comments').insert({
      pin_id: pinId,
      user_id: userId,
      display_name: displayName ?? null,
      content: input.trim(),
    });
    setSubmitting(false);
    if (!error) setInput('');
  }

  return (
    <div>
      <p className="text-[0.7rem] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {comments.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          No comments yet — be the first
        </p>
      ) : (
        <div className="flex flex-col gap-3 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
              >
                {(c.display_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {c.display_name ?? 'Anonymous'}
                  </span>
                  <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {userId ? (
        <div className="flex gap-2 mt-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
            }}
            placeholder="Add a comment…"
            className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={submitComment}
            disabled={!input.trim() || submitting}
            className="px-3 py-2 rounded-xl text-sm font-bold transition disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {submitting ? '…' : '↑'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
          Sign in to comment
        </p>
      )}
    </div>
  );
}
