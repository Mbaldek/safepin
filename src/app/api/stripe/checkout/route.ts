// src/app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout session for Pro subscription.

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-admin';

const PRICE_MAP: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[Stripe Checkout] STRIPE_SECRET_KEY manquant — vérifier .env');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (!process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
    console.error('[Stripe Checkout] STRIPE_PRO_MONTHLY_PRICE_ID manquant — vérifier .env');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { userId, email, plan } = (await req.json()) as {
    userId: string;
    email: string;
    plan: 'pro' | 'pro_annual';
  };

  const priceId = PRICE_MAP[plan];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Retrieve or create Stripe customer
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    success_url: `${origin}/map?billing=success`,
    cancel_url: `${origin}/map?billing=canceled`,
    metadata: { supabase_user_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
