// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useIsDark } from '@/hooks/useIsDark';
import { Pin } from '@/types';
import { bToast } from '@/components/GlobalToast';
import { usePresenceHeartbeat } from '@/lib/usePresence';
import { updateStreak } from '@/lib/streaks';
import { haversineMeters } from '@/lib/utils';
import { isPinBeyondGrace } from '@/lib/pin-utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, X, List, ChevronLeft, Shield, SlidersHorizontal } from 'lucide-react';
import MapView from '@/components/MapView';
import { BreveilMonogram } from '@/components/BrandAssets';
import { PinDetailSheet } from '@/components/map/PinDetailSheet';
import { ReportSheet } from '@/components/ReportSheet';
import AutocompleteInput, { type AutocompleteSection } from '@/components/AutocompleteInput';
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
import { useUiStore } from '@/stores/uiStore';
import FloatingCallPill from '@/components/FloatingCallPill';
import CallSheet from '@/components/CallSheet';
import { prefetchFeed } from '@/lib/prefetchFeed';
// Lazy-loaded heavy components — not on the critical rendering path
const EscorteSheet = dynamic(() => import('@/components/EscorteSheet'), { ssr: false });
const JuliaChat = dynamic(() => import('@/components/julia/JuliaChat'), { ssr: false });
const SettingsSheet = dynamic(() => import('@/components/settings/SettingsSheet'), { ssr: false });
const WalkHistorySheet = dynamic(() => import('@/components/WalkHistorySheet'), { ssr: false });
const TripHUD = dynamic(() => import('@/components/TripHUD'), { ssr: false });
const RouteQuickCard = dynamic(() => import('@/components/trip/RouteQuickCard'), { ssr: false });
const CommunityView = dynamic(() => import('@/components/community/CommunityView'), { ssr: false });
const CercleSheet = dynamic(() => import('@/components/CercleSheet'), { ssr: false });
const TripSummaryModal = dynamic(() => import('@/components/trip/TripSummaryModal'), { ssr: false });

const tabVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
} as const;
const tabTransition = { duration: 0.18, ease: 'easeOut' } as const;

// ─── Ambient pill logic ──────────────────────────────────────────────────────

const URGENT_CATS = ['theft','assault','harassment','following','suspect','group','unsafe']
const POSITIF_CATS = ['safe','help','presence']

function getAmbientPill(pins: Pin[], userLocation: { lat: number; lng: number } | null): {
  text: string
  color: 'calm' | 'warn' | 'alert' | 'safe'
  pulse: boolean
} {
  if (!userLocation || !pins.length) {
    return { text: 'À proximité', color: 'calm', pulse: false }
  }

  const now = Date.now()
  const nearby = pins.filter(p => {
    if (p.resolved_at || p.hidden_at) return false
    return haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) <= 500
  })

  // P3 — URGENT actif <500m dans les 30min
  const urgentRecent = nearby
    .filter(p => URGENT_CATS.includes(p.category))
    .filter(p => now - new Date(p.created_at).getTime() < 30 * 60 * 1000)
    .sort((a, b) =>
      haversineMeters(userLocation, { lat: a.lat, lng: a.lng }) -
      haversineMeters(userLocation, { lat: b.lat, lng: b.lng })
    )[0]

  if (urgentRecent) {
    const dist = Math.round(haversineMeters(userLocation, { lat: urgentRecent.lat, lng: urgentRecent.lng }))
    const mins = Math.round((now - new Date(urgentRecent.created_at).getTime()) / 60000)
    const label = urgentRecent.category_label ?? urgentRecent.category
    return { text: `${label} · ${dist}m · il y a ${mins} min`, color: 'alert', pulse: true }
  }

  // P4 — Safe space <200m
  const safeNearby = pins
    .filter(p => !p.resolved_at && !p.hidden_at && POSITIF_CATS.includes(p.category))
    .filter(p => haversineMeters(userLocation, { lat: p.lat, lng: p.lng }) <= 200)
    .sort((a, b) =>
      haversineMeters(userLocation, { lat: a.lat, lng: a.lng }) -
      haversineMeters(userLocation, { lat: b.lat, lng: b.lng })
    )[0]

  if (safeNearby) {
    const dist = Math.round(haversineMeters(userLocation, { lat: safeNearby.lat, lng: safeNearby.lng }))
    const label = safeNearby.category_label ?? safeNearby.address ?? 'Espace sûr'
    return { text: `${label} · ${dist}m`, color: 'safe', pulse: false }
  }

  // P2 — URGENT <500m dans les 2h (moins récent)
  const urgentOlder = nearby
    .filter(p => URGENT_CATS.includes(p.category))
    .filter(p => now - new Date(p.created_at).getTime() < 2 * 60 * 60 * 1000)[0]

  if (urgentOlder) {
    const mins = Math.round((now - new Date(urgentOlder.created_at).getTime()) / 60000)
    const label = urgentOlder.category_label ?? urgentOlder.category
    return { text: `${label} signalé · il y a ${mins} min`, color: 'warn', pulse: true }
  }

  // P1 — Calm
  const count = nearby.length
  if (count === 0) return { text: 'Secteur calme', color: 'calm', pulse: false }
  return { text: `Secteur calme · ${count} signal${count > 1 ? 'ements' : 'ement'}`, color: 'calm', pulse: false }
}

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
    showWalkHistory, setShowWalkHistory,
    mapFilters, setMapFilters,
    showSafeSpaces, setShowSafeSpaces,
    showPinLabels, setShowPinLabels,
    setTripPrefill,
    mapViewport, setDbClusters,
    pendingRoutes, tappedRouteIdx, setTappedRouteIdx,
    reportPlaceMode,
  } = useStore();
  const isDark = useIsDark();
  const tMap = useTranslations('map');
  const escorte = useEscorte(userId ?? '');
  const { communityDMTarget, closeCommunityDM } = useUiStore();
  const [dmTarget, setDmTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);
  const [tripSummaryData, setTripSummaryData] = useState<{
    destination: string;
    elapsedSeconds: number;
    distanceM: number;
    incidentsAvoided: number;
    score: number;
    circleMembers: { id: string; name: string }[];
  } | null>(null);

  const [onboardingDone, markOnboardingDone] = useOnboardingDone(userProfile);
  const justCompletedOnboardingRef = useRef(false);
  const [showCommunityTooltip, setShowCommunityTooltip] = useState(false);

  // ── Overlay / panel local state (declared early for closeAllPanels) ────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSections, setSearchSections] = useState<AutocompleteSection[]>([]);
  const [showCityContext, setShowCityContext] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialScreen, setSettingsInitialScreen] = useState<string | undefined>(undefined);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // ── Close all panels (exclusive panels rule) ─────────────────────────────
  const closeAllPanels = useCallback((except?: 'tab' | 'sheet') => {
    if (except !== 'sheet') { setActiveSheet('none'); setSelectedPin(null); }
    if (except !== 'tab') setActiveTab('map');
    setShowIncidentsList(false);
    setShowWalkHistory(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowSearch(false);
    setShowCityContext(false);
    setShowFilterPopover(false);
    setSearchQuery('');
    setSearchSections([]);
    // Reset escorte planning state (but not if a trip is active)
    if (except !== 'tab' && escorte.view !== 'trip-active') {
      escorte.reset();
    }
  }, [setActiveSheet, setSelectedPin, setActiveTab, setShowIncidentsList, setShowWalkHistory, escorte]);

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

  // Open CommunityView DM when triggered from CercleSheet
  useEffect(() => {
    if (!communityDMTarget) return;
    closeAllPanels('tab');
    setDmTarget(communityDMTarget);
    setActiveTab('community');
    closeCommunityDM();
  }, [communityDMTarget, closeCommunityDM, setActiveTab, closeAllPanels]);


  // Listen for locate-pin events from community cards
  useEffect(() => {
    const handler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      closeAllPanels();
      useStore.getState().setMapFlyTo({ lat, lng, zoom: 16 });
    };
    window.addEventListener('breveil:locate-pin', handler);
    return () => window.removeEventListener('breveil:locate-pin', handler);
  }, [closeAllPanels]);

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

  // ── Billing redirect handler (Stripe checkout return) ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (!billing) return;

    if (billing === 'success') {
      bToast.success({ title: 'Bienvenue dans Breveil Pro !' }, isDark);
      try { localStorage.setItem('breveil_is_pro', 'true'); } catch {}
    } else if (billing === 'canceled') {
      bToast.warning({ title: 'Paiement annulé' }, isDark);
    }

    // Clean up URL param
    params.delete('billing');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

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
  const [sosPin, setSosPin] = useState<import('@/types').Pin | null>(null);
  const [safetyFilter, setSafetyFilter] = useState<string | null>(null);

  // Debounced DB search — fires when searchQuery changes
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchSections([]); return; }
    const t = setTimeout(async () => {
      const [pinsRes, usersRes, hashtagsRes, commRes] = await Promise.all([
        supabase.rpc('search_pins',        { p_query: searchQuery, p_limit: 5 }),
        supabase.rpc('search_users',       { p_query: searchQuery, p_limit: 4 }),
        supabase.rpc('search_hashtags',    { p_query: searchQuery, p_limit: 4 }),
        supabase.rpc('search_communities', { p_query: searchQuery, p_limit: 3 }),
      ]);
      const sections: AutocompleteSection[] = [];
      if (pinsRes.data?.length) sections.push({
        title: 'Signalements',
        items: (pinsRes.data as import('@/types').Pin[]).map((p) => ({
          label: p.category_label ?? p.category,
          sublabel: p.address ?? undefined,
          coords: [p.lng, p.lat] as [number, number],
          icon: '📍',
          onClick: () => {
            closeAllPanels('sheet');
            useStore.getState().setSelectedPin(p);
            setActiveSheet('detail');
            useStore.getState().setMapFlyTo({ lat: p.lat, lng: p.lng, zoom: 16 });
          },
        })),
      });
      if (usersRes.data?.length) sections.push({
        title: 'Utilisateurs',
        items: (usersRes.data as { display_name: string | null; name: string | null; username: string | null; avatar_emoji: string | null }[]).map((u) => ({
          label: u.display_name ?? u.name ?? u.username ?? '—',
          sublabel: u.username ? `@${u.username}` : undefined,
          icon: u.avatar_emoji ?? '👤',
        })),
      });
      if (hashtagsRes.data?.length) sections.push({
        title: 'Hashtags',
        items: (hashtagsRes.data as { tag: string; uses_count: number | null }[]).map((h) => ({
          label: `#${h.tag}`,
          sublabel: h.uses_count ? `${h.uses_count} fois` : undefined,
          icon: '#',
        })),
      });
      if (commRes.data?.length) sections.push({
        title: 'Communautés',
        items: (commRes.data as { name: string; description: string | null }[]).map((c) => ({
          label: c.name,
          sublabel: c.description?.slice(0, 40) ?? undefined,
          icon: '🏘',
        })),
      });
      setSearchSections(sections);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleMapTap = useCallback(() => {
    const s = useStore.getState();
    const tab = s.activeTab;
    if (tab === 'trip' && s.pendingRoutes?.length) {
      // Don't close trip panel when viewing routes — just dismiss QuickCard + re-expand panel
      s.setTappedRouteIdx(null);
      window.dispatchEvent(new CustomEvent('route-tap-expand'));
      return;
    }
    closeAllPanels();
  }, [closeAllPanels]);

  // ── Tab toggle (re-click = close, different tab = exclusive switch) ────────
  const handleTabPress = useCallback((tab: 'map' | 'community' | 'cercle' | 'trip' | 'me') => {
    if (activeTab === tab) {
      closeAllPanels();
    } else {
      closeAllPanels('tab');
      setActiveTab(tab);
    }
  }, [activeTab, closeAllPanels, setActiveTab]);

  // Layer state (controls passed to MapView)
  const [mapStyle, setMapStyle] = useState<'custom' | 'streets' | 'light' | 'dark'>(isDark ? 'custom' : 'light');
  // Sync map style with theme — custom (dark) ↔ light
  useEffect(() => {
    setMapStyle((prev) => {
      if (isDark && prev === 'light') return 'custom';
      if (!isDark && prev === 'custom') return 'light';
      return prev;
    });
  }, [isDark]);
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
  const poiActive = showPharmacy && showHospital && showPolice;
  const filterActiveCount = [
    !mapFilters.showDanger,
    !mapFilters.showWarning,
    !mapFilters.showInfra,
    !mapFilters.showPositive,
    poiActive,
    mapFilters.confirmedOnly,
    mapFilters.age !== 'all',
  ].filter(Boolean).length;

  // Count of unresolved emergency pins created in the last 2 hours (red badge on "Nearby" button)
  const emergencyNearbyCount = pins.filter((p) => p.is_emergency && !p.resolved_at && (Date.now() - new Date(p.created_at).getTime()) / 3_600_000 < 2).length;

  const ambientPill = useMemo(() => getAmbientPill(pins, userLocation), [pins, userLocation]);

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
        updateStreak(supabase, uid).catch(() => {});

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
            .then((d) => { if (d.success) bToast.success({ title: 'Bienvenue sur Breveil 🎉', desc: `Vous avez rejoint via ${d.organization_name}` }, isDark); })
            .catch(() => {});
        }

        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') registerPush(uid);
        });
      }
    });
  }, [router, setUserProfile, setUserId]);

  // Prefetch community feed in background for instant tab opening
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => prefetchFeed(userId), 2000);
    return () => clearTimeout(timer);
  }, [userId]);

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
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const now = new Date().toISOString();

      if (mapViewport && mapViewport.zoom >= 12) {
        // ── Viewport-based spatial load via PostGIS ──────────────────────────
        const { lat, lng, radiusM, zoom } = mapViewport;
        const radius = Math.min(radiusM * 1.3, zoom < 14 ? 8_000 : 15_000);

        const [{ data: spatialPins, error }, { data: ownPins } = { data: [] }] = await Promise.all([
          supabase.rpc('pins_nearby', { p_lat: lat, p_lng: lng, p_radius_m: radius }),
          userId
            ? supabase.from('pins').select('*').eq('user_id', userId).order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) return;
        if (error) { console.error('[loadPins] pins_nearby:', error.message); return; }

        const merged = new Map<string, Pin>();
        for (const p of (spatialPins as Pin[] ?? [])) merged.set(p.id, p);
        for (const p of (ownPins as Pin[] ?? [])) merged.set(p.id, p);
        let result = [...merged.values()];
        if (!showSimulated) result = result.filter((p) => !p.is_simulated);
        result = result.filter((p) => !isPinBeyondGrace(p));
        setPins(result);
        setDbClusters([]);

      } else if (mapViewport && mapViewport.zoom < 12) {
        // ── Low zoom: DB spatial clustering via ST_ClusterDBSCAN ─────────────
        const { lat, lng, radiusM, zoom } = mapViewport;
        const eps = zoom < 7 ? 5000 : zoom < 9 ? 2000 : 800;

        const { data: clusters, error } = await supabase.rpc('pins_clustered', {
          p_lat: lat, p_lng: lng,
          p_radius_m: Math.min(radiusM * 1.5, 60_000),
          p_eps_m: eps,
        });

        if (cancelled) return;
        if (!error) setDbClusters(clusters ?? []);
        setPins([]);

      } else {
        // ── Fallback: global load (no viewport yet) ──────────────────────────
        const q1 = supabase
          .from('pins').select('*')
          .is('hidden_at', null)
          .order('created_at', { ascending: false });
        const q2 = userId
          ? supabase.from('pins').select('*').eq('user_id', userId).order('created_at', { ascending: false })
          : null;

        const [{ data: publicPins, error }, { data: ownPins } = { data: [] }] =
          await Promise.all([q1, q2 ?? Promise.resolve({ data: [] })]);

        if (cancelled) return;
        if (error) { console.error('[loadPins] fallback:', error.message); return; }

        const merged = new Map<string, Pin>();
        for (const p of (publicPins as Pin[] ?? [])) merged.set(p.id, p);
        for (const p of (ownPins as Pin[] ?? [])) merged.set(p.id, p);
        let result = [...merged.values()];
        if (!showSimulated) result = result.filter((p) => !p.is_simulated);
        result = result.filter((p) => !isPinBeyondGrace(p));
        setPins(result);
        setDbClusters([]);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [setPins, setDbClusters, userId, showSimulated, pinsVersion, mapViewport]);

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
        bToast.success({ title: 'Synchronisation terminée', desc: `${event.data.synced} signalement${event.data.synced > 1 ? 's' : ''} mis à jour` }, isDark);
        // Refresh pins from server (same filtered query as loadPins)
        supabase
          .from('pins')
          .select('*')
          .is('hidden_at', null)
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setPins((data as Pin[]).filter((p) => !isPinBeyondGrace(p))); });
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

  // Load notification settings for location_mode + quiet hours
  const locationModeRef = useRef<string>('while_using');
  const quietHoursRef = useRef<{ enabled: boolean; start: string; end: string }>({ enabled: false, start: '22:00', end: '07:00' });
  useEffect(() => {
    if (!userId) return;
    supabase.from('notification_settings').select('location_mode, quiet_hours_enabled, quiet_start, quiet_end').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data?.location_mode) locationModeRef.current = data.location_mode;
        if (data) quietHoursRef.current = { enabled: !!data.quiet_hours_enabled, start: data.quiet_start ?? '22:00', end: data.quiet_end ?? '07:00' };
      });
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
      // Suppress toast during quiet hours
      const qh = quietHoursRef.current;
      let inQuiet = false;
      if (qh.enabled) {
        const now = new Date().toTimeString().slice(0, 5);
        inQuiet = qh.start > qh.end ? (now >= qh.start || now < qh.end) : (now >= qh.start && now < qh.end);
      }
      if (!inQuiet) bToast.info(
        {
          title: 'Nouveau signalement à proximité',
          desc: 'Un incident vient d\'être signalé près de vous',
          cta: 'Voir sur la carte →',
        },
        isDark
      );
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
    <div id="main-content" role="main" className="h-dvh flex flex-col">

      {/* ── Top bar (floating transparent overlay) ────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-50"
        style={{
          height: 56,
          pointerEvents: 'none',
          ...(showSearch && activeTab === 'map' ? { backgroundColor: 'var(--surface-card)', borderBottom: '1px solid var(--border)', pointerEvents: 'auto' as const } : {}),
        }}
      >
        <div className="flex items-center gap-3 px-4 h-full" style={{ pointerEvents: 'auto' }}>
          {showSearch && activeTab === 'map' ? (
            <>
              {/* Back arrow — exit search */}
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchSections([]); }}
                aria-label="Close search"
                className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition hover:opacity-80"
              >
                <ChevronLeft size={20} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
              </button>
              {/* Inline search — fills header */}
              <div className="flex-1 min-w-0">
                <AutocompleteInput
                  value={searchQuery}
                  onChange={(text, coords) => {
                    setSearchQuery(text);
                    if (coords) useStore.getState().setMapFlyTo({ lng: coords[0], lat: coords[1], zoom: 15 });
                  }}
                  autoFocus
                  localSections={searchSections}
                />
              </div>
            </>
          ) : (
            <>
              {/* Logo */}
              <div className="flex items-center gap-2">
                <svg width={28} height={28} viewBox="0 0 80 80" fill="none" aria-hidden="true" className="text-[var(--text-primary)]" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                  <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
                  <circle cx="40" cy="22" r="4" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>BREVEIL</span>
              </div>
              <div className="flex-1" />
              {/* Right icons */}
              <div className="flex items-center gap-2">
                {/* Search icon — map tab only */}
                {activeTab === 'map' && (
                  <button
                    onClick={() => { if (showSearch) { setShowSearch(false); return; } closeAllPanels(); setShowSearch(true); }}
                    aria-label="Search location"
                    className="w-8 h-8 flex items-center justify-center rounded-full transition hover:opacity-80"
                    style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                  >
                    <Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
                {/* Notification bell */}
                <button
                  onClick={() => { if (showNotifications) { setShowNotifications(false); return; } closeAllPanels(); setShowNotifications(true); }}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  className="relative w-8 h-8 flex items-center justify-center rounded-full transition hover:opacity-80"
                  style={{
                    background: showNotifications
                      ? '#3BB4C1'
                      : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: showNotifications ? '0 0 0 3px rgba(59,180,193,0.30)' : 'none',
                  }}
                >
                  <Bell size={16} strokeWidth={2} style={{ color: showNotifications ? '#fff' : 'var(--text-muted)' }} />
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
                {/* Settings / burger menu */}
                <button
                  aria-label="Settings"
                  className="w-8 h-8 flex items-center justify-center rounded-full transition hover:opacity-80"
                  style={{
                    backgroundColor: showSettings ? 'var(--accent)' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  onClick={() => { if (showSettings) { setShowSettings(false); return; } closeAllPanels(); setShowSettings(true); }}
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
          onMapTap={handleMapTap}
        />

        {activeTab === 'map' && !showWalkHistory && escorte.view !== 'trip-active' && (
          <EmergencyButton userId={userId} />
        )}

        {/* RouteQuickCard — appears when user taps a route line on the map */}
        <AnimatePresence>
          {tappedRouteIdx !== null && pendingRoutes?.[tappedRouteIdx] && escorte.view !== 'trip-detail' && (
            <RouteQuickCard
              key="route-quick-card"
              route={pendingRoutes[tappedRouteIdx]}
              maxIncidents={Math.max(...(pendingRoutes?.map(r => r.nearbyIncidents ?? 0) ?? [0]))}
              onLaunch={() => {
                // Dispatch event for EscorteSheet to handle the launch
                window.dispatchEvent(new CustomEvent('route-quick-launch', { detail: { idx: tappedRouteIdx } }));
                setTappedRouteIdx(null);
              }}
              onDismiss={() => setTappedRouteIdx(null)}
            />
          )}
        </AnimatePresence>

        {/* Filter button — replaces old POI toggle */}
        {activeTab === 'map' && (
          <>
            <button
              onClick={() => setShowFilterPopover((v) => !v)}
              aria-label="Filtrer les signalements"
              style={{
                position: 'absolute', top: 58, right: 46, zIndex: 10,
                width: 32, height: 32, borderRadius: 9999,
                background: (showFilterPopover || filterActiveCount > 0) ? '#3BB4C1' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: 'none',
                boxShadow: (showFilterPopover || filterActiveCount > 0) ? '0 0 0 3px rgba(59,180,193,0.30)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <SlidersHorizontal size={16} strokeWidth={2} style={{ color: (showFilterPopover || filterActiveCount > 0) ? '#fff' : 'var(--text-muted)' }} />
              {filterActiveCount > 0 && !showFilterPopover && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 14, height: 14, borderRadius: 7,
                  background: '#EF4444', color: '#fff',
                  fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{filterActiveCount}</span>
              )}
            </button>

            {/* Filter popover */}
            {showFilterPopover && (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => setShowFilterPopover(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 59 }}
                />
                <div style={{
                  position: 'absolute', top: 100, right: 10, zIndex: 60,
                  width: 260, borderRadius: 12,
                  background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  padding: 12,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 8 }}>
                    Catégories
                  </div>
                  {[
                    { emoji: '🚨', label: 'Danger', key: 'showDanger' as const, value: mapFilters.showDanger },
                    { emoji: '⚠️', label: 'Vigilance', key: 'showWarning' as const, value: mapFilters.showWarning },
                    { emoji: '🚧', label: 'Infrastructure', key: 'showInfra' as const, value: mapFilters.showInfra },
                    { emoji: '💚', label: 'Positif', key: 'showPositive' as const, value: mapFilters.showPositive },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setMapFilters({ ...mapFilters, [item.key]: !item.value })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: item.value
                          ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                          : 'transparent',
                        opacity: item.value ? 1 : 0.45,
                        transition: 'all 150ms',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{item.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>{item.label}</span>
                      <div style={{
                        width: 32, height: 18, borderRadius: 9, padding: 2,
                        background: item.value ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                        transition: 'background 150ms',
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: 7, background: '#fff',
                          transform: item.value ? 'translateX(14px)' : 'translateX(0)',
                          transition: 'transform 150ms',
                        }} />
                      </div>
                    </button>
                  ))}

                  {/* Lieux SOS toggle */}
                  <button
                    onClick={() => {
                      const next = !poiActive;
                      setShowPharmacy(next); setShowHospital(next); setShowPolice(next);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: poiActive
                        ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                        : 'transparent',
                      opacity: poiActive ? 1 : 0.45,
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>🏥</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>Lieux SOS</span>
                    <div style={{
                      width: 32, height: 18, borderRadius: 9, padding: 2,
                      background: poiActive ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                      transition: 'background 150ms',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 7, background: '#fff',
                        transform: poiActive ? 'translateX(14px)' : 'translateX(0)',
                        transition: 'transform 150ms',
                      }} />
                    </div>
                  </button>

                  {/* Divider */}
                  <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '8px 0' }} />

                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
                    Qualité
                  </div>

                  {/* Confirmés only toggle */}
                  <button
                    onClick={() => setMapFilters({ ...mapFilters, confirmedOnly: !mapFilters.confirmedOnly })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: mapFilters.confirmedOnly
                        ? (isDark ? 'rgba(59,180,193,0.12)' : 'rgba(59,180,193,0.08)')
                        : 'transparent',
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>✅</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B', flex: 1, textAlign: 'left' }}>Confirmés uniquement</span>
                    <div style={{
                      width: 32, height: 18, borderRadius: 9, padding: 2,
                      background: mapFilters.confirmedOnly ? '#3BB4C1' : (isDark ? '#334155' : '#CBD5E1'),
                      transition: 'background 150ms',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 7, background: '#fff',
                        transform: mapFilters.confirmedOnly ? 'translateX(14px)' : 'translateX(0)',
                        transition: 'transform 150ms',
                      }} />
                    </div>
                  </button>

                  {/* Divider */}
                  <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '8px 0' }} />

                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }}>
                    Période
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { label: 'Tous', value: 'all' },
                      { label: '1h', value: '1h' },
                      { label: "Aujourd'hui", value: 'today' },
                      { label: '7 jours', value: '7d' },
                    ] as const).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setMapFilters({ ...mapFilters, age: item.value })}
                        style={{
                          padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600,
                          background: mapFilters.age === item.value
                            ? '#3BB4C1'
                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                          color: mapFilters.age === item.value
                            ? '#fff'
                            : (isDark ? '#CBD5E1' : '#64748B'),
                          transition: 'all 150ms',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Reset link */}
                  {filterActiveCount > 0 && (
                    <button
                      onClick={() => {
                        setMapFilters({ ...mapFilters, showDanger: true, showWarning: true, showInfra: true, showPositive: true, confirmedOnly: false, age: 'all' });
                        setShowPharmacy(true); setShowHospital(true); setShowPolice(true);
                      }}
                      style={{
                        display: 'block', width: '100%', marginTop: 8, padding: '6px 0',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, color: '#3BB4C1', textAlign: 'center',
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

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
            onClick={() => { closeAllPanels('tab'); setActiveTab('trip'); escorte.setView('escorte-intro'); }}
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
              onClick={() => { if (showIncidentsList) { setShowIncidentsList(false); return; } closeAllPanels(); setShowIncidentsList(true); }}
              aria-label={showIncidentsList ? 'Hide incidents list' : 'Show incidents list'}

              className="absolute rounded-xl shadow-lg z-50 hover:scale-105 active:scale-95 transition"
              // centered horizontally, just above BottomNav (64px + 8px gap)

              style={{
                bottom: 72,
                left: '50%',
                transform: 'translateX(-50%)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background:
                    ambientPill.color === 'alert' ? '#EF4444' :
                    ambientPill.color === 'warn'  ? '#F59E0B' :
                    ambientPill.color === 'safe'  ? '#34D399' : 'var(--text-muted)',
                  ...(ambientPill.pulse ? { animation: 'ambientDotPulse 1.2s ease-in-out infinite' } : {}),
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 200,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  color: showIncidentsList ? '#fff' :
                    ambientPill.color === 'alert' ? '#DC2626' :
                    ambientPill.color === 'warn'  ? '#B45309' :
                    ambientPill.color === 'safe'  ? '#059669' : 'var(--text-muted)',
                }}>
                  {ambientPill.text}
                </span>
              </div>
            </button>
            {/* Report button — stacked above SOS on the right */}
            <div
              onClick={() => {
                if (activeSheet === 'report') { closeAllPanels(); return; }
                closeAllPanels();
                const loc = useStore.getState().userLocation;
                if (loc) setNewPinCoords({ lat: loc.lat, lng: loc.lng });
                setActiveSheet('report');
              }}
              style={{
                position: 'fixed',
                bottom: 178,
                right: 20,
                width: 52,
                height: 52,
                borderRadius: '50%',
                zIndex: 50,
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                animation: 'grBreathe 5s ease-in-out infinite',
              }}
            >
              {/* warm glow bloom behind */}
              <div style={{
                position: 'absolute', borderRadius: '50%', zIndex: -1,
                width: 120, height: 120,
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'radial-gradient(circle, rgba(210,160,20,0.22) 0%, rgba(180,130,10,0.10) 45%, transparent 68%)',
                animation: 'grGlow 5s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* frosted body */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'radial-gradient(ellipse at 44% 36%, rgba(255,255,255,1) 0%, rgba(255,252,240,0.96) 18%, rgba(255,242,210,0.80) 42%, rgba(250,228,170,0.52) 62%, rgba(240,212,140,0.28) 78%, rgba(228,196,110,0.10) 92%, transparent 100%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
              }} />

              {/* static gold ring, gap at bottom */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'conic-gradient(from 90deg, #C8900A 0deg, #E8B020 40deg, #F5C830 80deg, #F0C020 140deg, #D4A010 190deg, #C09000 230deg, transparent 263deg, transparent 297deg, #B08008 312deg, #C8900A 360deg)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 23px, black 24px, black 26px, transparent 27px)',
                maskImage: 'radial-gradient(circle, transparent 23px, black 24px, black 26px, transparent 27px)',
                animation: 'grGlow 5s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* single spinner arc rotating over the ring */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 240deg, rgba(255,240,160,0.3) 270deg, rgba(255,230,100,0.7) 310deg, rgba(255,245,180,1) 350deg, transparent 360deg)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 23px, black 24px, black 26px, transparent 27px)',
                maskImage: 'radial-gradient(circle, transparent 23px, black 24px, black 26px, transparent 27px)',
                animation: 'grSpin 2.2s linear infinite',
                pointerEvents: 'none',
              }} />
            </div>

            {/* Safe spaces toggle — left of GPS geolocate */}
            <button
              onClick={() => setShowSafeSpaces(!showSafeSpaces)}
              aria-label={showSafeSpaces ? 'Masquer lieux sûrs' : 'Afficher lieux sûrs'}
              style={{
                position: 'fixed',
                bottom: 30,
                right: 60,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: showSafeSpaces
                  ? 'rgba(59,180,193,0.15)'
                  : (isDark ? '#1E293B' : '#FFFFFF'),
                border: showSafeSpaces
                  ? '1.5px solid #3BB4C1'
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              <Shield size={18} color={showSafeSpaces ? '#3BB4C1' : (isDark ? '#64748B' : '#94A3B8')} />
            </button>
          </>
        )}

        {/* Walk With Me — Diamond button (outside activeTab===map so animation plays on tab switch) */}
        {(activeTab === 'map' || escorte.view !== 'hub') && (() => {
          const isMAMActive = escorte.view !== 'hub';
          return (
            <div
              onClick={() => {
                escorte.setView('escorte-intro');
                setTimeout(() => { closeAllPanels('tab'); setActiveTab('trip'); }, 400);
              }}
              style={{
                position: 'fixed',
                bottom: 260,
                right: 20,
                width: 50,
                height: 50,
                borderRadius: '26%',
                cursor: 'pointer',
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isMAMActive ? 'rotate(-45deg)' : 'rotate(45deg)',
                transition: 'transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: 15,
              }}
            >
              {/* INNER — breathe scale */}
              <div style={{
                position: 'relative',
                width: 50,
                height: 50,
                borderRadius: '26%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'mamBreathe 5s ease-in-out infinite',
              }}>
                {/* shadow */}
                <div style={{
                  position: 'absolute', borderRadius: '26%', zIndex: 0, pointerEvents: 'none',
                  width: 110, height: 110,
                  top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  filter: 'blur(8px)',
                  background: isMAMActive
                    ? 'radial-gradient(ellipse at 58% 62%, rgba(25,110,135,0.18) 0%, rgba(18,95,118,0.08) 42%, transparent 68%)'
                    : 'radial-gradient(ellipse at 58% 62%, rgba(155,163,178,0.24) 0%, rgba(145,155,172,0.10) 42%, transparent 68%)',
                  transition: 'background 0.6s ease',
                }} />
                {/* glow2 teal — visible only active */}
                <div style={{
                  position: 'absolute', borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
                  width: 108, height: 108,
                  top: '50%', left: '50%',
                  filter: 'blur(8px)',
                  opacity: isMAMActive ? 1 : 0,
                  background: 'radial-gradient(circle, rgba(59,180,193,0.55) 0%, rgba(34,168,184,0.30) 38%, rgba(20,155,175,0.10) 62%, transparent 80%)',
                  transition: 'opacity 0.6s ease',
                  animation: 'mamGlow2 3.5s ease-in-out infinite 0.5s',
                }} />
                {/* glow1 */}
                <div style={{
                  position: 'absolute', borderRadius: '50%', zIndex: 1, pointerEvents: 'none',
                  width: 96, height: 96,
                  top: '50%', left: '50%',
                  background: isMAMActive
                    ? 'radial-gradient(circle, rgba(195,245,252,0.72) 0%, rgba(110,222,238,0.46) 28%, rgba(59,180,193,0.22) 50%, rgba(18,148,170,0.07) 68%, transparent 82%)'
                    : 'radial-gradient(circle, rgba(255,255,248,0.60) 0%, rgba(255,248,224,0.38) 30%, rgba(255,238,190,0.15) 52%, transparent 70%)',
                  transition: 'background 0.6s ease',
                  animation: 'mamGlow1 3.5s ease-in-out infinite',
                }} />
                {/* tile */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '26%', zIndex: 2,
                  background: isMAMActive
                    ? 'linear-gradient(145deg, #E6F7FA 0%, #C4ECF5 45%, #A2E1EF 100%)'
                    : 'linear-gradient(145deg, #F9F9F9 0%, #F1F1F1 45%, #E7E7E7 100%)',
                  boxShadow: isMAMActive
                    ? '-4px -4px 10px rgba(255,255,255,0.90), 5px 7px 16px rgba(25,95,115,0.28), 2px 3px 8px rgba(18,85,105,0.20), inset -2px -2px 5px rgba(255,255,255,0.75), inset 1px 1px 3px rgba(30,140,160,0.12), 0 0 0 1.5px rgba(59,180,193,0.38), 0 0 16px rgba(59,180,193,0.28)'
                    : '-5px -5px 12px rgba(255,255,255,0.95), 6px 8px 18px rgba(170,178,194,0.55), 3px 4px 9px rgba(160,170,186,0.38), inset -2px -2px 5px rgba(255,255,255,0.85), inset 1px 1px 3px rgba(150,160,176,0.10)',
                  transition: 'background 0.6s ease, box-shadow 0.6s ease',
                }} />
                {/* specular */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '26%', zIndex: 3, pointerEvents: 'none',
                  opacity: isMAMActive ? 0.55 : 1,
                  transition: 'opacity 0.6s ease',
                  background: 'radial-gradient(ellipse at 28% 26%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.46) 24%, rgba(255,255,255,0.10) 52%, transparent 68%)',
                }} />
              </div>
            </div>
          );
        })()}

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
            setTripSummaryData({
              destination: escorte.activeEscorte?.dest_name ?? '',
              elapsedSeconds: escorte.elapsed,
              distanceM: escorte.distanceM,
              incidentsAvoided: escorte.incidentsAvoided,
              score: 75,
              circleMembers: escorte.circleMembers
                .filter(m => m.profiles?.name)
                .map(m => ({ id: m.contact_id, name: m.profiles!.name })),
            });
            escorte.endEscorte(true);
            setActiveRoute(null);
            setTransitSegments(null);
          }}
          onTerminate={() => {
            escorte.setView('hub');
            setActiveRoute(null);
            setTransitSegments(null);
          }}
          onSOS={() => {
            escorte.triggerSOS();
            window.dispatchEvent(new Event('breveil:trigger-sos'));
          }}
        />

        {/* Trip summary modal — shown after "Je suis arrivée" */}
        <AnimatePresence>
          {tripSummaryData && (
            <TripSummaryModal
              isOpen
              destination={tripSummaryData.destination}
              tripSummary={{
                duration_s: tripSummaryData.elapsedSeconds,
                distance_m: tripSummaryData.distanceM,
                score: tripSummaryData.score,
              }}
              elapsedSeconds={tripSummaryData.elapsedSeconds}
              distanceM={tripSummaryData.distanceM}
              incidentsAvoided={tripSummaryData.incidentsAvoided}
              isDark={isDark}
              circleMembers={tripSummaryData.circleMembers}
              onClose={() => {
                setTripSummaryData(null);
                escorte.setView('hub');
              }}
            />
          )}
        </AnimatePresence>

        {/* Community tab — trusted circle, groups, messages */}
        <AnimatePresence mode="wait" onExitComplete={() => {
          if (pendingPinId) {
            const pinId = pendingPinId;
            setPendingPinId(null);
            (async () => {
              const { data: pin } = await supabase.from('pins').select('*').eq('id', pinId).single();
              if (pin) { useStore.getState().setSelectedPin(pin); setActiveSheet('detail'); }
            })();
          }
        }}>
          {activeTab === 'community' && userId && (
            <CommunityView key="community-tab" onClose={() => setActiveTab('map')} onSafetyFilter={(tag) => { setSafetyFilter(tag); setActiveTab('map'); }} dmTarget={dmTarget} onDMOpened={() => setDmTarget(null)} onPinClick={(pinId) => {
              setPendingPinId(pinId);
              setActiveTab('map');
              setActiveSheet('none');
            }} />
          )}
        </AnimatePresence>

        {/* Cercle tab — standalone trust circle */}
        <CercleSheet open={activeTab === 'cercle'} onClose={() => setActiveTab('map')} />

        {/* Escorte sheet — trip tab */}
        <AnimatePresence mode="wait">
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

        {/* Julia AI tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'me' && userId && (
            <JuliaChat
              key="julia-chat"
              userId={userId}
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
          if (!pin?.user_id || !userId) { bToast.danger({ title: 'Contact impossible', duration: 2500 }, isDark); return; }
          if (pin.user_id === userId) { bToast.info({ title: 'C\'est votre signalement', duration: 2500 }, isDark); return; }
          const { data: existing } = await supabase
            .from('dm_conversations')
            .select('*')
            .or(`and(user1_id.eq.${userId},user2_id.eq.${pin.user_id}),and(user1_id.eq.${pin.user_id},user2_id.eq.${userId})`)
            .limit(1)
            .maybeSingle();
          if (existing) {
            setActiveSheet('none'); setSelectedPin(null);
            setActiveTab('community');
            bToast.success({ title: 'Conversation ouverte', cta: 'Voir le message →', onCta: () => {} }, isDark);
            return;
          }
          const { error } = await supabase.from('dm_conversations').insert({ user1_id: userId, user2_id: pin.user_id });
          if (error) { bToast.danger({ title: 'Impossible d\'ouvrir la conversation', duration: 3000 }, isDark); return; }
          setActiveSheet('none'); setSelectedPin(null);
          setActiveTab('community');
          bToast.success({ title: 'Conversation ouverte', cta: 'Voir le message →', onCta: () => {} }, isDark);
        }}
        userId={userId ?? ''}
        userLat={userLocation?.lat ?? 48.8566}
        userLng={userLocation?.lng ?? 2.3522}
        onNavigateTo={(lat, lng, label) => {
          setTripPrefill({ destination: selectedPin?.address ?? label, destCoords: [lng, lat] });
          setActiveSheet('none');
          setSelectedPin(null);
          setActiveTab('trip');
        }}
      />

      {/* ── Crosshair overlay for pin placement ── */}
      <AnimatePresence>
        {reportPlaceMode && (
          <motion.div
            key="report-crosshair"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 'calc((100vh - 174px) / 2)',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {/* Crosshair icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="8" stroke={isDark ? '#fff' : '#1E293B'} strokeWidth="2" fill="none" opacity="0.7" />
              <line x1="24" y1="4" x2="24" y2="16" stroke={isDark ? '#fff' : '#1E293B'} strokeWidth="1.5" opacity="0.5" />
              <line x1="24" y1="32" x2="24" y2="44" stroke={isDark ? '#fff' : '#1E293B'} strokeWidth="1.5" opacity="0.5" />
              <line x1="4" y1="24" x2="16" y2="24" stroke={isDark ? '#fff' : '#1E293B'} strokeWidth="1.5" opacity="0.5" />
              <line x1="32" y1="24" x2="44" y2="24" stroke={isDark ? '#fff' : '#1E293B'} strokeWidth="1.5" opacity="0.5" />
              <circle cx="24" cy="24" r="2.5" fill={isDark ? '#3BB4C1' : '#1E3A5F'} />
            </svg>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.6)',
              background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)',
              padding: '2px 8px', borderRadius: 6,
              backdropFilter: 'blur(8px)',
            }}>
              Déplace la carte
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Report Sheet (v2) ── */}
      <AnimatePresence>
        <ReportSheet />
      </AnimatePresence>



      {/* ── Walk History sheet ──────────────────────────────────────── */}
      <AnimatePresence>
        {showWalkHistory && userId && (
          <WalkHistorySheet
            key="walk-history"
            userId={userId}
            onClose={() => { setShowWalkHistory(false); setActiveTab('trip'); }}
          />
        )}
      </AnimatePresence>

      {/* TripView removed — trip history now accessible via EscorteSheet */}

      {/* Post-onboarding community tooltip */}
      <CommunityTooltip show={showCommunityTooltip} />

      {/* ── Bottom navigation ──────────────────────────────────────── */}
      <BottomNav onTabPress={handleTabPress} />

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

      {/* ── Notifications dropdown ─────────────────────────────────── */}
      {showNotifications && (
        <NotificationsSheet
          onClose={() => setShowNotifications(false)}
          onOpenSettings={() => { setSettingsInitialScreen('alert-notifications'); setShowSettings(true); }}
          onOpenStory={(storyId) => {
            setActiveTab('community');
            useUiStore.getState().openStory(storyId);
          }}
        />
      )}

      {/* ── Settings sheet ─────────────────────────────────────────── */}
      <SettingsSheet isOpen={showSettings} onClose={() => { setShowSettings(false); setSettingsInitialScreen(undefined); }} initialScreen={settingsInitialScreen} />

      {/* Onboarding is now an early return — see above */}


      {/* ── PWA install prompt ──────────────────────────────────────── */}
      <InstallPrompt />

      {/* ── Offline banner ──────────────────────────────────────────── */}
      <OfflineBanner />

      {/* ── Global audio call UI ─────────────────────────────────────── */}
      <FloatingCallPill
        onEscorteTap={escorte.view === 'escorte-live' || escorte.view === 'escorte-notifying'
          ? () => setActiveTab('trip')
          : undefined
        }
      />
      <CallSheet />

    </div>
  );
}
