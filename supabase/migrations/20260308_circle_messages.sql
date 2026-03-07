-- Circle messages table for trusted contacts chat
CREATE TABLE circle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text','image','audio','location')),
  media_url text,
  created_at timestamptz DEFAULT now(),
  is_safe_arrival boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: only users in trusted_contacts can read
CREATE POLICY "circle_messages_select" ON circle_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trusted_contacts tc
      WHERE (tc.user_id = auth.uid() OR tc.contact_id = auth.uid())
        AND (tc.user_id = circle_messages.sender_id OR tc.contact_id = circle_messages.sender_id)
    )
  );

-- INSERT: authenticated users can insert their own messages
CREATE POLICY "circle_messages_insert" ON circle_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

-- Indexes
CREATE INDEX idx_circle_messages_sender_created ON circle_messages(sender_id, created_at DESC);
CREATE INDEX idx_circle_messages_created ON circle_messages(created_at DESC);
