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
