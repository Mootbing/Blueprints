-- Create published_apps table
CREATE TABLE published_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  app_name TEXT NOT NULL,
  app_blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GIN index on app_blueprint for JSONB query performance
CREATE INDEX idx_published_apps_blueprint ON published_apps USING GIN (app_blueprint);

-- Enable Row Level Security
ALTER TABLE published_apps ENABLE ROW LEVEL SECURITY;

-- Public read access for all roles
CREATE POLICY "published_apps_select_public"
  ON published_apps
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert restricted to authenticated users who own the row
CREATE POLICY "published_apps_insert_creator"
  ON published_apps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Update restricted to authenticated users who own the row
CREATE POLICY "published_apps_update_creator"
  ON published_apps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON published_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
