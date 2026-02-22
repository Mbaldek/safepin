// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { toast } from 'sonner';
import { checkMilestones, type MilestoneStats } from '@/lib/milestones';
import { computeScore } from '@/lib/levels';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, X, List } from 'lucide-react';
import SettingsSheet from '@/components/SettingsSheet';
import MapView from '@/components/MapView';
import MyKovaView from '@/components/MyKovaView';
import FilterBar from '@/components/FilterBar';
import ReportSheet from '@/components/ReportSheet';
import DetailSheet from '@/components/DetailSheet';
import ThemeToggle from '@/components/ThemeToggle';
import AddressSearch from '@/components/AddressSearch';
import EmergencyButton from '@/components/EmergencyButton';
import BottomNav from '@/components/BottomNav';
import IncidentsView from '@/components/IncidentsView';
import CommunityView from '@/components/CommunityView';
import TripView from '@/components/TripView';
import NotificationsSheet from '@/components/NotificationsSheet';
import CityContextPanel from '@/components/CityContextPanel';
import SosBanner from '@/components/SosBanner';
import OnboardingOverlay, { useOnboardingDone } from '@/components/OnboardingOverlay';
import PlaceNoteSheet from '@/components/PlaceNoteSheet';
import PlaceNotePopup from '@/components/PlaceNotePopup';
import PushOptInModal, { shouldShowPushOptIn, dismissPushOptIn } from '@/components/PushOptInModal';
import OfflineBanner from '@/components/OfflineBanner';
import SessionBriefingCard from '@/components/SessionBriefingCard';
import MapContextCard from '@/components/MapContextCard';
import InstallPrompt from '@/components/InstallPrompt';

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
    activeSheet, setActiveSheet,
    activeTab, setActiveTab,
    setUserProfile, setUserId, userId,
    addNotification, notifications,
    setPendingRoutes,
    isSharingLocation, setWatchedLocation,
    userLocation, userProfile,
    newPlaceNoteCoords, setNewPlaceNoteCoords,
    selectedPlaceNote, setSelectedPlaceNote,
    setLiveSessions, addLiveSession, updateLiveSession,
    showIncidentsList, setShowIncidentsList,
    achievedMilestones, addAchievedMilestone,
  } = useStore();

  const [onboardingDone, markOnboardingDone] = useOnboardingDone();

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
  const [showPushOptIn, setShowPushOptIn] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const briefingShownRef = useRef(false);
  const deepLinkHandled = useRef(false);

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
  useEffect(() => {
    if (!userId || loading) return;
    const timer = setTimeout(() => {
      if (shouldShowPushOptIn()) setShowPushOptIn(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [userId, loading]);

  // Run milestone check on first load (catches anything earned between sessions)
  useEffect(() => {
    if (userId && pins.length > 0) runMilestoneCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pins.length > 0]);

  // Show session briefing card once per session (after 2s delay)
  useEffect(() => {
    if (!userId || loading || briefingShownRef.current || !onboardingDone) return;
    const timer = setTimeout(() => {
      briefingShownRef.current = true;
      setShowBriefing(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [userId, loading, onboardingDone]);

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

  // Update profile last_known_lat/lng for geo-filtered push
  useEffect(() => {
    if (!userId || !userLocation) return;
    supabase.from('profiles').update({
      last_known_lat: userLocation.lat,
      last_known_lng: userLocation.lng,
      last_seen_at: new Date().toISOString(),
    }).eq('id', userId).then(() => {});
  }, [userId, userLocation?.lat, userLocation?.lng]);

  // ── Milestone check — runs after realtime events that involve the current user ──
  const milestoneCheckRef = useRef(false);
  const runMilestoneCheck = useCallback(async () => {
    if (!userId || milestoneCheckRef.current) return;
    milestoneCheckRef.current = true;
    try {
      const store = useStore.getState();
      const myPins = store.pins.filter((p) => p.user_id === userId);
      const alerts = myPins.filter((p) => p.is_emergency).length;
      const pinsCount = myPins.filter((p) => !p.is_emergency).length;

      const [{ count: votesCount }, { count: commentsCount }, { count: routesCount }, { count: placeNotesCount }, { count: communitiesCount }] = await Promise.all([
        supabase.from('pin_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('vote_type', 'confirm'),
        supabase.from('pin_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('saved_routes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('place_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      const score = computeScore(pinsCount, alerts, votesCount ?? 0, commentsCount ?? 0);
      const stats: MilestoneStats = {
        pins: pinsCount,
        alerts,
        votes: votesCount ?? 0,
        comments: commentsCount ?? 0,
        routes: routesCount ?? 0,
        placeNotes: placeNotesCount ?? 0,
        communities: communitiesCount ?? 0,
        score,
      };

      const newMilestones = checkMilestones(stats, store.achievedMilestones);
      for (const m of newMilestones) {
        store.addAchievedMilestone(m.key);
        showMilestoneToast(m);
        store.addNotification({
          id: crypto.randomUUID(),
          type: 'milestone',
          title: `${m.emoji} ${m.label}`,
          body: m.description,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Non-critical — don't block the app
    } finally {
      milestoneCheckRef.current = false;
    }
  }, [userId]);

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
      runMilestoneCheck();
    }
  }, [addPin, addNotification, runMilestoneCheck]);

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
    runMilestoneCheck();
  }, [addNotification, runMilestoneCheck]);

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
    runMilestoneCheck();
  }, [addNotification, runMilestoneCheck]);

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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-2xl shadow-lg shadow-[rgba(244,63,94,0.3)] animate-pulse">
          🛡️
        </div>
        <div className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
          KO<span style={{ color: 'var(--accent)' }}>V</span>A
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
          <div className="flex items-center gap-1.5">
            {/* KOVA shield mark */}
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" fill="var(--accent)" opacity="0.15" />
              <path d="M16 2L4 7v9c0 8.5 5.2 14.2 12 17 6.8-2.8 12-8.5 12-17V7L16 2z" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
              <text x="16" y="21" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="13" fill="var(--accent)">K</text>
            </svg>
            <span className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              KO<span style={{ color: 'var(--accent)' }}>V</span>A
            </span>
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
            {/* Settings / burger menu */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
              style={{ backgroundColor: showSettings ? 'var(--accent)' : 'var(--bg-card)' }}
              onClick={() => setShowSettings((v) => !v)}
            >
              <Menu size={15} strokeWidth={2} style={{ color: showSettings ? '#fff' : 'var(--text-muted)' }} />
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

      {/* ── Map tab — visible for map, trip, community AND mykova tabs ── */}
      <div className={`flex-1 relative min-h-0 ${activeTab !== 'map' && activeTab !== 'trip' && activeTab !== 'community' && activeTab !== 'mykova' ? 'hidden' : 'flex flex-col'}`}>
        <MapView />
        <FilterBar />
        <EmergencyButton userId={userId} />

        {/* Session briefing card — shown once per session on map tab */}
        <AnimatePresence>
          {showBriefing && activeTab === 'map' && !sosPin && (
            <SessionBriefingCard key="briefing" onDismiss={() => setShowBriefing(false)} />
          )}
        </AnimatePresence>

        {/* Report + incidents list toggle — map tab only */}
        {activeTab === 'map' && (
          <>
            {/* Incidents list toggle — top left pill */}
            <button
              onClick={() => setShowIncidentsList(!showIncidentsList)}
              className="absolute top-3 left-3 h-9 px-3 rounded-xl flex items-center gap-2 shadow-lg z-50 hover:scale-105 active:scale-95 transition"
              style={{
                backgroundColor: showIncidentsList ? 'var(--accent)' : 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
                border: showIncidentsList ? 'none' : '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <List size={15} strokeWidth={2.2} style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }}>
                Nearby
              </span>
              {/* Emergency badge */}
              {!showIncidentsList && pins.filter((p) => p.is_emergency && !p.resolved_at && (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2).length > 0 && (
                <span
                  className="min-w-[16px] h-[16px] rounded-full text-[0.5rem] font-black flex items-center justify-center px-1"
                  style={{ backgroundColor: '#ef4444', color: '#fff' }}
                >
                  {pins.filter((p) => p.is_emergency && !p.resolved_at && (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2).length}
                </span>
              )}
            </button>
            {/* Report button — bottom right */}
            <button
              onClick={() => setActiveSheet('report')}
              className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-linear-to-br from-[#f43f5e] to-[#e11d48] text-white text-2xl flex items-center justify-center shadow-lg shadow-[rgba(244,63,94,0.35)] z-50 hover:scale-105 active:scale-95 transition"
            >
              +
            </button>
          </>
        )}
        {/* Map contextual card — shows area info */}
        {activeTab === 'map' && !showBriefing && <MapContextCard />}

        {/* Trip sheet — overlays the map when on trip tab */}
        <AnimatePresence>
          {activeTab === 'trip' && (
            <TripView key="trip-sheet" onClose={() => setActiveTab('map')} />
          )}
        </AnimatePresence>

        {/* Incidents list overlay — triggered by list button on map */}
        <AnimatePresence>
          {showIncidentsList && activeTab === 'map' && (
            <IncidentsView key="incidents-sheet" onClose={() => setShowIncidentsList(false)} />
          )}
        </AnimatePresence>

        {/* Community sheet — overlays the map when on community tab */}
        <AnimatePresence>
          {activeTab === 'community' && (
            <CommunityView key="community-sheet" onClose={() => setActiveTab('map')} />
          )}
        </AnimatePresence>

        {/* My KOVA — merged dashboard + profile */}
        <AnimatePresence>
          {activeTab === 'mykova' && userId && (
            <MyKovaView
              key="mykova-sheet"
              userId={userId}
              userEmail={userEmail}
              onClose={() => setActiveTab('map')}
            />
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

      {/* ── Place Note popup — tap a note marker on the map ────────── */}
      <AnimatePresence>
        {selectedPlaceNote && (
          <PlaceNotePopup
            key="place-note-popup"
            note={selectedPlaceNote}
            onClose={() => setSelectedPlaceNote(null)}
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

      {/* ── Settings sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsSheet key="settings" onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* ── Onboarding overlay (first launch only) ─────────────────── */}
      {!loading && !onboardingDone && (
        <OnboardingOverlay onDone={markOnboardingDone} />
      )}

      {/* ── Push notification opt-in ─────────────────────────────────── */}
      <AnimatePresence>
        {showPushOptIn && (
          <PushOptInModal
            key="push-optin"
            onEnable={async () => {
              setShowPushOptIn(false);
              dismissPushOptIn();
              const perm = await Notification.requestPermission();
              if (perm === 'granted' && userId) registerPush(userId);
            }}
            onDismiss={() => { setShowPushOptIn(false); dismissPushOptIn(); }}
          />
        )}
      </AnimatePresence>

      {/* ── PWA install prompt ──────────────────────────────────────── */}
      <InstallPrompt />

      {/* ── Offline banner ──────────────────────────────────────────── */}
      <OfflineBanner />
    </div>
  );
}
