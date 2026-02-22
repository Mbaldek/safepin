-- KOVA — Persistent notifications + profile location columns
-- Run this migration in your Supabase SQL editor.

-- ── notifications table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL,
  title         text NOT NULL,
  body          text,
  read          boolean NOT NULL DEFAULT false,
  pin_id        uuid REFERENCES pins(id) ON DELETE SET NULL,
  community_id  uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Profile location columns (for geo-filtered push) ────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_known_lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_known_lng double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
