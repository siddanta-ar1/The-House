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
