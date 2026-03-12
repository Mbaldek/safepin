-- Julia AI vocal session tracking

CREATE TABLE julia_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escorte_id UUID REFERENCES escortes(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('standalone', 'escort_escalation')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error'))
);

CREATE INDEX idx_julia_sessions_user ON julia_sessions(user_id);
CREATE INDEX idx_julia_sessions_escorte ON julia_sessions(escorte_id);

ALTER TABLE julia_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON julia_sessions
  FOR ALL USING ((select auth.uid()) = user_id);
