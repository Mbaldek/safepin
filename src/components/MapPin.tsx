'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapPinProps {
  map: mapboxgl.Map;
  pin: {
    id: string;
    lat: number;
    lng: number;
    category: string;
    confirmations?: number;
    created_at: string;
    is_transport?: boolean;
    transport_type?: string;
    transport_line?: string;
    severity?: string;
  };
  onClick: (pin: any) => void;
  showLabels?: boolean;
}

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string; group: string }> = {
  assault: { color: '#EF4444', emoji: '🚨', label: 'Agression', group: 'urgent' },
  harassment: { color: '#EF4444', emoji: '🚫', label: 'Harcèlement', group: 'urgent' },
  theft: { color: '#EF4444', emoji: '👜', label: 'Vol', group: 'urgent' },
  following: { color: '#EF4444', emoji: '👤', label: 'Filature', group: 'urgent' },
  suspect: { color: '#F59E0B', emoji: '👁️', label: 'Suspect', group: 'attention' },
  group: { color: '#F59E0B', emoji: '👥', label: 'Attroupement', group: 'attention' },
  unsafe: { color: '#F59E0B', emoji: '⚠️', label: 'Zone à éviter', group: 'attention' },
  lighting: { color: '#64748B', emoji: '💡', label: 'Mal éclairé', group: 'infra' },
  blocked: { color: '#64748B', emoji: '🚧', label: 'Passage difficile', group: 'infra' },
  closed: { color: '#64748B', emoji: '🚷', label: 'Fermé', group: 'infra' },
  safe: { color: '#34D399', emoji: '💚', label: 'Lieu sûr', group: 'positif' },
  help: { color: '#34D399', emoji: '🙋', label: 'Aide reçue', group: 'positif' },
  presence: { color: '#34D399', emoji: '👮', label: 'Sécurité', group: 'positif' },
};

const TRANSPORT_COLORS: Record<string, string> = {
  metro: '#3B82F6',
  rer: '#06B6D4',
  bus: '#34D399',
  tram: '#34D399',
};

function getSize(confirmations: number): number {
  if (confirmations >= 10) return 28;
  if (confirmations >= 4) return 22;
  if (confirmations >= 2) return 18;
  return 14;
}

// Standard pin - simple circle with emoji
function createStandardPin(size: number, color: string, emoji: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:8px;`;

  const circle = document.createElement('div');
  circle.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;background:${color};
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;transition:transform 0.2s ease;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:${size * 0.5}px;
  `;
  if (size >= 18) circle.textContent = emoji;
  container.appendChild(circle);

  return container;
}

// Urgent pin - pulsing radar effect (RED)
function createUrgentPin(size: number, emoji: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:8px;`;

  const pinWrapper = document.createElement('div');
  pinWrapper.style.cssText = `position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease;`;

  // 3 pulse rings
  for (let i = 1; i <= 3; i++) {
    const pulse = document.createElement('div');
    pulse.className = `pin-pulse${i}`;
    pulse.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#EF4444;`;
    pinWrapper.appendChild(pulse);
  }

  // Main circle
  const main = document.createElement('div');
  main.style.cssText = `position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:50%;background:#EF4444;display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;`;
  if (size >= 18) main.textContent = emoji;
  pinWrapper.appendChild(main);

  container.appendChild(pinWrapper);
  return container;
}

// Transport pin - pulsing radar effect with transport color (BLUE/CYAN/GREEN)
function createTransportPin(size: number, emoji: string, transportType?: string): HTMLDivElement {
  const color = TRANSPORT_COLORS[transportType || 'metro'] || '#3B82F6';

  const container = document.createElement('div');
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:8px;`;

  const pinWrapper = document.createElement('div');
  pinWrapper.style.cssText = `position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease;`;

  // 3 pulse rings with transport color
  for (let i = 1; i <= 3; i++) {
    const pulse = document.createElement('div');
    pulse.className = `pin-pulse${i}`;
    pulse.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};`;
    pinWrapper.appendChild(pulse);
  }

  // Main circle
  const main = document.createElement('div');
  main.style.cssText = `position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;`;
  if (size >= 18) main.textContent = emoji;
  pinWrapper.appendChild(main);

  container.appendChild(pinWrapper);
  return container;
}

export function MapPin({ map, pin, onClick, showLabels = true }: MapPinProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const onClickRef = useRef(onClick);
  const pinRef = useRef(pin);
  onClickRef.current = onClick;
  pinRef.current = pin;

  // Create marker once on mount (key={pin.id} in parent handles identity)
  useEffect(() => {
    const config = CATEGORY_CONFIG[pin.category] || CATEGORY_CONFIG.unsafe;
    const size = getSize(pin.confirmations || 1);
    const isUrgent = config.group === 'urgent';
    const isTransport = pin.is_transport;

    // Create appropriate pin type
    let container: HTMLDivElement;
    if (isTransport) {
      container = createTransportPin(size, config.emoji, pin.transport_type);
    } else if (isUrgent) {
      container = createUrgentPin(size, config.emoji);
    } else {
      container = createStandardPin(size, config.color, config.emoji);
    }

    // Add label (always create, toggle visibility via separate effect)
    const label = document.createElement('div');
    label.style.cssText = `
      padding:2px 6px;border-radius:6px;background:rgba(30,41,59,0.9);
      font-size:10px;font-weight:500;color:#fff;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
    `;
    label.textContent = config.label + (isTransport && pin.transport_line ? ` ${pin.transport_line}` : '');
    container.appendChild(label);
    labelRef.current = label;

    // Hover effect
    const pinEl = container.firstElementChild as HTMLElement;
    container.addEventListener('mouseenter', () => { if (pinEl) pinEl.style.transform = 'scale(1.25)'; });
    container.addEventListener('mouseleave', () => { if (pinEl) pinEl.style.transform = 'scale(1)'; });

    // Click handler (uses ref to always get current pin/onClick)
    container.addEventListener('click', (e) => { e.stopPropagation(); onClickRef.current(pinRef.current); });

    // Create marker
    const marker = new mapboxgl.Marker({ element: container, anchor: 'center' })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);

    markerRef.current = marker;
    return () => { marker.remove(); markerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pin.id]);

  // Update position without recreating marker
  useEffect(() => {
    markerRef.current?.setLngLat([pin.lng, pin.lat]);
  }, [pin.lng, pin.lat]);

  // Toggle label visibility without recreating marker
  useEffect(() => {
    if (labelRef.current) {
      labelRef.current.style.display = showLabels ? '' : 'none';
    }
  }, [showLabels]);

  return null;
}

export default MapPin;
