// src/app/api/verify/submit/route.ts
// Step 2: called from the client after Onfido SDK onComplete fires.
// Creates the actual check (triggers document + face analysis).
// Required env vars: ONFIDO_API_TOKEN, SUPABASE_SERVICE_ROLE_KEY

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
  const { userId, applicantId } = await req.json();
  if (!userId || !applicantId) {
    return NextResponse.json({ error: 'Missing userId or applicantId' }, { status: 400 });
  }

  const apiToken = process.env.ONFIDO_API_TOKEN;
  if (!apiToken) return NextResponse.json({ error: 'Onfido not configured' }, { status: 503 });

  try {
    // Create check: document + facial similarity
    const checkRes = await fetch(`${onfidoBase()}/checks`, {
      method: 'POST',
      headers: {
        'Authorization': `Token token=${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_id: applicantId,
        report_names: ['document', 'facial_similarity_photo'],
      }),
    });

    if (!checkRes.ok) {
      const t = await checkRes.text();
      console.error('[verify/submit] check error:', t);
      return NextResponse.json({ error: 'Failed to create check' }, { status: 502 });
    }

    const check = await checkRes.json();

    // Mark profile as pending review
    await supabaseAdmin
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', userId);

    return NextResponse.json({ checkId: check.id });
  } catch (e) {
    console.error('[verify/submit]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
