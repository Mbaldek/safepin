// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { toast } from 'sonner';
import { checkMilestones, type MilestoneStats } from '@/lib/milestones';
import { updateStreak } from '@/lib/streaks';
import { usePresenceHeartbeat } from '@/lib/usePresence';
import { computeScore } from '@/lib/levels';
import { showMilestoneToast } from '@/components/MilestoneToast';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, X, List } from 'lucide-react';
import MapView from '@/components/MapView';
import { BreveilMonogram } from '@/components/BrandAssets';
import ContextBanner from '@/components/ContextBanner';
import IncidentReportModal from '@/components/IncidentReportModal';
import DetailSheet from '@/components/DetailSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { ConfirmFlowModal } from '@/components/ConfirmFlowModal';
import ThemeToggle from '@/components/ThemeToggle';
import AddressSearch from '@/components/AddressSearch';
import EmergencyButton from '@/components/EmergencyButton';
import BottomNav from '@/components/BottomNav';
import IncidentsView from '@/components/IncidentsView';
import NotificationsSheet from '@/components/NotificationsSheet';
import CityContextPanel from '@/components/CityContextPanel';
import SosBanner from '@/components/SosBanner';
import OnboardingFunnelV2, { useOnboardingDone } from '@/components/OnboardingFunnelV2';
import PlaceNoteSheet from '@/components/PlaceNoteSheet';
import PlaceNotePopup from '@/components/PlaceNotePopup';
import PushOptInModal, { shouldShowPushOptIn, dismissPushOptIn } from '@/components/PushOptInModal';
import OfflineBanner from '@/components/OfflineBanner';
import SessionBriefingCard from '@/components/SessionBriefingCard';
import InstallPrompt from '@/components/InstallPrompt';
import CommunityTooltip from '@/components/CommunityTooltip';
import { CoachMark } from '@/components/CoachMark';
import { useTour } from '@/hooks/useTour';

// Lazy-loaded heavy components — not on the critical rendering path
const TripView = dynamic(() => import('@/components/TripView'), { ssr: false });
const MyKovaView = dynamic(() => import('@/components/MyKovaView'), { ssr: false });
const SettingsSheet = dynamic(() => import('@/components/SettingsSheet'), { ssr: false });
const WalkWithMePanel = dynamic(() => import('@/components/WalkWithMePanel'), { ssr: false });
const TripHUD = dynamic(() => import('@/components/TripHUD'), { ssr: false });
const CommunityView = dynamic(() => import('@/components/CommunityView'), { ssr: false });

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
    isSharingLocation, setIsSharingLocation, setWatchedLocation,
    userLocation, userProfile,
    newPlaceNoteCoords, setNewPlaceNoteCoords,
    selectedPlaceNote, setSelectedPlaceNote,
    setLiveSessions, addLiveSession, updateLiveSession,
    showIncidentsList, setShowIncidentsList,
    achievedMilestones, addAchievedMilestone,
    setStreakInfo, longestStreak,
    activeTrip, setActiveTrip,
    setActiveRoute, setTransitSegments,
    tripNudge,
    showWalkWithMe, setShowWalkWithMe,
    mapFilters,
    showSafeSpaces, setShowSafeSpaces,
  } = useStore();
  const tMap = useTranslations('map');
  const tTour = useTranslations('tour');

  const { isActive: tourActive, currentStep: tourStep, currentStepIndex: tourStepIdx, totalSteps: tourTotal, next: tourNext, skip: tourSkip } = useTour();

  // Resolve tour step strings eagerly (avoids dynamic key call to t())
  const TOUR_TITLES: Record<string, string> = {
    sos:     tTour('sosTitle'),
    report:  tTour('reportTitle'),
    filters: tTour('filtersTitle'),
    trip:    tTour('tripTitle'),
    profile: tTour('profileTitle'),
  };
  const TOUR_DESCS: Record<string, string> = {
    sos:     tTour('sosDesc'),
    report:  tTour('reportDesc'),
    filters: tTour('filtersDesc'),
    trip:    tTour('tripDesc'),
    profile: tTour('profileDesc'),
  };

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
  const [showPushOptIn, setShowPushOptIn] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
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
    return () => clearInterval(iv);
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

  // ── Streak tracking — update on each session ────────────────────────────
  useEffect(() => {
    if (!userId) return;
    updateStreak(supabase, userId).then((result) => {
      if (result) {
        setStreakInfo(result.streak, result.isNewRecord ? result.streak : longestStreak);
        if (result.milestone) {
          toast.success(`\u{1F525} ${result.streak}-day streak!`);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  // ── App layout ────────────────────────────────────────────────────────────
  return (
    <div id="main-content" role="main" className="h-dvh flex flex-col overflow-hidden">

      {/* ── Top bar (always visible) ───────────────────────────────── */}
      <div className="shrink-0 z-50"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <div className="flex items-center gap-1.5">
            <BreveilMonogram size={22} variant="dark" />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1rem', letterSpacing: '3px', color: 'var(--text-primary)' }}>
              BREVEIL
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search icon — map tab only */}
            {activeTab === 'map' && (
              <button
                onClick={() => setShowSearch((v) => !v)}
                aria-label={showSearch ? 'Close search' : 'Search location'}
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
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              className="relative w-8 h-8 flex items-center justify-center rounded-xl transition hover:opacity-70"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <Bell size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
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
              aria-label="Settings"
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
      <div className={`flex-1 relative min-h-0 ${activeTab !== 'map' && activeTab !== 'trip' && activeTab !== 'me' && activeTab !== 'community' ? 'hidden' : 'flex flex-col'}`}>
        <MapView
          mapStyle={mapStyle}
          showBus={showBus}
          showMetroRER={showMetroRER}
          showPharmacy={showPharmacy}
          showHospital={showHospital}
          showPolice={showPolice}
          showHeatmap={showHeatmap}
          showScores={showScores}
          onTransitLoadingChange={setTransitLoading}
          onPoiLoadingChange={setPoiLoading}
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

        {/* Contextual rolling banner — map tab only */}
        {activeTab === 'map' && <ContextBanner />}

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
              aria-label={showIncidentsList ? 'Hide incidents list' : 'Show incidents list'}
              data-tour="filter-bar"
              className="absolute top-3 left-3 h-9 px-3 rounded-xl flex items-center gap-2 shadow-lg z-50 hover:scale-105 active:scale-95 transition"
              style={{
                backgroundColor: showIncidentsList ? 'var(--accent)' : 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
                border: showIncidentsList ? 'none' : '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <List size={15} strokeWidth={2.2} style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: showIncidentsList ? '#fff' : 'var(--text-muted)' }}>
                {tMap('nearby')}
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
            <button
              onClick={() => setActiveSheet('report')}
              data-tour="report-button"
              className="absolute bottom-22 right-4 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition"
              style={{
                backgroundColor: '#3b82f6',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
              }}
            >
              +
            </button>
          </>
        )}


        {/* Map contextual card — shows area info */}

        {/* TripHUD — persistent map overlay during active trip */}
        <AnimatePresence>
          {activeTrip?.state === 'ACTIVE' && activeTab === 'map' && (
            <TripHUD
              key="trip-hud"
              trip={activeTrip}
              nudge={tripNudge}
              onImSafe={() => {
                setActiveTrip(null);
                setActiveRoute(null);
                setTransitSegments(null);
                setPendingRoutes(null);
                setActiveTab('trip'); // open trip tab to show summary
              }}
              onOpenTrip={() => setActiveTab('trip')}
            />
          )}
        </AnimatePresence>

        {/* Community tab — trusted circle, groups, messages */}
        <AnimatePresence>
          {activeTab === 'community' && userId && (
            <CommunityView key="community-tab" onClose={() => setActiveTab('map')} />
          )}
        </AnimatePresence>

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

        {/* Report sheet — inside map container like other tab overlays */}
        <AnimatePresence>
          {activeSheet === 'report' && <IncidentReportModal key="report" userId={userId} />}
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
        {activeSheet === 'detail' && <DetailSheet key="detail" />}
      </AnimatePresence>

      {/* ── New Report Sheet (v2) ── */}
      <AnimatePresence>
        <ReportSheet />
      </AnimatePresence>

      {/* ── Confirm Flow Modal ── */}
      <ConfirmFlowModal />

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

      {/* ── Walk With Me panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showWalkWithMe && userId && (
          <WalkWithMePanel
            key="walk-with-me"
            userId={userId}
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
      <AnimatePresence>
        {showSettings && (
          <SettingsSheet key="settings" onClose={() => setShowSettings(false)} mapStyle={mapStyle} onMapStyleChange={setMapStyle} />
        )}
      </AnimatePresence>

      {/* ── Onboarding overlay (first launch only) ─────────────────── */}
      {!loading && !onboardingDone && userId && (
        <OnboardingFunnelV2 userId={userId} onComplete={handleOnboardingDone} />
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

      {/* ── Map tour coachmarks ─────────────────────────────────────── */}
      <AnimatePresence>
        {tourActive && tourStep && (
          <CoachMark
            key={tourStep.id}
            targetSelector={tourStep.targetSelector}
            title={TOUR_TITLES[tourStep.id] ?? ''}
            description={TOUR_DESCS[tourStep.id] ?? ''}
            position={tourStep.position}
            currentStep={tourStepIdx + 1}
            totalSteps={tourTotal}
            onNext={tourNext}
            onSkip={tourSkip}
            skipLabel={tTour('skip')}
            nextLabel={tTour('next')}
            doneLabel={tTour('done')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
