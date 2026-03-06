-- Track which users redeemed which share links
CREATE TABLE share_link_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(share_link_id, user_id)
);

CREATE INDEX idx_share_link_claims_user ON share_link_claims (user_id);
CREATE INDEX idx_share_link_claims_link ON share_link_claims (share_link_id);

ALTER TABLE share_link_claims ENABLE ROW LEVEL SECURITY;

-- Users can see their own claims
CREATE POLICY "claims_select_own"
  ON share_link_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own claims
CREATE POLICY "claims_insert_own"
  ON share_link_claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop old permissive shared-access policies on user_slates
DROP POLICY IF EXISTS "user_slates_shared_select" ON user_slates;
DROP POLICY IF EXISTS "user_slates_shared_update" ON user_slates;

-- Collaborators can read only if they claimed a share link for this slate
CREATE POLICY "user_slates_shared_select"
  ON user_slates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM share_link_claims slc
      JOIN share_links sl ON sl.id = slc.share_link_id
      WHERE sl.slate_id = user_slates.id
        AND slc.user_id = auth.uid()
        AND sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );

-- Only users who claimed an EDITOR link can update
CREATE POLICY "user_slates_shared_update"
  ON user_slates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM share_link_claims slc
      JOIN share_links sl ON sl.id = slc.share_link_id
      WHERE sl.slate_id = user_slates.id
        AND slc.user_id = auth.uid()
        AND sl.role = 'editor'
        AND sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );
