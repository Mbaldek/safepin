-- Fix: allow non-verified users to confirm incidents
-- Previously only 'report' was allowed without is_user_verified();
-- now 'confirmation' is also permitted for all authenticated users.

DROP POLICY IF EXISTS pin_evidence_insert ON pin_evidence;

CREATE POLICY pin_evidence_insert ON pin_evidence FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (activity IN ('report', 'confirmation') OR is_user_verified())
  );
