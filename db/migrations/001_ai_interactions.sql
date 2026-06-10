-- AI interaction logging for training dataset preparation.
-- Run once against your Postgres database, e.g.:
--   psql "$POSTGRES_URL" -f db/migrations/001_ai_interactions.sql

CREATE TABLE IF NOT EXISTS ai_interactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature       TEXT NOT NULL CHECK (feature IN ('analyze', 'summarize')),
  input_mode    TEXT NOT NULL CHECK (input_mode IN ('short', 'long')),
  user_message  TEXT NOT NULL,
  ai_response   TEXT,
  status        TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'succeeded', 'failed')),
  error_code    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_feature ON ai_interactions (feature);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_status ON ai_interactions (status);
