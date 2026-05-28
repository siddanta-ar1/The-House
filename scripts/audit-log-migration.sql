-- Audit Log Migration
-- Run once in Supabase SQL Editor
-- Tracks all staff-initiated mutations for dispute resolution and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID      REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id     UUID,       -- staff member who performed the action (null = system/customer)
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,  -- 'order', 'payment', 'session', 'menu_item', etc.
    entity_id   TEXT,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast lookups per restaurant, newest first
CREATE INDEX IF NOT EXISTS audit_logs_restaurant_created
    ON audit_logs (restaurant_id, created_at DESC);

-- Allow querying by actor
CREATE INDEX IF NOT EXISTS audit_logs_user_id
    ON audit_logs (user_id) WHERE user_id IS NOT NULL;

-- RLS: staff can read their own restaurant's logs; only DB admin writes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their restaurant audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE id = auth.uid()
        )
    );

-- No INSERT/UPDATE/DELETE via RLS — writes happen server-side with service_role key
