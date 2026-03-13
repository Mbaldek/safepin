'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Search, Mic, Plus, X,
  Home, Briefcase, Coffee, Shield, MapPin, Star, Heart, Zap,
  Clock, Bookmark, Loader2, Edit2, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsDark } from '@/hooks/useIsDark';
import { SavedPlace } from '@/types';
import { T } from '@/lib/tokens';
import { useToast } from '@/hooks/useToast';

// ─── Helpers ────────────────────────────────────────────────────────

function calcDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function debounce<F extends (...args: never[]) => void>(fn: F, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const LS_KEY = 'breveil_recent_searches';
function getRecentSearches(): { name: string; address: string; lat: number; lng: number; ts: number }[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function addRecentSearch(item: { name: string; address: string; lat: number; lng: number }) {
  const list = getRecentSearches().filter((r) => r.name !== item.name);
  list.unshift({ ...item, ts: Date.now() });
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 5)));
}

type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties: Record<string, unknown>;
};

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'home', label: 'Domicile' },
  { key: 'work', label: 'Travail' },
  { key: 'cafe', label: 'Cafés' },
  { key: 'safe_space', label: 'Safe Spaces' },
];

const CATEGORY_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  home: { bg: 'rgba(245,195,65,0.12)', border: 'rgba(245,195,65,0.25)', color: T.accentGold },
  work: { bg: 'rgba(59,180,193,0.12)', border: 'rgba(59,180,193,0.25)', color: T.accentCyan },
  cafe: { bg: T.semanticSuccessSoft, border: 'rgba(52,211,153,0.25)', color: T.semanticSuccess },
  safe_space: { bg: T.semanticSuccessSoft, border: 'rgba(52,211,153,0.25)', color: T.semanticSuccess },
  health: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#EF4444' },
  sport: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', color: '#A78BFA' },
  other: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', color: T.textSecondary },
};

const ICON_MAP: Record<string, typeof Home> = {
  Home, Briefcase, Coffee, MapPin, Star, Shield, Heart, Zap,
};
const CATEGORY_ICON: Record<string, string> = {
  home: 'Home', work: 'Briefcase', cafe: 'Coffee', safe_space: 'Shield', other: 'MapPin',
};
const ICON_NAMES = ['Coffee', 'Home', 'Briefcase', 'MapPin', 'Star', 'Shield', 'Heart', 'Zap'];

const ADD_CATEGORIES = [
  { key: 'cafe' as const, label: 'Café' },
  { key: 'home' as const, label: 'Domicile' },
  { key: 'work' as const, label: 'Travail' },
  { key: 'safe_space' as const, label: 'Safe Space' },
  { key: 'other' as const, label: 'Personnel' },
];

// ─── Types ──────────────────────────────────────────────────────────

interface FavorisSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (place: SavedPlace) => void;
  userId: string;
  userLat: number;
  userLng: number;
}

// ─── Component ──────────────────────────────────────────────────────

export default function FavorisSheet({ isOpen, onClose, onSelect, userId, userLat, userLng }: FavorisSheetProps) {
  const toast = useToast();
  const isDark = useIsDark();
  const d = isDark;

  // State
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'list' | 'search' | 'add'>('list');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [addCandidate, setAddCandidate] = useState<{
    name: string; address: string; lat: number; lng: number;
  } | null>(null);
  const [addName, setAddName] = useState('');
  const [addIcon, setAddIcon] = useState('Coffee');
  const [addCategory, setAddCategory] = useState<SavedPlace['category']>('cafe');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !userId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (data) {
        const withDist = data.map((p: SavedPlace) => ({
          ...p,
          distance_km: calcDist(userLat, userLng, p.lat, p.lng),
        }));
        setPlaces(withDist);
      }
      setLoading(false);
    };
    load();
  }, [isOpen, userId, userLat, userLng]);

  // ── Reset view when opening ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setView('list');
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // ── Mapbox search ─────────────────────────────────────────────────
  const debouncedSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        if (q.length < 2) { setSuggestions([]); return; }
        setSearching(true);
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const proximity = `${userLng},${userLat}`;
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${token}&language=fr&limit=5&proximity=${proximity}&types=poi,address,place,locality,neighborhood&autocomplete=true`;
        try {
          const res = await fetch(url);
          const json = await res.json();
          setSuggestions(json.features ?? []);
        } catch {
          setSuggestions([]);
        }
        setSearching(false);
      }, 300),
    [userLat, userLng],
  );

  useEffect(() => { debouncedSearch(query); }, [query, debouncedSearch]);

  // Focus search input when entering search view
  useEffect(() => {
    if (view === 'search') {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [view]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!addCandidate || !addName.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('saved_places')
      .insert({
        user_id: userId,
        label: addName.trim(),
        address: addCandidate.address,
        lat: addCandidate.lat,
        lng: addCandidate.lng,
        icon: addIcon,
        category: addCategory,
        is_pinned: false,
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Impossible de sauvegarder');
      setSaving(false);
      return;
    }

    const newPlace: SavedPlace = {
      ...data,
      distance_km: calcDist(userLat, userLng, data.lat, data.lng),
    };
    setPlaces((p) => [newPlace, ...p]);
    toast.success(`${addName} ajouté aux favoris`);

    setAddCandidate(null);
    setAddName('');
    setAddIcon('Coffee');
    setAddCategory('cafe');
    setView('list');
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    setPlaces((p) => p.filter((x) => x.id !== id));
    await supabase.from('saved_places').delete().eq('id', id);
    toast.success('Lieu supprimé');
  }, []);

  // ── Filters ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === 'all') return places;
    return places.filter((p) => p.category === filter);
  }, [places, filter]);

  const pinned = filtered.filter((p) => p.is_pinned);
  const regular = filtered.filter((p) => !p.is_pinned);

  // ── Render helpers ────────────────────────────────────────────────
  const recentSearches = getRecentSearches();

  const renderIcon = (iconName: string, size: number, color: string) => {
    const Comp = ICON_MAP[iconName] ?? MapPin;
    return <Comp size={size} strokeWidth={1.5} color={color} />;
  };

  // ═══════════════════════════════════════════════════════════════════
  // FAV ITEM
  // ═══════════════════════════════════════════════════════════════════
  const FavItem = ({ place }: { place: SavedPlace }) => {
    const cat = place.category || 'other';
    const style = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE.other;
    const iconName = CATEGORY_ICON[cat] ?? place.icon ?? 'MapPin';

    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '10px 20px',
          cursor: 'pointer',
          transition: `background 150ms ${T.easeOut}`,
        }}
        onClick={() => onSelect(place)}
        onMouseEnter={(e) => { e.currentTarget.style.background = d ? T.interactiveHover : T.interactiveHoverL; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: T.radiusMd,
            background: style.bg,
            border: `1px solid ${style.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {renderIcon(iconName, 18, style.color)}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: d ? T.textPrimary : T.textPrimaryL,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place.label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: d ? T.textSecondary : T.textSecondaryL,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place.address || cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: d ? T.textTertiary : T.textTertiaryL }}>
            {place.distance_km !== undefined ? `${place.distance_km.toFixed(1)} km` : ''}
          </span>
          {(cat === 'safe_space' || cat === 'cafe') && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: T.radiusFull,
                background: T.semanticSuccessSoft,
                border: '1px solid rgba(52,211,153,0.2)',
                color: T.semanticSuccess,
              }}
            >
              Safe ✓
            </span>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(place.id); }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            alignSelf: 'center',
          }}
        >
          <Trash2 size={13} color="#EF4444" />
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="favoris-sheet"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={SPRING}
          style={{
            position: 'fixed',
            bottom: 80,
            left: 0,
            right: 0,
            zIndex: 100,
            background: d ? T.surfaceElevated : T.surfaceElevatedL,
            borderTopLeftRadius: T.radiusXl,
            borderTopRightRadius: T.radiusXl,
            borderTop: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
            borderLeft: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
            borderRight: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100% - 80px - 200px)',
          }}
        >
          {/* Handle */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: T.radiusFull,
              background: d ? T.borderStrong : T.borderStrongL,
              margin: '12px auto 0',
              flexShrink: 0,
            }}
          />

          <AnimatePresence mode="wait">
            {/* ═══ VIEW: LIST ════════════════════════════════════════ */}
            {view === 'list' && (
              <motion.div
                key="list"
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={SPRING}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 12px' }}>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: d ? T.surfaceGlass : T.surfaceGlassL,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronLeft size={18} color={d ? T.textPrimary : T.textPrimaryL} />
                  </button>
                  <span style={{ fontSize: 17, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL, flex: 1 }}>
                    Mes favoris
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: d ? T.textTertiary : T.textTertiaryL,
                      padding: '3px 10px',
                      borderRadius: T.radiusFull,
                      background: d ? T.surfaceGlass : T.surfaceGlassL,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                    }}
                  >
                    {places.length} lieu{places.length !== 1 ? 'x' : ''}
                  </span>
                </div>

                {/* Search input (fake — navigates to search view) */}
                <div style={{ padding: '0 16px 12px' }}>
                  <button
                    onClick={() => setView('search')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: T.radiusMd,
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Search size={16} color={d ? T.textTertiary : T.textTertiaryL} />
                    <span style={{ flex: 1, fontSize: 14, color: d ? T.textTertiary : T.textTertiaryL }}>
                      Rechercher ou ajouter…
                    </span>
                    <Mic size={16} color={d ? T.textTertiary : T.textTertiaryL} />
                  </button>
                </div>

                {/* Filter chips */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '0 16px 14px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    flexShrink: 0,
                  }}
                >
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: T.radiusFull,
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: `all 150ms ${T.easeOut}`,
                        background: filter === f.key ? (d ? T.interactiveActive : T.interactiveActiveL) : 'transparent',
                        border: `1px solid ${filter === f.key ? T.gradientStart : (d ? T.borderDefault : T.borderDefaultL)}`,
                        color: filter === f.key ? (d ? T.textPrimary : T.textPrimaryL) : (d ? T.textSecondary : T.textSecondaryL),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Scroll body */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {loading && (
                    <div style={{ padding: '0 16px' }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            height: 60,
                            borderRadius: T.radiusLg,
                            background: d ? T.interactiveHover : T.interactiveHoverL,
                            marginBottom: 8,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                      <Bookmark size={40} color={d ? T.textTertiary : T.textTertiaryL} />
                      <div style={{ fontSize: 14, color: d ? T.textTertiary : T.textTertiaryL, marginTop: 8 }}>
                        Aucun favori
                      </div>
                    </div>
                  )}

                  {!loading && pinned.length > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 6px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL }}>
                          Épinglés
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.gradientStart, cursor: 'pointer' }}>
                          Modifier
                        </span>
                      </div>
                      {pinned.map((p) => <FavItem key={p.id} place={p} />)}
                      <div style={{ height: 1, background: d ? T.borderSubtle : T.borderSubtleL, margin: '4px 20px' }} />
                    </>
                  )}

                  {!loading && regular.length > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 20px 6px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL }}>
                          Favoris
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.gradientStart, cursor: 'pointer' }}>
                          Tout voir
                        </span>
                      </div>
                      {regular.map((p) => <FavItem key={p.id} place={p} />)}
                    </>
                  )}

                  {/* Add row */}
                  {!loading && (
                    <button
                      onClick={() => setView('search')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        margin: '4px 16px',
                        padding: '12px 14px',
                        borderRadius: T.radiusLg,
                        border: `1.5px dashed ${d ? T.borderDefault : T.borderDefaultL}`,
                        background: 'transparent',
                        cursor: 'pointer',
                        width: 'calc(100% - 32px)',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: T.radiusMd,
                          background: d ? T.surfaceGlass : T.surfaceGlassL,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={16} color={d ? T.textSecondary : T.textSecondaryL} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: d ? T.textSecondary : T.textSecondaryL }}>
                          Ajouter un lieu
                        </div>
                        <div style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL }}>
                          Rechercher ou tap sur la carte
                        </div>
                      </div>
                      <ChevronRight size={16} color={d ? T.textTertiary : T.textTertiaryL} />
                    </button>
                  )}
                </div>

                {/* CTA */}
                <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
                  <button
                    onClick={onClose}
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      borderRadius: 32,
                      background: d ? T.textPrimary : T.textInverse,
                      color: d ? T.textInverse : T.textPrimary,
                      fontSize: 16,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Lancer un trajet
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ VIEW: SEARCH ══════════════════════════════════════ */}
            {view === 'search' && (
              <motion.div
                key="search"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={SPRING}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                {/* Search input (focused) */}
                <div style={{ padding: '16px 16px 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: T.radiusMd,
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      border: `1.5px solid ${T.borderFocus}`,
                      boxShadow: T.shadowGlow,
                    }}
                  >
                    <Search size={16} color={T.gradientStart} />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un lieu…"
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: d ? T.textPrimary : T.textPrimaryL,
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => { setQuery(''); setView('list'); }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: d ? T.interactiveActive : T.interactiveActiveL,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={13} color={d ? T.textSecondary : T.textSecondaryL} />
                    </button>
                  </div>
                </div>

                {/* Results body */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 16px' }}>
                  {/* Recent searches */}
                  {query.length < 2 && recentSearches.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL, padding: '0 4px 8px' }}>
                        Recherches récentes
                      </div>
                      {recentSearches.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setAddCandidate({ name: r.name, address: r.address, lat: r.lat, lng: r.lng });
                            setAddName(r.name);
                            setView('add');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 4px',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <Clock size={14} color={d ? T.textTertiary : T.textTertiaryL} />
                          <span style={{ fontSize: 13, color: d ? T.textPrimary : T.textPrimaryL, flex: 1 }}>
                            {r.name}
                          </span>
                          <span style={{ fontSize: 11, color: d ? T.textTertiary : T.textTertiaryL }}>
                            {(() => {
                              const m = Math.floor((Date.now() - r.ts) / 60000);
                              if (m < 60) return `${m}min`;
                              if (m < 1440) return `${Math.floor(m / 60)}h`;
                              return `${Math.floor(m / 1440)}j`;
                            })()}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Spinner */}
                  {searching && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <Loader2 size={20} color={T.gradientStart} style={{ animation: 'spin 1s linear infinite' }} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                  )}

                  {/* Suggestions */}
                  {!searching && query.length >= 2 && suggestions.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL, padding: '0 4px 8px' }}>
                        Résultats
                      </div>
                      {suggestions.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            addRecentSearch({ name: f.text, address: f.place_name, lat: f.center[1], lng: f.center[0] });
                            setAddCandidate({ name: f.text, address: f.place_name, lat: f.center[1], lng: f.center[0] });
                            setAddName(f.text);
                            // Auto-detect category
                            const cat = String(f.properties?.category ?? '').toLowerCase();
                            if (cat.includes('cafe') || cat.includes('coffee')) setAddCategory('cafe');
                            else if (cat.includes('health') || cat.includes('pharmacy') || cat.includes('hospital')) setAddCategory('health');
                            else setAddCategory('other');
                            setView('add');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 4px',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: T.radiusMd,
                              background: d ? T.interactiveHover : T.interactiveHoverL,
                              border: `1px solid ${d ? T.borderSubtle : T.borderSubtleL}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <MapPin size={16} color={d ? T.textTertiary : T.textTertiaryL} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: d ? T.textPrimary : T.textPrimaryL, fontWeight: 500 }}>
                              {f.text}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: d ? T.textSecondary : T.textSecondaryL,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {f.place_name}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* No results */}
                  {!searching && query.length >= 2 && suggestions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: d ? T.textTertiary : T.textTertiaryL, fontSize: 13 }}>
                      Aucun résultat pour &laquo;{query}&raquo;
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ═══ VIEW: ADD ═════════════════════════════════════════ */}
            {view === 'add' && addCandidate && (
              <motion.div
                key="add"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={SPRING}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}
              >
                {/* Mini map preview */}
                <div
                  style={{
                    height: 200,
                    background: d ? T.surfaceBase : T.surfaceBaseL,
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {/* Grid pattern */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `linear-gradient(${d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px), linear-gradient(90deg, ${d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Crosshair */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ position: 'absolute', width: 48, height: 1.5, background: 'rgba(245,195,65,0.35)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    <div style={{ position: 'absolute', width: 1.5, height: 48, background: 'rgba(245,195,65,0.35)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: T.accentGold,
                        border: '3px solid #fff',
                        boxShadow: '0 0 0 8px rgba(245,195,65,0.2)',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%,-50%)',
                      }}
                    />
                  </div>

                  {/* Address pill */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: d ? T.surfaceGlass : T.surfaceGlassL,
                      backdropFilter: 'blur(16px)',
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      borderRadius: T.radiusFull,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      maxWidth: '80%',
                    }}
                  >
                    <MapPin size={11} color={T.gradientStart} />
                    <span
                      style={{
                        fontSize: 12,
                        color: d ? T.textSecondary : T.textSecondaryL,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {addCandidate.address}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div style={{ padding: '16px 20px 12px' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: d ? T.textPrimary : T.textPrimaryL }}>
                    Nommer ce lieu
                  </div>
                  <div style={{ fontSize: 13, color: d ? T.textSecondary : T.textSecondaryL, marginTop: 2 }}>
                    Visible uniquement par toi
                  </div>
                </div>

                {/* Name input */}
                <div
                  style={{
                    margin: '0 20px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    borderRadius: T.radiusMd,
                    background: d ? T.surfaceCard : T.surfaceCardL,
                    border: `1.5px solid ${T.borderFocus}`,
                    boxShadow: T.shadowGlow,
                  }}
                >
                  <Edit2 size={15} color={d ? T.textTertiary : T.textTertiaryL} />
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Nom du lieu"
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: 15,
                      fontWeight: 500,
                      color: d ? T.textPrimary : T.textPrimaryL,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Icon label */}
                <div style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL }}>
                  Icône
                </div>

                {/* Icon grid */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 20px 16px' }}>
                  {ICON_NAMES.map((name) => {
                    const Comp = ICON_MAP[name] ?? MapPin;
                    const selected = addIcon === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setAddIcon(name)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: T.radiusMd,
                          border: `1.5px solid ${selected ? T.gradientStart : (d ? T.borderSubtle : T.borderSubtleL)}`,
                          background: selected ? 'rgba(59,180,193,0.10)' : (d ? T.interactiveHover : T.interactiveHoverL),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Comp size={18} strokeWidth={1.5} color={selected ? T.gradientStart : (d ? T.textSecondary : T.textSecondaryL)} />
                      </button>
                    );
                  })}
                </div>

                {/* Category label */}
                <div style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: d ? T.textTertiary : T.textTertiaryL }}>
                  Catégorie
                </div>

                {/* Category chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 20px 16px' }}>
                  {ADD_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setAddCategory(c.key)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: T.radiusFull,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: addCategory === c.key ? (d ? T.interactiveActive : T.interactiveActiveL) : 'transparent',
                        border: `1px solid ${addCategory === c.key ? T.gradientStart : (d ? T.borderDefault : T.borderDefaultL)}`,
                        color: addCategory === c.key ? (d ? T.textPrimary : T.textPrimaryL) : (d ? T.textSecondary : T.textSecondaryL),
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Dual CTA */}
                <div style={{ display: 'flex', gap: 10, padding: '12px 20px 8px', flexShrink: 0 }}>
                  <button
                    onClick={() => setView('search')}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      borderRadius: 32,
                      background: d ? T.surfaceCard : T.surfaceCardL,
                      border: `1px solid ${d ? T.borderDefault : T.borderDefaultL}`,
                      color: d ? T.textSecondary : T.textSecondaryL,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    disabled={saving || !addName.trim()}
                    onClick={handleSave}
                    style={{
                      flex: 2,
                      padding: '14px 0',
                      borderRadius: 32,
                      background: saving || !addName.trim() ? (d ? T.interactiveActive : T.interactiveActiveL) : (d ? T.textPrimary : T.textInverse),
                      color: saving || !addName.trim() ? (d ? T.textTertiary : T.textTertiaryL) : (d ? T.textInverse : T.textPrimary),
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    Sauvegarder
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
