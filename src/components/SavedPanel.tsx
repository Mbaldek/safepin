// src/components/SavedPanel.tsx

'use client';

import { useState } from 'react';
import { Trash2, MapPin } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { PlaceNote, SavedRoute } from '@/types';

const MODES: Record<string, string> = {
  walk: '🚶', bike: '🚴', drive: '🚗', transit: '🚇',
};

type Props = {
  savedRoutes: SavedRoute[];
  favRouteIds: Set<string>;
  onToggleFavRoute: (id: string) => void;
  onLoadPlace: (note: PlaceNote, as: 'from' | 'to') => void;
  onLoadRoute: (route: SavedRoute) => void;
  onDeleteRoute: (id: string) => void;
  onAddPlace: () => void; // navigate to map to long-press
};

export default function SavedPanel({
  savedRoutes,
  favRouteIds,
  onToggleFavRoute,
  onLoadPlace,
  onLoadRoute,
  onDeleteRoute,
  onAddPlace,
}: Props) {
  const { placeNotes, favPlaceIds, toggleFavPlace, deletePlaceNote } = useStore();
  const [tab, setTab] = useState<'places' | 'routes'>('places');

  const favPlaces = placeNotes.filter((n) => favPlaceIds.includes(n.id));
  const sortedRoutes = [
    ...savedRoutes.filter((r) => favRouteIds.has(r.id)),
    ...savedRoutes.filter((r) => !favRouteIds.has(r.id)),
  ];

  return (
    <div className="flex flex-col h-full">

      {/* Tabs */}
      <div className="flex gap-1 px-1 py-1 rounded-2xl shrink-0" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['places', 'routes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-xl text-xs font-black transition capitalize"
            style={{
              backgroundColor: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)',
            }}
          >
            {t === 'places' ? `📍 Places${favPlaces.length > 0 ? ` (${favPlaces.length})` : ''}` : `🗺️ Routes${savedRoutes.length > 0 ? ` (${savedRoutes.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-3 flex flex-col gap-2 pb-2">

        {/* ── Places tab ────────────────────────────────────────────── */}
        {tab === 'places' && (
          <>
            {favPlaces.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-3xl">📍</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  No favorite places yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Long-press on the map to pin a spot, then ⭐ it when saving.
                </p>
                <button
                  onClick={onAddPlace}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-black transition"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  <MapPin size={12} className="inline mr-1" />
                  Go to Map
                </button>
              </div>
            ) : (
              favPlaces.map((n) => {
                const label = n.name || `${n.emoji} ${n.note.slice(0, 28)}`;
                const sub   = n.name ? `${n.emoji} ${n.note.slice(0, 40)}` : null;
                return (
                  <div
                    key={n.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid rgba(245,158,11,0.35)' }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                      <span className="text-lg shrink-0">{n.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
                        {sub && <p className="text-[0.6rem] truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
                      </div>
                      {/* Un-fav + delete */}
                      <button
                        onClick={() => toggleFavPlace(n.id)}
                        className="text-base px-1 transition hover:opacity-70"
                        title="Remove from favorites"
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => deletePlaceNote(n.id)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center transition hover:opacity-70"
                        style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
                        title="Delete place"
                      >
                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1.5 px-3 pb-3 pt-1">
                      <button
                        onClick={() => onLoadPlace(n, 'from')}
                        className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                        style={{ backgroundColor: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        🚶 Depart from here
                      </button>
                      <button
                        onClick={() => onLoadPlace(n, 'to')}
                        className="flex-1 py-1.5 rounded-xl text-xs font-bold transition"
                        style={{ backgroundColor: 'rgba(244,63,94,0.10)', color: 'var(--accent)', border: '1px solid rgba(244,63,94,0.2)' }}
                      >
                        📍 Go here
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── Routes tab ────────────────────────────────────────────── */}
        {tab === 'routes' && (
          <>
            {sortedRoutes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-3xl">🗺️</span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  No saved routes yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Find a route and tap the bookmark icon to save it.
                </p>
              </div>
            ) : (
              sortedRoutes.map((r) => {
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
                    {/* Fav toggle */}
                    <button
                      onClick={() => onToggleFavRoute(r.id)}
                      className="shrink-0 w-9 flex items-center justify-center self-stretch transition hover:opacity-70"
                      title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      <span className="text-base">{isFav ? '⭐' : '☆'}</span>
                    </button>

                    {/* Route info + load */}
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

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteRoute(r.id)}
                      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mr-1.5 transition hover:opacity-70"
                      style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
                      title="Delete route"
                    >
                      <Trash2 size={12} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
