-- Add visibility column to community_stories
ALTER TABLE community_stories
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'followers', 'cercle'));

-- Update RLS SELECT policy to respect visibility
DROP POLICY IF EXISTS "see global or member stories" ON community_stories;
CREATE POLICY "see stories by visibility" ON community_stories FOR SELECT USING (
  visibility = 'public'
  OR (visibility = 'followers' AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = community_stories.user_id)
  ))
  OR (visibility = 'cercle' AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM trusted_contacts WHERE status = 'accepted' AND (
      (user_id = auth.uid() AND contact_id = community_stories.user_id)
      OR (contact_id = auth.uid() AND user_id = community_stories.user_id)
    ))
  ))
  OR (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM community_members m
    WHERE m.community_id = community_stories.community_id
      AND m.user_id = auth.uid()
  ))
);
