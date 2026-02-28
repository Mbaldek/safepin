// src/components/SavedPanel.tsx

'use client';

import { useState } from 'react';
import { Trash2, Plus, Check, X, Share2, ThumbsUp } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { PlaceNote, SavedRoute } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { geocodeForward } from '@/lib/geocode';

const MODES_LIST = [
  { id: 'walk',    emoji: '🚶' },
  { id: 'bike',    emoji: '🚴' },
  { id: 'drive',   emoji: '🚗' },
  { id: 'transit', emoji: '🚇' },
] as const;
type Mode = typeof MODES_LIST[number]['id'];

const MODES: Record<string, string> = { walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇' };
const PLACE_EMOJIS = ['📌', '🏠', '💼', '🍽️', '❤️', '🌳', '🔒', '🚶', '⭐', '⚠️'];

type Props = {
  savedRoutes: SavedRoute[];
  favRouteIds: Set<string>;
  onToggleFavRoute: (id: string) => void;
  onLoadPlace: (note: PlaceNote, as: 'from' | 'to') => void;
  onLoadRoute: (route: SavedRoute) => void;
  onDeleteRoute: (id: string) => void;
  onAddPlace: () => void;
  onRouteAdded: (route: SavedRoute) => void;
};

export default function SavedPanel({
  savedRoutes,
  favRouteIds,
  onToggleFavRoute,
  onLoadPlace,
  onLoadRoute,
  onDeleteRoute,
  onAddPlace,
  onRouteAdded,
}: Props) {
  const { placeNotes, favPlaceIds, toggleFavPlace, deletePlaceNote, userId, userLocation } = useStore();
  const [tab, setTab] = useState<'places' | 'routes'>('places');

  // ── Add place form state ──────────────────────────────────────────────────
  const [addingPlace, setAddingPlace]   = useState(false);
  const [pName, setPName]               = useState('');
  const [pAddr, setPAddr]               = useState('');
  const [pEmoji, setPEmoji]             = useState('📌');
  const [pSaving, setPSaving]           = useState(false);

  // ── Add route form state ──────────────────────────────────────────────────
  const [addingRoute, setAddingRoute]   = useState(false);
  const [rFrom, setRFrom]               = useState('');
  const [rTo, setRTo]                   = useState('');
  const [rMode, setRMode]               = useState<Mode>('walk');
  const [rSaving, setRSaving]           = useState(false);

  const [sharingId, setSharingId] = useState<string | null>(null);

  const favPlaces   = placeNotes.filter((n) => favPlaceIds.includes(n.id));
  const sortedRoutes = [
    ...savedRoutes.filter((r) => favRouteIds.has(r.id)),
    ...savedRoutes.filter((r) => !favRouteIds.has(r.id)),
  ];

  async function toggleShareRoute(route: SavedRoute) {
    if (!userId) return;
    setSharingId(route.id);
    const newPublic = !route.is_public;
    const token = newPublic ? crypto.randomUUID().slice(0, 8) : null;
    const { error } = await supabase
      .from('saved_routes')
      .update({ is_public: newPublic, share_token: token })
      .eq('id', route.id)
      .eq('user_id', userId);
    setSharingId(null);
    if (error) { toast.error('Failed to update sharing'); return; }
    route.is_public = newPublic;
    route.share_token = token;
    toast.success(newPublic ? 'Route shared publicly' : 'Route set to private');
  }

  // ── Submit add-place ──────────────────────────────────────────────────────
  async function submitPlace() {
    if (!pName.trim() && !pAddr.trim()) return;
    if (!userId) return;
    setPSaving(true);

    let lat = 48.8566, lng = 2.3522; // Paris fallback
    if (pAddr.trim()) {
      const coords = await geocodeForward(pAddr.trim(), userLocation);
      if (!coords) {
        toast.error('Address not found — try a more specific address');
        setPSaving(false);
        return;
      }
      [lng, lat] = coords;
    }

    const { data, error } = await supabase
      .from('place_notes')
      .insert({
        user_id: userId,
        lat,
        lng,
        name:  pName.trim() || null,
        note:  pAddr.trim(),
        emoji: pEmoji,
      })
      .select()
      .single();

    setPSaving(false);
    if (error) { toast.error('Could not save place'); return; }

    const note = data as PlaceNote;
    useStore.getState().addPlaceNote(note);
    toggleFavPlace(note.id);
    toast.success(`${pEmoji} ${pName.trim() || pAddr.trim()} added ⭐`);
    setPName(''); setPAddr(''); setPEmoji('📌');
    setAddingPlace(false);
  }

  // ── Submit add-route ──────────────────────────────────────────────────────
  async function submitRoute() {
    if (!rTo.trim()) return;
    if (!userId) return;
    setRSaving(true);

    const name = rTo.trim();
    const { data, error } = await supabase
      .from('saved_routes')
      .upsert(
        {
          user_id:           userId,
          name,
          from_label:        rFrom.trim() || null,
          to_label:          rTo.trim(),
          mode:              rMode,
          coords:            [],
          danger_score_last: 0,
          trip_count:        0,
          last_used_at:      new Date().toISOString(),
        },
        { onConflict: 'user_id,name' },
      )
      .select()
      .single();

    setRSaving(false);
    if (error) { toast.error('Could not save route'); return; }
    toast.success('Route saved ✓');
    onRouteAdded(data as SavedRoute);
    setRFrom(''); setRTo('');
    setAddingRoute(false);
  }

  // ── Common input style ────────────────────────────────────────────────────
  const inputStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1.5px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="flex flex-col h-full">

      {/* Tabs */}
      <div
        className="flex gap-1 px-1 py-1 rounded-2xl shrink-0"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {(['places', 'routes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-xl text-xs font-black transition"
            style={{
              backgroundColor: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)',
            }}
          >
            {t === 'places'
              ? `📍 Places${favPlaces.length > 0 ? ` (${favPlaces.length})` : ''}`
              : `🗺️ Routes${savedRoutes.length > 0 ? ` (${savedRoutes.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto mt-3 flex flex-col gap-2 pb-2">

        {/* ── Places tab ──────────────────────────────────────────────── */}
        {tab === 'places' && (
          <>
            {favPlaces.length === 0 && !addingPlace && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="text-3xl">📍</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  No favorite places yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add one below, or long-press on the map to pin a spot.
                </p>
              </div>
            )}

            {favPlaces.map((n) => {
              const label = n.name || `${n.emoji} ${n.note.slice(0, 28)}`;
              const sub   = n.name && n.note ? `${n.emoji} ${n.note.slice(0, 40)}` : null;
              return (
                <div
                  key={n.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid rgba(245,158,11,0.35)' }}
                >
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <span className="text-lg shrink-0">{n.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      {sub && <p className="text-[0.6rem] truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
                    </div>
                    <button
                      onClick={() => toggleFavPlace(n.id)}
                      className="text-base px-1 transition hover:opacity-70"
                      title="Remove from favorites"
                    >⭐</button>
                    <button
                      onClick={() => deletePlaceNote(n.id)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition hover:opacity-70"
                      style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
                      title="Delete place"
                    >
                      <Trash2 size={12} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                  <div className="flex gap-1.5 px-3 pb-3 pt-1">
                    <button
                      onClick={() => onLoadPlace(n, 'from')}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                      style={{ backgroundColor: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                    >🚶 Depart</button>
                    <button
                      onClick={() => onLoadPlace(n, 'to')}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                      style={{ backgroundColor: 'rgba(212,168,83,0.10)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.2)' }}
                    >📍 Go here</button>
                  </div>
                </div>
              );
            })}

            {/* Add place form */}
            {addingPlace ? (
              <div
                className="rounded-2xl p-3 flex flex-col gap-2"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--accent)' }}
              >
                <p className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                  New Favorite Place
                </p>

                {/* Emoji row */}
                <div className="flex gap-1.5 flex-wrap">
                  {PLACE_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setPEmoji(e)}
                      className="w-8 h-8 rounded-xl text-base flex items-center justify-center"
                      style={{
                        backgroundColor: pEmoji === e ? 'var(--accent)' : 'var(--bg-secondary)',
                        border: pEmoji === e ? '2px solid var(--accent)' : '1px solid var(--border)',
                      }}
                    >{e}</button>
                  ))}
                </div>

                {/* Name */}
                <input
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Name (e.g. Home, Office…)"
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={inputStyle}
                />

                {/* Address */}
                <input
                  value={pAddr}
                  onChange={(e) => setPAddr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitPlace()}
                  placeholder="Address (to geocode location)"
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={inputStyle}
                />

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAddingPlace(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    <X size={11} className="inline mr-1" />Cancel
                  </button>
                  <button
                    onClick={submitPlace}
                    disabled={(!pName.trim() && !pAddr.trim()) || pSaving}
                    className="flex-1 py-2 rounded-xl text-xs font-black transition disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {pSaving ? '…' : <><Check size={11} className="inline mr-1" />Add ⭐</>}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingPlace(true)}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl text-xs font-bold transition"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
              >
                <Plus size={13} />
                Add a place
              </button>
            )}

            {/* Map hint */}
            {!addingPlace && (
              <button
                onClick={onAddPlace}
                className="text-[0.6rem] text-center transition hover:opacity-70"
                style={{ color: 'var(--text-placeholder)' }}
              >
                or long-press on the map to pin a location
              </button>
            )}
          </>
        )}

        {/* ── Routes tab ──────────────────────────────────────────────── */}
        {tab === 'routes' && (
          <>
            {sortedRoutes.length === 0 && !addingRoute && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="text-3xl">🗺️</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  No saved routes yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add one below or find a route and tap the bookmark icon.
                </p>
              </div>
            )}

            {sortedRoutes.map((r) => {
              const isFav = favRouteIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-1 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: isFav ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid var(--border)',
                  }}
                >
                  <button
                    onClick={() => onToggleFavRoute(r.id)}
                    className="shrink-0 w-9 flex items-center justify-center self-stretch transition hover:opacity-70"
                  >
                    <span className="text-base">{isFav ? '⭐' : '☆'}</span>
                  </button>
                  <button
                    onClick={() => onLoadRoute(r)}
                    className="flex-1 flex items-center justify-between py-2.5 pr-2 text-left min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {r.from_label ? `${r.from_label} → ` : ''}{r.to_label}
                      </p>
                      <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                        {MODES[r.mode] ?? ''} {r.mode} · {r.trip_count}× used
                      </p>
                    </div>
                    <span
                      className="text-[0.55rem] font-black px-2 py-0.5 rounded-full shrink-0 ml-2"
                      style={{
                        backgroundColor: r.danger_score_last === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: r.danger_score_last === 0 ? '#22c55e' : '#f59e0b',
                      }}
                    >
                      {r.danger_score_last === 0 ? 'Clear' : `${r.danger_score_last} risk`}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0 mr-1.5">
                    {r.is_public && (
                      <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{ backgroundColor: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                        <ThumbsUp size={9} /> {r.upvote_count ?? 0}
                      </span>
                    )}
                    <button
                      onClick={() => toggleShareRoute(r)}
                      disabled={sharingId === r.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-70"
                      style={{
                        backgroundColor: r.is_public ? 'rgba(34,197,94,0.10)' : 'var(--bg-secondary)',
                      }}
                      title={r.is_public ? 'Shared publicly' : 'Share route'}
                    >
                      <Share2 size={12} style={{ color: r.is_public ? '#22c55e' : 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => onDeleteRoute(r.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:opacity-70"
                      style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
                    >
                      <Trash2 size={12} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add route form */}
            {addingRoute ? (
              <div
                className="rounded-2xl p-3 flex flex-col gap-2"
                style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--accent)' }}
              >
                <p className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                  New Saved Route
                </p>

                {/* Mode selector */}
                <div className="flex gap-1.5">
                  {MODES_LIST.map(({ id, emoji }) => (
                    <button
                      key={id}
                      onClick={() => setRMode(id)}
                      className="flex-1 py-1.5 rounded-xl text-sm transition"
                      style={{
                        backgroundColor: rMode === id ? 'var(--accent)' : 'var(--bg-secondary)',
                        border: rMode === id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      }}
                    >{emoji}</button>
                  ))}
                </div>

                {/* From */}
                <input
                  value={rFrom}
                  onChange={(e) => setRFrom(e.target.value)}
                  placeholder="From (optional, e.g. Home)"
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={inputStyle}
                />

                {/* To */}
                <input
                  value={rTo}
                  onChange={(e) => setRTo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRoute()}
                  placeholder="To (e.g. Gare du Nord) *"
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={inputStyle}
                />

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAddingRoute(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    <X size={11} className="inline mr-1" />Cancel
                  </button>
                  <button
                    onClick={submitRoute}
                    disabled={!rTo.trim() || rSaving}
                    className="flex-1 py-2 rounded-xl text-xs font-black transition disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {rSaving ? '…' : <><Check size={11} className="inline mr-1" />Save</>}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingRoute(true)}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl text-xs font-bold transition"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
              >
                <Plus size={13} />
                Add a route
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
