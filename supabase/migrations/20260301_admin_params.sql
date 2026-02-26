-- Admin parameters — key-value config store for the admin panel
-- Used by ParametersTab, SimulationTab, and various server-side logic

CREATE TABLE IF NOT EXISTS admin_params (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_params_select" ON admin_params
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_params_insert" ON admin_params
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_params_update" ON admin_params
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed default parameters so .update() calls find existing rows
INSERT INTO admin_params (key, value, description) VALUES
  ('pin_expiry_hours',      '24',    'Hours before a pin auto-expires'),
  ('sos_expiry_hours',      '2',     'Hours before an SOS pin auto-expires'),
  ('auto_resolve_denies',   '3',     'Number of deny votes to auto-resolve a pin'),
  ('max_pins_per_user_day', '10',    'Max pins a user can create per day'),
  ('notify_radius_default', '1000',  'Default push notification radius in metres'),
  ('simulation_active',     'false', 'Whether the simulation engine is running')
ON CONFLICT (key) DO NOTHING;
