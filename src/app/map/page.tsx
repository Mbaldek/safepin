// src/app/map/page.tsx

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { Pin } from '@/types';
import { bToast } from '@/components/GlobalToast';
import { usePresenceHeartbeat } from '@/lib/usePresence';
import { updateStreak } from '@/lib/streaks';
import { haversineMeters } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Search, Menu, X, List, ChevronLeft, Plus, Shield, SlidersHorizontal } from 'lucide-react';
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

// Lazy-loaded heavy components — not on the critical rendering path
const EscorteSheet = dynamic(() => import('@/components/EscorteSheet'), { ssr: false });
const MyKovaView = dynamic(() => import('@/components/MyKovaView'), { ssr: false });
const SettingsSheet = dynamic(() => import('@/components/settings/SettingsSheet'), { ssr: false });
const WalkWithMePanel = dynamic(() => import('@/components/WalkWithMePanel'), { ssr: false });
const WalkHistorySheet = dynamic(() => import('@/components/WalkHistorySheet'), { ssr: false });
const TripView = dynamic(() => import('@/components/trip/TripView'), { ssr: false });
const TripHUD = dynamic(() => import('@/components/TripHUD'), { ssr: false });
const CommunityView = dynamic(() => import('@/components/community/CommunityView'), { ssr: false });
const CercleSheet = dynamic(() => import('@/components/CercleSheet'), { ssr: false });

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
    showWalkWithMe, setShowWalkWithMe,
    showWalkHistory, setShowWalkHistory,
    showTripHistory, setShowTripHistory,
    mapFilters, setMapFilters,
    showSafeSpaces, setShowSafeSpaces,
    showPinLabels, setShowPinLabels,
    setTripPrefill,
    mapViewport, setDbClusters,
  } = useStore();
  const isDark = useTheme((s) => s.theme) === 'dark';
  const tMap = useTranslations('map');
  const escorte = useEscorte(userId ?? '');
  const { communityDMTarget, closeCommunityDM } = useUiStore();
  const [dmTarget, setDmTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);

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

  // Open CommunityView DM when triggered from CercleSheet
  useEffect(() => {
    if (!communityDMTarget) return;
    setDmTarget(communityDMTarget);
    setActiveTab('community');
    closeCommunityDM();
  }, [communityDMTarget, closeCommunityDM, setActiveTab]);


  // Listen for locate-pin events from community cards
  useEffect(() => {
    const handler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      useStore.getState().setMapFlyTo({ lat, lng, zoom: 16 });
      setActiveTab('map');
    };
    window.addEventListener('breveil:locate-pin', handler);
    return () => window.removeEventListener('breveil:locate-pin', handler);
  }, [setActiveTab]);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSections, setSearchSections] = useState<AutocompleteSection[]>([]);
  const [showCityContext, setShowCityContext] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialScreen, setSettingsInitialScreen] = useState<string | undefined>(undefined);
  const [sosPin, setSosPin] = useState<import('@/types').Pin | null>(null);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const [safetyFilter, setSafetyFilter] = useState<string | null>(null);
  // showWalkWithMe is now in the Zustand store (shared with TripView)

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
    setActiveSheet('none');
    setShowNotifications(false);
    setShowSettings(false);
    setShowSearch(false);
    setShowCityContext(false);
    setShowIncidentsList(false);
    // Close trip/community/cercle panels — return to map
    const tab = useStore.getState().activeTab;
    if (tab === 'trip' || tab === 'community' || tab === 'cercle') {
      setActiveTab('map');
    }
  }, [setActiveSheet, setShowIncidentsList, setActiveTab]);

  // When a store-driven overlay opens (pin detail, report), close all local overlays
  useEffect(() => {
    if (activeSheet !== 'none') {
      setShowNotifications(false);
      setShowSettings(false);
      setShowSearch(false);
      setShowCityContext(false);
      setShowIncidentsList(false);
      setActiveTab('map');
    }
  }, [activeSheet]);

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
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const now = new Date().toISOString();

      if (mapViewport && mapViewport.zoom >= 10) {
        // ── Viewport-based spatial load via PostGIS ──────────────────────────
        const { lat, lng, radiusM } = mapViewport;
        const radius = Math.min(radiusM * 1.3, 15_000);

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
        setPins(result);
        setDbClusters([]);

      } else if (mapViewport && mapViewport.zoom < 10) {
        // ── Low zoom: DB spatial clustering via ST_ClusterDBSCAN ─────────────
        const { lat, lng, radiusM, zoom } = mapViewport;
        const eps = zoom < 7 ? 3000 : zoom < 9 ? 1500 : 800;

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
          .is('hidden_at', null).gt('expires_at', now)
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
          .gt('expires_at', new Date().toISOString())
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
    <div id="main-content" role="main" className="h-dvh flex flex-col overflow-hidden">

      {/* ── Top bar (always visible, 56px) ────────────────────────── */}
      <div className="shrink-0 z-50 relative"
        style={{ backgroundColor: 'var(--surface-card)', borderBottom: '1px solid var(--border)', height: 56 }}>
        <div className="flex items-center gap-3 px-4 h-full">
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
                <svg width={28} height={28} viewBox="0 0 80 80" fill="none" aria-hidden="true" className="text-[var(--text-primary)]">
                  <path d="M20 60 Q20 30, 40 20 Q60 30, 60 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M28 55 Q28 35, 40 28 Q52 35, 52 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
                  <circle cx="40" cy="22" r="4" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>BREVEIL</span>
              </div>
              <div className="flex-1" />
              {/* Right icons */}
              <div className="flex items-center gap-2">
                {/* Search icon — map tab only */}
                {activeTab === 'map' && (
                  <button
                    onClick={() => { setActiveSheet('none'); setShowIncidentsList(false); setShowNotifications(false); setShowSettings(false); setShowCityContext(false); setShowSearch(true); }}
                    aria-label="Search location"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                  >
                    <Search size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
                {/* Notification bell */}
                <button
                  onClick={() => { setActiveSheet('none'); setShowIncidentsList(false); setShowSettings(false); setShowSearch(false); setShowCityContext(false); setShowNotifications((v) => !v); }}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                  style={{
                    background: showNotifications
                      ? '#3BB4C1'
                      : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.80)'),
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-80"
                  style={{ backgroundColor: showSettings ? 'var(--accent)' : 'transparent' }}
                  onClick={() => { if (!showSettings) { setActiveSheet('none'); setShowIncidentsList(false); setShowNotifications(false); setShowSearch(false); setShowCityContext(false); } setShowSettings((v) => !v); }}
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

        <EmergencyButton userId={userId} compact={activeTab !== 'map'} />

        {/* Filter button — replaces old POI toggle */}
        {activeTab === 'map' && (
          <>
            <button
              onClick={() => setShowFilterPopover((v) => !v)}
              aria-label="Filtrer les signalements"
              style={{
                position: 'absolute', top: 10, right: 50, zIndex: 10,
                width: 29, height: 29, borderRadius: 4,
                backgroundColor: (showFilterPopover || filterActiveCount > 0) ? '#3BB4C1' : '#fff',
                border: (showFilterPopover || filterActiveCount > 0) ? 'none' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={2} color={(showFilterPopover || filterActiveCount > 0) ? '#fff' : '#333'} />
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
                  position: 'absolute', top: 44, right: 10, zIndex: 60,
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
            {/* Walk With Me */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => setShowWalkWithMe(true)}
                style={{
                  position: 'fixed',
                  bottom: 200,
                  right: 20,
                  width: 50, height: 50, borderRadius: '50%', border: 'none',
                  background: 'linear-gradient(145deg, #8B6B9A 0%, #5C3D5E 55%, #3d2245 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', zIndex: 50,
                  animation: 'wwm-glow 2.8s ease-in-out infinite',
                }}
                title="Marche avec moi"
              >
                <span style={{
                  position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
                  animation: 'wwm-shimmer 3s ease-in-out infinite',
                }} />
                <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </button>
            </div>

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
                width: 50,
                height: 50,
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
        <AnimatePresence onExitComplete={() => {
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
        <AnimatePresence>
          {activeTab === 'trip' && !showWalkWithMe && userId && (
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
            onClose={() => { setShowWalkWithMe(false); setActiveTab('map'); }}
          />
        )}
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

      <AnimatePresence>
        {showTripHistory && userId && (
          <TripView
            key="trip-history"
            onClose={() => { setShowTripHistory(false); setActiveTab('trip'); }}
            openToHistory
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
      <FloatingCallPill />
      <CallSheet />

    </div>
  );
}
