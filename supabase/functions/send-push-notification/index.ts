// supabase/functions/send-push-notification/index.ts
//
// Triggered via a Supabase Database Webhook on INSERT to the `notifications` table.
// Sends a Web Push notification to the target user if they have a push subscription.
//
// Deploy: supabase functions deploy send-push-notification
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:hello@breveil.com
// Webhook: Dashboard > Database > Webhooks > New webhook
//   Table: notifications  Event: INSERT  HTTP method: POST
//   URL: https://<ref>.supabase.co/functions/v1/send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Web Push helpers (VAPID / JWT) ───────────────────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importVapidPrivateKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(base64Key);
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 86400, sub: subject })),
  );
  const input = new TextEncoder().encode(`${header}.${payload}`);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, input));
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payloadStr: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const privKey = await importVapidPrivateKey(vapidPrivateKey);
  const jwt = await createVapidJwt(audience, vapidSubject, privKey);

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body: new TextEncoder().encode(payloadStr),
  });
}

// ── Notification title/body mapping ──────────────────────────────────────────

function buildPushContent(type: string, payload: Record<string, string>): { title: string; body: string } {
  switch (type) {
    case 'circle_invitation':
      return {
        title: 'Invitation cercle',
        body: `${payload.senderName ?? 'Quelqu\u2019un'} t\u2019invite dans son cercle`,
      };
    case 'circle_accepted':
      return {
        title: 'Cercle mis \u00e0 jour',
        body: `${payload.receiverName ?? 'Quelqu\u2019un'} a rejoint ton cercle \uD83C\uDF89`,
      };
    case 'sos_alert':
      return {
        title: '\uD83C\uDD98 Alerte SOS',
        body: `${payload.senderName ?? 'Un contact'} a d\u00e9clench\u00e9 une alerte SOS`,
      };
    case 'route_danger':
      return {
        title: '\u26A0\uFE0F Danger sur ton trajet',
        body: payload.message ?? 'Un signalement a \u00e9t\u00e9 ajout\u00e9 pr\u00e8s de ton trajet',
      };
    default:
      return {
        title: 'Breveil',
        body: 'Nouvelle notification',
      };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record as {
      id: string;
      user_id: string;
      type: string;
      payload: Record<string, string>;
    } | undefined;

    if (!record?.user_id) {
      return new Response('no record', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch push subscription from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', record.user_id)
      .single();

    if (!profile?.push_subscription) {
      return new Response('ok \u2014 no push subscription', { status: 200 });
    }

    const subscription = profile.push_subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!subscription.endpoint) {
      return new Response('ok \u2014 invalid subscription', { status: 200 });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@breveil.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-push] VAPID keys not configured');
      return new Response('VAPID not configured', { status: 500 });
    }

    const { title, body: pushBody } = buildPushContent(record.type, record.payload ?? {});

    const pushPayload = JSON.stringify({
      title,
      body: pushBody,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        type: record.type,
        notificationId: record.id,
        url: '/map',
      },
    });

    const pushRes = await sendWebPush(subscription, pushPayload, vapidPublicKey, vapidPrivateKey, vapidSubject);

    if (pushRes.status === 410 || pushRes.status === 404) {
      // Subscription expired — clean up
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', record.user_id);
      console.log(`[send-push] Cleaned expired subscription for user=${record.user_id}`);
    }

    return new Response(
      JSON.stringify({ sent: pushRes.ok, status: pushRes.status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-push]', err);
    return new Response(String(err), { status: 500 });
  }
});
