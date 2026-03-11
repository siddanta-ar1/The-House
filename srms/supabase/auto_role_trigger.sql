-- ============================================================
-- AUTO-ASSIGN ADMIN ROLE TRIGGER (FOR DEMO/TESTING ONLY)
-- Automatically inserts a new user into the public.users table 
-- as a super_admin for the Demo Restaurant whenever they sign up.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_auto_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, restaurant_id, full_name, role_id)
  VALUES (
    NEW.id, 
    '11111111-1111-1111-1111-111111111111'::UUID, -- Demo Restaurant ID
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Test Admin User'), 
    1 -- Super Admin Role
  );
  RETURN NEW;
END;
$$;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_auto_admin();
