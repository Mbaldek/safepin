// supabase/functions/emergency-dispatch/index.ts
// Auto-dispatch SOS alerts to trusted contacts via push + SMS fallback.
// Actions: dispatch | resolve | escalate

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { action, user_id, pin_id, lat, lng, display_name, session_id } =
    await req.json();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // ── Dispatch: send alerts to trusted contacts ─────────────────────────────
  if (action === "dispatch" || action === "escalate") {
    // Get accepted trusted contacts
    const { data: contacts } = await admin
      .from("trusted_contacts")
      .select("user_id, contact_id")
      .or(`user_id.eq.${user_id},contact_id.eq.${user_id}`)
      .eq("status", "accepted");

    if (!contacts?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_contacts" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const contactIds = contacts.map((c) =>
      c.user_id === user_id ? c.contact_id : c.user_id
    );

    // Get push subscriptions for contacts
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("user_id, subscription")
      .in("user_id", contactIds);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const title =
      action === "escalate"
        ? `🆘 ESCALATION: ${display_name ?? "Someone"} still needs help!`
        : `🆘 ${display_name ?? "Someone"} triggered an emergency!`;
    const body =
      action === "escalate"
        ? "No safety confirmation after 15 minutes — please check on them."
        : "Open to see their live location and help.";

    const trackUrl = `${supabaseUrl.replace(".supabase.co", ".vercel.app")}/track/${session_id}`;

    let pushSent = 0;

    for (const sub of subs ?? []) {
      try {
        const { default: webpush } = await import("npm:web-push@3.6.7");
        webpush.setVapidDetails(
          "mailto:kovaapp@pm.me",
          vapidPublicKey,
          vapidPrivateKey
        );
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title,
            body,
            url: trackUrl,
          })
        );
        pushSent++;
      } catch {
        // Subscription expired — clean up
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", sub.user_id);
      }
    }

    // SMS fallback via Twilio for contacts without push
    const pushUserIds = new Set((subs ?? []).map((s) => s.user_id));
    const noPushContacts = contactIds.filter((id) => !pushUserIds.has(id));
    let smsSent = false;

    const twilioSid = Deno.env.get("TWILIO_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    if (twilioSid && twilioToken && twilioFrom && noPushContacts.length > 0) {
      // Get phone numbers from profiles (if stored)
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, phone")
        .in("id", noPushContacts);

      for (const profile of profiles ?? []) {
        if (!profile.phone) continue;
        try {
          const smsBody = `🆘 KOVA Emergency: ${display_name ?? "A trusted contact"} needs help! Track: ${trackUrl}`;
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: twilioFrom,
                To: profile.phone,
                Body: smsBody,
              }),
            }
          );
          smsSent = true;
        } catch {
          // SMS failed — non-critical
        }
      }
    }

    // Create emergency_sessions row for public tracking
    if (session_id && action === "dispatch") {
      await admin.from("emergency_sessions").insert({
        id: session_id,
        user_id,
        pin_id,
        display_name,
        location_trail: lat && lng ? [{ lat, lng, ts: new Date().toISOString() }] : [],
      });
    }

    // Insert dispatch record
    await admin.from("emergency_dispatches").insert({
      user_id,
      pin_id,
      contacts_notified: contactIds,
      sms_sent: smsSent,
    });

    // Insert notifications for contacts
    for (const contactId of contactIds) {
      await admin.from("notifications").insert({
        user_id: contactId,
        type: "emergency",
        title,
        body,
        pin_id,
        read: false,
      });
    }

    return new Response(
      JSON.stringify({ sent: pushSent, sms: smsSent, contacts: contactIds.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Resolve: notify contacts that user is safe ────────────────────────────
  if (action === "resolve") {
    // Mark dispatch as resolved
    await admin
      .from("emergency_dispatches")
      .update({ resolved_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .eq("pin_id", pin_id)
      .is("resolved_at", null);

    // Mark session as resolved
    if (session_id) {
      await admin
        .from("emergency_sessions")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", session_id);
    }

    // Notify contacts
    const { data: dispatches } = await admin
      .from("emergency_dispatches")
      .select("contacts_notified")
      .eq("user_id", user_id)
      .eq("pin_id", pin_id)
      .limit(1);

    const contactIds = dispatches?.[0]?.contacts_notified ?? [];
    for (const contactId of contactIds) {
      await admin.from("notifications").insert({
        user_id: contactId,
        type: "emergency",
        title: `✅ ${display_name ?? "Your contact"} is safe`,
        body: "The emergency alert has been resolved.",
        pin_id,
        read: false,
      });
    }

    return new Response(JSON.stringify({ resolved: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
});
