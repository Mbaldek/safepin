-- ============================================================================
-- Admin RLS policies — unblock Tower Control admin panel
-- ============================================================================

-- 1. user_reports: admin can read ALL reports + update status
CREATE POLICY "admins_read_all_reports" ON user_reports
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admins_update_reports" ON user_reports
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 1b. user_reports: users can view their own reports (was missing!)
CREATE POLICY "users_view_own_reports" ON user_reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

-- 2. pins: admin can update any pin (resolve, hide) + delete any pin
CREATE POLICY "admins_update_pins" ON pins
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_pins" ON pins
  FOR DELETE TO authenticated
  USING (is_admin());

-- 3. trips: admin can read all trips (overview counts)
CREATE POLICY "admins_read_all_trips" ON trips
  FOR SELECT TO authenticated
  USING (is_admin());
