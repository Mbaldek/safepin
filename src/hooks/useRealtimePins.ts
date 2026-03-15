// src/hooks/useRealtimePins.ts

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useIsDark } from '@/hooks/useIsDark';
import { bToast } from '@/components/GlobalToast';
import { Pin } from '@/types';

/**
 * Subscribes to realtime INSERT / UPDATE / DELETE on `pins`,
 * INSERT on `pin_comments` and `pin_votes`.
 *
 * Handles new-pin toasts, SOS notifications, quiet hours suppression,
 * nearby push trigger, comments & votes notifications.
 *
 * @param onSosPin — callback when an emergency pin arrives (sets local SOS state)
 * @param quietHoursRef — ref to quiet-hours settings loaded by the page
 */
export function useRealtimePins(
  onSosPin: (pin: Pin) => void,
  quietHoursRef: React.RefObject<{ enabled: boolean; start: string; end: string }>,
) {
  const addPin = useStore((s) => s.addPin);
  const updatePin = useStore((s) => s.updatePin);
  const setPins = useStore((s) => s.setPins);
  const addNotification = useStore((s) => s.addNotification);
  const isDark = useIsDark();

  // Keep callbacks in refs so the channel subscription doesn't re-subscribe on every render
  const onSosPinRef = useRef(onSosPin);
  onSosPinRef.current = onSosPin;

  const handleNewPin = useCallback((pin: Pin) => {
    const exists = useStore.getState().pins.some((p) => p.id === pin.id);
    if (!exists) addPin(pin);
    if (pin.is_emergency) {
      onSosPinRef.current(pin);
      addNotification({
        id: crypto.randomUUID(),
        type: 'emergency',
        title: '🆘 Emergency alert nearby!',
        body: pin.description?.slice(0, 100) ?? 'Someone needs help in your area',
        read: false,
        created_at: new Date().toISOString(),
        pin_id: pin.id,
      });
    } else {
      // Suppress toast during quiet hours
      const qh = quietHoursRef.current;
      let inQuiet = false;
      if (qh.enabled) {
        const now = new Date().toTimeString().slice(0, 5);
        inQuiet = qh.start > qh.end ? (now >= qh.start || now < qh.end) : (now >= qh.start && now < qh.end);
      }
      if (!inQuiet) bToast.info(
        {
          title: 'Nouveau signalement à proximité',
          desc: 'Un incident vient d\'être signalé près de vous',
          cta: 'Voir sur la carte →',
        },
        isDark
      );
    }
    // Notify nearby users (server-side push) — only triggered by the pin creator
    if (pin.user_id === useStore.getState().userId) {
      fetch('/api/notify-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }).catch(() => {});
    }
  }, [addPin, addNotification, isDark, quietHoursRef]);

  // Realtime: comment on own pin → notification
  const handleNewComment = useCallback((payload: { pin_id: string; display_name: string | null; content: string }) => {
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === payload.pin_id);
    if (!pin || pin.user_id !== store.userId) return;
    addNotification({
      id: crypto.randomUUID(),
      type: 'comment',
      title: '💬 New comment on your pin',
      body: `${payload.display_name ?? 'Someone'}: ${payload.content.slice(0, 80)}`,
      read: false,
      created_at: new Date().toISOString(),
      pin_id: payload.pin_id,
    });
  }, [addNotification]);

  // Realtime: vote on own pin → notification
  const handleNewVote = useCallback((payload: { pin_id: string }) => {
    const store = useStore.getState();
    const pin = store.pins.find((p) => p.id === payload.pin_id);
    if (!pin || pin.user_id !== store.userId) return;
    addNotification({
      id: crypto.randomUUID(),
      type: 'vote',
      title: '👍 Someone confirmed your report',
      body: null,
      read: false,
      created_at: new Date().toISOString(),
      pin_id: payload.pin_id,
    });
  }, [addNotification]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' },
        (payload) => handleNewPin(payload.new as Pin))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pins' },
        (payload) => updatePin(payload.new as Pin))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pins' },
        (payload) => { const old = payload.old as { id?: string }; if (old?.id) setPins(useStore.getState().pins.filter(p => p.id !== old.id)); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_comments' },
        (payload) => handleNewComment(payload.new as { pin_id: string; display_name: string | null; content: string }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pin_votes' },
        (payload) => handleNewVote(payload.new as { pin_id: string }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [handleNewPin, updatePin, setPins, handleNewComment, handleNewVote]);
}
