-- =============================================================================
-- Assign Super Admin Role to Specific User
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- User: siyona.snotra@mca.christuniversity.in
-- User ID: f8075237-6694-45ae-b418-0cfc3208187b
-- =============================================================================

BEGIN;

-- Step 1: Remove any existing role for this user (clean slate)
DELETE FROM public.user_roles 
WHERE user_id = 'f8075237-6694-45ae-b418-0cfc3208187b';

-- Step 2: Assign super_admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('f8075237-6694-45ae-b418-0cfc3208187b', 'super_admin');

-- Step 3: Ensure the profile has NO organization_id 
-- (super admins are platform-wide, not tied to any single org)
UPDATE public.profiles
SET organization_id = NULL
WHERE user_id = 'f8075237-6694-45ae-b418-0cfc3208187b';

-- Step 4: Verify the assignment was successful
SELECT 
  p.user_id,
  p.full_name,
  p.email,
  p.organization_id,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.user_id = 'f8075237-6694-45ae-b418-0cfc3208187b';

COMMIT;
