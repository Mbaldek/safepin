// src/app/api/verify/webhook/route.ts
// Receives Veriff decision webhooks and updates profile verification status.
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY
//   VERIFF_SECRET_KEY  — from Veriff dashboard (used for HMAC-SHA256 signature)
//
// Register in Veriff dashboard → Integrations → Webhooks:
//   URL: https://your-app.vercel.app/api/verify/webhook
//   Events: verification.accepted, verification.declined, verification.resubmission_requested

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createAdminClient();
  const rawBody = await req.text();
  const sig = req.headers.get('x-hmac-signature');
  const secret = process.env.VERIFF_SECRET_KEY ?? '';

  if (secret && !verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const verification = body.verification as Record<string, unknown> | undefined;
  const status     = verification?.status as string | undefined;   // "approved" | "declined" | "resubmission_requested"
  const vendorData = verification?.vendorData as string | undefined; // userId we passed at session creation

  if (!vendorData || !status) {
    return NextResponse.json({ ok: true });
  }

  let newStatus: 'approved' | 'declined' | 'pending' | null = null;

  if (status === 'approved') {
    newStatus = 'approved';
  } else if (status === 'declined') {
    newStatus = 'declined';
  } else if (status === 'resubmission_requested') {
    // User needs to re-do the flow — reset to unverified so they can retry
    newStatus = 'declined';
  }

  if (newStatus) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_status: newStatus,
        verified: newStatus === 'approved',
      })
      .eq('id', vendorData);

    if (error) {
      console.error('[verify/webhook] DB error:', error);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
