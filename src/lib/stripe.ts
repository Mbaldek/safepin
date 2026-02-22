// src/lib/stripe.ts — Stripe singleton (server) + loadStripe (client)

import Stripe from 'stripe';

// Lazy-initialised so the build doesn't crash when STRIPE_SECRET_KEY is absent
let _stripe: Stripe | null = null;
export function getStripeServer(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return _stripe;
}

/** @deprecated Use getStripeServer() — kept for backward compat */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeServer() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Client-side lazy loader (call only in browser context)
export async function getStripe() {
  const { loadStripe } = await import('@stripe/stripe-js');
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
}
