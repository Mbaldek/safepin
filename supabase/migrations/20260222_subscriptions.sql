-- KOVA — Subscriptions & Invoices
-- Run this migration in your Supabase SQL editor.
-- When integrating Stripe, populate stripe_customer_id and stripe_subscription_id via webhook.

-- ── subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  plan                    text NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'pro', 'pro_annual')),
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),

  stripe_customer_id      text,
  stripe_subscription_id  text,

  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read/write all (uses service_role key from server-side functions)
-- No INSERT/UPDATE policy for users — managed by Stripe webhook or server function.

-- ── invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  stripe_invoice_id   text,
  amount_cents        integer NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'eur',
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

  description         text,
  invoice_pdf_url     text,

  period_start        timestamptz,
  period_end          timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices (user_id);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices (created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- ── pro_waitlist ────────────────────────────────────────────────────────────
-- Stores users who tapped "Join waitlist" before Pro launches.
CREATE TABLE IF NOT EXISTS pro_waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pro_waitlist_email_idx ON pro_waitlist (email);

ALTER TABLE pro_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own waitlist entry"
  ON pro_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own waitlist entry"
  ON pro_waitlist FOR SELECT
  USING (auth.uid() = user_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
