-- 1. DROP the problematic trigger that is causing the error.
-- It's trying to insert into a 'public.users' table that doesn't exist.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. DROP the function the trigger was calling to completely clean up.
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Now that the buggy trigger is gone, you can safely create the user.
-- 3. Create the Admin User
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@thehouse.com',
  crypt('HouseAdmin2026!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
