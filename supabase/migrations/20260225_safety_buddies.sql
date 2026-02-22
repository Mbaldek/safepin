-- KOVA — Safety Buddies (route-matching buddy system)

CREATE TABLE IF NOT EXISTS safety_buddies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id      uuid NOT NULL REFERENCES saved_routes(id) ON DELETE CASCADE,
  day_of_week   int[] NOT NULL DEFAULT '{}',
  time_start    time,
  time_end      time,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_buddies_route_idx ON safety_buddies (route_id);
CREATE INDEX IF NOT EXISTS safety_buddies_user_idx ON safety_buddies (user_id);

ALTER TABLE safety_buddies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own buddies"
  ON safety_buddies FOR ALL
  USING (auth.uid() = user_id);

-- Allow reading other users' buddy entries for matching
CREATE POLICY "Users can read all buddy entries"
  ON safety_buddies FOR SELECT
  USING (true);
