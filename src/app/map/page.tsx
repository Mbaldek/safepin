// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { toast } from 'sonner';
import MapView from '@/components/MapView';
import FilterBar from '@/components/FilterBar';
import ReportSheet from '@/components/ReportSheet';
import DetailSheet from '@/components/DetailSheet';
import ThemeToggle from '@/components/ThemeToggle';
import AddressSearch from '@/components/AddressSearch';
import EmergencyButton from '@/components/EmergencyButton';
import BottomNav from '@/components/BottomNav';
import IncidentsView from '@/components/IncidentsView';
import ProfileView from '@/components/ProfileView';
import CommunityView from '@/components/CommunityView';
import NotificationsSheet from '@/components/NotificationsSheet';

// ─── Push helpers ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerPush(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: sub.toJSON() },
      { onConflict: 'user_id' }
    );
  } catch {
    // Push unavailable or denied — non-critical
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const router = useRouter();
  const {
    setPins, addPin, updatePin,
    activeSheet, setActiveSheet,
    activeTab,
    setUserProfile, setUserId, userId,
    addNotification, notifications,
  } = useStore();

  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auth + push + profile setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        const uid = session.user.id;
        setUserId(uid);
        setUserEmail(session.user.email ?? '');
        setLoading(false);

        supabase.from('profiles').select('*').eq('id', uid).single().then(({ data }) => {
          if (data) {
            setUserProfile(data);
          } else {
            supabase.from('profiles').upsert({ id: uid }).select().single().then(({ data: created }) => {
              if (created) setUserProfile(created);
            });
          }
        });

        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') registerPush(uid);
        });
      }
    });
  }, [router, setUserProfile, setUserId]);

  // Load pins
  useEffect(() => {
    async function loadPins() {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { toast.error('Failed to load pins'); return; }
      setPins((data as Pin[]) || []);
    }
    loadPins();
  }, [setPins]);

  // Realtime: new/updated pins
  const handleNewPin = useCallback((pin: Pin) => {
    addPin(pin);
    if (pin.is_emergency) {
      toast.error('🆘 Emergency alert nearby!', { duration: 6000 });
      addNotification({
        id: crypto.randomUUID(),
        type: 'emergency',
        title: '🆘 Emergency alert nearby!',
        body: pin.description?.slice(0, 100) ?? 'Someone needs help in your area',
        read: false,
        created_at: new Date().toISOString(),
        pin_id: pin.id,
      });
      fetch('/api/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🆘 SafePin — Emergency nearby',
          body: pin.description?.slice(0, 80) ?? 'Someone needs help in your area',
        }),
      }).catch(() => {});
    } else {
      toast('📍 New report nearby');
    }
  }, [addPin, addNotification]);

  // Realtime: comment on own pin → notification
  const handleNewComment = useCallback((payload: { pin_id: string; display_name: string | null; content: string }) => {
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === payload.pin_id);
    if (!pin || pin.user_id !== store.userId) return;
    addNotification({
      id: crypto.randomUUID(),
      type: 'comment',
      title: '💬 New comment on your pin',
      body: `${payload.display_name ?? 'Someone'}: ${payload.content.slice(0, 80)}`,
      read: false,
      created_at: new Date().toISOString(),
      pin_id: payload.pin_id,
    });
  }, [addNotification]);

  // Realtime: vote on own pin → notification
  const handleNewVote = useCallback((payload: { pin_id: string }) => {
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === payload.pin_id);
    if (!pin || pin.user_id !== store.userId) return;
    addNotification({
      id: crypto.randomUUID(),
      type: 'vote',
      title: '👍 Someone confirmed your report',
      body: null,
      read: false,
      created_at: new Date().toISOString(),
      pin_id: payload.pin_id,
    });
  }, [addNotification]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' },
        (payload) => handleNewPin(payload.new as Pin))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pins' },
        (payload) => updatePin(payload.new as Pin))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_comments' },
        (payload) => handleNewComment(payload.new as { pin_id: string; display_name: string | null; content: string }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_votes' },
        (payload) => handleNewVote(payload.new as { pin_id: string }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [handleNewPin, updatePin, handleNewComment, handleNewVote]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-2xl shadow-lg shadow-[rgba(244,63,94,0.3)] animate-pulse">
          🛡️
        </div>
        <div className="text-lg font-bold tracking-tight">
          <span style={{ color: 'var(--accent)' }}>Safe</span>
          <span style={{ color: 'var(--text-primary)' }}>Pin</span>
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mt-2"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // ── App layout ────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh flex flex-col overflow-hidden">

      {/* ── Top bar (always visible) ───────────────────────────────── */}
      <div className="shrink-0 z-50"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <div className="text-lg font-bold tracking-tight">
            <span style={{ color: 'var(--accent)' }}>Safe</span>
            <span style={{ color: 'var(--text-primary)' }}>Pin</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <span className="text-base leading-none">🔔</span>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[0.55rem] font-black flex items-center justify-center px-1"
                  style={{ backgroundColor: '#ef4444', color: '#fff', lineHeight: 1 }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <ThemeToggle />
            <button
              onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
              className="text-xs hover:opacity-80 transition"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign out
            </button>
          </div>
        </div>
        {activeTab === 'map' && (
          <div className="px-3 pb-2.5">
            <AddressSearch />
          </div>
        )}
      </div>

      {/* ── Map tab — kept mounted to preserve map position ───────── */}
      <div className={`flex-1 relative min-h-0 ${activeTab !== 'map' ? 'hidden' : 'flex flex-col'}`}>
        <MapView />
        <FilterBar />
        <EmergencyButton userId={userId} />
        <button
          onClick={() => setActiveSheet('report')}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white text-2xl flex items-center justify-center shadow-lg shadow-[rgba(244,63,94,0.35)] z-50 hover:scale-105 active:scale-95 transition"
        >
          +
        </button>
        {activeSheet === 'report' && <ReportSheet userId={userId} />}
        {activeSheet === 'detail' && <DetailSheet />}
      </div>

      {/* ── Incidents tab ──────────────────────────────────────────── */}
      {activeTab === 'incidents' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <IncidentsView />
          {activeSheet === 'detail' && <DetailSheet />}
        </div>
      )}

      {/* ── Community tab ──────────────────────────────────────────── */}
      {activeTab === 'community' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CommunityView />
        </div>
      )}

      {/* ── Profile tab ────────────────────────────────────────────── */}
      {activeTab === 'profile' && userId && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ProfileView userId={userId} userEmail={userEmail} />
          {activeSheet === 'detail' && <DetailSheet />}
        </div>
      )}

      {/* ── Messages placeholder ───────────────────────────────────── */}
      {activeTab === 'messages' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            ✉️
          </div>
          <div className="text-center">
            <p className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Messages</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Coming in a future sprint</p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            🚧 In progress
          </span>
        </div>
      )}

      {/* ── Bottom navigation ──────────────────────────────────────── */}
      <BottomNav />

      {/* ── Notifications overlay ──────────────────────────────────── */}
      {showNotifications && (
        <div className="absolute inset-0 z-[300]">
          <NotificationsSheet onClose={() => setShowNotifications(false)} />
        </div>
      )}
    </div>
  );
}
