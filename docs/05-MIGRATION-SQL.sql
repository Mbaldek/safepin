-- ══════════════════════════════════════════════════════════════════════════════
-- BREVEIL: Incident System v2 Migration
-- Run this in Supabase SQL Editor BEFORE Phase 4
-- Date: 2026-03-03
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PINS TABLE: Add transport and confirmation fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Transport fields
ALTER TABLE pins ADD COLUMN IF NOT EXISTS is_transport boolean DEFAULT false;
ALTER TABLE pins ADD COLUMN IF NOT EXISTS transport_type text;
ALTER TABLE pins ADD COLUMN IF NOT EXISTS transport_line text;

-- Confirmations counter
ALTER TABLE pins ADD COLUMN IF NOT EXISTS confirmations integer DEFAULT 1;

-- Decay type for different expiry rules
ALTER TABLE pins ADD COLUMN IF NOT EXISTS decay_type text DEFAULT 'people';

-- Address field (reverse geocoded)
ALTER TABLE pins ADD COLUMN IF NOT EXISTS address text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pins_confirmations ON pins(confirmations);
CREATE INDEX IF NOT EXISTS idx_pins_is_transport ON pins(is_transport);
CREATE INDEX IF NOT EXISTS idx_pins_decay_type ON pins(decay_type);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PIN_EVIDENCE TABLE: Add evidence_type
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pin_evidence ADD COLUMN IF NOT EXISTS evidence_type text DEFAULT 'confirmation';
-- Values: 'confirmation', 'rejection', 'report'

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PROFILES TABLE: Ensure onboarding fields exist
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_goals jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PENDING_INVITES TABLE: Create if not exists
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pending_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid REFERENCES auth.users NOT NULL,
  contact_info text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_invites_inviter ON pending_invites(inviter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own invites" ON pending_invites;
CREATE POLICY "Users can insert own invites"
  ON pending_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Users can view own invites" ON pending_invites;
CREATE POLICY "Users can view own invites"
  ON pending_invites FOR SELECT
  USING (auth.uid() = inviter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VERIFICATION QUERIES (run separately to check)
-- ─────────────────────────────────────────────────────────────────────────────

-- Check pins columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pins' 
AND column_name IN ('is_transport', 'transport_type', 'transport_line', 'confirmations', 'decay_type', 'address');

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
