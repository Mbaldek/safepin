// src/app/api/verify/webhook/route.ts
// Receives Persona webhook events and updates profiles.verification_status
// Required env: SUPABASE_SERVICE_ROLE_KEY, PERSONA_WEBHOOK_SECRET (optional but recommended)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyPersonaSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return true; // skip if not configured
  try {
    // Persona signature format: "t=timestamp,v1=hash"
    const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=')));
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${parts.t}.${rawBody}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(parts.v1 ?? '', 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('persona-signature');
  const secret = process.env.PERSONA_WEBHOOK_SECRET ?? '';

  if (secret && !verifyPersonaSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Persona sends events under body.data.attributes (camelCase or kebab-case depending on config)
  const attributes = (body.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  const inquiryId  = (body.data as Record<string, unknown>)?.id as string | undefined;
  const referenceId = attributes?.referenceId ?? attributes?.['reference-id'] as string | undefined;
  const status = attributes?.status as string | undefined;
  const eventName = (body as Record<string, unknown>).name as string | undefined;

  if (!referenceId) {
    // Nothing to update
    return NextResponse.json({ ok: true });
  }

  // Map Persona status → our verification_status
  let newStatus: 'pending' | 'approved' | 'declined' | null = null;

  if (status === 'approved' || eventName === 'inquiry.approved') {
    newStatus = 'approved';
  } else if (status === 'declined' || eventName === 'inquiry.declined') {
    newStatus = 'declined';
  } else if (status === 'completed' || eventName === 'inquiry.completed') {
    // Completed means submitted; awaiting manual/automated review
    newStatus = 'pending';
  }

  if (newStatus) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        verification_status: newStatus,
        verified: newStatus === 'approved',
        ...(inquiryId ? { verification_id: inquiryId } : {}),
      })
      .eq('id', referenceId);

    if (error) {
      console.error('[verify/webhook] Supabase update error:', error);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
