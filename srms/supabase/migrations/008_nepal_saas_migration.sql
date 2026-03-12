-- ============================================================
-- Migration 008: Nepal Market + SaaS Architecture
-- Adds Nepal-specific payment, VAT/PAN compliance, phone OTP,
-- SaaS subscription billing, custom domain routing, feature 
-- flag enforcement, and plan-tiered limits.
-- ============================================================

-- ============================================================
-- 1. ALTER restaurants: Add Nepal business fields + SaaS fields
-- ============================================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS pan_number      TEXT,              -- Nepal IRD PAN/VAT number
  ADD COLUMN IF NOT EXISTS vat_registered  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_qr_url  TEXT,              -- Static NepalPay/Fonepay/eSewa QR image URL
  ADD COLUMN IF NOT EXISTS payment_qr_label TEXT DEFAULT 'Scan to Pay', -- Label shown to customer
  ADD COLUMN IF NOT EXISTS custom_domain   TEXT UNIQUE,       -- White-label: menu.hotelhimalaya.com
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free','basic','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active','past_due','suspended','cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,           -- Stripe customer for SaaS billing (NOT customer payments)
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 2. Update settings.features_v2: Add Nepal-specific defaults
-- ============================================================
-- Update existing features_v2 to include new keys (idempotent)
UPDATE settings
SET features_v2 = features_v2 || '{
  "nepalPayEnabled": false,
  "vatEnabled": false,
  "phoneOtpEnabled": false,
  "bsDateEnabled": false
}'::jsonb
WHERE features_v2 IS NOT NULL
  AND NOT (features_v2 ? 'nepalPayEnabled');

-- ============================================================
-- 3. SaaS Subscription Plans table
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,  -- 'free', 'basic', 'pro', 'enterprise'
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_menu_items INTEGER NOT NULL DEFAULT 50,
  max_staff INTEGER NOT NULL DEFAULT 5,
  max_tables INTEGER NOT NULL DEFAULT 10,
  max_orders_per_month INTEGER,  -- NULL = unlimited
  features_included JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, max_menu_items, max_staff, max_tables, max_orders_per_month, features_included) VALUES
  ('free', 'Free', 0, 0, 25, 3, 5, 100, '{"loyaltyEnabled":false,"takeoutEnabled":false,"dynamicPricingEnabled":false,"ingredientTrackingEnabled":false,"staffShiftsEnabled":false,"splitBillingEnabled":false,"serviceRequestsEnabled":true}'),
  ('basic', 'Basic', 29.99, 299.99, 100, 10, 20, 1000, '{"loyaltyEnabled":false,"takeoutEnabled":true,"dynamicPricingEnabled":false,"ingredientTrackingEnabled":false,"staffShiftsEnabled":false,"splitBillingEnabled":true,"serviceRequestsEnabled":true}'),
  ('pro', 'Pro', 79.99, 799.99, 500, 50, 100, NULL, '{"loyaltyEnabled":true,"takeoutEnabled":true,"dynamicPricingEnabled":true,"ingredientTrackingEnabled":true,"staffShiftsEnabled":true,"splitBillingEnabled":true,"serviceRequestsEnabled":true}'),
  ('enterprise', 'Enterprise', 199.99, 1999.99, 2000, 200, 500, NULL, '{"loyaltyEnabled":true,"takeoutEnabled":true,"dynamicPricingEnabled":true,"ingredientTrackingEnabled":true,"staffShiftsEnabled":true,"splitBillingEnabled":true,"serviceRequestsEnabled":true}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Payment Verification table (QR-based Nepal payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  takeout_order_id UUID REFERENCES takeout_orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'qr_scan'
    CHECK (payment_method IN ('qr_scan','esewa','khalti','fonepay','cash','card','stripe')),
  customer_claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_verified BOOLEAN NOT NULL DEFAULT FALSE,
  staff_verified_by UUID REFERENCES auth.users(id),
  staff_verified_at TIMESTAMPTZ,
  staff_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  reference_code TEXT,  -- Customer can paste transaction ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_verifications_pending
  ON payment_verifications (restaurant_id, staff_verified)
  WHERE staff_verified = FALSE AND staff_rejected = FALSE;

-- ============================================================
-- 5. IRD Invoice Sequence (per-restaurant sequential numbering)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_sequences (
  restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  current_number BIGINT NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'INV',
  fiscal_year TEXT NOT NULL DEFAULT '2082/83',  -- Nepali BS fiscal year
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function: Atomically generate next invoice number
CREATE OR REPLACE FUNCTION next_invoice_number(p_restaurant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_num BIGINT;
BEGIN
  UPDATE invoice_sequences
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE restaurant_id = p_restaurant_id
  RETURNING prefix, fiscal_year, current_number
  INTO v_prefix, v_fy, v_num;

  -- Auto-create sequence if not exists
  IF NOT FOUND THEN
    INSERT INTO invoice_sequences (restaurant_id) VALUES (p_restaurant_id)
    ON CONFLICT (restaurant_id) DO UPDATE SET current_number = invoice_sequences.current_number + 1
    RETURNING prefix, fiscal_year, current_number
    INTO v_prefix, v_fy, v_num;
  END IF;

  RETURN v_prefix || '-' || v_fy || '-' || LPAD(v_num::TEXT, 6, '0');
END;
$$;

-- Add invoice_number to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,        -- Snapshot of restaurant PAN at time of order
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0;

-- ============================================================
-- 6. Nepali Date (B.S.) helper — lightweight lookup
-- ============================================================
-- We store a simple conversion function for display purposes.
-- Full BS calendar conversion is done in the frontend (TypeScript).
-- The DB just stores the BS date string alongside the AD date.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_date_bs TEXT;  -- e.g. '2082-11-28'

ALTER TABLE eod_reports
  ADD COLUMN IF NOT EXISTS report_date_bs TEXT;

-- ============================================================
-- 7. Phone OTP tokens (for local SMS providers)
-- ============================================================
CREATE TABLE IF NOT EXISTS phone_otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login'
    CHECK (purpose IN ('login','verify','loyalty_signup')),
  restaurant_id UUID REFERENCES restaurants(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_otp_active
  ON phone_otp_tokens (phone, purpose)
  WHERE used = FALSE;

-- ============================================================
-- 8. Custom Domain Mapping index
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_custom_domain
  ON restaurants (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- ============================================================
-- 9. RLS Policies for new tables
-- ============================================================
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_otp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Payment verifications: staff reads/writes own restaurant
CREATE POLICY "Staff can view payment verifications"
  ON payment_verifications FOR SELECT
  USING (restaurant_id = current_restaurant_id());

CREATE POLICY "Staff can update payment verifications"
  ON payment_verifications FOR UPDATE
  USING (restaurant_id = current_restaurant_id() AND current_app_role() IN ('waiter','manager','super_admin'));

CREATE POLICY "Anyone can create payment verification"
  ON payment_verifications FOR INSERT
  WITH CHECK (TRUE);

-- Invoice sequences: admin manages
CREATE POLICY "Admin can manage invoice sequences"
  ON invoice_sequences FOR ALL
  USING (restaurant_id = current_restaurant_id() AND current_app_role() IN ('manager','super_admin'));

-- Subscription plans: public read
CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admin manages subscription plans"
  ON subscription_plans FOR ALL
  USING (current_app_role() = 'super_admin');

-- Phone OTP: service role only (server-side)
CREATE POLICY "Service role manages OTP"
  ON phone_otp_tokens FOR ALL
  USING (TRUE); -- Protected by service_role usage in server actions only

-- ============================================================
-- 10. Plan limit enforcement helper function
-- ============================================================
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_restaurant_id UUID,
  p_resource TEXT  -- 'menu_items', 'staff', 'tables'
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_tier TEXT;
  v_plan subscription_plans;
  v_current_count INTEGER;
  v_max_allowed INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier FROM restaurants WHERE id = p_restaurant_id;
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_tier;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no plan restrictions');
  END IF;

  CASE p_resource
    WHEN 'menu_items' THEN
      SELECT COUNT(*) INTO v_current_count FROM menu_items WHERE restaurant_id = p_restaurant_id;
      v_max_allowed := v_plan.max_menu_items;
    WHEN 'staff' THEN
      SELECT COUNT(*) INTO v_current_count FROM users WHERE restaurant_id = p_restaurant_id;
      v_max_allowed := v_plan.max_staff;
    WHEN 'tables' THEN
      SELECT COUNT(*) INTO v_current_count FROM tables WHERE restaurant_id = p_restaurant_id;
      v_max_allowed := v_plan.max_tables;
    ELSE
      RETURN jsonb_build_object('allowed', true, 'reason', 'unknown resource');
  END CASE;

  IF v_current_count >= v_max_allowed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', v_current_count,
      'max', v_max_allowed,
      'tier', v_tier,
      'reason', format('Your %s plan allows up to %s %s. Please upgrade.', v_tier, v_max_allowed, p_resource)
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', v_current_count, 'max', v_max_allowed, 'tier', v_tier);
END;
$$;
