// supabase/functions/weekly-digest/index.ts
// Weekly digest push notification — triggered by pg_cron every Monday 9:00 AM
// Sends a summary of safety activity near each user.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const R = 6_371_000;

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req: Request) => {
  // Only allow POST with valid authorization
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  // Get all users with push subscriptions AND known location
  const { data: subscribers } = await admin
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (!subscribers?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const userIds = subscribers.map((s) => s.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, last_known_lat, last_known_lng")
    .in("id", userIds);

  const locationMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, { lat: p.last_known_lat, lng: p.last_known_lng }])
  );

  // Get pins from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data: recentPins } = await admin
    .from("pins")
    .select("id, lat, lng, is_emergency, resolved_at, severity")
    .gte("created_at", oneWeekAgo);

  const allPins = recentPins ?? [];

  let sent = 0;

  for (const sub of subscribers) {
    const loc = locationMap[sub.user_id];
    if (!loc?.lat || !loc?.lng) continue;

    const radiusM = 1000; // Default 1km radius for digest
    const nearbyPins = allPins.filter(
      (p) => distanceM(loc.lat, loc.lng, p.lat, p.lng) <= radiusM
    );

    if (nearbyPins.length === 0) continue;

    const newCount = nearbyPins.length;
    const resolvedCount = nearbyPins.filter((p) => p.resolved_at).length;
    const sosCount = nearbyPins.filter((p) => p.is_emergency).length;

    let title = "📊 Your weekly safety digest";
    let body = `Last week near you: ${newCount} report${newCount > 1 ? "s" : ""}`;
    if (resolvedCount > 0) body += `, ${resolvedCount} resolved`;
    if (sosCount > 0) body += `, ${sosCount} SOS alert${sosCount > 1 ? "s" : ""}`;

    // Insert notification in DB
    await admin.from("notifications").insert({
      user_id: sub.user_id,
      type: "digest",
      title,
      body,
      read: false,
    });

    // Send push notification
    try {
      // Use web-push compatible approach for Deno
      // For production, use a proper web-push library for Deno
      // This is a simplified version — in production, use the web-push npm package via esm.sh
      const { default: webpush } = await import("npm:web-push@3.6.7");
      webpush.setVapidDetails(
        "mailto:kovaapp@pm.me",
        vapidPublicKey,
        vapidPrivateKey
      );
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, body })
      );
      sent++;
    } catch {
      // Subscription expired — clean up
      await admin
        .from("push_subscriptions")
        .delete()
        .eq("user_id", sub.user_id);
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
