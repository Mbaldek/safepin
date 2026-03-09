-- Migration: track existing delete_account RPC (created manually in prod)
-- This RPC already exists in production — this file documents it for local dev

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Anonymise profile
  UPDATE public.profiles
  SET
    username       = 'deleted_' || id,
    display_name   = NULL,
    first_name     = NULL,
    last_name      = NULL,
    avatar_url     = NULL,
    bio            = NULL,
    phone          = NULL,
    email          = NULL,
    city           = NULL,
    is_public      = false,
    deleted_at     = now()
  WHERE id = (SELECT auth.uid());

  -- Delete sensitive relational data
  DELETE FROM public.trusted_contacts   WHERE user_id  = (SELECT auth.uid());
  DELETE FROM public.trusted_contacts   WHERE contact_id = (SELECT auth.uid());
  DELETE FROM public.location_history   WHERE user_id  = (SELECT auth.uid());
  DELETE FROM public.direct_messages    WHERE sender_id = (SELECT auth.uid());
  DELETE FROM public.push_subscriptions WHERE user_id  = (SELECT auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
