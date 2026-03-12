-- Julia AI Chat tables

CREATE TABLE julia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_julia_conv_user ON julia_conversations(user_id);

ALTER TABLE julia_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_conversations" ON julia_conversations
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE TABLE julia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES julia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_julia_msg_conv ON julia_messages(conversation_id);

ALTER TABLE julia_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_messages" ON julia_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM julia_conversations WHERE user_id = (select auth.uid()))
  );
