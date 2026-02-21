// src/app/api/verify/webhook/route.ts
// Receives Onfido webhooks (check.completed) and updates profile verification status.
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY
//   ONFIDO_WEBHOOK_TOKEN — from Onfido dashboard → Webhooks → token
//
// Register in Onfido dashboard → Webhooks:
//   URL: https://your-app.vercel.app/api/verify/webhook
//   Events: check.completed

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(rawBody: string, signature: string | null, token: string): boolean {
  if (!token) return true; // skip verification if token not configured
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', token).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-sha2-signature');
  const webhookToken = process.env.ONFIDO_WEBHOOK_TOKEN ?? '';

  if (webhookToken && !verifySignature(rawBody, sig, webhookToken)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body.payload as Record<string, unknown> | undefined;
  const resourceType = payload?.resource_type as string | undefined;
  const action = payload?.action as string | undefined;
  const obj = payload?.object as Record<string, unknown> | undefined;

  if (resourceType !== 'check' || action !== 'check.completed') {
    return NextResponse.json({ ok: true });
  }

  const applicantId = obj?.applicant_id as string | undefined;
  const result = obj?.result as string | undefined; // "clear" | "consider"

  if (!applicantId) {
    return NextResponse.json({ ok: true });
  }

  // Find user by the applicant_id stored during /api/verify/start
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('verification_id', applicantId)
    .single();

  if (!profile) {
    console.warn('[verify/webhook] No profile found for applicant_id:', applicantId);
    return NextResponse.json({ ok: true });
  }

  // "clear" = all reports passed → approved
  // "consider" = one or more reports flagged → declined
  const newStatus = result === 'clear' ? 'approved' : 'declined';

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      verification_status: newStatus,
      verified: newStatus === 'approved',
    })
    .eq('id', profile.id);

  if (error) {
    console.error('[verify/webhook] DB error:', error);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
