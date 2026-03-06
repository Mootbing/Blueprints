-- AI jobs: server-side AI processing queue
CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  slate_id UUID NOT NULL REFERENCES user_slates(id) ON DELETE CASCADE,
  session_id TEXT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  request JSONB NOT NULL,
  base_slate_version BIGINT,

  response JSONB,
  applied BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_jobs_owner_status ON ai_jobs (owner_id, status);
CREATE INDEX idx_ai_jobs_slate ON ai_jobs (slate_id);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_jobs_owner" ON ai_jobs FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE ai_jobs;
