-- Migration: Audit Logs
-- Tracks user actions on key entities (tenders, documents, bids)

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  metadata    jsonb,
  ip_address  text
);

CREATE INDEX idx_audit_logs_user_id   ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit entries
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Buyers can view audit logs for tenders they own
CREATE POLICY "Buyers can view audit logs for owned tenders" ON audit_logs
  FOR SELECT USING (
    entity_type = 'tender'
    AND entity_id IN (
      SELECT id FROM tenders WHERE entity_id = auth.uid()::text
    )
  );
