// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Settings, X, Building2 } from 'lucide-react';
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
import TripView from '@/components/TripView';
import NotificationsSheet from '@/components/NotificationsSheet';
import CityContextPanel from '@/components/CityContextPanel';
import SosBanner from '@/components/SosBanner';
import OnboardingOverlay, { useOnboardingDone } from '@/components/OnboardingOverlay';
import PlaceNoteSheet from '@/components/PlaceNoteSheet';

const tabVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
} as const;
const tabTransition = { duration: 0.18, ease: 'easeOut' } as const;

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
    activeTab, setActiveTab,
    setUserProfile, setUserId, userId,
    addNotification, notifications,
    setPendingRoutes,
    isSharingLocation, setWatchedLocation,
    userLocation, userProfile,
    newPlaceNoteCoords, setNewPlaceNoteCoords,
  } = useStore();

  const [onboardingDone, markOnboardingDone] = useOnboardingDone();

  // Clear pending route options whenever the user leaves the trip tab
  useEffect(() => {
    if (activeTab !== 'trip') {
      setPendingRoutes(null);
    }
  }, [activeTab, setPendingRoutes]);

  // ── Walk With Me — trusted contacts presence ──────────────────────────────
  const [watchContacts, setWatchContacts] = useState<{ id: string; name: string | null }[]>([]);
  const shareChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load accepted trusted contacts when userId is available
  useEffect(() => {
    if (!userId) return;
    async function loadTrusted() {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('user_id, contact_id')
        .or(`user_id.eq.${userId},contact_id.eq.${userId}`)
        .eq('status', 'accepted');
      if (!data?.length) return;
      const ids = data.map((r) => r.user_id === userId ? r.contact_id : r.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name').in('id', ids);
      const nm: Record<string, string | null> = {};
      for (const p of (profiles ?? [])) nm[p.id] = p.display_name;
      setWatchContacts(ids.map((id) => ({ id, name: nm[id] ?? null })));
    }
    loadTrusted();
  }, [userId]);

  // Subscribe to each trusted contact's location presence channel
  useEffect(() => {
    if (!watchContacts.length) return;
    const channels = watchContacts.map(({ id: cid, name }) => {
      const ch = supabase.channel(`watch:${cid}`);
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ lat: number; lng: number }>();
        const entries = Object.values(state).flat();
        if (entries.length > 0) {
          setWatchedLocation(cid, { lat: entries[0].lat, lng: entries[0].lng, name });
        } else {
          setWatchedLocation(cid, null);
        }
      })
      .on('presence', { event: 'leave' }, () => setWatchedLocation(cid, null))
      .subscribe();
      return ch;
    });
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [watchContacts, setWatchedLocation]);

  // Start / stop broadcasting own location when isSharingLocation changes
  useEffect(() => {
    if (!isSharingLocation || !userId) {
      if (shareChannelRef.current) {
        supabase.removeChannel(shareChannelRef.current);
        shareChannelRef.current = null;
      }
      return;
    }
    const ch = supabase.channel(`watch:${userId}`);
    ch.subscribe();
    shareChannelRef.current = ch;
    return () => {
      if (shareChannelRef.current) {
        supabase.removeChannel(shareChannelRef.current);
        shareChannelRef.current = null;
      }
    };
  }, [isSharingLocation, userId]);

  // Re-broadcast location whenever it changes while sharing
  useEffect(() => {
    if (!isSharingLocation || !userLocation || !shareChannelRef.current) return;
    shareChannelRef.current.track({
      lat: userLocation.lat,
      lng: userLocation.lng,
      name: userProfile?.display_name ?? null,
    });
  }, [isSharingLocation, userLocation, userProfile]);

  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCityContext, setShowCityContext] = useState(false);
  const [sosPin, setSosPin] = useState<import('@/types').Pin | null>(null);

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
      setSosPin(pin);
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
        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-2xl shadow-lg shadow-[rgba(244,63,94,0.3)] animate-pulse">
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
          <div className="flex items-center gap-2">
            {/* Search icon — map tab only */}
            {activeTab === 'map' && (
              <button
                onClick={() => setShowSearch((v) => !v)}
                className="relative w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
                style={{ backgroundColor: showSearch ? 'var(--accent)' : 'var(--bg-card)' }}
              >
                {showSearch
                  ? <X size={15} strokeWidth={2.2} style={{ color: '#fff' }} />
                  : <Search size={15} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                }
              </button>
            )}
            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <Bell size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-3.75 h-3.75 rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
                  style={{ backgroundColor: '#ef4444', color: '#fff' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            <ThemeToggle />
            {/* Settings icon — placeholder */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-card)' }}
              onClick={() => toast('Settings coming soon')}
            >
              <Settings size={15} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
        {/* Search panel — slides in below header on map tab */}
        <AnimatePresence>
          {activeTab === 'map' && showSearch && (
            <motion.div
              key="search-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.6 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-3 pb-2.5">
                <AddressSearch autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Map tab — visible for map AND trip tabs ────────────────── */}
      <div className={`flex-1 relative min-h-0 ${activeTab !== 'map' && activeTab !== 'trip' && activeTab !== 'incidents' ? 'hidden' : 'flex flex-col'}`}>
        <MapView />
        <FilterBar />
        <EmergencyButton userId={userId} />
        {/* City context + report buttons — map tab only */}
        {activeTab === 'map' && (
          <>
            <button
              onClick={() => setShowCityContext(true)}
              className="absolute bottom-22 right-4 w-11 h-11 rounded-2xl flex items-center justify-center shadow-md z-60 transition hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              title="City context"
            >
              <Building2 size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => setActiveSheet('report')}
              className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-linear-to-br from-[#f43f5e] to-[#e11d48] text-white text-2xl flex items-center justify-center shadow-lg shadow-[rgba(244,63,94,0.35)] z-50 hover:scale-105 active:scale-95 transition"
            >
              +
            </button>
          </>
        )}
        {/* Trip sheet — overlays the map when on trip tab */}
        <AnimatePresence>
          {activeTab === 'trip' && (
            <TripView key="trip-sheet" onClose={() => setActiveTab('map')} />
          )}
        </AnimatePresence>

        {/* Incidents sheet — overlays the map when on incidents tab */}
        <AnimatePresence>
          {activeTab === 'incidents' && (
            <IncidentsView key="incidents-sheet" onClose={() => setActiveTab('map')} />
          )}
        </AnimatePresence>
      </div>

      {/* SOS nearby banner */}
      <AnimatePresence>
        {sosPin && (
          <motion.div
            key="sos-banner"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute left-3 right-3 z-200"
            style={{ top: '72px' }}
          >
            <SosBanner
              pin={sosPin}
              userLocation={useStore.getState().userLocation}
              onDismiss={() => setSosPin(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Non-map tabs — fade in/out with AnimatePresence ────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'community' && (
          <motion.div key="community" className="flex-1 min-h-0 overflow-hidden flex flex-col"
            variants={tabVariants} initial="initial" animate="animate" exit="exit" transition={tabTransition}>
            <CommunityView />
          </motion.div>
        )}
        {activeTab === 'profile' && userId && (
          <motion.div key="profile" className="flex-1 min-h-0 overflow-hidden flex flex-col"
            variants={tabVariants} initial="initial" animate="animate" exit="exit" transition={tabTransition}>
            <ProfileView userId={userId} userEmail={userEmail} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sheets (top-level so they render over any tab) ─────────── */}
      <AnimatePresence>
        {activeSheet === 'report' && <ReportSheet key="report" userId={userId} />}
        {activeSheet === 'detail' && <DetailSheet key="detail" />}
      </AnimatePresence>

      {/* ── Place Note sheet — triggered by long-press on map ──────── */}
      <AnimatePresence>
        {newPlaceNoteCoords && userId && (
          <PlaceNoteSheet
            key="place-note"
            coords={newPlaceNoteCoords}
            userId={userId}
            onClose={() => setNewPlaceNoteCoords(null)}
            onSaved={() => setNewPlaceNoteCoords(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom navigation ──────────────────────────────────────── */}
      <BottomNav />

      {/* ── City context overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {showCityContext && (
          <motion.div key="city-context" className="absolute inset-0 z-300"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            <CityContextPanel onClose={() => setShowCityContext(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Notifications overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div key="notifications" className="absolute inset-0 z-300"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            <NotificationsSheet onClose={() => setShowNotifications(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Onboarding overlay (first launch only) ─────────────────── */}
      {!loading && !onboardingDone && (
        <OnboardingOverlay onDone={markOnboardingDone} />
      )}
    </div>
  );
}
