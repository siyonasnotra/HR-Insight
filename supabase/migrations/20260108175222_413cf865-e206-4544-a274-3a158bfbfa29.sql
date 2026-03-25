
-- Fix overly permissive RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can manage category scores" ON public.category_scores;

-- Recreate with proper security (these are handled by trigger with SECURITY DEFINER)
-- Profiles: Allow insert during registration flow (handled by trigger)
CREATE POLICY "Allow profile creation during signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: Allow role creation during registration flow (handled by trigger)  
CREATE POLICY "Allow role creation during signup" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Category scores: Only HR managers and admins can manage
CREATE POLICY "HR can manage category scores" ON public.category_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Add INSERT policy for organizations (needed for registration)
CREATE POLICY "Allow org creation during signup" ON public.organizations
  FOR INSERT WITH CHECK (true);

-- Add INSERT policy for certifications
CREATE POLICY "HR can create certifications" ON public.certifications
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "HR can update certifications" ON public.certifications
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );
