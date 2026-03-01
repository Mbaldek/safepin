// src/app/track/[sessionId]/page.tsx — Public emergency tracking page

'use client';

import { useEffect, useState, useRef, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

type TrailPoint = { lat: number; lng: number; ts: string };
type Session = {
  id: string;
  display_name: string | null;
  location_trail: TrailPoint[];
  resolved_at: string | null;
  created_at: string;
};

export default function TrackPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session
  useEffect(() => {
    supabase
      .from('emergency_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err || !data) {
          setError('Session not found');
          return;
        }
        setSession(data as Session);
      });
  }, [sessionId]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`track-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergency_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as Session),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !session || mapRef.current) return;
    const trail = session.location_trail;
    const last = trail[trail.length - 1];
    if (!last) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [last.lng, last.lat],
      zoom: 15,
    });

    // Red pulsing marker for current position
    const el = document.createElement('div');
    el.className = 'track-marker';
    el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 12px rgba(239,68,68,0.6);';
    markerRef.current = new mapboxgl.Marker(el).setLngLat([last.lng, last.lat]).addTo(m);

    m.on('load', () => {
      // Trail line
      if (trail.length > 1) {
        m.addSource('trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: trail.map((p) => [p.lng, p.lat]),
            },
          },
        });
        m.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
            'line-opacity': 0.7,
          },
        });
      }
    });

    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, [session?.id]);

  // Update map when trail changes
  useEffect(() => {
    if (!session || !mapRef.current || !markerRef.current) return;
    const trail = session.location_trail;
    const last = trail[trail.length - 1];
    if (!last) return;

    markerRef.current.setLngLat([last.lng, last.lat]);
    mapRef.current.flyTo({ center: [last.lng, last.lat], duration: 1000 });

    // Update trail line
    const src = mapRef.current.getSource('trail') as mapboxgl.GeoJSONSource | undefined;
    if (src && trail.length > 1) {
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: trail.map((p) => [p.lng, p.lat]),
        },
      });
    }
  }, [session?.location_trail]);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center" style={{ backgroundColor: '#0a0a0a', color: '#fff' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
          <p className="text-sm font-bold">Loading tracking session…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-dvh flex items-center justify-center" style={{ backgroundColor: '#0a0a0a', color: '#fff' }}>
        <div className="text-center">
          <span className="text-4xl block mb-3">🔒</span>
          <p className="text-sm font-bold">{error || 'Session not found'}</p>
          <p className="text-xs mt-2" style={{ color: '#888' }}>This tracking link may have expired.</p>
        </div>
      </div>
    );
  }

  const lastPoint = session.location_trail[session.location_trail.length - 1];
  const lastUpdate = lastPoint ? new Date(lastPoint.ts).toLocaleTimeString() : 'Unknown';

  return (
    <div className="h-dvh flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #222' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: session.resolved_at ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
          {session.resolved_at ? '✅' : '🆘'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#fff' }}>
            {session.resolved_at
              ? `${session.display_name ?? 'User'} is safe`
              : `${session.display_name ?? 'Someone'} needs help`}
          </p>
          <p className="text-xs" style={{ color: '#888' }}>
            {session.resolved_at ? 'Emergency resolved' : `Last update: ${lastUpdate}`}
          </p>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: session.resolved_at ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: session.resolved_at ? '#10b981' : '#ef4444',
          }}>
          {session.resolved_at ? 'SAFE' : 'ACTIVE'}
        </div>
      </div>

      {/* Resolved banner */}
      {session.resolved_at && (
        <div className="px-4 py-3 text-center text-sm font-bold"
          style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
          This emergency has been resolved — everyone is safe.
        </div>
      )}

      {/* Map */}
      <div ref={mapContainer} className="flex-1" />

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 text-center" style={{ borderTop: '1px solid #222' }}>
        <p className="text-xs font-bold" style={{ color: '#888' }}>
          ✦ Breveil Emergency Tracking
        </p>
      </div>
    </div>
  );
}
