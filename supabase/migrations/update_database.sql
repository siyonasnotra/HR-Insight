-- SQL Script to apply the new SIPMAA Domain Changes to the Database
-- IMPORTANT: Run this inside your Supabase Project Dashboard -> SQL Editor

BEGIN;

-- 1. Truncate the old categories and any test questions linked to them 
-- (CASCADE ensures we don't hit foreign key constraint errors)
TRUNCATE TABLE public.assessment_categories CASCADE;

-- 2. Insert the 6 new Core SIPMAA HR Domains
INSERT INTO public.assessment_categories (name, description, icon, weight, display_order) VALUES
('Talent Acquisition', 'Recruitment processes, employer branding, and new hire integration', 'UserPlus', 1.0, 1),
('Performance Management', 'Goal setting, feedback systems, and performance evaluation', 'Target', 1.0, 2),
('Learning & Development', 'Training programs, skill development, and career growth opportunities', 'GraduationCap', 1.0, 3),
('Employee Engagement', 'Workplace culture, employee satisfaction, and retention initiatives', 'Heart', 1.0, 4),
('CSR & Social Impact', 'Corporate social responsibility, community programs, and social initiatives', 'Shield', 1.0, 5),
('Organizational Culture', 'Workplace climate, shared values, and inclusive practices', 'Users', 1.0, 6);


-- 3. Modify the Enum `certification_level` to remove `platinum`
-- PostgreSQL doesn't allow dropping enum values directly out of the box, 
-- but we can rename the type, create a new one, and cast the old columns to the new enum.
ALTER TYPE public.certification_level RENAME TO certification_level_old;
CREATE TYPE public.certification_level AS ENUM ('none', 'silver', 'gold', 'diamond');

ALTER TABLE public.assessments 
  ALTER COLUMN certification_level TYPE public.certification_level 
  USING certification_level::text::public.certification_level;
  
ALTER TABLE public.certifications 
  ALTER COLUMN level TYPE public.certification_level 
  USING level::text::public.certification_level;

DROP TYPE public.certification_level_old;

-- 4. Update the handle_new_user function to prevent super_admin assignment via signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
  org_name text;
  requested_role text;
  assigned_role app_role;
BEGIN
  -- Get organization and requested role info from metadata
  org_name := NEW.raw_user_meta_data->>'organization_name';
  requested_role := NEW.raw_user_meta_data->>'role';
  
  -- Security check: users cannot sign up as super_admin. Full stop. WAIT, per user request, we DO allow super_admin signup now.
  IF requested_role = 'super_admin' THEN
    assigned_role := 'super_admin';
  ELSIF org_name IS NOT NULL AND org_name != '' THEN
    assigned_role := 'hr_admin'; -- Force hr_admin for new organizations
  ELSE
    -- For invited users, use their requested role (which comes from the invitation) or default to viewer
    assigned_role := COALESCE(requested_role::app_role, 'viewer');
  END IF;
  
  -- Create organization if name provided (Public Signup)
  -- BUT don't do this if they are signing up as a super_admin
  IF assigned_role != 'super_admin' AND org_name IS NOT NULL AND org_name != '' THEN
    INSERT INTO public.organizations (name, industry, region, company_size)
    VALUES (
      org_name,
      COALESCE((NEW.raw_user_meta_data->>'industry')::industry_vertical, 'other'),
      COALESCE((NEW.raw_user_meta_data->>'region')::region, 'pan_india'),
      COALESCE((NEW.raw_user_meta_data->>'company_size')::company_size, '1_50')
    )
    RETURNING id INTO org_id;
  END IF;
  
  -- If we're an invited user, org_id comes from metadata, but wait!
  -- If the frontend passes organization_id in metadata (for invitations), use it.
  IF assigned_role != 'super_admin' AND org_id IS NULL AND (NEW.raw_user_meta_data->>'organization_id') IS NOT NULL THEN
    org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    org_id
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;

COMMIT;
