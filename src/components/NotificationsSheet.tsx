// src/components/NotificationsSheet.tsx

'use client';

import { useEffect } from 'react';
import { useStore } from '@/stores/useStore';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${hours}h ago`;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  emergency: { icon: '🆘', color: 'rgba(239,68,68,0.12)' },
  vote:      { icon: '👍', color: 'rgba(16,185,129,0.10)' },
  comment:   { icon: '💬', color: 'rgba(59,130,246,0.10)' },
  resolve:   { icon: '✅', color: 'rgba(16,185,129,0.10)' },
  community: { icon: '💬', color: 'rgba(139,92,246,0.10)' },
};

export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { notifications, markNotificationsRead } = useStore();

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <>
      <div
        className="absolute inset-0 z-[200]"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] rounded-t-3xl z-[201] max-h-[72dvh] overflow-y-auto animate-slide-up"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
        <div className="p-5 pb-10">
          <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h3>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <span className="text-4xl">🔔</span>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                No notifications yet
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                You'll see emergency alerts, comments, and votes here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((n) => {
                const meta = TYPE_META[n.type] ?? { icon: '📍', color: 'var(--bg-card)' };
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{
                      backgroundColor: n.read ? 'var(--bg-card)' : meta.color,
                      border: n.read ? '1px solid var(--border)' : '1px solid rgba(244,63,94,0.2)',
                    }}
                  >
                    <span className="text-xl shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {n.body}
                        </p>
                      )}
                      <p className="text-[0.6rem] mt-1 font-bold" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm transition hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
