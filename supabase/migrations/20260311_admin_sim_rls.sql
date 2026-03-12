-- Admin SELECT policies for trip_log and trusted_contacts
-- Fixes: admin simulation panel showing 0 for trips and contacts stats

CREATE POLICY "admins_read_all_trip_log"
  ON trip_log FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admins_read_all_trusted_contacts"
  ON trusted_contacts FOR SELECT TO authenticated
  USING (is_admin());
