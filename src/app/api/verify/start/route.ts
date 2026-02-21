// src/app/api/verify/start/route.ts
// Creates a Veriff session server-side and returns the session URL.
// Required env vars:
//   VERIFF_API_KEY    — from Veriff dashboard (same key shown in their SDK snippet)
//   SUPABASE_SERVICE_ROLE_KEY

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const apiKey = process.env.VERIFF_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Veriff not configured. Set VERIFF_API_KEY in environment variables.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch('https://stationapi.veriff.com/v1/sessions', {
      method: 'POST',
      headers: {
        'X-AUTH-CLIENT': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verification: {
          // vendorData ties the session to this user — echoed back in webhook
          vendorData: userId,
          timestamp: new Date().toISOString(),
          person: {
            firstName: 'SafePin',
            lastName: 'User',
          },
          document: { type: 'DOCUMENT' },
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('[verify/start] Veriff error:', res.status, t);
      return NextResponse.json({ error: 'Veriff session creation failed' }, { status: 502 });
    }

    const json = await res.json();
    const sessionUrl: string = json.verification?.url;
    const sessionId: string  = json.verification?.id;

    if (!sessionUrl) {
      return NextResponse.json({ error: 'No session URL returned' }, { status: 502 });
    }

    // Persist session ID so we can cross-reference if needed
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
