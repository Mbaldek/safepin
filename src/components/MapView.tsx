// src/components/MapView.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/stores/useStore';
import { SEVERITY } from '@/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { pins, activeFilter, setSelectedPin, setActiveSheet, setNewPinCoords, activeSheet } = useStore();
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [2.3522, 48.8566], // Paris default
      zoom: 13,
    });

    // Try to get user's real location
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

    // Add user location dot
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      })
    );

    // Click on map to set pin location (when report sheet is open)
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

  // Render pin markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filter pins
    const filtered = pins.filter((pin) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'verified') return false;
      return pin.severity === activeFilter;
    });

    // Add new markers
    filtered.forEach((pin) => {
      const color = SEVERITY[pin.severity as keyof typeof SEVERITY]?.color || '#6b7490';

      // Create a wrapper div with fixed size for stable positioning
      const wrapper = document.createElement('div');
      wrapper.style.width = '28px';
      wrapper.style.height = '28px';
      wrapper.style.cursor = 'pointer';

      // Inner dot that can scale without affecting marker position
      const dot = document.createElement('div');
      dot.style.width = '100%';
      dot.style.height = '100%';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = color;
      dot.style.border = '3px solid rgba(255,255,255,0.9)';
      dot.style.boxShadow = `0 2px 8px ${color}66`;
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
  }, [pins, activeFilter, mapReady, setSelectedPin, setActiveSheet]);

  return <div ref={mapContainer} className="w-full h-full" />;
}