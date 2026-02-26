-- Admin parameters — key-value config store for the admin panel
-- Used by ParametersTab, SimulationTab, and various server-side logic

-- Add description column if missing
DO $$ BEGIN
  ALTER TABLE admin_params ADD COLUMN description text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add updated_at column if missing
DO $$ BEGIN
  ALTER TABLE admin_params ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE admin_params ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid duplicates, then recreate
DROP POLICY IF EXISTS "admin_params_select" ON admin_params;
DROP POLICY IF EXISTS "admin_params_insert" ON admin_params;
DROP POLICY IF EXISTS "admin_params_update" ON admin_params;

CREATE POLICY "admin_params_select" ON admin_params
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_params_insert" ON admin_params
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_params_update" ON admin_params
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed default parameters so .update() calls find existing rows
INSERT INTO admin_params (key, value) VALUES
  ('pin_expiry_hours',      '24'),
  ('sos_expiry_hours',      '2'),
  ('auto_resolve_denies',   '3'),
  ('max_pins_per_user_day', '10'),
  ('notify_radius_default', '1000'),
  ('simulation_active',     'false')
ON CONFLICT (key) DO NOTHING;

-- Backfill descriptions for seeded rows
UPDATE admin_params SET description = 'Hours before a pin auto-expires' WHERE key = 'pin_expiry_hours' AND description IS NULL;
UPDATE admin_params SET description = 'Hours before an SOS pin auto-expires' WHERE key = 'sos_expiry_hours' AND description IS NULL;
UPDATE admin_params SET description = 'Number of deny votes to auto-resolve a pin' WHERE key = 'auto_resolve_denies' AND description IS NULL;
UPDATE admin_params SET description = 'Max pins a user can create per day' WHERE key = 'max_pins_per_user_day' AND description IS NULL;
UPDATE admin_params SET description = 'Default push notification radius in metres' WHERE key = 'notify_radius_default' AND description IS NULL;
UPDATE admin_params SET description = 'Whether the simulation engine is running' WHERE key = 'simulation_active' AND description IS NULL;
