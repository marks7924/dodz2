-- Create Developer User Account (Name: Mark, Email: dev@dodz.com, Password: ch222ch222)
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- 1. Insert into auth.users (creating the login credential)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'dev@dodz.com',
    crypt('ch222ch222', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mark"}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- 2. Update the automatically generated profile to have the DEVELOPER role
  UPDATE public.profiles
  SET 
    full_name = 'Mark',
    role = 'DEVELOPER',
    phone = '01234567890'
  WHERE id = new_user_id;

END $$;
