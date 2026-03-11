-- RPC: community_feed
-- Replaces 3 sequential queries (messages + profiles + comment counts) with 1 JOIN
-- Returns feed posts with author profiles and comment counts in a single round-trip

CREATE OR REPLACE FUNCTION public.community_feed(
  p_community_ids uuid[],
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  content text,
  created_at timestamptz,
  user_id uuid,
  display_name text,
  community_id uuid,
  visibility text,
  media_url text,
  author_display_name text,
  author_first_name text,
  author_username text,
  author_avatar_emoji text,
  author_avatar_url text,
  comment_count bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    m.id,
    m.content,
    m.created_at,
    m.user_id,
    m.display_name,
    m.community_id,
    m.visibility,
    m.media_url,
    p.display_name   AS author_display_name,
    p.first_name     AS author_first_name,
    p.username        AS author_username,
    p.avatar_emoji    AS author_avatar_emoji,
    p.avatar_url      AS author_avatar_url,
    COALESCE(cc.cnt, 0) AS comment_count
  FROM public.community_messages m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS cnt
    FROM public.post_comments
    GROUP BY post_id
  ) cc ON cc.post_id = m.id
  WHERE m.community_id = ANY(p_community_ids)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.community_feed(uuid[], int) TO authenticated;


-- RPC: community_last_messages
-- Returns the most recent message per community using DISTINCT ON
-- Replaces fetching ALL messages and deduplicating client-side

CREATE OR REPLACE FUNCTION public.community_last_messages(p_community_ids uuid[])
RETURNS TABLE (
  community_id uuid,
  content text,
  created_at timestamptz,
  display_name text
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT DISTINCT ON (m.community_id)
    m.community_id,
    m.content,
    m.created_at,
    m.display_name
  FROM public.community_messages m
  WHERE m.community_id = ANY(p_community_ids)
  ORDER BY m.community_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.community_last_messages(uuid[]) TO authenticated;
