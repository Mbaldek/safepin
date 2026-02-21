// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { SEVERITY } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { pins, activeFilter, setSelectedPin, setActiveSheet, setNewPinCoords, mapFlyTo, setMapFlyTo } = useStore();
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
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
        });
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
      if (getPinOpacity(pin.created_at) === 0) return false;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'verified') return false;
      return pin.severity === activeFilter;
    });

    filtered.forEach((pin) => {
      const color = SEVERITY[pin.severity as keyof typeof SEVERITY]?.color || '#6b7490';

      const wrapper = document.createElement('div');
      wrapper.style.width = '28px';
      wrapper.style.height = '28px';
      wrapper.style.cursor = 'pointer';

      const dot = document.createElement('div');
      dot.style.width = '100%';
      dot.style.height = '100%';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = color;
      dot.style.border = theme === 'dark' ? '3px solid rgba(255,255,255,0.9)' : '3px solid rgba(0,0,0,0.15)';
      dot.style.boxShadow = `0 2px 8px ${color}66`;
      dot.style.opacity = String(getPinOpacity(pin.created_at));
      dot.style.transition = 'box-shadow 0.15s';

      wrapper.onmouseenter = () => {
        dot.style.boxShadow = `0 2px 16px ${color}aa`;
      };
      wrapper.onmouseleave = () => {
        dot.style.boxShadow = `0 2px 8px ${color}66`;
      };

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