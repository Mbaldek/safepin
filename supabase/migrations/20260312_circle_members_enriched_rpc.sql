-- RPC: circle_members_enriched
-- Single round-trip to get all circle members with profile + active trip info
-- Handles bidirectional contacts (user_id or contact_id = caller)
CREATE OR REPLACE FUNCTION circle_members_enriched(p_user_id uuid)
RETURNS TABLE (
  contact_row_id   uuid,
  member_id        uuid,
  member_name      text,
  avatar_url       text,
  last_seen_at     timestamptz,
  is_watching      boolean,
  contact_relation text,
  trip_destination text,
  trip_eta_minutes int
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT
    tc.id            AS contact_row_id,
    partner.id       AS member_id,
    COALESCE(p.display_name, p.username, p.name, 'Membre') AS member_name,
    p.avatar_url,
    p.last_seen_at,
    COALESCE(tc.is_watching, false) AS is_watching,
    tc.contact_relation,
    t.dest_address   AS trip_destination,
    t.eta_minutes    AS trip_eta_minutes
  FROM public.trusted_contacts tc
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN tc.user_id = p_user_id THEN tc.contact_id
      ELSE tc.user_id
    END AS id
  ) partner
  LEFT JOIN public.profiles p ON p.id = partner.id
  LEFT JOIN public.trips t
    ON t.user_id = partner.id AND t.status = 'active'
  WHERE tc.status = 'accepted'
    AND (tc.user_id = p_user_id OR tc.contact_id = p_user_id)
    AND partner.id IS NOT NULL
    AND partner.id != p_user_id
$$;
