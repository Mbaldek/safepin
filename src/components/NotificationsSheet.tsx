// src/components/NotificationsSheet.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import type { AppNotification } from '@/types';
import { timeAgoLong as timeAgo } from '@/lib/utils';
import { useTheme } from '@/stores/useTheme';

/* ── icon + dot color per notification type ─────────────────────── */

function getIcon(type: string): string {
  switch (type) {
    case 'sos': case 'emergency': return '🆘';
    case 'trip_arrived': case 'safe_arrival': case 'resolve': return '✅';
    case 'circle_invite': case 'cercle': case 'circle_invitation': case 'community': return '🤝';
    case 'pin': case 'new_pin': case 'comment': return '📍';
    case 'pin_confirmed': case 'vote': return '👍';
    case 'digest': case 'weekly': case 'milestone': return '📊';
    case 'mention': return '@';
    case 'story': return '📸';
    default: return '🔔';
  }
}

function getDotColor(type: string): string {
  switch (type) {
    case 'sos': case 'emergency': return '#EF4444';
    case 'trip_arrived': case 'safe_arrival': case 'resolve': return '#34D399';
    case 'circle_invite': case 'cercle': case 'circle_invitation': case 'community': return '#3BB4C1';
    case 'pin': case 'new_pin': case 'comment': case 'pin_confirmed': case 'vote': return '#F59E0B';
    case 'digest': case 'weekly': case 'milestone': return '#A78BFA';
    case 'mention': return '#3BB4C1';
    case 'story': return '#A78BFA';
    default: return '#3BB4C1';
  }
}

/* ── component ──────────────────────────────────────────────────── */

export default function NotificationsSheet({ onClose, onOpenSettings, onOpenStory }: { onClose: () => void; onOpenSettings?: () => void; onOpenStory?: (storyId: string) => void }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const { notifications, markNotificationsRead, setActiveTab, userId } = useStore();
  const focusTrapRef = useFocusTrap(true, onClose);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Hydrate from DB on first open
  useEffect(() => {
    if (hydrated || notifications.length > 0 || !userId) { setHydrated(true); return; }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          for (const n of data.reverse()) {
            const existing = useStore.getState().notifications.find((x) => x.id === n.id);
            if (!existing) {
              useStore.setState((s) => ({ notifications: [n as AppNotification, ...s.notifications] }));
            }
          }
        }
        setHydrated(true);
      });
  }, [userId, notifications.length, hydrated]);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const unreadCount = sorted.filter((n) => !n.read).length;
  const displayed = filter === 'unread' ? sorted.filter((n) => !n.read) : sorted;

  const handleMarkAllRead = useCallback(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  const handleDismiss = useCallback((id: string) => {
    useStore.setState((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  /* ── colors ──────────────────────────────────────────────────── */
  const sheetBg = isDark ? 'rgba(18,26,44,0.97)' : 'rgba(255,255,255,0.97)';
  const brd = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#475569';
  const textTertiary = isDark ? '#64748B' : '#94A3B8';
  const surfaceElevated = isDark ? '#334155' : '#F8FAFC';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 299,
        }}
      />

      {/* Dropdown */}
      <AnimatePresence>
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            top: 56,
            left: 10,
            right: 10,
            borderRadius: 18,
            maxHeight: 'calc(100vh - 76px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
            zIndex: 300,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: sheetBg,
            border: `1px solid ${brd}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Arrow pointing to bell */}
          <div style={{
            position: 'absolute', top: -6, right: 36,
            width: 12, height: 12,
            background: sheetBg,
            border: `1px solid ${brd}`,
            borderRight: 'none', borderBottom: 'none',
            transform: 'rotate(45deg)',
            borderRadius: 2, zIndex: 1,
          }} />

          {/* ── Header ──────────────────────────────────────────── */}
          <div style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: '#EF4444', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: '#3BB4C1',
                  padding: '2px 0',
                }}
              >
                Tout lire
              </button>
            )}
          </div>

          {/* ── Filter pills ────────────────────────────────────── */}
          <div style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
            {([
              { key: 'all' as const, label: 'Toutes' },
              { key: 'unread' as const, label: `Non lues · ${unreadCount}` },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  border: filter === f.key ? 'none' : `1px solid ${brd}`,
                  background: filter === f.key ? '#3BB4C1' : surfaceElevated,
                  color: filter === f.key ? '#fff' : textSecondary,
                  transition: 'all 150ms',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── List ────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 10px 12px' }}>
            {displayed.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
                padding: '32px 0', gap: 8,
              }}>
                <span style={{ fontSize: 28 }}>🔔</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>
                  {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                </span>
              </div>
            ) : (
              displayed.map((n) => {
                const icon = getIcon(n.type);
                const dotColor = getDotColor(n.type);
                const isUnread = !n.read;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if ((n.type === 'mention' || n.type === 'story') && n.payload) {
                        const storyId = (n.payload as Record<string, unknown>).storyId as string | undefined;
                        if (storyId && onOpenStory) { onOpenStory(storyId); onClose(); }
                      }
                    }}
                    style={{
                      display: 'flex', gap: 9, padding: '8px 10px',
                      borderRadius: 12, marginBottom: 4,
                      cursor: (n.type === 'mention' || n.type === 'story') ? 'pointer' : 'default',
                      background: isUnread
                        ? (isDark ? 'rgba(59,180,193,0.06)' : '#F0FAFB')
                        : 'transparent',
                      border: `1px solid ${isUnread ? 'rgba(59,180,193,0.15)' : brd}`,
                      transition: 'all 150ms',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: surfaceElevated,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 15,
                    }}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row: title + timestamp + dot */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 11.5,
                          fontWeight: isUnread ? 700 : 500,
                          color: textPrimary,
                          flex: 1, minWidth: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }}>
                          {n.title ?? (n.type === 'circle_invitation' ? 'Invitation au cercle' : 'Notification')}
                        </span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 500, color: textTertiary,
                          flexShrink: 0, whiteSpace: 'nowrap' as const,
                        }}>
                          {timeAgo(n.created_at)}
                        </span>
                        {isUnread && (
                          <div style={{
                            width: 6, height: 6, borderRadius: 3,
                            background: dotColor, flexShrink: 0,
                          }} />
                        )}
                      </div>

                      {/* Body */}
                      {(n.body || (n.type === 'circle_invitation' && n.payload)) && (
                        <p style={{
                          fontSize: 11, color: textSecondary,
                          margin: '2px 0 0', lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                        }}>
                          {n.body ?? (n.type === 'circle_invitation'
                            ? `${(n.payload as Record<string, unknown>)?.senderName ?? 'Quelqu\'un'} vous invite à rejoindre son cercle`
                            : '')}
                        </p>
                      )}
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={() => handleDismiss(n.id)}
                      style={{
                        width: 20, height: 20, flexShrink: 0,
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, marginTop: 2,
                      }}
                    >
                      <X size={12} style={{ color: textTertiary }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div style={{
            borderTop: `1px solid ${brd}`,
            padding: '10px 14px',
            textAlign: 'center' as const,
          }}>
            <button
              onClick={() => { onClose(); onOpenSettings?.(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, color: textTertiary,
              }}
            >
              {'Gérer les notifications \u2192'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
