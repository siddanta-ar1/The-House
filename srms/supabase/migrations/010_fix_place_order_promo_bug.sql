-- ============================================================
-- Fix: v_promo not assigned when no promo code is provided
-- The UPDATE at the end references v_promo.id even when
-- p_promo_code IS NULL, causing "record not assigned yet"
-- ============================================================

CREATE OR REPLACE FUNCTION place_order(
  p_session_id UUID,
  p_items JSONB,
  p_customer_note TEXT DEFAULT NULL,
  p_seat_id UUID DEFAULT NULL,
  p_promo_code TEXT DEFAULT NULL,
  p_loyalty_member_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_restaurant_id UUID;
  v_item JSONB;
  v_menu_item menu_items%ROWTYPE;
  v_subtotal NUMERIC(10,2) := 0;
  v_order_item_id UUID;
  v_modifier JSONB;
  v_mod_record menu_item_modifiers%ROWTYPE;
  v_item_total NUMERIC(10,2);
  v_effective_price NUMERIC(10,2);
  -- Promo
  v_promo RECORD;
  v_promo_id UUID := NULL;  -- Track promo ID separately to avoid accessing unassigned record
  v_discount NUMERIC(10,2) := 0;
  -- Tax
  v_tax_rate NUMERIC(6,2) := 0;
  v_tax NUMERIC(10,2) := 0;
  -- Loyalty
  v_loyalty_config RECORD;
  v_points_earned INTEGER := 0;
  -- Ingredients
  v_ingredient RECORD;
  v_required_qty NUMERIC;
BEGIN
  -- 1. Validate session & get restaurant_id
  SELECT s.restaurant_id INTO v_restaurant_id
  FROM sessions s
  WHERE s.id = p_session_id AND s.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_SESSION: Session not found or inactive';
  END IF;

  -- Get tax rate from settings
  SELECT COALESCE((s.tax_config->>'tax_rate')::NUMERIC, 0) INTO v_tax_rate
  FROM settings s WHERE s.restaurant_id = v_restaurant_id;

  -- 2. Create the order
  INSERT INTO orders (
    session_id, restaurant_id, status, payment_status,
    customer_note, placed_at
  ) VALUES (
    p_session_id, v_restaurant_id, 'pending', 'unpaid',
    p_customer_note, NOW()
  )
  RETURNING id INTO v_order_id;

  -- 3. Process each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock menu item row — prevents concurrent stock modifications
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND restaurant_id = v_restaurant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ITEM_UNAVAILABLE: Menu item % not found', v_item->>'menu_item_id';
    END IF;

    IF NOT v_menu_item.is_available THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: % is currently unavailable', v_menu_item.name;
    END IF;

    -- 3a. Check inventory for each ingredient
    FOR v_ingredient IN
      SELECT mi.ingredient_id, mi.quantity_per_item, i.name, i.current_stock
      FROM menu_item_ingredients mi
      JOIN ingredients i ON i.id = mi.ingredient_id
      WHERE mi.menu_item_id = v_menu_item.id
    LOOP
      v_required_qty := v_ingredient.quantity_per_item * (v_item->>'quantity')::SMALLINT;
      IF v_ingredient.current_stock < v_required_qty THEN
        RAISE EXCEPTION 'OUT_OF_STOCK: Not enough % in stock for %', v_ingredient.name, v_menu_item.name;
      END IF;

      -- Deduct ingredient stock
      UPDATE ingredients
      SET current_stock = current_stock - v_required_qty,
          updated_at = NOW()
      WHERE id = v_ingredient.ingredient_id;

      -- Log the ingredient movement
      INSERT INTO ingredient_movements (ingredient_id, movement_type, quantity, reference_id, notes)
      VALUES (v_ingredient.ingredient_id, 'order_deduction', v_required_qty, v_order_id,
              'Auto-deducted for order ' || v_order_id::TEXT);
    END LOOP;

    -- 3b. Calculate effective price (check pricing rules)
    v_effective_price := v_menu_item.price;
    
    -- Check for active pricing rule (time-based, happy hour, etc.)
    DECLARE
      v_pricing_rule RECORD;
    BEGIN
      SELECT * INTO v_pricing_rule
      FROM pricing_rules
      WHERE menu_item_id = v_menu_item.id
        AND is_active = TRUE
        AND (start_time IS NULL OR start_time <= CURRENT_TIME)
        AND (end_time IS NULL OR end_time >= CURRENT_TIME)
        AND (valid_days IS NULL OR EXTRACT(DOW FROM CURRENT_DATE)::TEXT = ANY(
          SELECT jsonb_array_elements_text(valid_days)
        ))
      ORDER BY created_at DESC
      LIMIT 1;

      IF FOUND THEN
        IF v_pricing_rule.rule_type = 'discount_percentage' THEN
          v_effective_price := ROUND(v_menu_item.price * (1 - v_pricing_rule.value / 100), 2);
        ELSIF v_pricing_rule.rule_type = 'fixed_price' THEN
          v_effective_price := v_pricing_rule.value;
        ELSIF v_pricing_rule.rule_type = 'surcharge_percentage' THEN
          v_effective_price := ROUND(v_menu_item.price * (1 + v_pricing_rule.value / 100), 2);
        END IF;
      END IF;
    END;

    -- 3c. Insert order item
    INSERT INTO order_items (
      order_id, menu_item_id, quantity, unit_price, special_request
    ) VALUES (
      v_order_id, v_menu_item.id, (v_item->>'quantity')::SMALLINT,
      v_effective_price, v_item->>'special_request'
    )
    RETURNING id INTO v_order_item_id;

    v_item_total := v_effective_price * (v_item->>'quantity')::SMALLINT;

    -- 3d. Process modifiers for this item
    IF v_item ? 'modifiers' AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT * INTO v_mod_record
        FROM menu_item_modifiers
        WHERE id = (v_modifier->>'modifier_id')::UUID
          AND menu_item_id = v_menu_item.id;

        IF FOUND THEN
          INSERT INTO order_item_modifiers (
            order_item_id, modifier_name, price_adjustment
          ) VALUES (
            v_order_item_id, v_mod_record.name, v_mod_record.price_adjustment
          );

          -- Add modifier price × item quantity
          v_item_total := v_item_total + (v_mod_record.price_adjustment * (v_item->>'quantity')::SMALLINT);
        END IF;
      END LOOP;
    END IF;

    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 5. Apply promo code (if provided)
  IF p_promo_code IS NOT NULL THEN
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE restaurant_id = v_restaurant_id
      AND code = UPPER(TRIM(p_promo_code))
      AND is_active = TRUE
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (max_uses IS NULL OR current_uses < max_uses)
      AND min_order_amount <= v_subtotal
    FOR UPDATE;

    IF FOUND THEN
      -- Track the promo ID safely
      v_promo_id := v_promo.id;
      
      -- Calculate discount based on type
      CASE v_promo.promo_type
        WHEN 'percentage_off' THEN
          v_discount := ROUND(v_subtotal * v_promo.value / 100, 2);
          IF v_promo.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_promo.max_discount_amount);
          END IF;
        WHEN 'amount_off' THEN
          v_discount := LEAST(v_promo.value, v_subtotal);
        WHEN 'free_item' THEN
          IF v_promo.free_item_id IS NOT NULL THEN
            SELECT price INTO v_discount FROM menu_items WHERE id = v_promo.free_item_id;
            v_discount := COALESCE(v_discount, 0);
          END IF;
        WHEN 'bogo' THEN
          IF v_promo.bogo_get_item_id IS NOT NULL THEN
            SELECT price INTO v_discount FROM menu_items WHERE id = v_promo.bogo_get_item_id;
            v_discount := COALESCE(v_discount, 0);
          END IF;
      END CASE;

      -- Record the promo usage
      INSERT INTO order_promos (order_id, promo_code_id, code_used, discount_amount)
      VALUES (v_order_id, v_promo_id, v_promo.code, v_discount);

      -- Increment usage counter
      UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo_id;
    END IF;
  END IF;

  -- 6. Calculate tax on (subtotal - discount)
  v_tax := ROUND((v_subtotal - v_discount) * v_tax_rate / 100, 2);

  -- 7. Update order financial totals (use v_promo_id instead of v_promo.id)
  UPDATE orders
  SET subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      promo_code_id = v_promo_id,
      tax_amount = v_tax,
      total_amount = v_subtotal - v_discount + v_tax
  WHERE id = v_order_id;

  -- 8. Award loyalty points (if member linked)
  IF p_loyalty_member_id IS NOT NULL THEN
    SELECT * INTO v_loyalty_config
    FROM loyalty_config
    WHERE restaurant_id = v_restaurant_id AND is_active = TRUE;

    IF FOUND THEN
      v_points_earned := FLOOR((v_subtotal - v_discount) * v_loyalty_config.points_per_dollar);

      UPDATE loyalty_members
      SET total_points = total_points + v_points_earned,
          available_points = available_points + v_points_earned,
          updated_at = NOW()
      WHERE id = p_loyalty_member_id;

      INSERT INTO loyalty_transactions (
        member_id, type, points, reference_id, description
      ) VALUES (
        p_loyalty_member_id, 'earn', v_points_earned, v_order_id,
        'Earned from order #' || SUBSTR(v_order_id::TEXT, 1, 8)
      );
    END IF;
  END IF;

  -- 9. Return order details as JSONB
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'tax', v_tax,
    'total', v_subtotal - v_discount + v_tax,
    'points_earned', v_points_earned
  );
END;
$$;
