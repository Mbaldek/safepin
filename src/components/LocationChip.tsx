// src/components/LocationChip.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { geocodeReverse } from '@/lib/geocode';
import { haversineMeters } from '@/lib/utils';

export default function LocationChip() {
  const { userLocation, pins } = useStore();
  const [locationName, setLocationName] = useState<string | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  // Reverse geocode when user location changes significantly (>200m)
  useEffect(() => {
    if (!userLocation) return;

    const moved = lastGeocodedRef.current
      ? haversineMeters(lastGeocodedRef.current, userLocation) > 200
      : true;

    if (!moved) return;

    lastGeocodedRef.current = userLocation;
    geocodeReverse(userLocation.lng, userLocation.lat).then((name) => {
      if (name) {
        // Extract the short neighborhood/locality name (first part before comma)
        const short = name.split(',').slice(0, 2).join(',').trim();
        setLocationName(short);
      }
    });
  }, [userLocation]);

  if (!userLocation || !locationName) return null;

  // Count nearby incidents (within 1km, last 24h, not resolved)
  const nearbyCount = pins.filter((p) => {
    if (p.resolved_at) return false;
    const ageH = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
    if (ageH > 24) return false;
    const dist = haversineMeters(userLocation, { lat: p.lat, lng: p.lng });
    return dist < 1000;
  }).length;

  return (
    <div
      className="absolute top-[64px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-3xl"
      style={{
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: '#3BB4C1' }}
      />
      <span
        className="text-xs font-bold truncate max-w-[180px]"
        style={{ color: '#FFFFFF' }}
      >
        {locationName}
      </span>
      {nearbyCount > 0 && (
        <>
          <span className="text-xs" style={{ color: '#94A3B8' }}>·</span>
          <span
            className="text-xs font-bold whitespace-nowrap"
            style={{ color: '#94A3B8' }}
          >
            {nearbyCount} incident{nearbyCount > 1 ? 's' : ''}
          </span>
        </>
      )}
    </div>
  );
}
