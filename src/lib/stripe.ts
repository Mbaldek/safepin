// src/lib/stripe.ts — Stripe singleton (server) + loadStripe (client)

import Stripe from 'stripe';

// Server-side Stripe instance — only import this in API routes / server components
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// Client-side lazy loader (call only in browser context)
export async function getStripe() {
  const { loadStripe } = await import('@stripe/stripe-js');
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
}
