// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { Pin } from '@/types';
import { toast } from 'sonner';
import { usePresenceHeartbeat } from '@/lib/usePresence';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, X, List, ChevronLeft, Plus } from 'lucide-react';
import MapView from '@/components/MapView';
import { BreveilMonogram } from '@/components/BrandAssets';
import { PinDetailSheet } from '@/components/map/PinDetailSheet';
import { ReportSheet } from '@/components/ReportSheet';
import ThemeToggle from '@/components/ThemeToggle';
import AddressSearch from '@/components/AddressSearch';
import EmergencyButton from '@/components/EmergencyButton';
import BottomNav from '@/components/BottomNav';
import NearbySheet from '@/components/nearby/NearbySheet';
import NotificationsSheet from '@/components/NotificationsSheet';
import CityContextPanel from '@/components/CityContextPanel';
import SosBanner from '@/components/SosBanner';
import { useOnboardingDone } from '@/components/OnboardingFunnel';

import OfflineBanner from '@/components/OfflineBanner';
import InstallPrompt from '@/components/InstallPrompt';
import CommunityTooltip from '@/components/CommunityTooltip';
import { useEscorte } from '@/hooks/useEscorte';

// Lazy-loaded heavy components — not on the critical rendering path
const EscorteSheet = dynamic(() => import('@/components/EscorteSheet'), { ssr: false });
const MyKovaView = dynamic(() => import('@/components/MyKovaView'), { ssr: false });
const SettingsSheet = dynamic(() => import('@/components/settings/SettingsSheet'), { ssr: false });
const WalkWithMePanel = dynamic(() => import('@/components/WalkWithMePanel'), { ssr: false });
const TripHUD = dynamic(() => import('@/components/TripHUD'), { ssr: false });
const CommunityView = dynamic(() => import('@/components/community/CommunityView'), { ssr: false });
const CercleTab = dynamic(() => import('@/components/community/cercle-tab'), { ssr: false });

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
    pins, setPins, addPin, updatePin,
    activeSheet, setActiveSheet, selectedPin, setSelectedPin,
    activeTab, setActiveTab,
    setUserProfile, setUserId, userId,
    addNotification, notifications,
    setPendingRoutes,
    isSharingLocation, setIsSharingLocation, setWatchedLocation,
    userLocation, userProfile, setNewPinCoords,
    setLiveSessions, addLiveSession, updateLiveSession,
    showIncidentsList, setShowIncidentsList,
activeTrip, setActiveTrip,
    setActiveRoute, setTransitSegments,
    showWalkWithMe, setShowWalkWithMe,
    mapFilters,
    showSafeSpaces, setShowSafeSpaces,
    showPinLabels, setShowPinLabels,
  } = useStore();
  const isDark = useTheme((s) => s.theme) === 'dark';
  const tMap = useTranslations('map');
  const escorte = useEscorte(userId ?? '');

  const [onboardingDone, markOnboardingDone] = useOnboardingDone(userProfile);
  const justCompletedOnboardingRef = useRef(false);
  const [showCommunityTooltip, setShowCommunityTooltip] = useState(false);

  const handleOnboardingDone = useCallback(() => {
    justCompletedOnboardingRef.current = true;
    markOnboardingDone();
  }, [markOnboardingDone]);

  useEffect(() => {
    if (justCompletedOnboardingRef.current && onboardingDone) {
      setShowCommunityTooltip(true);
      justCompletedOnboardingRef.current = false;
    }
  }, [onboardingDone]);

  // Presence heartbeat — updates last_seen_at every 2 min
  usePresenceHeartbeat(userId);

  // Clear pending route options whenever the user leaves the trip tab
  useEffect(() => {
    if (activeTab !== 'trip') {
      setPendingRoutes(null);
    }
  }, [activeTab, setPendingRoutes]);

  // Auto-close incidents list when leaving the map tab
  useEffect(() => {
    if (activeTab !== 'map') {
      setShowIncidentsList(false);
    }
  }, [activeTab, setShowIncidentsList]);

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
  const [showSettings, setShowSettings] = useState(false);
  const [sosPin, setSosPin] = useState<import('@/types').Pin | null>(null);

  const [safetyFilter, setSafetyFilter] = useState<string | null>(null);
  // showWalkWithMe is now in the Zustand store (shared with TripView)

  // Layer state (controls passed to MapView)
  const [mapStyle, setMapStyle] = useState<'custom' | 'streets' | 'light' | 'dark'>('custom');
  const [showBus, setShowBus] = useState(false);
  const [showMetroRER, setShowMetroRER] = useState(false);
  const [showPharmacy, setShowPharmacy] = useState(false);
  const [showHospital, setShowHospital] = useState(false);
  const [showPolice, setShowPolice] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);

  // Map style defaults to Breveil custom — user can change in Settings

  // Filter active count for badge
  const filterActiveCount = [
    mapFilters.severity !== 'all',
    mapFilters.age !== 'all',
    mapFilters.urban !== 'all',
    mapFilters.confirmedOnly,
    mapFilters.timeOfDay !== 'all',
  ].filter(Boolean).length;

  // Count of unresolved emergency pins created in the last 2 hours (red badge on "Nearby" button)
  const emergencyNearbyCount = pins.filter((p) => p.is_emergency && !p.resolved_at && (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2).length;

  const deepLinkHandled = useRef(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auth + push + profile setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/onboarding');
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

        // Redeem pending invite code (from OAuth flow)
        const urlInviteCode = new URLSearchParams(window.location.search).get('invite_code');
        const storedInviteCode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('breveil_invite_code') : null;
        const pendingCode = urlInviteCode || storedInviteCode;
        if (pendingCode) {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('breveil_invite_code');
          window.history.replaceState({}, '', window.location.pathname + (window.location.search.replace(/[?&]invite_code=[^&]*/g, '').replace(/^\?$/, '') || ''));
          fetch('/api/invite/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: pendingCode }),
          })
            .then((r) => r.json())
            .then((d) => { if (d.success) toast.success(`Welcome! You joined via ${d.organization_name}`); })
            .catch(() => {});
        }

        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') registerPush(uid);
        });
      }
    });
  }, [router, setUserProfile, setUserId]);

  // Fetch unread DM count periodically
  const { unreadDmCount, setUnreadDmCount } = useStore();
  useEffect(() => {
    if (!userId) return;
    async function fetchUnread() {
      const { data } = await supabase
        .from('dm_conversations')
        .select('id, user1_id, user2_id, last_message_at, user1_last_read_at, user2_last_read_at, last_message_sender_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (!data) return;
      let count = 0;
      for (const c of data) {
        if (!c.last_message_at || c.last_message_sender_id === userId) continue;
        const readAt = c.user1_id === userId ? c.user1_last_read_at : c.user2_last_read_at;
        if (!readAt || new Date(c.last_message_at) > new Date(readAt)) count++;
      }
      setUnreadDmCount(count);
    }
    fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);

    // Realtime: instant badge update when a DM conversation is updated
    const channel = supabase
      .channel('dm_badge_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
        (payload) => {
          const row = payload.new as any;
          if (row.user1_id !== userId && row.user2_id !== userId) return;
          if (row.last_message_sender_id === userId) return; // I sent it
          const readAt = row.user1_id === userId ? row.user1_last_read_at : row.user2_last_read_at;
          if (!readAt || new Date(row.last_message_at) > new Date(readAt)) {
            fetchUnread();
          }
        },
      )
      .subscribe();

    return () => {
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, [userId, setUnreadDmCount]);

  // Load pins (exclude hidden pins unless the user owns them; filter simulated client-side)
  const { showSimulated, setShowSimulated, pinsVersion } = useStore();

  // Auto-enable showSimulated via URL param (e.g. from admin "See on map")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sim') === '1') setShowSimulated(true);
  }, [setShowSimulated]);

  useEffect(() => {
    async function loadPins() {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .or(`hidden_at.is.null${userId ? `,user_id.eq.${userId}` : ''}`)
        .order('created_at', { ascending: false });
      if (error) { toast.error('Could not load reports. Try refreshing.'); return; }
      let result = (data as Pin[]) || [];
      if (!showSimulated) {
        result = result.filter((p) => !p.is_simulated);
      }
      setPins(result);
    }
    loadPins();
  }, [setPins, userId, showSimulated, pinsVersion]);

  // Deep link: ?pin=UUID → fly to pin and open detail sheet
  useEffect(() => {
    if (deepLinkHandled.current || pins.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const pinId = params.get('pin');
    if (!pinId) return;
    deepLinkHandled.current = true;
    const pin = pins.find((p) => p.id === pinId);
    if (pin) {
      useStore.getState().setSelectedPin(pin);
      setActiveSheet('detail');
      useStore.getState().setMapFlyTo({ lat: pin.lat, lng: pin.lng, zoom: 16 });
    }
    window.history.replaceState({}, '', '/map');
  }, [pins, setActiveSheet]);

  // Show push opt-in after a short delay (first session only)

  // Listen for SW sync-complete messages → refresh pins + queue count
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'BREVEIL_SYNC_COMPLETE') {
        toast.success(`Synced ${event.data.synced} offline report${event.data.synced > 1 ? 's' : ''}`);
        // Refresh pins from server
        supabase
          .from('pins')
          .select('*')
          .or(`hidden_at.is.null${userId ? `,user_id.eq.${userId}` : ''}`)
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setPins(data as Pin[]); });
        // Reset offline queue count
        import('@/lib/offlineQueue').then(({ getCount }) =>
          getCount().then((n) => useStore.getState().setOfflineQueueCount(n))
        );
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [userId, setPins]);

  // App badge — update unread count on home screen icon
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as Navigator & { setAppBadge(n: number): Promise<void> }).setAppBadge(unreadCount);
      } else {
        (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge();
      }
    }
  }, [unreadCount]);

  // Update profile last_known_lat/lng for geo-filtered push (respects location_mode setting)
  const locationModeRef = useRef<string>('while_using');
  useEffect(() => {
    if (!userId) return;
    supabase.from('notification_settings').select('location_mode').eq('user_id', userId).single()
      .then(({ data }) => { if (data?.location_mode) locationModeRef.current = data.location_mode; });
  }, [userId]);

  useEffect(() => {
    if (!userId || !userLocation || locationModeRef.current === 'never') return;
    supabase.from('profiles').update({
      last_known_lat: userLocation.lat,
      last_known_lng: userLocation.lng,
      last_seen_at: new Date().toISOString(),
    }).eq('id', userId).then(() => {});
  }, [userId, userLocation?.lat, userLocation?.lng]);

  // Realtime: new/updated pins
  const handleNewPin = useCallback((pin: Pin) => {
    const exists = useStore.getState().pins.some((p) => p.id === pin.id);
    if (!exists) addPin(pin);
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
    } else {
      toast('📍 New report nearby');
    }
    // Notify nearby users (server-side push) — only triggered by the pin creator
    if (pin.user_id === useStore.getState().userId) {
      fetch('/api/notify-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }).catch(() => {});
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pins' },
        (payload) => { const old = payload.old as { id?: string }; if (old?.id) setPins(useStore.getState().pins.filter(p => p.id !== old.id)); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_comments' },
        (payload) => handleNewComment(payload.new as { pin_id: string; display_name: string | null; content: string }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_votes' },
        (payload) => handleNewVote(payload.new as { pin_id: string }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [handleNewPin, updatePin, handleNewComment, handleNewVote]);

  // ── Live sessions realtime ────────────────────────────────────────────────
  useEffect(() => {
    // Load active sessions on mount
    supabase
      .from('live_sessions')
      .select('*')
      .is('ended_at', null)
      .then(({ data }) => { if (data) setLiveSessions(data as import('@/types').LiveSession[]); });

    const liveChannel = supabase
      .channel('live-sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_sessions' },
        (payload) => addLiveSession(payload.new as import('@/types').LiveSession))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions' },
        (payload) => updateLiveSession(payload.new as import('@/types').LiveSession))
      .subscribe();
    return () => { supabase.removeChannel(liveChannel); };
  }, [setLiveSessions, addLiveSession, updateLiveSession]);

  // ── Onboarding gate — redirect to /onboarding if not completed ────────────
  useEffect(() => {
    if (!loading && !onboardingDone && userId) {
      router.replace('/onboarding');
    }
  }, [loading, onboardingDone, userId, router]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-pulse">
          <BreveilMonogram size={48} variant="dark" />
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.25rem', letterSpacing: '4px', color: 'var(--text-primary)' }}>
          BREVEIL
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mt-2"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!onboardingDone && userId) return null;

  // ── App layout ────────────────────────────────────────────────────────────
  return (
    <div id="main-content" role="main" className="h-dvh flex flex-col overflow-hidden">

      {/* ── Top bar (always visible, 56px) ────────────────────────── */}
      <div className="shrink-0 z-50 relative"
        style={{ backgroundColor: 'var(--surface-card)', borderBottom: '1px solid var(--border)', height: 56 }}>
        <div className="flex items-center gap-3 px-4 h-full">
          {showSearch && activeTab === 'map' ? (
            <>
              {/* Back arrow — exit search */}
              <button
                onClick={() => setShowSearch(false)}
                aria-label="Close search"
                className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition hover:opacity-80"
              >
                <ChevronLeft size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              </button>
              {/* Inline search — fills header */}
              <div className="flex-1 min-w-0">
                <AddressSearch autoFocus />
              </div>
            </>
          ) : (
            <>
              {/* Logo */}
              <div className="flex items-center gap-2">
                <svg width={28} height={28} viewBox="0 0 80 80" fill="none" aria-hidden="true" className="text-[var(--text-primary)]">
                  <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
                  <circle cx="40" cy="22" r="4" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>BREVEIL</span>
              </div>
              <div className="flex-1" />
              {/* Right icons */}
              <div className="flex items-center gap-2">
                {/* Search icon — map tab only */}
                {activeTab === 'map' && (
                  <button
                    onClick={() => setShowSearch(true)}
                    aria-label="Search location"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                  >
                    <Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
                {/* Notification bell */}
                <button
                  onClick={() => setShowNotifications(true)}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                >
                  <Bell size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  {unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
                      style={{ backgroundColor: '#EF4444', color: '#fff' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
                <ThemeToggle />
                {/* Settings / burger menu */}
                <button
                  aria-label="Settings"
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                  style={{ backgroundColor: showSettings ? 'var(--accent)' : 'transparent' }}
                  onClick={() => setShowSettings((v) => !v)}
                >
                  <Menu size={16} strokeWidth={2} style={{ color: showSettings ? '#FFFFFF' : 'var(--text-muted)' }} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Map tab — visible for map, trip, community AND mykova tabs ── */}
      <div className={`flex-1 relative min-h-0 ${activeTab !== 'map' && activeTab !== 'trip' && activeTab !== 'me' && activeTab !== 'community' && activeTab !== 'cercle' ? 'hidden' : 'flex flex-col'}`}>
        <MapView
          mapStyle={mapStyle}
          showBus={showBus}
          showMetroRER={showMetroRER}
          showPharmacy={showPharmacy}
          showHospital={showHospital}
          showPolice={showPolice}
          showHeatmap={showHeatmap}
          showScores={showScores}
          showPinLabels={showPinLabels}
          onTransitLoadingChange={setTransitLoading}
          onPoiLoadingChange={setPoiLoading}
          safetyFilter={safetyFilter}
          onClearSafetyFilter={() => setSafetyFilter(null)}
        />

        <EmergencyButton userId={userId} />

        {/* Location sharing chip — visible while Walk With Me broadcast is active */}
        {isSharingLocation && (
          <div
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30
                       flex items-center gap-2 px-3 py-1.5 rounded-full
                       backdrop-blur-sm cursor-pointer"
            style={{
              background: 'rgba(76,175,121,0.12)',
              border: '1px solid rgba(76,175,121,0.25)',
            }}
            onClick={() => setShowWalkWithMe(true)}
          >
            <span className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--safe)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--safe)' }}>
              Partage actif
            </span>
            <button
              className="text-xs opacity-60 ml-1 leading-none"
              onClick={(e) => { e.stopPropagation(); setIsSharingLocation(false); }}
            >
              ×
            </button>
          </div>
        )}



        {/* Report + incidents list toggle — map tab only */}
        {activeTab === 'map' && (
          <>
            {/* Incidents list toggle — top left pill */}
            <button
              onClick={() => setShowIncidentsList(!showIncidentsList)}
              aria-label={showIncidentsList ? 'Hide incidents list' : 'Show incidents list'}

              className="absolute top-3 left-3 rounded-xl shadow-lg z-50 hover:scale-105 active:scale-95 transition"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                backgroundColor: showIncidentsList ? '#3BB4C1' : 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
                border: showIncidentsList ? 'none' : '1px solid var(--border)',
                color: showIncidentsList ? '#FFFFFF' : undefined,
                backdropFilter: 'blur(12px)',
              }}
            >
              <List size={15} strokeWidth={2.2} style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }}>
                {tMap('nearby')}
              </span>
              {/* Emergency badge — unresolved emergency pins from last 2 h */}
              {!showIncidentsList && emergencyNearbyCount > 0 && (
                <span
                  className="min-w-[16px] h-[16px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
                  style={{ backgroundColor: '#ef4444', color: '#fff' }}
                >
                  {emergencyNearbyCount}
                </span>
              )}
              {/* Active filter count badge */}
              {!showIncidentsList && filterActiveCount > 0 && (
                <span
                  className="min-w-[16px] h-[16px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {filterActiveCount}
                </span>
              )}
            </button>
            {/* Report button — stacked above SOS on the right */}
            <motion.button
              onClick={() => {
                const loc = useStore.getState().userLocation;
                if (loc) setNewPinCoords({ lat: loc.lat, lng: loc.lng });
                setActiveSheet('report');
              }}
              whileTap={{ scale: 0.93 }}

              style={{
                position: 'fixed',
                bottom: 140,
                right: 20,
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3BB4C1, #0E7490)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59,180,193,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
              }}
            >
              <Plus size={22} color="#fff" strokeWidth={2} />
            </motion.button>
          </>
        )}


        {/* Map contextual card — shows area info */}

        {/* TripHUD — persistent map overlay during active trip */}
        <TripHUD
          isDark={isDark}
          isVisible={escorte.view === 'trip-active'}
          destName={escorte.activeEscorte?.dest_name ?? ''}
          etaMinutes={escorte.activeEscorte?.eta_minutes ?? 0}
          tripProgress={
            escorte.activeEscorte?.eta_minutes
              ? Math.min(100, (escorte.elapsed / (escorte.activeEscorte.eta_minutes * 60)) * 100)
              : 0
          }
          juliaActive={escorte.juliaActive}
          onArrived={() => {
            escorte.endEscorte(true);
            setActiveRoute(null);
            setTransitSegments(null);
          }}
          onTerminate={() => {
            escorte.endEscorte(false);
            setActiveRoute(null);
            setTransitSegments(null);
          }}
          onSOS={() => {
            escorte.triggerSOS();
            window.dispatchEvent(new Event('breveil:trigger-sos'));
          }}
        />

        {/* Community tab — trusted circle, groups, messages */}
        <AnimatePresence>
          {activeTab === 'community' && userId && (
            <CommunityView key="community-tab" onClose={() => setActiveTab('map')} onSafetyFilter={(tag) => { setSafetyFilter(tag); setActiveTab('map'); }} />
          )}
        </AnimatePresence>

        {/* Cercle tab — standalone trust circle */}
        <AnimatePresence>
          {activeTab === 'cercle' && userId && (
            <motion.div
              key="cercle-tab"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
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
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', flexShrink: 0,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#fff' : '#0F172A' }}>
                  Cercle
                </span>
                <button onClick={() => setActiveTab('map')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
                <CercleTab isDark={isDark} userId={userId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escorte sheet — trip tab */}
        <AnimatePresence>
          {activeTab === 'trip' && userId && (
            <EscorteSheet
              key="escorte-sheet"
              userId={userId}
              isDark={isDark}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
              escorte={escorte}
              onClose={() => setActiveTab('map')}
            />
          )}
        </AnimatePresence>

        {/* Incidents list overlay — triggered by list button on map */}
        <AnimatePresence>
          {showIncidentsList && activeTab === 'map' && (
            <NearbySheet key="nearby-sheet" onClose={() => setShowIncidentsList(false)} />
          )}
        </AnimatePresence>

        {/* Me tab — profile, trusted circle, community */}
        <AnimatePresence>
          {activeTab === 'me' && userId && (
            <MyKovaView
              key="me-sheet"
              userId={userId}
              userEmail={userEmail}
              onClose={() => setActiveTab('map')}
            />
          )}
        </AnimatePresence>

        {/* Report sheet — replaced by ReportSheet (v2) rendered below */}
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

      {/* ── Pin Detail Sheet ─────────────────────────────────────── */}
      <PinDetailSheet
        pin={selectedPin}
        isOpen={activeSheet === 'detail' && !!selectedPin}
        onClose={() => { setActiveSheet('none'); setSelectedPin(null); }}
        onContact={async (pinId) => {
          const pin = pins.find((p) => p.id === pinId);
          if (!pin?.user_id || !userId) { toast.error('Contact impossible'); return; }
          if (pin.user_id === userId) { toast('C\u2019est votre signalement'); return; }
          const { data: existing } = await supabase
            .from('dm_conversations')
            .select('*')
            .or(`and(user1_id.eq.${userId},user2_id.eq.${pin.user_id}),and(user1_id.eq.${pin.user_id},user2_id.eq.${userId})`)
            .limit(1)
            .maybeSingle();
          if (existing) {
            setActiveSheet('none'); setSelectedPin(null);
            setActiveTab('community');
            toast.success('Conversation ouverte');
            return;
          }
          const { error } = await supabase.from('dm_conversations').insert({ user1_id: userId, user2_id: pin.user_id });
          if (error) { toast.error('Impossible d\u2019ouvrir la conversation'); return; }
          setActiveSheet('none'); setSelectedPin(null);
          setActiveTab('community');
          toast.success('Conversation ouverte');
        }}
        userId={userId ?? ''}
        userLat={userLocation?.lat ?? 48.8566}
        userLng={userLocation?.lng ?? 2.3522}
      />

      {/* ── New Report Sheet (v2) ── */}
      <AnimatePresence>
        <ReportSheet />
      </AnimatePresence>


      {/* ── Walk With Me panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showWalkWithMe && userId && (
          <WalkWithMePanel
            key="walk-with-me"
            userId={userId}
            destination={activeTrip?.destination?.label ?? ''}
            onClose={() => setShowWalkWithMe(false)}
          />
        )}
      </AnimatePresence>

      {/* Post-onboarding community tooltip */}
      <CommunityTooltip show={showCommunityTooltip} />

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

      {/* ── Settings sheet ─────────────────────────────────────────── */}
      <SettingsSheet isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Onboarding is now an early return — see above */}


      {/* ── PWA install prompt ──────────────────────────────────────── */}
      <InstallPrompt />

      {/* ── Offline banner ──────────────────────────────────────────── */}
      <OfflineBanner />

    </div>
  );
}
