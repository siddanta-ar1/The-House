-- ============================================================
-- SRMS — place_order RPC
-- ACID-safe order placement with inventory locking,
-- modifier support, dynamic pricing, promo codes,
-- loyalty points, ingredient deduction, and financial tracking
-- ============================================================

CREATE OR REPLACE FUNCTION place_order(
  p_session_id UUID,
  p_items JSONB,
  p_customer_note TEXT DEFAULT NULL,
  p_seat_id UUID DEFAULT NULL,
  p_promo_code TEXT DEFAULT NULL,
  p_loyalty_member_id UUID DEFAULT NULL
)
RETURNS JSONB  -- returns { order_id, subtotal, discount, tax, total, points_earned }
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
  v_discount NUMERIC(10,2) := 0;
  -- Tax
  v_tax_rate NUMERIC(6,2) := 0;
  v_tax NUMERIC(10,2) := 0;
  -- Loyalty
  v_loyalty_config RECORD;
  v_points_earned INTEGER := 0;
  -- Ingredients
  v_recipe RECORD;
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

  -- 1b. Load restaurant tax rate from settings
  SELECT COALESCE((features_v2->>'defaultTaxRate')::NUMERIC, 0) INTO v_tax_rate
  FROM settings
  WHERE restaurant_id = v_restaurant_id;

  -- 2. Create the order record
  INSERT INTO orders (session_id, restaurant_id, customer_note, seat_id, loyalty_member_id)
  VALUES (p_session_id, v_restaurant_id, p_customer_note, p_seat_id, p_loyalty_member_id)
  RETURNING id INTO v_order_id;

  -- 3. Process each line item with stock check
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock the menu_item row to prevent concurrent depletion
    -- Use FOR UPDATE (not SKIP LOCKED) so concurrent transactions WAIT
    -- instead of skipping the row and falsely returning NOT FOUND
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND restaurant_id = v_restaurant_id
      AND is_available = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ITEM_UNAVAILABLE: Item % is unavailable',
        v_item->>'menu_item_id';
    END IF;

    -- 3a. Get effective price (applies happy hour / dynamic pricing rules)
    v_effective_price := get_effective_price(v_menu_item.id);

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

    -- 3b. Deduct ingredients (if recipe management is configured)
    FOR v_recipe IN
      SELECT r.ingredient_id, r.quantity_needed
      FROM recipes r
      WHERE r.menu_item_id = v_menu_item.id
    LOOP
      UPDATE ingredients
      SET stock_quantity = stock_quantity - (v_recipe.quantity_needed * (v_item->>'quantity')::SMALLINT),
          updated_at = NOW()
      WHERE id = v_recipe.ingredient_id;

      -- Log the movement
      INSERT INTO ingredient_movements (ingredient_id, movement_type, quantity, reference_id)
      VALUES (
        v_recipe.ingredient_id,
        'usage',
        -(v_recipe.quantity_needed * (v_item->>'quantity')::SMALLINT),
        v_order_id
      );
    END LOOP;

    -- Insert order item with effective (dynamic) price snapshot
    INSERT INTO order_items (
      order_id, menu_item_id, quantity, unit_price, special_request
    ) VALUES (
      v_order_id,
      v_menu_item.id,
      (v_item->>'quantity')::SMALLINT,
      v_effective_price,
      v_item->>'special_request'
    )
    RETURNING id INTO v_order_item_id;

    -- Start with effective price × quantity
    v_item_total := v_effective_price * (v_item->>'quantity')::SMALLINT;

    -- 4. Process modifiers for this item (if any)
    IF v_item ? 'modifiers' AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      FOR v_modifier IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT * INTO v_mod_record
        FROM menu_item_modifiers
        WHERE id = (v_modifier->>'modifier_id')::UUID
          AND is_available = TRUE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'MODIFIER_UNAVAILABLE: Modifier % is unavailable',
            v_modifier->>'modifier_id';
        END IF;

        -- Snapshot modifier into order_item_modifiers
        INSERT INTO order_item_modifiers (
          order_item_id, modifier_id, modifier_name, price_adjustment
        ) VALUES (
          v_order_item_id,
          v_mod_record.id,
          v_mod_record.name,
          v_mod_record.price_adjustment
        );

        -- Add modifier price × item quantity
        v_item_total := v_item_total + (v_mod_record.price_adjustment * (v_item->>'quantity')::SMALLINT);
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
          -- Give the price of the free item as discount
          IF v_promo.free_item_id IS NOT NULL THEN
            SELECT price INTO v_discount FROM menu_items WHERE id = v_promo.free_item_id;
            v_discount := COALESCE(v_discount, 0);
          END IF;
        WHEN 'bogo' THEN
          -- Give the cheaper item free
          IF v_promo.bogo_get_item_id IS NOT NULL THEN
            SELECT price INTO v_discount FROM menu_items WHERE id = v_promo.bogo_get_item_id;
            v_discount := COALESCE(v_discount, 0);
          END IF;
      END CASE;

      -- Record the promo usage
      INSERT INTO order_promos (order_id, promo_code_id, code_used, discount_amount)
      VALUES (v_order_id, v_promo.id, v_promo.code, v_discount);

      -- Increment usage counter
      UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;
    END IF;
    -- If promo not found or invalid, silently skip (no error — let user know via response)
  END IF;

  -- 6. Calculate tax on (subtotal - discount)
  v_tax := ROUND((v_subtotal - v_discount) * v_tax_rate / 100, 2);

  -- 7. Update order financial totals
  UPDATE orders
  SET subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      promo_code_id = CASE WHEN v_discount > 0 THEN v_promo.id ELSE NULL END,
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

      -- Credit points
      UPDATE loyalty_members
      SET points_balance = points_balance + v_points_earned,
          lifetime_points = lifetime_points + v_points_earned,
          lifetime_spend = lifetime_spend + (v_subtotal - v_discount + v_tax),
          visit_count = visit_count + 1,
          last_visit_at = NOW(),
          -- Auto-upgrade tier
          tier = CASE
            WHEN lifetime_points + v_points_earned >= v_loyalty_config.platinum_threshold THEN 'platinum'
            WHEN lifetime_points + v_points_earned >= v_loyalty_config.gold_threshold THEN 'gold'
            WHEN lifetime_points + v_points_earned >= v_loyalty_config.silver_threshold THEN 'silver'
            ELSE 'bronze'
          END,
          updated_at = NOW()
      WHERE id = p_loyalty_member_id;

      -- Log the transaction
      INSERT INTO loyalty_transactions (member_id, order_id, type, points, description)
      VALUES (p_loyalty_member_id, v_order_id, 'earn', v_points_earned,
        'Earned ' || v_points_earned || ' points on order ' || v_order_id::TEXT);
    END IF;
  END IF;

  -- Return rich response
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
