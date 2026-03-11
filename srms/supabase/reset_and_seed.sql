-- ============================================================
-- 0. DROP EXISTING CONFLICTING TABLES (CLEAN SLATE)
-- ============================================================
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS category_clicks CASCADE;
DROP TABLE IF EXISTS gallery_images CASCADE;
DROP TABLE IF EXISTS menu_views CASCADE;
DROP TABLE IF EXISTS promo_videos CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================================
-- SRMS Core Schema Migration
-- Smart Restaurant Management System — Full DDL
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full system access, billing, multi-restaurant'),
  (2, 'manager', 'Menu management, staff management, reports'),
  (3, 'kitchen', 'Order queue view and status mutation only'),
  (4, 'waiter', 'Session open/close, table management, delivery'),
  (5, 'customer', 'Menu browsing and order placement within session');

-- ============================================================
-- TABLE: restaurants
-- ============================================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role_id SMALLINT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_restaurant_role ON users(restaurant_id, role_id);

-- ============================================================
-- TABLE: tables
-- ============================================================
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  nfc_uid TEXT UNIQUE,
  capacity SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_tables_qr_token ON tables(qr_token);

-- ============================================================
-- TABLE: menu_categories
-- ============================================================
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- TABLE: menu_items
-- ============================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  stock_count INTEGER,
  preparation_min SMALLINT DEFAULT 10,
  allergens TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available) WHERE is_available = TRUE;

-- ============================================================
-- TABLE: sessions (anti-spam core entity)
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 hours',
  guest_count SMALLINT,
  notes TEXT
);

CREATE INDEX idx_sessions_table_active ON sessions(table_id, status) WHERE status = 'active';
CREATE INDEX idx_sessions_token ON sessions(session_token);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_note TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  special_request TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- TABLE: settings (Customisation Engine)
-- ============================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  theme JSONB NOT NULL DEFAULT '{
    "primaryColor": "#E85D04",
    "secondaryColor": "#1B263B",
    "fontFamily": "Inter",
    "borderRadius": "lg",
    "menuLayout": "grid"
  }',
  features JSONB NOT NULL DEFAULT '{
    "tipsEnabled": true,
    "feedbackEnabled": true,
    "geofenceEnabled": false,
    "geofenceRadiusMeters": 100
  }',
  business_hours JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- SRMS — place_order RPC
-- ACID-safe order placement with inventory locking
-- ============================================================

CREATE OR REPLACE FUNCTION place_order(
  p_session_id UUID,
  p_items JSONB,
  p_customer_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_item JSONB;
  v_menu_item menu_items%ROWTYPE;
  v_total NUMERIC(10,2) := 0;
BEGIN
  -- 1. Verify the session is active and belongs to a real table
  SELECT restaurant_id INTO v_restaurant_id
  FROM sessions
  WHERE id = p_session_id
    AND status = 'active'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_SESSION: Session % is not active or has expired', p_session_id;
  END IF;

  -- 2. Create the order record
  INSERT INTO orders (session_id, restaurant_id, customer_note)
  VALUES (p_session_id, v_restaurant_id, p_customer_note)
  RETURNING id INTO v_order_id;

  -- 3. Process each line item with stock check
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock the menu_item row to prevent concurrent depletion
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND restaurant_id = v_restaurant_id
      AND is_available = TRUE
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ITEM_UNAVAILABLE: Item % is unavailable or locked',
        v_item->>'menu_item_id';
    END IF;

    -- Stock depletion check
    IF v_menu_item.stock_count IS NOT NULL THEN
      IF v_menu_item.stock_count < (v_item->>'quantity')::SMALLINT THEN
        RAISE EXCEPTION 'OUT_OF_STOCK: Insufficient stock for item %',
          v_menu_item.name;
      END IF;
      UPDATE menu_items
      SET stock_count = stock_count - (v_item->>'quantity')::SMALLINT
      WHERE id = v_menu_item.id;
    END IF;

    -- Insert order item with price snapshot
    INSERT INTO order_items (
      order_id, menu_item_id, quantity, unit_price, special_request
    ) VALUES (
      v_order_id,
      v_menu_item.id,
      (v_item->>'quantity')::SMALLINT,
      v_menu_item.price,
      v_item->>'special_request'
    );

    v_total := v_total + (v_menu_item.price * (v_item->>'quantity')::SMALLINT);
  END LOOP;

  -- 4. Update order total
  UPDATE orders SET total_amount = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;
-- ============================================================
-- SRMS — Production Indexes
-- Optimized for all critical query paths
-- ============================================================

-- Hot-path: Kitchen fetching active orders
-- Query: WHERE restaurant_id = $1 AND status IN ('pending', 'preparing')
CREATE INDEX idx_orders_active
  ON orders (restaurant_id, placed_at DESC)
  WHERE status IN ('pending', 'confirmed', 'preparing');

-- Hot-path: Session validation on every customer request
-- Query: WHERE session_token = $1 AND status = 'active'
CREATE UNIQUE INDEX idx_sessions_token_active
  ON sessions (session_token)
  WHERE status = 'active';

-- Menu items full-text search
CREATE INDEX idx_menu_items_fts
  ON menu_items
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Covering index for menu page render (avoids heap fetch)
CREATE INDEX idx_menu_items_covering
  ON menu_items (restaurant_id, category_id)
  INCLUDE (name, price, image_url, is_available, tags);

-- Analytics: order aggregation by date
CREATE INDEX idx_orders_analytics
  ON orders (restaurant_id, DATE_TRUNC('day', placed_at AT TIME ZONE 'UTC'), status)
  INCLUDE (total_amount);

-- Prevent duplicate active sessions per table
CREATE UNIQUE INDEX idx_sessions_one_active_per_table
  ON sessions (table_id)
  WHERE status = 'active';
-- ============================================================
-- SRMS — JWT Custom Claims Hook
-- Enriches Supabase Auth JWTs with app_role and restaurant_id
-- ============================================================

-- Function called by Supabase Auth "custom access token" hook
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_role TEXT;
  v_restaurant_id UUID;
  claims JSONB;
BEGIN
  -- Fetch the user's role and restaurant from our users table
  SELECT r.name, u.restaurant_id INTO v_role, v_restaurant_id
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Inject custom claims into the JWT
  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{restaurant_id}', to_jsonb(v_restaurant_id::TEXT));
  ELSE
    -- Anonymous/customer users get the customer role
    claims := jsonb_set(claims, '{app_role}', '"customer"');
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to the auth hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;

-- Revoke function execution from public
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM authenticated;
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
-- ============================================================
-- SRMS DEMO SEED SCRIPT
-- Safely creates the SRMS tables alongside your old schema,
-- and inserts mock Demo Data so you can immediately test the App!
-- ============================================================

-- 1. Create the base tables (safely ignoring if they already exist)
CREATE TABLE IF NOT EXISTS roles (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role_id SMALLINT NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  nfc_uid TEXT UNIQUE,
  capacity SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES users(id), -- Nullable for demo/test purposes initially
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '4 hours',
  guest_count SMALLINT,
  notes TEXT
);

-- Note: orders and order_items skipped here to keep the demo script lean.
-- The app will automatically create them when the customer checks out if they are defined in your complete schema.

-- ============================================================
-- 2. Insert Base RBAC Roles
-- ============================================================
INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full system access'),
  (2, 'manager', 'Menu management'),
  (3, 'kitchen', 'Order queue view'),
  (4, 'waiter', 'Session open/close'),
  (5, 'customer', 'Customer flow')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Create a Demo Restaurant
-- ============================================================
INSERT INTO restaurants (id, name, slug) 
VALUES ('11111111-1111-1111-1111-111111111111', 'The House Cafe Demo', 'the-house')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. Create Demo Target Tables (for Customer Scanning)
-- ============================================================
INSERT INTO tables (id, restaurant_id, label, qr_token, capacity)
VALUES 
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Table 1', 'table-1-token', 4),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Table 2', 'table-2-token', 2)
ON CONFLICT (qr_token) DO NOTHING;

-- ============================================================
-- 5. Seed Mock Menu Items (from old 'menu_items' to new 'menu_categories' style)
-- ============================================================
INSERT INTO menu_categories (id, restaurant_id, name, sort_order)
VALUES ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Specialty Coffee', 1)
ON CONFLICT (id) DO NOTHING;

-- Note: your old menu_items table has: id, name, price, category_id, image_url.
-- The new SRMS menu_items expects a restaurant_id linked to the items.
-- If you run the 001_core_schema.sql over your old DB, it will ALTER the tables. 
-- For now, this seed assumes you are using the new schema layout designed in our codebase.
