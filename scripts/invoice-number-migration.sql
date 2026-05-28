-- Invoice Number Migration
-- Run in Supabase SQL Editor

-- Add invoice_number to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Per-restaurant sequential counter (reset never — numbers are globally unique per restaurant)
CREATE TABLE IF NOT EXISTS invoice_sequences (
    restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    last_sequence INTEGER DEFAULT 0 NOT NULL
);

-- Atomically increment and return the next invoice number for a restaurant.
-- Format: INV-YYYY-{5-digit zero-padded sequence}
-- e.g. INV-2026-00001, INV-2026-00002, …
CREATE OR REPLACE FUNCTION generate_invoice_number(p_restaurant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seq INTEGER;
    v_year TEXT := to_char(NOW() AT TIME ZONE 'Asia/Kathmandu', 'YYYY');
BEGIN
    INSERT INTO invoice_sequences (restaurant_id, last_sequence)
    VALUES (p_restaurant_id, 1)
    ON CONFLICT (restaurant_id) DO UPDATE
        SET last_sequence = invoice_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    RETURN 'INV-' || v_year || '-' || lpad(v_seq::TEXT, 5, '0');
END;
$$;

-- Trigger: auto-assign invoice number when an order becomes paid for the first time
CREATE OR REPLACE FUNCTION assign_invoice_on_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only when transitioning TO paid and no invoice yet
    IF NEW.payment_status = 'paid'
       AND (OLD.payment_status IS DISTINCT FROM 'paid')
       AND NEW.invoice_number IS NULL
    THEN
        NEW.invoice_number := generate_invoice_number(NEW.restaurant_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_invoice ON orders;
CREATE TRIGGER trg_assign_invoice
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_invoice_on_paid();

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS orders_invoice_number_idx ON orders (invoice_number) WHERE invoice_number IS NOT NULL;
