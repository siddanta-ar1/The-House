-- ============================================================
-- SRMS — Row Level Security Policies
-- Comprehensive RLS for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions: extract role and restaurant from JWT
-- ============================================================
CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() ->> 'app_role'
$$;

CREATE OR REPLACE FUNCTION current_restaurant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'restaurant_id')::UUID
$$;

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE POLICY "anyone_can_read_restaurants" ON restaurants
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "super_admin_manage_restaurants" ON restaurants
  FOR ALL USING (current_app_role() = 'super_admin');

-- ============================================================
-- USERS
-- ============================================================
CREATE POLICY "staff_read_users" ON users
  FOR SELECT USING (
    current_app_role() IN ('super_admin', 'manager')
    AND restaurant_id = current_restaurant_id()
  );

CREATE POLICY "user_read_self" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_manage_users" ON users
  FOR ALL USING (
    current_app_role() IN ('super_admin', 'manager')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- TABLES
-- ============================================================
CREATE POLICY "staff_read_tables" ON tables
  FOR SELECT USING (
    current_app_role() IN ('super_admin', 'manager', 'waiter')
    AND restaurant_id = current_restaurant_id()
  );

CREATE POLICY "admin_manage_tables" ON tables
  FOR ALL USING (
    current_app_role() IN ('super_admin', 'manager')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
CREATE POLICY "public_read_menu_categories" ON menu_categories
  FOR SELECT USING (is_visible = TRUE);

CREATE POLICY "manager_write_menu_categories" ON menu_categories
  FOR ALL USING (
    current_app_role() IN ('manager', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE POLICY "public_read_menu_items" ON menu_items
  FOR SELECT USING (is_available = TRUE);

CREATE POLICY "manager_write_menu_items" ON menu_items
  FOR ALL USING (
    current_app_role() IN ('manager', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE POLICY "waiter_insert_session" ON sessions
  FOR INSERT WITH CHECK (
    current_app_role() IN ('waiter', 'manager', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

CREATE POLICY "staff_read_sessions" ON sessions
  FOR SELECT USING (
    current_app_role() IN ('waiter', 'manager', 'super_admin', 'kitchen')
    AND restaurant_id = current_restaurant_id()
  );

CREATE POLICY "waiter_update_session" ON sessions
  FOR UPDATE USING (
    current_app_role() IN ('waiter', 'manager', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "kitchen_read_orders" ON orders
  FOR SELECT USING (
    current_app_role() IN ('kitchen', 'manager', 'super_admin', 'waiter')
    AND restaurant_id = current_restaurant_id()
  );

CREATE POLICY "customer_read_own_orders" ON orders
  FOR SELECT USING (
    current_app_role() = 'customer'
    AND session_id IN (
      SELECT id FROM sessions
      WHERE session_token = auth.jwt() ->> 'session_token'
    )
  );

CREATE POLICY "customer_insert_order" ON orders
  FOR INSERT WITH CHECK (
    current_app_role() = 'customer'
    AND session_id IN (
      SELECT id FROM sessions
      WHERE session_token = auth.jwt() ->> 'session_token'
        AND status = 'active'
        AND expires_at > NOW()
    )
  );

CREATE POLICY "staff_update_order_status" ON orders
  FOR UPDATE USING (
    current_app_role() IN ('kitchen', 'manager', 'waiter', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY "staff_read_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE restaurant_id = current_restaurant_id()
    )
  );

CREATE POLICY "customer_read_own_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE session_id IN (
        SELECT id FROM sessions
        WHERE session_token = auth.jwt() ->> 'session_token'
      )
    )
  );

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE POLICY "public_read_settings" ON settings
  FOR SELECT USING (TRUE);

CREATE POLICY "super_admin_settings" ON settings
  FOR ALL USING (
    current_app_role() = 'super_admin'
    OR (current_app_role() = 'manager'
        AND restaurant_id = current_restaurant_id())
  );
