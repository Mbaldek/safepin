-- Fix: restrict admin_params INSERT/UPDATE to admin users only
-- Previously any authenticated user could modify system parameters

DROP POLICY IF EXISTS "admin_params_insert" ON admin_params;
DROP POLICY IF EXISTS "admin_params_update" ON admin_params;

CREATE POLICY "admin_params_insert" ON admin_params
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "admin_params_update" ON admin_params
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );
