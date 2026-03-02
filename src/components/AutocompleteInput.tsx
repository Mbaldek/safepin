// src/components/AutocompleteInput.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/stores/useStore';

export interface ACSuggestion {
  label: string;
  sublabel?: string;
  coords?: [number, number]; // [lng, lat]
  icon?: string;
}

interface AutocompleteSection {
  title: string;
  items: ACSuggestion[];
}

interface Props {
  value: string;
  onChange: (text: string, coords?: [number, number]) => void;
  placeholder?: string;
  localSections?: AutocompleteSection[];
  autoFocus?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  localSections,
  autoFocus,
}: Props) {
  const { userLocation } = useStore();
  const [open, setOpen]         = useState(false);
  const [geoResults, setGeoResults] = useState<ACSuggestion[]>([]);
  const [loading, setLoading]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Mapbox geocoding
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim() || value.length < 2) {
      setGeoResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const prox = userLocation ? `&proximity=${userLocation.lng},${userLocation.lat}` : '';
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json` +
          `?access_token=${token}&limit=7&language=fr,en${prox}&autocomplete=true&types=poi,address,place`,
        );
        const data = await res.json();
        const results: ACSuggestion[] = (data.features ?? []).map((f: {
          place_name: string;
          geometry: { coordinates: [number, number] };
        }) => ({
          label: f.place_name.split(',')[0],
          sublabel: f.place_name.split(',').slice(1).join(',').trim() || undefined,
          coords: f.geometry.coordinates as [number, number],
          icon: '📍',
        }));
        setGeoResults(results);
      } catch {
        setGeoResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const localHasItems = localSections?.some((s) => s.items.length > 0) ?? false;
  const hasDropdown = open && (localHasItems || loading || geoResults.length > 0);

  function select(item: ACSuggestion) {
    onChange(item.label, item.coords);
    setOpen(false);
    setGeoResults([]);
  }

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full text-sm rounded-xl px-4 py-2.5 outline-none"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      />

      {hasDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl overflow-hidden shadow-xl z-50 max-h-64 overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Static local sections (My Places, My Routes) */}
          {localSections?.map((section) =>
            section.items.length > 0 ? (
              <div key={section.title}>
                <p
                  className="text-[0.6rem] font-black uppercase tracking-widest px-4 pt-2.5 pb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {section.title}
                </p>
                {section.items.map((item, i) => (
                  <button
                    key={i}
                    onMouseDown={() => select(item)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition hover:opacity-70 active:opacity-50"
                  >
                    {item.icon && <span className="text-base shrink-0">{item.icon}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-[0.65rem] truncate" style={{ color: 'var(--text-muted)' }}>
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                <div className="h-px mx-3" style={{ backgroundColor: 'var(--border)' }} />
              </div>
            ) : null
          )}

          {/* Geocoding results */}
          {loading ? (
            <div className="px-4 py-3 flex items-center gap-2">
              <div
                className="w-3 h-3 border-2 rounded-full animate-spin shrink-0"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Searching…</p>
            </div>
          ) : geoResults.length > 0 ? (
            <div>
              <p
                className="text-[0.6rem] font-black uppercase tracking-widest px-4 pt-2.5 pb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Places
              </p>
              {geoResults.map((item, i) => (
                <button
                  key={i}
                  onMouseDown={() => select(item)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition hover:opacity-70 active:opacity-50"
                >
                  <span className="text-base shrink-0">📍</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-[0.65rem] truncate" style={{ color: 'var(--text-muted)' }}>
                        {item.sublabel}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
