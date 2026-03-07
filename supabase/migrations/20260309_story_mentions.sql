-- Make community_id nullable on community_stories (stories are global, not group-scoped)
ALTER TABLE community_stories ALTER COLUMN community_id DROP NOT NULL;

-- Content mentions table (same pattern as content_hashtags)
CREATE TABLE content_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('story','post','incident')),
  content_id uuid NOT NULL,
  mentioner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_mentions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mentions_mentioned ON content_mentions(mentioned_user_id);
CREATE INDEX idx_mentions_content ON content_mentions(content_type, content_id);

CREATE POLICY "insert own" ON content_mentions
  FOR INSERT WITH CHECK (auth.uid() = mentioner_id);

CREATE POLICY "read own or mentioned" ON content_mentions
  FOR SELECT USING (auth.uid() = mentioner_id OR auth.uid() = mentioned_user_id);

-- Update stories SELECT policy to allow global (null community_id) stories
DROP POLICY IF EXISTS "members see stories" ON community_stories;
CREATE POLICY "see global or member stories" ON community_stories
  FOR SELECT USING (
    community_id IS NULL
    OR EXISTS (
      SELECT 1 FROM community_members m
      WHERE m.community_id = community_stories.community_id
        AND m.user_id = auth.uid()
    )
  );
