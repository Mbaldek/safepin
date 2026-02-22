-- KOVA — Emergency dispatch + public tracking sessions

CREATE TABLE IF NOT EXISTS emergency_dispatches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_id            uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  contacts_notified uuid[] NOT NULL DEFAULT '{}',
  sms_sent          boolean NOT NULL DEFAULT false,
  resolved_at       timestamptz DEFAULT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emergency_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own dispatches" ON emergency_dispatches FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own dispatches" ON emergency_dispatches FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own dispatches" ON emergency_dispatches FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Public tracking sessions (readable by anyone with the link)
CREATE TABLE IF NOT EXISTS emergency_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_id          uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  display_name    text,
  location_trail  jsonb NOT NULL DEFAULT '[]',
  resolved_at     timestamptz DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emergency_sessions ENABLE ROW LEVEL SECURITY;
-- Anyone can read (public tracking link)
CREATE POLICY "Public read sessions" ON emergency_sessions FOR SELECT USING (true);
CREATE POLICY "Users manage own sessions" ON emergency_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid());
