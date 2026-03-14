'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CATEGORY_DETAILS, CATEGORY_GROUPS, DECAY_HOURS } from '@/types';
import { getPinOpacity, getPinColorWithAge, getPinAgeRatio, getPinScale, isPinDead } from '@/lib/pin-utils';

interface MapPinProps {
  map: mapboxgl.Map;
  pin: {
    id: string;
    lat: number;
    lng: number;
    category: string;
    confirmations?: number;
    created_at: string;
    last_confirmed_at?: string | null;
    expires_at?: string | null;
    is_transport?: boolean;
    transport_type?: string;
    transport_line?: string;
    severity?: string;
  };
  onClick: (pin: any) => void;
  showLabels?: boolean;
  opacity?: number;
  isNew?: boolean;
  highlighted?: boolean;
  zoom?: number;
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
  if (confirmations >= 10) return 32;
  if (confirmations >= 4) return 26;
  if (confirmations >= 2) return 20;
  return 16;
}

/* ── Glow config per category ────────────────────────────────────── */

const GLOW_CONFIG: Record<string, { glow: string; group: string }> = {
  // URGENT
  assault:    { glow: 'rgba(239,68,68,0.5)',  group: 'urgent' },
  harassment: { glow: 'rgba(239,68,68,0.5)',  group: 'urgent' },
  theft:      { glow: 'rgba(239,68,68,0.5)',  group: 'urgent' },
  following:  { glow: 'rgba(239,68,68,0.5)',  group: 'urgent' },
  // ATTENTION
  suspect:    { glow: 'rgba(249,115,22,0.4)', group: 'attention' },
  group:      { glow: 'rgba(249,115,22,0.4)', group: 'attention' },
  unsafe:     { glow: 'rgba(249,115,22,0.4)', group: 'attention' },
  // INFRA
  lighting:   { glow: 'none',                 group: 'infra' },
  blocked:    { glow: 'none',                 group: 'infra' },
  closed:     { glow: 'none',                 group: 'infra' },
  // POSITIF
  safe:       { glow: 'rgba(52,211,153,0.4)', group: 'positif' },
  help:       { glow: 'rgba(52,211,153,0.4)', group: 'positif' },
  presence:   { glow: 'rgba(52,211,153,0.4)', group: 'positif' },
};

// Standard pin — continuous opacity + color fade based on age
function createStandardPin(
  size: number,
  _originalColor: string,
  emoji: string,
  pin: { category: string; created_at: string; last_confirmed_at?: string | null; expires_at?: string | null },
): HTMLDivElement {
  const dead = isPinDead(pin);
  const ageRatio = getPinAgeRatio(pin);
  const pinOpacity = dead ? 0.18 : getPinOpacity(pin);
  const pinScale = dead ? 0.7 : getPinScale(pin);
  const fadedColor = dead ? '#94A3B8' : getPinColorWithAge(pin);
  const glowCfg = GLOW_CONFIG[pin.category] ?? { glow: 'none', group: 'infra' };

  // No rings for dead pins; show rings only in the first ~35% of life (fresh pins)
  const showRings = !dead && ageRatio < 0.35 && glowCfg.group !== 'infra';
  const showGlow = showRings && glowCfg.glow !== 'none';
  const glowShadow = showGlow ? `0 0 10px ${glowCfg.glow}` : '0 2px 6px rgba(0,0,0,0.3)';

  const container = document.createElement('div');
  const deadFilter = dead ? 'filter:grayscale(1);' : '';
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${pinOpacity};transform:scale(${pinScale});transition:opacity 1s ease,transform 1s ease;${deadFilter}`;

  if (showRings) {
    const pinWrapper = document.createElement('div');
    pinWrapper.dataset.baseSize = String(size);
    pinWrapper.style.cssText = `position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease, width 0.25s ease, height 0.25s ease;`;

    if (glowCfg.group === 'urgent') {
      for (const cls of ['pin-urgent-ring1', 'pin-urgent-ring2']) {
        const ring = document.createElement('div');
        ring.className = cls;
        ring.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};`;
        pinWrapper.appendChild(ring);
      }
    } else if (glowCfg.group === 'attention') {
      const ring = document.createElement('div');
      ring.className = 'pin-attention-ring';
      ring.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};`;
      pinWrapper.appendChild(ring);
    } else if (glowCfg.group === 'positif') {
      const ring = document.createElement('div');
      ring.className = 'pin-positif-ring';
      ring.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};`;
      pinWrapper.appendChild(ring);
    }

    const main = document.createElement('div');
    main.dataset.mainDot = '';
    main.style.cssText = `position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;box-shadow:${glowShadow};transition:font-size 0.2s ease;`;
    if (size >= 18) main.textContent = emoji;
    pinWrapper.appendChild(main);

    container.appendChild(pinWrapper);
  } else {
    // Simple circle — no rings (older pins or infra)
    const circle = document.createElement('div');
    circle.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:transform 0.2s ease;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:${size * 0.5}px;
    `;
    if (size >= 18) circle.textContent = emoji;
    container.appendChild(circle);
  }

  return container;
}

// Urgent pin - pulsing radar effect (RED), but fades with age
function createUrgentPin(
  size: number,
  emoji: string,
  pin: { category: string; created_at: string; last_confirmed_at?: string | null; expires_at?: string | null },
): HTMLDivElement {
  const dead = isPinDead(pin);
  const ageRatio = getPinAgeRatio(pin);
  const pinOpacity = dead ? 0.18 : getPinOpacity(pin);
  const fadedColor = dead ? '#94A3B8' : getPinColorWithAge(pin);

  // Dead pins or old pins (>35% of life) → standard rendering
  if (dead || ageRatio >= 0.35) {
    return createStandardPin(size, '', emoji, pin);
  }

  const pinScale = getPinScale(pin);
  const container = document.createElement('div');
  container.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${pinOpacity};transform:scale(${pinScale});transition:opacity 1s ease,transform 1s ease;`;

  const pinWrapper = document.createElement('div');
  pinWrapper.dataset.baseSize = String(size);
  pinWrapper.style.cssText = `position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease, width 0.25s ease, height 0.25s ease;`;

  // 3 pulse rings
  for (let i = 1; i <= 3; i++) {
    const pulse = document.createElement('div');
    pulse.className = `pin-pulse${i}`;
    pulse.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};`;
    pinWrapper.appendChild(pulse);
  }

  const main = document.createElement('div');
  main.dataset.mainDot = '';
  main.style.cssText = `position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:50%;background:${fadedColor};display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;transition:font-size 0.2s ease;`;
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
  pinWrapper.dataset.baseSize = String(size);
  pinWrapper.style.cssText = `position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s ease, width 0.25s ease, height 0.25s ease;`;

  // 3 pulse rings with transport color
  for (let i = 1; i <= 3; i++) {
    const pulse = document.createElement('div');
    pulse.className = `pin-pulse${i}`;
    pulse.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};`;
    pinWrapper.appendChild(pulse);
  }

  const main = document.createElement('div');
  main.dataset.mainDot = '';
  main.style.cssText = `position:relative;z-index:10;width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;transition:font-size 0.2s ease;`;
  if (size >= 18) main.textContent = emoji;
  pinWrapper.appendChild(main);

  container.appendChild(pinWrapper);
  return container;
}

export function MapPin({ map, pin, onClick, showLabels = true, opacity = 1, isNew = false, highlighted = false, zoom = 14 }: MapPinProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const onClickRef = useRef(onClick);
  const pinRef = useRef(pin);
  onClickRef.current = onClick;
  pinRef.current = pin;

  // Create marker once on mount (key={pin.id} in parent handles identity)
  useEffect(() => {
    // Guard: skip if map is in a transitional state (e.g. style reload)
    try { if (!map.getContainer()) return; } catch { return; }

    const catDetails = CATEGORY_DETAILS[pin.category];
    const config = CATEGORY_CONFIG[pin.category] ?? (catDetails ? {
      color: CATEGORY_GROUPS[catDetails.group]?.color.text ?? '#64748B',
      emoji: catDetails.emoji ?? '📍',
      label: catDetails.label ?? pin.category,
      group: catDetails.group ?? 'infra',
    } : CATEGORY_CONFIG.unsafe);
    const size = getSize(pin.confirmations || 1);
    const isUrgent = config.group === 'urgent';
    const isTransport = pin.is_transport;

    // Create appropriate pin type
    let container: HTMLDivElement;
    if (isTransport) {
      container = createTransportPin(size, config.emoji, pin.transport_type);
    } else if (isUrgent) {
      container = createUrgentPin(size, config.emoji, pin);
    } else {
      container = createStandardPin(size, config.color, config.emoji, pin);
    }

    // Pin drop animation for newly created pins
    if (isNew) {
      container.style.animation = 'pin-drop-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both';
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
    container.addEventListener('mouseleave', () => { if (pinEl) pinEl.style.transform = ''; });

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

  // Update opacity without recreating marker
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (el) {
      el.style.opacity = String(opacity);
      el.style.transition = 'opacity 300ms ease';
    }
  }, [opacity]);

  // Zoom-based DOM adaptation — hide rings & compact wrapper at low zoom
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el || highlighted) return;
    const pinEl = el.firstElementChild as HTMLElement;
    if (!pinEl) return;

    const isCompact = zoom < 14;
    const baseSize = pinEl.dataset.baseSize;

    // Toggle rings/pulse visibility
    const rings = pinEl.querySelectorAll<HTMLElement>(
      '.pin-urgent-ring1,.pin-urgent-ring2,.pin-attention-ring,.pin-positif-ring,.pin-pulse1,.pin-pulse2,.pin-pulse3'
    );
    rings.forEach(ring => { ring.style.display = isCompact ? 'none' : ''; });

    // Resize wrapper: size*3 → size (compact) or restore
    if (baseSize) {
      const s = parseInt(baseSize);
      pinEl.style.width = isCompact ? `${s}px` : `${s * 3}px`;
      pinEl.style.height = isCompact ? `${s}px` : `${s * 3}px`;
    }

    // Hide emoji in main dot at low zoom (dot too small)
    const mainDot = pinEl.querySelector('[data-main-dot]') as HTMLElement;
    if (mainDot) {
      mainDot.style.fontSize = isCompact ? '0px' : '';
    }
  }, [zoom, highlighted]);

  // Highlight effect — scale up + glow when pin is in a selected route corridor
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    const pinEl = el.firstElementChild as HTMLElement;
    if (!pinEl) return;

    if (highlighted) {
      pinEl.style.transform = 'scale(1.6)';
      pinEl.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      pinEl.style.boxShadow = '0 0 16px rgba(239,68,68,0.5), 0 0 32px rgba(239,68,68,0.25)';
      pinEl.style.zIndex = '20';
      pinEl.style.animation = 'pin-highlight-breathe 2s ease-in-out infinite';
    } else {
      pinEl.style.transform = '';
      pinEl.style.boxShadow = '';
      pinEl.style.zIndex = '';
      pinEl.style.animation = '';
    }
  }, [highlighted]);

  return null;
}

export default MapPin;
