-- Fix the ENUM type by adding HEAD_ADMIN, and then update the user's role.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'HEAD_ADMIN';

-- Update the profile that was created earlier to the correct role
UPDATE public.profiles
SET role = 'HEAD_ADMIN'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'headadmin@dodz.com'
);
