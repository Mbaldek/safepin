// src/app/api/stripe/portal/route.ts
// Creates a Stripe Customer Portal session for managing subscriptions.

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { userId } = (await req.json()) as { userId: string };

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/map`,
  });

  return NextResponse.json({ url: session.url });
}
