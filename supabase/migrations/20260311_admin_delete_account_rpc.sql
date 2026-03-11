-- Admin-only RPC to delete (anonymise) any user account
-- Mirrors delete_account() but takes a target_user_id parameter
-- and verifies the caller is an admin

CREATE OR REPLACE FUNCTION public.admin_delete_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Prevent self-deletion via admin RPC
  IF target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot delete your own account via admin RPC';
  END IF;

  -- Anonymise profile
  UPDATE public.profiles
  SET
    username       = 'deleted_' || target_user_id,
    display_name   = NULL,
    first_name     = NULL,
    last_name      = NULL,
    avatar_url     = NULL,
    bio            = NULL,
    phone          = NULL,
    email          = NULL,
    city           = NULL,
    is_public      = false,
    is_admin       = false,
    is_support     = false,
    is_shadow_banned = false,
    blocked_reason = NULL,
    deleted_at     = now()
  WHERE id = target_user_id;

  -- Delete sensitive relational data
  DELETE FROM public.trusted_contacts   WHERE user_id    = target_user_id;
  DELETE FROM public.trusted_contacts   WHERE contact_id = target_user_id;
  DELETE FROM public.location_history   WHERE user_id    = target_user_id;
  DELETE FROM public.direct_messages    WHERE sender_id  = target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id    = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;
