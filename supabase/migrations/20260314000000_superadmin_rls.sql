-- Add RLS Policies for Super Admin global access
-- IMPORTANT: Run this inside your Supabase Project Dashboard -> SQL Editor

BEGIN;

-- 1. Profiles: Super admins should be able to view and manage all profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Super admins can view all profiles'
    ) THEN
        CREATE POLICY "Super admins can view all profiles" ON public.profiles
          FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Super admins can update all profiles'
    ) THEN
        CREATE POLICY "Super admins can update all profiles" ON public.profiles
          FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 2. Certifications: Super admins should be able to view and manage all certifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'certifications' AND policyname = 'Super admins can view all certifications'
    ) THEN
        CREATE POLICY "Super admins can view all certifications" ON public.certifications
          FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'certifications' AND policyname = 'Super admins can manage all certifications'
    ) THEN
        CREATE POLICY "Super admins can manage all certifications" ON public.certifications
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 3. Assessments: Super admins should be able to view all assessments (already partially handled but making explicit)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assessments' AND policyname = 'Super admins can view all assessments'
    ) THEN
        CREATE POLICY "Super admins can view all assessments" ON public.assessments
          FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

COMMIT;
