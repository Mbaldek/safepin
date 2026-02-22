-- KOVA — Content moderation: user reports, pin flagging, shadow ban

-- user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('pin', 'user', 'message', 'story')),
  target_id   uuid NOT NULL,
  reason      text NOT NULL CHECK (reason IN ('spam', 'false_report', 'offensive', 'duplicate')),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One report per user per target
CREATE UNIQUE INDEX IF NOT EXISTS user_reports_unique_idx ON user_reports (reporter_id, target_type, target_id);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reports" ON user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users can view own reports" ON user_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Flag count + auto-hide on pins
ALTER TABLE pins ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0;
ALTER TABLE pins ADD COLUMN IF NOT EXISTS hidden_at timestamptz DEFAULT NULL;

-- Shadow ban on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_shadow_banned boolean NOT NULL DEFAULT false;

-- Trigger: auto-increment flag_count, auto-hide at 3 flags
CREATE OR REPLACE FUNCTION increment_pin_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_type = 'pin' THEN
    UPDATE pins
    SET flag_count = flag_count + 1,
        hidden_at = CASE WHEN flag_count + 1 >= 3 THEN now() ELSE hidden_at END
    WHERE id = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_report_insert ON user_reports;
CREATE TRIGGER on_user_report_insert
  AFTER INSERT ON user_reports
  FOR EACH ROW EXECUTE FUNCTION increment_pin_flag_count();
