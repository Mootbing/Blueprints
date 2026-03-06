-- User slates: cloud-synced projects
CREATE TABLE user_slates (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT 'Untitled',
  slate JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX idx_user_slates_owner ON user_slates (owner_id);
CREATE INDEX idx_user_slates_updated ON user_slates (updated_at);

ALTER TABLE user_slates ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "user_slates_owner_select"
  ON user_slates FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "user_slates_owner_insert"
  ON user_slates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "user_slates_owner_update"
  ON user_slates FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "user_slates_owner_delete"
  ON user_slates FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Auto-update updated_at (reuses function from migration 001)
CREATE TRIGGER set_user_slates_updated_at
  BEFORE UPDATE ON user_slates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_slate_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_increment_version
  BEFORE UPDATE ON user_slates
  FOR EACH ROW
  EXECUTE FUNCTION increment_slate_version();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_slates;

-- Share links (must be created before policies that reference it)
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slate_id UUID NOT NULL REFERENCES user_slates(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  share_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_share_links_code ON share_links (share_code);
CREATE INDEX idx_share_links_slate ON share_links (slate_id);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Anyone can look up by share code
CREATE POLICY "share_links_lookup"
  ON share_links FOR SELECT TO anon, authenticated
  USING (true);

-- Only creator can insert
CREATE POLICY "share_links_insert"
  ON share_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update
CREATE POLICY "share_links_update"
  ON share_links FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Only creator can delete
CREATE POLICY "share_links_delete"
  ON share_links FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Generate share code function
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  -- Check uniqueness
  IF EXISTS (SELECT 1 FROM share_links WHERE share_code = result) THEN
    RETURN generate_share_code();
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Sharing policies on user_slates (now that share_links exists)

-- Collaborators can read via share_links
CREATE POLICY "user_slates_shared_select"
  ON user_slates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM share_links
      WHERE share_links.slate_id = user_slates.id
        AND share_links.is_active = true
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );

-- Collaborators with editor role can update via share_links
CREATE POLICY "user_slates_shared_update"
  ON user_slates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM share_links
      WHERE share_links.slate_id = user_slates.id
        AND share_links.role = 'editor'
        AND share_links.is_active = true
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );

-- Anon can read if active share link exists
CREATE POLICY "user_slates_anon_select"
  ON user_slates FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM share_links
      WHERE share_links.slate_id = user_slates.id
        AND share_links.is_active = true
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );
