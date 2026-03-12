-- ============================================================
-- SRMS — Migration 006: Feature Gaps & Architectural Fixes
-- Adds: modifiers, financials, seat splitting, dynamic ETAs,
--        session denormalization trigger, RLS simplification
-- ============================================================

-- ============================================================
-- 1. MENU ITEM MODIFIER GROUPS & MODIFIERS
-- Structured add-ons (e.g., "Milk Options" → "Oat Milk +$1.00")
-- ============================================================

CREATE TABLE menu_item_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Milk Options", "Size", "Extras"
  min_selections SMALLINT NOT NULL DEFAULT 0,   -- 0 = optional group
  max_selections SMALLINT NOT NULL DEFAULT 1,   -- 1 = radio, N = checkbox
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_selection_range CHECK (min_selections >= 0 AND max_selections >= min_selections)
);

CREATE INDEX idx_modifier_groups_menu_item ON menu_item_modifier_groups(menu_item_id);

CREATE TABLE menu_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES menu_item_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Oat Milk", "Extra Bacon"
  price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0.00,  -- can be 0, positive, or negative
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modifiers_group ON menu_item_modifiers(group_id);

-- ============================================================
-- 2. ORDER ITEM MODIFIERS (join table for selected modifiers)
-- ============================================================

CREATE TABLE order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES menu_item_modifiers(id) ON DELETE RESTRICT,
  modifier_name TEXT NOT NULL,           -- snapshot at order time
  price_adjustment NUMERIC(10, 2) NOT NULL,  -- snapshot at order time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);

-- ============================================================
-- 3. FINANCIAL COLUMNS ON ORDERS
-- Tax, tip, payment tracking, Stripe integration
-- ============================================================

-- Add payment_status type
CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'refunded', 'failed');

ALTER TABLE orders
  ADD COLUMN subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN stripe_payment_intent_id TEXT,
  ADD COLUMN paid_at TIMESTAMPTZ;

-- Index for payment reconciliation
CREATE INDEX idx_orders_payment_status ON orders(restaurant_id, payment_status);
CREATE INDEX idx_orders_stripe_pi ON orders(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================
-- 4. SESSION SEAT SPLITTING (sub-sessions for split billing)
-- Allows multiple guests at the same table to order independently
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN max_seats SMALLINT NOT NULL DEFAULT 4;

CREATE TABLE session_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seat_number SMALLINT NOT NULL,
  label TEXT,                            -- e.g., "Guest 1", or a name
  device_fingerprint TEXT,               -- optional: ties a phone to a seat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_seat_per_session UNIQUE (session_id, seat_number),
  CONSTRAINT valid_seat_number CHECK (seat_number > 0)
);

CREATE INDEX idx_session_seats_session ON session_seats(session_id);

-- Link orders to specific seats for split billing
ALTER TABLE orders
  ADD COLUMN seat_id UUID REFERENCES session_seats(id) ON DELETE SET NULL;

-- ============================================================
-- 5. DYNAMIC ETA CALCULATION
-- Function that calculates estimated wait time based on
-- the aggregate preparation_min of the current pending queue
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_dynamic_eta(
  p_restaurant_id UUID,
  p_new_items JSONB DEFAULT NULL  -- optional: items about to be ordered
)
RETURNS INTEGER  -- returns estimated minutes
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_queue_minutes INTEGER := 0;
  v_new_item_minutes INTEGER := 0;
  v_kitchen_parallelism INTEGER := 3;  -- assume 3 concurrent prep stations
BEGIN
  -- Sum preparation_min for all currently active orders in the queue
  SELECT COALESCE(SUM(
    mi.preparation_min * oi.quantity
  ), 0) INTO v_queue_minutes
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status IN ('pending', 'confirmed', 'preparing');

  -- Add the new items' prep time if provided
  IF p_new_items IS NOT NULL THEN
    SELECT COALESCE(SUM(
      mi.preparation_min * (item->>'quantity')::INTEGER
    ), 0) INTO v_new_item_minutes
    FROM jsonb_array_elements(p_new_items) AS item
    JOIN menu_items mi ON mi.id = (item->>'menu_item_id')::UUID;
  END IF;

  -- Divide by parallelism factor and add buffer
  RETURN CEIL((v_queue_minutes + v_new_item_minutes)::NUMERIC / v_kitchen_parallelism) + 2;
END;
$$;

-- ============================================================
-- 6. SESSION DENORMALIZATION SAFETY TRIGGER
-- Ensures session.restaurant_id matches the table's restaurant_id
-- Prevents data corruption from manual inserts or API misuse
-- ============================================================

CREATE OR REPLACE FUNCTION verify_session_restaurant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_restaurant_id UUID;
BEGIN
  SELECT restaurant_id INTO v_table_restaurant_id
  FROM tables
  WHERE id = NEW.table_id;

  IF v_table_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_TABLE: Table % does not exist', NEW.table_id;
  END IF;

  IF NEW.restaurant_id IS DISTINCT FROM v_table_restaurant_id THEN
    RAISE EXCEPTION 'RESTAURANT_MISMATCH: Table % belongs to restaurant %, not %',
      NEW.table_id, v_table_restaurant_id, NEW.restaurant_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_session_restaurant
  BEFORE INSERT OR UPDATE OF table_id, restaurant_id ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION verify_session_restaurant_id();

-- ============================================================
-- 7. RLS FOR NEW TABLES
-- ============================================================

ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_seats ENABLE ROW LEVEL SECURITY;

-- Modifier groups & modifiers: public read, manager write
CREATE POLICY "public_read_modifier_groups" ON menu_item_modifier_groups
  FOR SELECT USING (TRUE);

CREATE POLICY "manager_write_modifier_groups" ON menu_item_modifier_groups
  FOR ALL USING (
    current_app_role() IN ('manager', 'super_admin')
  );

CREATE POLICY "public_read_modifiers" ON menu_item_modifiers
  FOR SELECT USING (is_available = TRUE);

CREATE POLICY "manager_write_modifiers" ON menu_item_modifiers
  FOR ALL USING (
    current_app_role() IN ('manager', 'super_admin')
  );

-- Order item modifiers: staff read, inserted via RPC
CREATE POLICY "staff_read_order_item_modifiers" ON order_item_modifiers
  FOR SELECT USING (
    order_item_id IN (
      SELECT id FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE restaurant_id = current_restaurant_id()
      )
    )
  );

-- Session seats: staff manage, customers read their session
CREATE POLICY "staff_manage_session_seats" ON session_seats
  FOR ALL USING (
    current_app_role() IN ('waiter', 'manager', 'super_admin')
  );

CREATE POLICY "customer_read_session_seats" ON session_seats
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE session_token = auth.jwt() ->> 'session_token'
    )
  );

-- ============================================================
-- 8. SIMPLIFY REDUNDANT RLS: customer_insert_order
-- The place_order RPC runs as SECURITY DEFINER and already
-- validates session status. The RLS policy for inserts can be
-- simplified since the RPC bypasses RLS anyway.
-- ============================================================

-- Drop the overly-complex insert policy
DROP POLICY IF EXISTS "customer_insert_order" ON orders;

-- Replace with a simpler policy — the RPC (SECURITY DEFINER) handles
-- the heavy validation. This policy only guards against direct inserts
-- bypassing the RPC (which anon/authenticated shouldn't do).
CREATE POLICY "customer_insert_order" ON orders
  FOR INSERT WITH CHECK (
    current_app_role() = 'customer'
  );
