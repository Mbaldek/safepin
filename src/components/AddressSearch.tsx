// src/components/AddressSearch.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';

type Suggestion = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

export default function AddressSearch({ autoFocus }: { autoFocus?: boolean }) {
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
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an address…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
          autoFocus={autoFocus}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); }}
            className="text-xs transition hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-[9999]"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              className="w-full text-left px-4 py-3 text-sm transition hover:opacity-70"
              style={{
                color: 'var(--text-primary)',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
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
