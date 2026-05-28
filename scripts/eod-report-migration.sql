-- EOD Z-Report Migration
-- Run in Supabase SQL Editor

-- ────────────────────────────────────────────────────────────
-- Table: eod_reports
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eod_reports (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    report_date     DATE        NOT NULL,
    total_orders    INTEGER     NOT NULL DEFAULT 0,
    total_revenue   NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_tax       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_tips      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_discounts NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
    cash_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    card_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_voids     INTEGER     NOT NULL DEFAULT 0,
    total_refunds   INTEGER     NOT NULL DEFAULT 0,
    total_cancelled INTEGER     NOT NULL DEFAULT 0,
    avg_order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cogs      NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_profit    NUMERIC(12,2) NOT NULL DEFAULT 0,
    closed_by       UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (restaurant_id, report_date)
);

CREATE INDEX IF NOT EXISTS eod_reports_restaurant_date
    ON eod_reports (restaurant_id, report_date DESC);

ALTER TABLE eod_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read their restaurant EOD reports"
    ON eod_reports FOR SELECT TO authenticated
    USING (restaurant_id IN (SELECT restaurant_id FROM users WHERE id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- Function: generate_eod_report(restaurant_id, date)
-- Aggregates paid orders for the given calendar day and
-- upserts the result into eod_reports.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_eod_report(
    p_restaurant_id UUID,
    p_report_date   DATE
)
RETURNS eod_reports
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start         TIMESTAMPTZ := p_report_date::TIMESTAMPTZ AT TIME ZONE 'Asia/Kathmandu';
    v_end           TIMESTAMPTZ := (p_report_date + INTERVAL '1 day')::TIMESTAMPTZ AT TIME ZONE 'Asia/Kathmandu';
    v_total_orders  INTEGER;
    v_gross         NUMERIC := 0;
    v_tax           NUMERIC := 0;
    v_discounts     NUMERIC := 0;
    v_cash          NUMERIC := 0;
    v_cancelled     INTEGER := 0;
    v_net           NUMERIC;
    v_avg           NUMERIC := 0;
    v_result        eod_reports;
BEGIN
    SELECT
        COUNT(*)                                      INTO v_total_orders
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND placed_at >= v_start
      AND placed_at <  v_end
      AND payment_status = 'paid';

    SELECT
        COALESCE(SUM(total_amount),    0),
        COALESCE(SUM(tax_amount),      0),
        COALESCE(SUM(discount_amount), 0)
    INTO v_gross, v_tax, v_discounts
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND placed_at >= v_start
      AND placed_at <  v_end
      AND payment_status = 'paid';

    -- Cash vs digital: join to payment_verifications for method
    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_cash
    FROM orders o
    JOIN payment_verifications pv ON pv.order_id = o.id AND pv.staff_verified = TRUE
    WHERE o.restaurant_id = p_restaurant_id
      AND o.placed_at >= v_start
      AND o.placed_at <  v_end
      AND o.payment_status = 'paid'
      AND pv.payment_method = 'cash';

    SELECT COUNT(*) INTO v_cancelled
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND placed_at >= v_start
      AND placed_at <  v_end
      AND status = 'cancelled';

    v_net := v_gross - v_tax;
    v_avg := CASE WHEN v_total_orders > 0 THEN v_gross / v_total_orders ELSE 0 END;

    INSERT INTO eod_reports (
        restaurant_id, report_date,
        total_orders, total_revenue, total_tax, total_tips, total_discounts,
        net_revenue, cash_total, card_total,
        total_voids, total_refunds, total_cancelled,
        avg_order_value, total_cogs, gross_profit
    ) VALUES (
        p_restaurant_id, p_report_date,
        v_total_orders, v_gross, v_tax, 0, v_discounts,
        v_net, v_cash, (v_gross - v_cash),
        0, 0, v_cancelled,
        v_avg, 0, v_net
    )
    ON CONFLICT (restaurant_id, report_date) DO UPDATE SET
        total_orders    = EXCLUDED.total_orders,
        total_revenue   = EXCLUDED.total_revenue,
        total_tax       = EXCLUDED.total_tax,
        total_discounts = EXCLUDED.total_discounts,
        net_revenue     = EXCLUDED.net_revenue,
        cash_total      = EXCLUDED.cash_total,
        card_total      = EXCLUDED.card_total,
        total_cancelled = EXCLUDED.total_cancelled,
        avg_order_value = EXCLUDED.avg_order_value,
        gross_profit    = EXCLUDED.gross_profit,
        created_at      = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;
