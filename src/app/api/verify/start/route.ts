// src/app/api/verify/start/route.ts
// Step 1: creates an Onfido applicant + returns an SDK token to the client.
// Required env vars:
//   ONFIDO_API_TOKEN          — from Onfido dashboard → API Tokens
//   NEXT_PUBLIC_ONFIDO_REGION — "eu" (France/EU), "us", or "ca"
//   SUPABASE_SERVICE_ROLE_KEY — to write verification_id

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function onfidoBase() {
  const region = (process.env.NEXT_PUBLIC_ONFIDO_REGION ?? 'eu').toLowerCase();
  return region === 'us'
    ? 'https://api.onfido.com/v3.6'
    : `https://api.${region}.onfido.com/v3.6`;
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const apiToken = process.env.ONFIDO_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: 'Onfido not configured. Set ONFIDO_API_TOKEN in environment variables.' },
      { status: 503 }
    );
  }

  const base = onfidoBase();
  const headers = {
    'Authorization': `Token token=${apiToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1 — Create applicant (store userId as external reference)
    const applicantRes = await fetch(`${base}/applicants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ first_name: 'SafePin', last_name: userId }),
    });
    if (!applicantRes.ok) {
      const t = await applicantRes.text();
      console.error('[verify/start] applicant error:', t);
      return NextResponse.json({ error: 'Failed to create applicant' }, { status: 502 });
    }
    const applicant = await applicantRes.json();
    const applicantId: string = applicant.id;

    // 2 — Persist applicant_id so webhook can look up the user
    await supabaseAdmin
      .from('profiles')
      .update({ verification_id: applicantId, verification_status: 'started' })
      .eq('id', userId);

    // 3 — Generate SDK token
    const sdkRes = await fetch(`${base}/sdk_token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ applicant_id: applicantId, referrer: '*://*/*' }),
    });
    if (!sdkRes.ok) {
      const t = await sdkRes.text();
      console.error('[verify/start] sdk_token error:', t);
      return NextResponse.json({ error: 'Failed to create SDK token' }, { status: 502 });
    }
    const sdkData = await sdkRes.json();

    return NextResponse.json({ sdkToken: sdkData.token, applicantId });
  } catch (e) {
    console.error('[verify/start]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
