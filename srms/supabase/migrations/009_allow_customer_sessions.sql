-- ============================================================
-- Migration 009: Allow customer-initiated sessions
-- Makes opened_by nullable so QR scans can create sessions
-- without requiring a staff user reference
-- ============================================================

ALTER TABLE sessions
  ALTER COLUMN opened_by DROP NOT NULL;

COMMENT ON COLUMN sessions.opened_by IS
  'Staff user who opened the session. NULL for customer-initiated (QR scan) sessions.';
