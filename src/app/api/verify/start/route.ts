// src/app/api/verify/start/route.ts
// Creates a Veriff session server-side and returns the session URL.
// Veriff server-to-server calls require HMAC-SHA256 signature on the request body.
// Required env vars:
//   VERIFF_API_KEY       — from Veriff dashboard → API Keys
//   VERIFF_SECRET_KEY    — Master Signature Key (same one used for webhook verification)
//   SUPABASE_SERVICE_ROLE_KEY

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const apiKey   = process.env.VERIFF_API_KEY;
  const secretKey = process.env.VERIFF_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: 'Veriff not configured. Set VERIFF_API_KEY and VERIFF_SECRET_KEY.' },
      { status: 503 }
    );
  }

  try {
    const payload = JSON.stringify({
      verification: {
        vendorData: userId,              // echoed back in webhook so we can identify the user
        timestamp: new Date().toISOString(),
        person: { firstName: 'User', lastName: 'User' },
      },
    });

    // Veriff requires HMAC-SHA256 signature of the raw JSON body
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const res = await fetch('https://stationapi.veriff.com/v1/sessions', {
      method: 'POST',
      headers: {
        'X-AUTH-CLIENT': apiKey,
        'X-HMAC-SIGNATURE': signature,
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('[verify/start] Veriff error:', res.status, t);
      return NextResponse.json({ error: `Veriff session creation failed (${res.status})` }, { status: 502 });
    }

    const json = await res.json();
    const sessionUrl: string = json.verification?.url;
    const sessionId: string  = json.verification?.id;

    if (!sessionUrl) {
      return NextResponse.json({ error: 'No session URL returned by Veriff' }, { status: 502 });
    }

    // Store session ID in profile for reference
    await supabaseAdmin
      .from('profiles')
      .update({ verification_id: sessionId, verification_status: 'started' })
      .eq('id', userId);

    return NextResponse.json({ sessionUrl, sessionId });
  } catch (e) {
    console.error('[verify/start]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
