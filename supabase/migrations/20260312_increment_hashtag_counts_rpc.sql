-- Batch increment hashtag counts in a single query
CREATE OR REPLACE FUNCTION increment_hashtag_counts(p_tag_ids uuid[])
RETURNS void
LANGUAGE sql VOLATILE
SET search_path = ''
AS $$
  UPDATE public.hashtags
  SET uses_count = uses_count + 1
  WHERE id = ANY(p_tag_ids);
$$;
