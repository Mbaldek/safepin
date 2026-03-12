-- Unified feed RPC: single round-trip for the entire community feed.
-- Returns social graph + community posts + nearby pins + social pins,
-- all with profile JOINs and visibility filtering baked in.

CREATE OR REPLACE FUNCTION public.user_feed(
  p_user_id uuid,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_limit int DEFAULT 40,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_community_ids uuid[];
  v_following_ids uuid[];
  v_circle_ids uuid[];
  v_social_ids uuid[];
  v_result jsonb;
  v_seven_days_ago timestamptz := now() - interval '7 days';
BEGIN
  -- 1. Social graph
  SELECT COALESCE(array_agg(community_id), '{}')
    INTO v_community_ids
    FROM public.community_members
    WHERE user_id = p_user_id;

  SELECT COALESCE(array_agg(following_id), '{}')
    INTO v_following_ids
    FROM public.follows
    WHERE follower_id = p_user_id;

  SELECT COALESCE(array_agg(DISTINCT contact), '{}')
    INTO v_circle_ids
    FROM (
      SELECT contact_id AS contact FROM public.trusted_contacts
        WHERE user_id = p_user_id AND status = 'accepted'
      UNION ALL
      SELECT user_id AS contact FROM public.trusted_contacts
        WHERE contact_id = p_user_id AND status = 'accepted'
    ) sub;

  v_social_ids := v_following_ids || v_circle_ids;

  -- 2. Build unified response
  SELECT jsonb_build_object(
    'community_ids', to_jsonb(v_community_ids),
    'following_ids', to_jsonb(v_following_ids),
    'circle_ids', to_jsonb(v_circle_ids),

    -- Community posts with visibility filter + profiles + comment counts
    'posts', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          m.id, m.content, m.created_at, m.user_id, m.community_id,
          m.visibility, m.media_url,
          p.display_name AS author_display_name,
          p.first_name AS author_first_name,
          p.username AS author_username,
          p.avatar_emoji AS author_avatar_emoji,
          p.avatar_url AS author_avatar_url,
          COALESCE(cc.cnt, 0) AS comment_count
        FROM public.community_messages m
        LEFT JOIN public.profiles p ON p.id = m.user_id
        LEFT JOIN (
          SELECT post_id, count(*) AS cnt
          FROM public.post_comments
          GROUP BY post_id
        ) cc ON cc.post_id = m.id
        WHERE m.community_id = ANY(v_community_ids)
          AND (
            m.visibility IS NULL
            OR m.visibility = 'public'
            OR m.user_id = p_user_id
            OR (m.visibility = 'followers' AND m.user_id = ANY(v_following_ids))
            OR (m.visibility = 'cercle' AND m.user_id = ANY(v_circle_ids))
          )
          AND (p_cursor IS NULL OR m.created_at < p_cursor)
        ORDER BY m.created_at DESC
        LIMIT p_limit
      ) t
    ), '[]'::jsonb),

    -- Nearby pins (500m bounding box)
    'nearby_pins', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          pin.id, pin.user_id, pin.lat, pin.lng, pin.category, pin.severity,
          pin.description, pin.photo_url, pin.address, pin.confirmations, pin.created_at,
          pp.display_name, pp.first_name, pp.username,
          pp.avatar_emoji, pp.avatar_url
        FROM public.pins pin
        LEFT JOIN public.profiles pp ON pp.id = pin.user_id
        WHERE pin.created_at > v_seven_days_ago
          AND pin.resolved_at IS NULL
          AND pin.hidden_at IS NULL
          AND (
            p_lat IS NULL
            OR (
              pin.lat BETWEEN p_lat - 0.0045 AND p_lat + 0.0045
              AND pin.lng BETWEEN p_lng - 0.0055 AND p_lng + 0.0055
            )
          )
        ORDER BY pin.created_at DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),

    -- Social pins (from followed users + circle)
    'social_pins', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          pin.id, pin.user_id, pin.lat, pin.lng, pin.category, pin.severity,
          pin.description, pin.photo_url, pin.address, pin.confirmations, pin.created_at,
          pp.display_name, pp.first_name, pp.username,
          pp.avatar_emoji, pp.avatar_url
        FROM public.pins pin
        LEFT JOIN public.profiles pp ON pp.id = pin.user_id
        WHERE pin.created_at > v_seven_days_ago
          AND pin.resolved_at IS NULL
          AND pin.hidden_at IS NULL
          AND pin.user_id = ANY(v_social_ids)
        ORDER BY pin.created_at DESC
        LIMIT 15
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
