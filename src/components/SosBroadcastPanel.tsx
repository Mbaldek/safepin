// src/components/SosBroadcastPanel.tsx — S50: SOS Community Broadcast

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Radio, Navigation, Users, Shield, Loader2 } from 'lucide-react';
import type { SosResponder } from '@/types';

type Props = {
  pinId: string;
  pinLat: number;
  pinLng: number;
  onClose: () => void;
};

import { haversineKm } from '@/lib/utils';

export default function SosBroadcastPanel({ pinId, pinLat, pinLng, onClose }: Props) {
  const { userId, userLocation } = useStore();
  const [responders, setResponders] = useState<SosResponder[]>([]);
  const [hasResponded, setHasResponded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadResponders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sos_responders')
      .select('*')
      .eq('pin_id', pinId)
      .order('created_at', { ascending: false });
    const items = (data ?? []) as SosResponder[];
    setResponders(items);
    setHasResponded(items.some((r) => r.responder_id === userId));
    setLoading(false);
  }, [pinId, userId]);

  useEffect(() => { loadResponders(); }, [loadResponders]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`sos-responders-${pinId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_responders', filter: `pin_id=eq.${pinId}` },
        () => loadResponders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pinId, loadResponders]);

  async function respondToSos(status: 'on_way' | 'arrived') {
    if (!userId) return;
    const { error } = await supabase.from('sos_responders').upsert(
      {
        pin_id: pinId,
        responder_id: userId,
        status,
        lat: userLocation?.lat ?? null,
        lng: userLocation?.lng ?? null,
      },
      { onConflict: 'pin_id,responder_id' }
    );
    if (error) { toast.error('Failed to respond'); return; }
    setHasResponded(true);
    toast.success(status === 'on_way' ? 'On your way — stay safe!' : 'Thanks for arriving!');
    loadResponders();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl p-4 shadow-xl"
      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(239,68,68,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Radio size={16} style={{ color: '#ef4444' }} className="animate-pulse" />
        <span className="text-sm font-black" style={{ color: '#ef4444' }}>SOS Broadcast</span>
        <span className="ml-auto text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          {responders.length} responder{responders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <>
          {/* Responder list */}
          {responders.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {responders.map((r) => {
                const dist = r.lat && r.lng ? haversineKm({ lat: pinLat, lng: pinLng }, { lat: r.lat, lng: r.lng }) : null;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-black"
                      style={{
                        backgroundColor: r.status === 'arrived' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                        color: r.status === 'arrived' ? '#10b981' : '#3b82f6',
                      }}
                    >
                      {r.status === 'arrived' ? <Shield size={12} /> : <Navigation size={12} />}
                    </div>
                    <span className="text-xs font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
                      {r.responder_id === userId ? 'You' : 'Responder'}
                    </span>
                    <span className="text-[0.6rem] font-bold" style={{ color: r.status === 'arrived' ? '#10b981' : '#3b82f6' }}>
                      {r.status === 'arrived' ? 'Arrived' : 'On the way'}
                    </span>
                    {dist !== null && (
                      <span className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>
                        {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          {!hasResponded ? (
            <div className="flex gap-2">
              <button
                onClick={() => respondToSos('on_way')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <Navigation size={13} /> On my way
              </button>
              <button
                onClick={() => respondToSos('arrived')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition"
                style={{ backgroundColor: '#10b981' }}
              >
                <Shield size={13} /> I'm here
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <Users size={14} style={{ color: '#10b981' }} />
              <span className="text-xs font-bold" style={{ color: '#10b981' }}>You're responding — thank you!</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
