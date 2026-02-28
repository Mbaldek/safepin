// Step 1 — Map preview with animated fake pins

'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/stores/useTheme';
import mapboxgl from 'mapbox-gl';

const FAKE_PINS = [
  { lngLat: [2.3522, 48.8576] as [number, number], color: '#D4A853', emoji: '😰', delay: 600 },
  { lngLat: [2.3482, 48.8546] as [number, number], color: '#f59e0b', emoji: '🌑', delay: 1200 },
  { lngLat: [2.3562, 48.8556] as [number, number], color: '#10b981', emoji: '⚡', delay: 1800 },
];

export default function StepMapPreview({ onNext }: { onNext: () => void }) {
  const t = useTranslations('onboarding');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [2.3522, 48.8566],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      FAKE_PINS.forEach(({ lngLat, color, emoji, delay }) => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'onboarding-pin-drop';
          el.style.cssText = `width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
          el.textContent = emoji;
          new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
        }, delay);
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [theme]);

  return (
    <div className="flex flex-col items-center text-center pt-2 pb-4">
      <div ref={containerRef} className="w-full h-[220px] rounded-2xl overflow-hidden mb-5" />
      <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('mapTitle')}
      </h2>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {t('mapBody')}
      </p>
      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98]"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        {t('gotIt')} →
      </button>
    </div>
  );
}
