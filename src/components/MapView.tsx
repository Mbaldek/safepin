// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { SEVERITY, Pin } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { pins, activeFilter, setSelectedPin, setActiveSheet, mapFlyTo, setMapFlyTo, setUserLocation } = useStore();
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 48.8566],
      zoom: 13,
    });

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14 });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      })
    );

    map.current.on('click', (e) => {
      const store = useStore.getState();
      if (store.activeSheet === 'report') {
        store.setNewPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.current.on('load', () => setMapReady(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fly to address search result
  useEffect(() => {
    if (!mapFlyTo || !map.current) return;
    map.current.flyTo({ center: [mapFlyTo.lng, mapFlyTo.lat], zoom: mapFlyTo.zoom });
    setMapFlyTo(null);
  }, [mapFlyTo, setMapFlyTo]);

  // Switch map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const style = theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
    map.current.setStyle(style);
  }, [theme]);

  // Render pin markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    function getPinOpacity(createdAt: string): number {
      const ageH = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
      if (ageH >= 24) return 0;
      if (ageH >= 18) return 0.25;
      if (ageH >= 12) return 0.5;
      if (ageH >= 6) return 0.75;
      return 1;
    }

    const filtered = pins.filter((pin) => {
      // Never show resolved emergencies
      if (pin.is_emergency && pin.resolved_at) return false;
      // Emergency pins expire after 2h
      if (pin.is_emergency) {
        const ageH = (Date.now() - new Date(pin.created_at).getTime()) / 3_600_000;
        return ageH < 2;
      }
      // Regular pins: fade then expire at 24h
      if (getPinOpacity(pin.created_at) === 0) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'verified') return false;
      return pin.severity === activeFilter;
    });

    // Build trail groups: userId → pins sorted newest-first
    // Index 0 = latest (full size + pulse), 1 = faded, 2 = more faded, 3+ = hidden
    const trailGroups = new Map<string, Pin[]>();
    filtered.forEach((pin) => {
      if (!pin.is_emergency) return;
      const arr = trailGroups.get(pin.user_id) ?? [];
      arr.push(pin);
      trailGroups.set(pin.user_id, arr);
    });
    trailGroups.forEach((arr, key) => {
      trailGroups.set(key, [...arr].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    });

    // Trail config: [opacity, dotPx, wrapperPx, showRing]
    const TRAIL_LEVELS: [number, number, number, boolean][] = [
      [1.0, 38, 44, true],   // latest — full, pulsing
      [0.55, 28, 34, false], // previous — medium
      [0.28, 20, 26, false], // older — small
      // index 3+ → skipped (hidden)
    ];

    function trailLevel(pin: Pin): [number, number, number, boolean] | null {
      if (!pin.is_emergency) return null;
      const group = trailGroups.get(pin.user_id) ?? [];
      const idx = group.findIndex((p) => p.id === pin.id);
      return TRAIL_LEVELS[idx] ?? null; // null = hidden
    }

    filtered.forEach((pin) => {
      const isEmergency = !!pin.is_emergency;

      // Determine trail rendering for emergency pins
      let trailOpacity = 1;
      let dotPx = 0;
      let wrapperPx = 0;
      let showRing = false;

      if (isEmergency) {
        const level = trailLevel(pin);
        if (!level) return; // too old in trail — skip
        [trailOpacity, dotPx, wrapperPx, showRing] = level;
      }

      const color = isEmergency
        ? '#ef4444'
        : (SEVERITY[pin.severity as keyof typeof SEVERITY]?.color || '#6b7490');

      const wrapperSize = isEmergency ? `${wrapperPx}px` : '28px';

      const wrapper = document.createElement('div');
      wrapper.style.width = wrapperSize;
      wrapper.style.height = wrapperSize;
      wrapper.style.cursor = 'pointer';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      if (isEmergency) wrapper.style.opacity = String(trailOpacity);

      if (isEmergency && showRing) {
        const ring = document.createElement('div');
        ring.className = 'emergency-ring';
        wrapper.appendChild(ring);
      }

      const dot = document.createElement('div');
      const dotSize = isEmergency ? `${dotPx}px` : '100%';
      dot.style.width = dotSize;
      dot.style.height = dotSize;
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = color;
      dot.style.border = theme === 'dark' ? '3px solid rgba(255,255,255,0.9)' : '3px solid rgba(0,0,0,0.15)';
      dot.style.boxShadow = `0 2px 8px ${color}88`;
      dot.style.transition = 'box-shadow 0.15s';
      dot.style.zIndex = '1';
      dot.style.position = 'relative';

      if (isEmergency) {
        dot.style.fontSize = `${Math.round(dotPx * 0.47)}px`;
        dot.style.display = 'flex';
        dot.style.alignItems = 'center';
        dot.style.justifyContent = 'center';
        dot.textContent = '🆘';
      } else {
        dot.style.opacity = String(getPinOpacity(pin.created_at));
      }

      wrapper.onmouseenter = () => { dot.style.boxShadow = `0 2px 16px ${color}bb`; };
      wrapper.onmouseleave = () => { dot.style.boxShadow = `0 2px 8px ${color}88`; };

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedPin(pin);
        setActiveSheet('detail');
      });

      wrapper.appendChild(dot);

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: 'center' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [pins, activeFilter, mapReady, setSelectedPin, setActiveSheet, theme]);

  return <div ref={mapContainer} className="w-full h-full" />;
}