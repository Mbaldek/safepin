// supabase/functions/on-new-pin/index.ts
//
// Triggered via a Supabase Database Webhook on INSERT to the `pins` table.
// Checks if the new pin is within 300 m of any saved route.
// If so, queues push notifications for those route owners.
//
// Deploy: supabase functions deploy on-new-pin
// Webhook: Dashboard → Database → Webhooks → New webhook
//   Table: pins  Event: INSERT  HTTP method: POST
//   URL: https://<ref>.supabase.co/functions/v1/on-new-pin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PROXIMITY_M = 300;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  try {
    const body = await req.json();
    // Supabase webhook sends { type, table, record, old_record }
    const record = body.record as {
      id: string;
      lat: number;
      lng: number;
      user_id: string;
      is_emergency: boolean;
      severity: string;
    } | undefined;

    if (!record?.lat || !record?.lng) {
      return new Response('no record', { status: 400 });
    }

    // G1 — Skip simulated pins to avoid edge function cost
    if ((record as Record<string, unknown>).is_simulated) {
      return new Response('skip — simulated pin', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch all saved routes (owner_id ≠ pin reporter to avoid self-alerts)
    const { data: routes } = await supabase
      .from('saved_routes')
      .select('id, user_id, name, to_label, coords')
      .neq('user_id', record.user_id);

    if (!routes?.length) return new Response('ok — no routes', { status: 200 });

    // Collect users whose route passes within PROXIMITY_M of the new pin
    const alertUserIds = new Set<string>();
    const alertRouteNames: Record<string, string> = {};

    for (const route of routes) {
      const coords: [number, number][] = route.coords ?? [];
      const step = Math.max(1, Math.floor(coords.length / 20));

      for (let i = 0; i < coords.length; i += step) {
        const [lng, lat] = coords[i];
        if (haversineMeters(record.lat, record.lng, lat, lng) <= PROXIMITY_M) {
          alertUserIds.add(route.user_id);
          alertRouteNames[route.user_id] = route.name ?? route.to_label;
          break;
        }
      }
    }

    if (!alertUserIds.size) return new Response('ok — no proximity match', { status: 200 });

    // Fetch push subscriptions for matched users
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', [...alertUserIds]);

    if (!subs?.length) return new Response('ok — no push subs', { status: 200 });

    const severity = record.is_emergency ? '🆘 Emergency' : `⚠️ ${record.severity} severity`;
    let sent = 0;

    for (const sub of subs) {
      const routeName = alertRouteNames[sub.user_id] ?? 'your route';
      // Call the existing push-notify endpoint
      // (In production, send Web Push directly using web-push library on Deno)
      // Here we just log — hook this up to your actual push dispatch
      console.log(`[smart-alert] user=${sub.user_id} route="${routeName}" pin=${severity}`);
      sent++;
    }

    return new Response(
      JSON.stringify({ alerted: alertUserIds.size, pushSent: sent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[on-new-pin]', err);
    return new Response(String(err), { status: 500 });
  }
});
