-- Performance indexes for community feed loading
-- community_messages has no custom indexes — every query does a seq scan

-- Composite index for feed queries: WHERE community_id IN (...) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_community_messages_community_created
  ON community_messages(community_id, created_at DESC);

-- Index for user-based lookups (realtime, moderation, profile enrichment)
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id
  ON community_messages(user_id);

-- Index on post_comments for efficient comment counting
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id
  ON post_comments(post_id);
