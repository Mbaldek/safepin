-- Add streak + stats columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_streak     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date   DATE,
  ADD COLUMN IF NOT EXISTS pin_count          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escort_count       INTEGER NOT NULL DEFAULT 0;

-- Create engagement_events table if not exists
CREATE TABLE IF NOT EXISTS engagement_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id
  ON engagement_events(user_id, created_at DESC);

-- RLS
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON engagement_events FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read own events"
  ON engagement_events FOR SELECT
  USING ((select auth.uid()) = user_id);
