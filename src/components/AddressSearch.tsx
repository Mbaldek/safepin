// src/components/AddressSearch.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';

type Suggestion = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    textPrimary: '#FFFFFF', textSecondary: '#94A3B8', textTertiary: '#64748B',
    border: 'rgba(255,255,255,0.08)', borderMid: 'rgba(255,255,255,0.12)',
    hover: 'rgba(255,255,255,0.05)', active: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.06)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
    border: 'rgba(15,23,42,0.06)', borderMid: 'rgba(15,23,42,0.10)',
    hover: 'rgba(15,23,42,0.03)', active: 'rgba(15,23,42,0.06)',
    inputBg: 'rgba(15,23,42,0.04)',
  };
}
const FIXED = {
  accentCyan: '#3BB4C1', accentCyanSoft: 'rgba(59,180,193,0.12)',
  accentGold: '#F5C341', semanticDanger: '#EF4444',
};

export default function AddressSearch({ autoFocus }: { autoFocus?: boolean }) {
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setMapFlyTo, userLocation } = useStore();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&language=fr,en${userLocation ? `&proximity=${userLocation.lng},${userLocation.lat}` : ''}&autocomplete=true&types=poi,address,place,locality,neighborhood`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }, [query]);

  function handleSelect(s: Suggestion) {
    setQuery(s.place_name);
    setSuggestions([]);
    setOpen(false);
    setMapFlyTo({ lng: s.center[0], lat: s.center[1], zoom: 15 });
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{
          backgroundColor: C.card,
          border: `1px solid ${C.border}`,
        }}
      >
        <span className="text-sm" style={{ color: C.textSecondary }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an address…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: C.textPrimary }}
          autoFocus={autoFocus}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            className="text-xs transition hover:opacity-70"
            style={{ color: C.textSecondary }}
          >
            ✕
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-[9999]"
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              className="w-full text-left px-4 py-3 text-sm transition hover:opacity-70"
              style={{
                color: C.textPrimary,
                borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
              onMouseDown={() => handleSelect(s)}
            >
              {s.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
