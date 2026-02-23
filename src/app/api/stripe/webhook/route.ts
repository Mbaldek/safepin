// src/app/api/stripe/webhook/route.ts
// Handles Stripe webhook events for subscription lifecycle.

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-admin';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID ? 'pro_annual' : 'pro';

      await db.from('subscriptions').upsert({
        user_id: userId,
        plan,
        status: subscription.status === 'active' ? 'active' : 'trialing',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, { onConflict: 'user_id' });

      // Create initial invoice record
      if (session.invoice) {
        const inv = await stripe.invoices.retrieve(session.invoice as string);
        await db.from('invoices').insert({
          user_id: userId,
          stripe_invoice_id: inv.id,
          amount_cents: inv.amount_paid,
          currency: inv.currency,
          status: 'paid',
          description: `${plan === 'pro_annual' ? 'Annual' : 'Monthly'} Pro subscription`,
          invoice_pdf_url: inv.invoice_pdf,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { data: sub } = await db.from('subscriptions').select('user_id, plan').eq('stripe_customer_id', customerId).single();
      if (!sub) break;

      await db.from('invoices').insert({
        user_id: sub.user_id,
        stripe_invoice_id: invoice.id,
        amount_cents: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        description: `${sub.plan === 'pro_annual' ? 'Annual' : 'Monthly'} Pro subscription`,
        invoice_pdf_url: invoice.invoice_pdf,
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      });

      await db.from('subscriptions').update({ status: 'active' }).eq('stripe_customer_id', customerId);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await db.from('subscriptions').update({ status: 'past_due' }).eq('stripe_customer_id', invoice.customer as string);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID ? 'pro_annual' : 'pro';

      await db.from('subscriptions').update({
        plan,
        status: subscription.status === 'active' ? 'active' : subscription.status as string,
        current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      }).eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.from('subscriptions').update({
        status: 'canceled',
        cancel_at_period_end: false,
      }).eq('stripe_customer_id', subscription.customer as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
