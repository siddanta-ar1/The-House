-- ============================================================
-- SRMS — Migration 007: Full Feature Expansion
-- Dynamic Pricing, Promos, Loyalty, Ingredients, Z-Reports,
-- Service Requests, Split Billing, i18n, Takeout, Staff Shifts
-- ============================================================

-- ============================================================
-- 1. DYNAMIC PRICING & HAPPY HOURS
-- Automated time-based price rules per item or category
-- ============================================================

CREATE TYPE pricing_rule_type AS ENUM ('percentage_off', 'fixed_price', 'amount_off');

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- e.g., "Happy Hour Beers"
  description TEXT,
  rule_type pricing_rule_type NOT NULL,
  value NUMERIC(10, 2) NOT NULL,              -- e.g., 50 for 50% off, or 3.99 for fixed
  -- Scope: what does this rule apply to?
  applies_to_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  applies_to_category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  applies_to_all BOOLEAN NOT NULL DEFAULT FALSE,
  -- Schedule: when is this rule active?
  days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',  -- 0=Sun..6=Sat
  start_time TIME NOT NULL DEFAULT '00:00',
  end_time TIME NOT NULL DEFAULT '23:59',
  valid_from DATE,                             -- NULL = no start limit
  valid_until DATE,                            -- NULL = no end limit
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority SMALLINT NOT NULL DEFAULT 0,        -- higher = takes precedence
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Must target at least one scope
  CONSTRAINT valid_scope CHECK (
    applies_to_item_id IS NOT NULL OR
    applies_to_category_id IS NOT NULL OR
    applies_to_all = TRUE
  ),
  CONSTRAINT valid_value CHECK (value >= 0)
);

CREATE INDEX idx_pricing_rules_restaurant ON pricing_rules(restaurant_id, is_active);
CREATE INDEX idx_pricing_rules_item ON pricing_rules(applies_to_item_id) WHERE applies_to_item_id IS NOT NULL;
CREATE INDEX idx_pricing_rules_category ON pricing_rules(applies_to_category_id) WHERE applies_to_category_id IS NOT NULL;

-- Function to get the effective price for a menu item at a given time
CREATE OR REPLACE FUNCTION get_effective_price(
  p_menu_item_id UUID,
  p_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base_price NUMERIC(10,2);
  v_category_id UUID;
  v_restaurant_id UUID;
  v_rule RECORD;
  v_effective_price NUMERIC(10,2);
  v_day SMALLINT;
  v_time TIME;
BEGIN
  -- Get the item's base price and context
  SELECT price, category_id, restaurant_id
  INTO v_base_price, v_category_id, v_restaurant_id
  FROM menu_items WHERE id = p_menu_item_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_effective_price := v_base_price;
  v_day := EXTRACT(DOW FROM p_at)::SMALLINT;
  v_time := p_at::TIME;

  -- Find the highest-priority active rule that matches
  SELECT * INTO v_rule
  FROM pricing_rules
  WHERE restaurant_id = v_restaurant_id
    AND is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= p_at::DATE)
    AND (valid_until IS NULL OR valid_until >= p_at::DATE)
    AND v_day = ANY(days_of_week)
    AND v_time BETWEEN start_time AND end_time
    AND (
      applies_to_item_id = p_menu_item_id
      OR applies_to_category_id = v_category_id
      OR applies_to_all = TRUE
    )
  ORDER BY priority DESC, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    CASE v_rule.rule_type
      WHEN 'percentage_off' THEN
        v_effective_price := v_base_price * (1 - v_rule.value / 100);
      WHEN 'fixed_price' THEN
        v_effective_price := v_rule.value;
      WHEN 'amount_off' THEN
        v_effective_price := GREATEST(v_base_price - v_rule.value, 0);
    END CASE;
  END IF;

  RETURN ROUND(v_effective_price, 2);
END;
$$;


-- ============================================================
-- 2. PROMO CODES & DISCOUNTS
-- Coupon infrastructure: % off, fixed off, BOGO, free item
-- ============================================================

CREATE TYPE promo_type AS ENUM (
  'percentage_off',   -- 10% off entire order
  'amount_off',       -- $5 off order
  'free_item',        -- free specific menu item
  'bogo'              -- buy one get one free
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  promo_type promo_type NOT NULL,
  value NUMERIC(10, 2) NOT NULL DEFAULT 0,     -- % or $ amount
  -- For free_item / bogo: which item?
  free_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  bogo_buy_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  bogo_get_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  -- Constraints
  min_order_amount NUMERIC(10, 2) DEFAULT 0,   -- min spend to apply
  max_discount_amount NUMERIC(10, 2),          -- cap the discount
  max_uses INTEGER,                            -- total uses allowed (NULL = unlimited)
  max_uses_per_customer INTEGER DEFAULT 1,     -- per loyalty_member
  current_uses INTEGER NOT NULL DEFAULT 0,
  -- Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_code_per_restaurant UNIQUE (restaurant_id, code),
  CONSTRAINT valid_promo_value CHECK (value >= 0)
);

CREATE INDEX idx_promo_codes_lookup ON promo_codes(restaurant_id, code, is_active);

-- Track which promos were used on which orders
CREATE TABLE order_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE RESTRICT,
  code_used TEXT NOT NULL,                     -- snapshot
  discount_amount NUMERIC(10, 2) NOT NULL,     -- actual $ saved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_promos_order ON order_promos(order_id);


-- ============================================================
-- 3. CRM & LOYALTY PROGRAM
-- Customer accounts, points, tiers, redemption
-- ============================================================

CREATE TABLE loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  -- Auth: can link to Supabase auth user or be phone-based
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  display_name TEXT,
  -- Points
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  lifetime_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Tier
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_phone_per_restaurant UNIQUE (restaurant_id, phone),
  CONSTRAINT unique_email_per_restaurant UNIQUE (restaurant_id, email),
  CONSTRAINT unique_auth_per_restaurant UNIQUE (restaurant_id, auth_user_id)
);

CREATE INDEX idx_loyalty_members_restaurant ON loyalty_members(restaurant_id);
CREATE INDEX idx_loyalty_members_phone ON loyalty_members(phone);

-- Loyalty configuration per restaurant
CREATE TABLE loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  points_per_dollar NUMERIC(6, 2) NOT NULL DEFAULT 10,        -- earn 10 pts per $1
  redemption_threshold INTEGER NOT NULL DEFAULT 1000,          -- min points to redeem
  redemption_value NUMERIC(10, 2) NOT NULL DEFAULT 5.00,      -- $5 reward per threshold
  -- Tier thresholds (lifetime points)
  silver_threshold INTEGER NOT NULL DEFAULT 5000,
  gold_threshold INTEGER NOT NULL DEFAULT 15000,
  platinum_threshold INTEGER NOT NULL DEFAULT 50000,
  -- Bonus rules
  birthday_bonus_points INTEGER DEFAULT 500,
  signup_bonus_points INTEGER DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Points transaction ledger (audit trail)
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'adjustment', 'expire')),
  points INTEGER NOT NULL,                     -- positive = earn, negative = redeem
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_tx_member ON loyalty_transactions(member_id, created_at DESC);

-- Link orders to loyalty members
ALTER TABLE orders
  ADD COLUMN loyalty_member_id UUID REFERENCES loyalty_members(id) ON DELETE SET NULL;


-- ============================================================
-- 4. INGREDIENT-LEVEL INVENTORY (Recipe Management)
-- Track raw ingredients, recipes, COGS, auto-depletion
-- ============================================================

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,                          -- e.g., 'g', 'ml', 'pcs', 'oz'
  stock_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12, 4),               -- alert when stock drops below
  cost_per_unit NUMERIC(10, 4) NOT NULL DEFAULT 0,  -- cost in dollars
  supplier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredients_restaurant ON ingredients(restaurant_id);

-- Recipes: which ingredients make up a menu item
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_needed NUMERIC(12, 4) NOT NULL,     -- e.g., 200 (grams of flour)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_recipe_ingredient UNIQUE (menu_item_id, ingredient_id)
);

CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient ON recipes(ingredient_id);

-- Function to calculate COGS for a menu item
CREATE OR REPLACE FUNCTION calculate_cogs(p_menu_item_id UUID)
RETURNS NUMERIC(10, 2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(ROUND(SUM(r.quantity_needed * i.cost_per_unit), 2), 0)
  FROM recipes r
  JOIN ingredients i ON i.id = r.ingredient_id
  WHERE r.menu_item_id = p_menu_item_id;
$$;

-- Ingredient stock movement log (audit trail)
CREATE TABLE ingredient_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase',     -- bought more stock
    'usage',        -- auto-deducted by order
    'waste',        -- spoilage / thrown away
    'adjustment',   -- manual correction
    'transfer'      -- moved between locations
  )),
  quantity NUMERIC(12, 4) NOT NULL,            -- positive = in, negative = out
  reference_id UUID,                           -- order_id or purchase_order_id
  notes TEXT,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredient_movements ON ingredient_movements(ingredient_id, created_at DESC);


-- ============================================================
-- 5. END-OF-DAY (EOD) Z-REPORTS
-- Formal register close with financial summary
-- ============================================================

CREATE TABLE eod_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  -- Revenue breakdown
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tips NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_discounts NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Payment method breakdown
  cash_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  card_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Operational stats
  total_voids INTEGER NOT NULL DEFAULT 0,
  total_refunds NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cancelled INTEGER NOT NULL DEFAULT 0,
  avg_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- COGS
  total_cogs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Metadata
  closed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_eod_per_day UNIQUE (restaurant_id, report_date)
);

CREATE INDEX idx_eod_reports_restaurant ON eod_reports(restaurant_id, report_date DESC);

-- Function to generate an EOD report for a given date
CREATE OR REPLACE FUNCTION generate_eod_report(
  p_restaurant_id UUID,
  p_date DATE,
  p_closed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id UUID;
  v_stats RECORD;
BEGIN
  -- Aggregate the day's orders
  SELECT
    COUNT(*) FILTER (WHERE status != 'cancelled') AS total_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_revenue,
    COALESCE(SUM(tax_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_tax,
    COALESCE(SUM(tip_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_tips,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS total_cancelled,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'refunded'), 0) AS total_refunds,
    COALESCE(AVG(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS avg_order_value
  INTO v_stats
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND placed_at::DATE = p_date;

  -- Calculate total discounts from promo usage
  -- Calculate COGS from ingredient recipes
  INSERT INTO eod_reports (
    restaurant_id, report_date,
    total_orders, total_revenue, total_tax, total_tips,
    total_cancelled, total_refunds, avg_order_value,
    total_discounts, net_revenue, total_cogs, gross_profit,
    closed_by
  ) VALUES (
    p_restaurant_id, p_date,
    v_stats.total_orders, v_stats.total_revenue, v_stats.total_tax, v_stats.total_tips,
    v_stats.total_cancelled, v_stats.total_refunds, ROUND(v_stats.avg_order_value, 2),
    -- Discounts
    COALESCE((
      SELECT SUM(op.discount_amount)
      FROM order_promos op
      JOIN orders o ON o.id = op.order_id
      WHERE o.restaurant_id = p_restaurant_id AND o.placed_at::DATE = p_date
    ), 0),
    -- Net revenue = revenue - tax - discounts
    v_stats.total_revenue - v_stats.total_tax - COALESCE((
      SELECT SUM(op.discount_amount)
      FROM order_promos op
      JOIN orders o ON o.id = op.order_id
      WHERE o.restaurant_id = p_restaurant_id AND o.placed_at::DATE = p_date
    ), 0),
    -- COGS: sum recipe costs * quantities sold
    COALESCE((
      SELECT ROUND(SUM(r.quantity_needed * ing.cost_per_unit * oi.quantity), 2)
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN recipes r ON r.menu_item_id = oi.menu_item_id
      JOIN ingredients ing ON ing.id = r.ingredient_id
      WHERE o.restaurant_id = p_restaurant_id
        AND o.placed_at::DATE = p_date
        AND o.status != 'cancelled'
    ), 0),
    -- Gross profit = net_revenue - COGS
    v_stats.total_revenue - v_stats.total_tax - COALESCE((
      SELECT SUM(op.discount_amount)
      FROM order_promos op
      JOIN orders o ON o.id = op.order_id
      WHERE o.restaurant_id = p_restaurant_id AND o.placed_at::DATE = p_date
    ), 0) - COALESCE((
      SELECT ROUND(SUM(r.quantity_needed * ing.cost_per_unit * oi.quantity), 2)
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN recipes r ON r.menu_item_id = oi.menu_item_id
      JOIN ingredients ing ON ing.id = r.ingredient_id
      WHERE o.restaurant_id = p_restaurant_id
        AND o.placed_at::DATE = p_date
        AND o.status != 'cancelled'
    ), 0),
    p_closed_by
  )
  ON CONFLICT (restaurant_id, report_date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_tax = EXCLUDED.total_tax,
    total_tips = EXCLUDED.total_tips,
    total_cancelled = EXCLUDED.total_cancelled,
    total_refunds = EXCLUDED.total_refunds,
    avg_order_value = EXCLUDED.avg_order_value,
    total_discounts = EXCLUDED.total_discounts,
    net_revenue = EXCLUDED.net_revenue,
    total_cogs = EXCLUDED.total_cogs,
    gross_profit = EXCLUDED.gross_profit,
    closed_by = EXCLUDED.closed_by,
    created_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;


-- ============================================================
-- 6. SERVICE REQUESTS ("Call Waiter" / "Need Water" / etc.)
-- Real-time push notifications to waiter PWA
-- ============================================================

CREATE TYPE service_request_status AS ENUM ('pending', 'acknowledged', 'completed', 'cancelled');

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'call_waiter',
    'request_bill',
    'need_water',
    'clean_table',
    'other'
  )),
  message TEXT,                                -- optional custom message
  status service_request_status NOT NULL DEFAULT 'pending',
  acknowledged_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_requests_restaurant ON service_requests(restaurant_id, status, created_at DESC);
CREATE INDEX idx_service_requests_session ON service_requests(session_id);


-- ============================================================
-- 7. SPLIT BILLING INFRASTRUCTURE
-- Split by seat, split evenly, or custom split
-- ============================================================

CREATE TYPE split_type AS ENUM ('by_seat', 'even', 'custom', 'full');

CREATE TABLE bill_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  split_type split_type NOT NULL DEFAULT 'full',
  total_amount NUMERIC(10, 2) NOT NULL,
  split_count SMALLINT NOT NULL DEFAULT 1,     -- how many ways to split
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bill_split_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_split_id UUID NOT NULL REFERENCES bill_splits(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES session_seats(id) ON DELETE SET NULL,
  -- Which portion of the bill
  label TEXT,                                  -- "Guest 1", "John", etc.
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  -- Payment tracking
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bill_split_items_split ON bill_split_items(bill_split_id);


-- ============================================================
-- 8. MULTI-LANGUAGE SUPPORT (i18n)
-- Translations for menu items, categories, modifier names
-- ============================================================

CREATE TABLE supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,                  -- ISO 639-1: 'en', 'ne', 'zh', 'es'
  language_name TEXT NOT NULL,                  -- "English", "नेपाली", "中文", "Español"
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_lang_per_restaurant UNIQUE (restaurant_id, language_code)
);

CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  -- What entity is being translated?
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'menu_item_name', 'menu_item_description',
    'category_name',
    'modifier_group_name', 'modifier_name',
    'restaurant_name'
  )),
  entity_id UUID NOT NULL,                     -- the ID of the item/category/modifier
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_translation UNIQUE (restaurant_id, language_code, entity_type, entity_id)
);

CREATE INDEX idx_translations_lookup ON translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_restaurant ON translations(restaurant_id);


-- ============================================================
-- 9. TAKEOUT / ORDER-AHEAD WORKFLOW
-- Orders without a table — pickup time instead of table_id
-- ============================================================

CREATE TYPE takeout_status AS ENUM (
  'placed', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'cancelled'
);

CREATE TABLE takeout_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  -- Customer identity (loyalty member or anonymous)
  loyalty_member_id UUID REFERENCES loyalty_members(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  -- Scheduling
  pickup_time TIMESTAMPTZ NOT NULL,            -- when they want to pick up
  estimated_prep_minutes SMALLINT,
  -- Order details
  status takeout_status NOT NULL DEFAULT 'placed',
  items JSONB NOT NULL,                        -- snapshot of cart items
  subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- Payment
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id TEXT,
  -- Promo
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- Notes
  customer_note TEXT,
  kitchen_note TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_takeout_orders_restaurant ON takeout_orders(restaurant_id, status);
CREATE INDEX idx_takeout_orders_pickup ON takeout_orders(restaurant_id, pickup_time);
CREATE INDEX idx_takeout_orders_phone ON takeout_orders(customer_phone);


-- ============================================================
-- 10. STAFF TIME & ATTENDANCE
-- Clock in/out, shift tracking, payroll prep
-- ============================================================

CREATE TABLE staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  -- Computed on clock-out
  hours_worked NUMERIC(6, 2),
  -- Break tracking
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  break_minutes SMALLINT DEFAULT 0,
  -- Metadata
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_shifts_user ON staff_shifts(user_id, clock_in DESC);
CREATE INDEX idx_staff_shifts_restaurant ON staff_shifts(restaurant_id, clock_in DESC);

-- Prevent double clock-in: only one open shift per user
CREATE UNIQUE INDEX idx_staff_shifts_active
  ON staff_shifts(user_id)
  WHERE clock_out IS NULL;

-- Function to clock in
CREATE OR REPLACE FUNCTION staff_clock_in(
  p_user_id UUID,
  p_restaurant_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  -- Check not already clocked in
  IF EXISTS (
    SELECT 1 FROM staff_shifts
    WHERE user_id = p_user_id AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_CLOCKED_IN: User % is already clocked in', p_user_id;
  END IF;

  INSERT INTO staff_shifts (user_id, restaurant_id)
  VALUES (p_user_id, p_restaurant_id)
  RETURNING id INTO v_shift_id;

  RETURN v_shift_id;
END;
$$;

-- Function to clock out
CREATE OR REPLACE FUNCTION staff_clock_out(
  p_user_id UUID
)
RETURNS NUMERIC(6,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hours NUMERIC(6,2);
  v_break SMALLINT;
BEGIN
  UPDATE staff_shifts
  SET clock_out = NOW(),
      hours_worked = ROUND(
        EXTRACT(EPOCH FROM (NOW() - clock_in)) / 3600.0 - COALESCE(break_minutes, 0) / 60.0,
        2
      )
  WHERE user_id = p_user_id AND clock_out IS NULL
  RETURNING hours_worked INTO v_hours;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_CLOCKED_IN: User % is not currently clocked in', p_user_id;
  END IF;

  RETURN v_hours;
END;
$$;


-- ============================================================
-- 11. ADD DISCOUNT COLUMN TO ORDERS (for promo application)
-- ============================================================

ALTER TABLE orders
  ADD COLUMN discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

-- Add payment_method for EOD cash/card breakdown
ALTER TABLE orders
  ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'mobile', 'split'));


-- ============================================================
-- 12. RESTAURANT SETTINGS EXPANSION
-- Add loyalty, takeout, and i18n feature flags
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS features_v2 JSONB NOT NULL DEFAULT '{
  "loyaltyEnabled": false,
  "takeoutEnabled": false,
  "multiLanguageEnabled": false,
  "serviceRequestsEnabled": true,
  "splitBillingEnabled": true,
  "dynamicPricingEnabled": false,
  "ingredientTrackingEnabled": false,
  "staffShiftsEnabled": false,
  "defaultTaxRate": 13.0,
  "currency": "USD",
  "currencySymbol": "$"
}';


-- ============================================================
-- 13. RLS POLICIES FOR ALL NEW TABLES
-- ============================================================

-- PRICING RULES
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_pricing_rules" ON pricing_rules
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "manager_write_pricing_rules" ON pricing_rules
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- PROMO CODES
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_manage_promos" ON promo_codes
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());
CREATE POLICY "customer_validate_promo" ON promo_codes
  FOR SELECT USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

-- ORDER PROMOS
ALTER TABLE order_promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_order_promos" ON order_promos
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE restaurant_id = current_restaurant_id()));

-- LOYALTY MEMBERS
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_manage_loyalty" ON loyalty_members
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());
CREATE POLICY "member_read_self" ON loyalty_members
  FOR SELECT USING (auth_user_id = auth.uid());

-- LOYALTY CONFIG
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_loyalty_config" ON loyalty_config
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "manager_write_loyalty_config" ON loyalty_config
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- LOYALTY TRANSACTIONS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_read_own_tx" ON loyalty_transactions
  FOR SELECT USING (member_id IN (SELECT id FROM loyalty_members WHERE auth_user_id = auth.uid()));
CREATE POLICY "staff_read_loyalty_tx" ON loyalty_transactions
  FOR SELECT USING (
    member_id IN (SELECT id FROM loyalty_members WHERE restaurant_id = current_restaurant_id())
    AND current_app_role() IN ('manager', 'super_admin')
  );

-- INGREDIENTS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_manage_ingredients" ON ingredients
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- RECIPES
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_manage_recipes" ON recipes
  FOR ALL USING (
    current_app_role() IN ('manager', 'super_admin')
    AND menu_item_id IN (SELECT id FROM menu_items WHERE restaurant_id = current_restaurant_id())
  );

-- INGREDIENT MOVEMENTS
ALTER TABLE ingredient_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_manage_movements" ON ingredient_movements
  FOR ALL USING (
    ingredient_id IN (SELECT id FROM ingredients WHERE restaurant_id = current_restaurant_id())
    AND current_app_role() IN ('manager', 'super_admin', 'kitchen')
  );

-- EOD REPORTS
ALTER TABLE eod_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_manage_eod" ON eod_reports
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- SERVICE REQUESTS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_create_service_request" ON service_requests
  FOR INSERT WITH CHECK (current_app_role() = 'customer');
CREATE POLICY "customer_read_own_requests" ON service_requests
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = auth.jwt() ->> 'session_token')
  );
CREATE POLICY "staff_manage_service_requests" ON service_requests
  FOR ALL USING (
    current_app_role() IN ('waiter', 'manager', 'super_admin')
    AND restaurant_id = current_restaurant_id()
  );

-- BILL SPLITS
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_read_bill_splits" ON bill_splits
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = auth.jwt() ->> 'session_token')
    OR current_app_role() IN ('waiter', 'manager', 'super_admin')
  );
CREATE POLICY "staff_manage_bill_splits" ON bill_splits
  FOR ALL USING (current_app_role() IN ('waiter', 'manager', 'super_admin'));

-- BILL SPLIT ITEMS
ALTER TABLE bill_split_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_bill_split_items" ON bill_split_items
  FOR SELECT USING (
    bill_split_id IN (SELECT id FROM bill_splits WHERE session_id IN (
      SELECT id FROM sessions WHERE session_token = auth.jwt() ->> 'session_token'
    ))
    OR current_app_role() IN ('waiter', 'manager', 'super_admin')
  );
CREATE POLICY "staff_manage_split_items" ON bill_split_items
  FOR ALL USING (current_app_role() IN ('waiter', 'manager', 'super_admin'));

-- LANGUAGES
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_languages" ON supported_languages
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "manager_write_languages" ON supported_languages
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- TRANSLATIONS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_translations" ON translations
  FOR SELECT USING (TRUE);
CREATE POLICY "manager_write_translations" ON translations
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- TAKEOUT ORDERS
ALTER TABLE takeout_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_read_own_takeout" ON takeout_orders
  FOR SELECT USING (loyalty_member_id IN (SELECT id FROM loyalty_members WHERE auth_user_id = auth.uid()));
CREATE POLICY "staff_manage_takeout" ON takeout_orders
  FOR ALL USING (current_app_role() IN ('kitchen', 'waiter', 'manager', 'super_admin') AND restaurant_id = current_restaurant_id());

-- STAFF SHIFTS
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_read_own_shifts" ON staff_shifts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "manager_manage_shifts" ON staff_shifts
  FOR ALL USING (current_app_role() IN ('manager', 'super_admin') AND restaurant_id = current_restaurant_id());
