-- Create Head Admin User Account (Name: Head Admin, Email: headadmin@dodz.com, Password: headadmin123)
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
    'headadmin@dodz.com',
    crypt('headadmin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Head Admin"}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- 2. Update the automatically generated profile to have the HEAD_ADMIN role
  UPDATE public.profiles
  SET 
    full_name = 'Head Admin',
    role = 'HEAD_ADMIN',
    phone = '01055556666'
  WHERE id = new_user_id;

END $$;
