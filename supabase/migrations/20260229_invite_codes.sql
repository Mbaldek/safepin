-- Invite codes for B2B2C partner organisations
-- Used by admin to generate codes, by users to redeem them at signup

-- ── invite_codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  organization_name text NOT NULL,
  description   text,
  max_uses      int NOT NULL DEFAULT 100,
  used_count    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  expires_at    timestamptz,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all codes (admin page)
CREATE POLICY "invite_codes_select" ON invite_codes
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert (admin creates codes)
CREATE POLICY "invite_codes_insert" ON invite_codes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update (toggle active, increment used_count)
CREATE POLICY "invite_codes_update" ON invite_codes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── invite_code_uses ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id  uuid NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  used_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE invite_code_uses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (admin sees who used codes)
CREATE POLICY "invite_code_uses_select" ON invite_code_uses
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert (redeem flow via API)
CREATE POLICY "invite_code_uses_insert" ON invite_code_uses
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── Add invite_code_id to profiles if not exists ──────────────
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN invite_code_id uuid REFERENCES invite_codes(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
