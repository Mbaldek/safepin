-- Add escort columns to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS dest_name    TEXT,
  ADD COLUMN IF NOT EXISTS dest_lat     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dest_lng     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dest_address TEXT,
  ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active'
    CHECK (status IN ('active','arrived','cancelled','sos')),
  ADD COLUMN IF NOT EXISTS walk_with_me BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eta_minutes  INT,
  ADD COLUMN IF NOT EXISTS last_lat     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_lng     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Add is_watching to trusted_contacts
ALTER TABLE trusted_contacts
  ADD COLUMN IF NOT EXISTS is_watching BOOLEAN DEFAULT false;

-- Partial index for active trip lookup
CREATE INDEX IF NOT EXISTS idx_trips_user_active
  ON trips(user_id, status) WHERE status = 'active';

-- RLS: trusted contacts can read active trips (bidirectional relationship)
CREATE POLICY "Trusted contacts read active trips"
  ON trips FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM trusted_contacts tc
      WHERE tc.status = 'accepted'
        AND (
          (tc.user_id = trips.user_id AND tc.contact_id = auth.uid())
          OR (tc.contact_id = trips.user_id AND tc.user_id = auth.uid())
        )
    )
  );
