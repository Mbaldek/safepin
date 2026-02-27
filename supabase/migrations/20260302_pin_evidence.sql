-- Pin evidence — media & text attached to reports, confirmations, and rejections
-- Powers the unified evidence timeline in the pin detail view

CREATE TABLE IF NOT EXISTS pin_evidence (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id      uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  activity    text NOT NULL CHECK (activity IN ('report', 'confirmation', 'rejection')),
  content     text,
  media_urls  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pin_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pin_evidence_select" ON pin_evidence;
DROP POLICY IF EXISTS "pin_evidence_insert" ON pin_evidence;

CREATE POLICY "pin_evidence_select" ON pin_evidence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pin_evidence_insert" ON pin_evidence
  FOR INSERT TO authenticated WITH CHECK (true);
