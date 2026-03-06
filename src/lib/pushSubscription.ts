import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/**
 * Registers a Web Push subscription for the current user.
 * Call after login or at the end of onboarding.
 *
 * - Requests notification permission
 * - Subscribes via the service worker's pushManager
 * - Saves the PushSubscription JSON into profiles.push_subscription
 */
export async function registerPushSubscription(): Promise<boolean> {
  try {
    // Guard: browser support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    // Guard: VAPID key must be set
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Register service worker and wait for it to be ready
    await navigator.serviceWorker.register('/service-worker.js');
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Save subscription to profile
    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription.toJSON() })
      .eq('id', user.id);

    if (error) {
      console.error('[push] Failed to save subscription:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[push] Registration failed:', err);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
