-- =============================================================================
-- Fix Assessment & Related Table RLS for Super Admin
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

BEGIN;

-- ── 1. ASSESSMENTS ────────────────────────────────────────────────────────────
-- Drop ALL existing assessment policies that might conflict
DROP POLICY IF EXISTS "Users can view org assessments"             ON public.assessments;
DROP POLICY IF EXISTS "HR can manage org assessments"             ON public.assessments;
DROP POLICY IF EXISTS "Super admins can view all assessments"     ON public.assessments;
DROP POLICY IF EXISTS "Super admins can manage all assessments"   ON public.assessments;

-- Recreate: org members see their org's assessments
CREATE POLICY "Users can view org assessments" ON public.assessments
  FOR SELECT USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Recreate: HR roles manage their org's assessments
CREATE POLICY "HR can manage org assessments" ON public.assessments
  FOR ALL USING (
    (
      organization_id = public.get_user_organization_id(auth.uid()) AND
      (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager'))
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- ── 2. ASSESSMENT RESPONSES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view org assessment responses"    ON public.assessment_responses;
DROP POLICY IF EXISTS "HR can manage assessment responses"         ON public.assessment_responses;
DROP POLICY IF EXISTS "Super admins can view all assessment responses" ON public.assessment_responses;

CREATE POLICY "Users can view org assessment responses" ON public.assessment_responses
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "HR can manage assessment responses" ON public.assessment_responses
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_id
        AND a.organization_id = public.get_user_organization_id(auth.uid())
      ) AND (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager'))
    )
  );

-- ── 3. CATEGORY SCORES ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view org category scores"        ON public.category_scores;
DROP POLICY IF EXISTS "HR can manage category scores"             ON public.category_scores;
DROP POLICY IF EXISTS "Super admins can view all category scores" ON public.category_scores;

CREATE POLICY "Users can view org category scores" ON public.category_scores
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "HR can manage category scores" ON public.category_scores
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_id
        AND a.organization_id = public.get_user_organization_id(auth.uid())
      ) AND (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager'))
    )
  );

-- ── 4. ORGANIZATIONS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own organization"           ON public.organizations;
DROP POLICY IF EXISTS "HR Admins can update own organization"     ON public.organizations;
DROP POLICY IF EXISTS "Super admins can view all organizations"   ON public.organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow org creation during signup"         ON public.organizations;

CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (
    id = public.get_user_organization_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "HR Admins can update own organization" ON public.organizations
  FOR UPDATE USING (
    id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Super admins can manage all organizations" ON public.organizations
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Allow org creation during signup" ON public.organizations
  FOR INSERT WITH CHECK (true);

-- ── 5. ACTION PLANS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view org action plans"           ON public.action_plans;
DROP POLICY IF EXISTS "HR can manage action plans"                ON public.action_plans;
DROP POLICY IF EXISTS "Super admins can manage all action plans"  ON public.action_plans;

CREATE POLICY "Users can view org action plans" ON public.action_plans
  FOR SELECT USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "HR can manage action plans" ON public.action_plans
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      organization_id = public.get_user_organization_id(auth.uid()) AND
      (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager'))
    )
  );

-- ── 6. PROFILES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles"      ON public.profiles;

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));

-- ── VERIFY: List all policies on key tables ───────────────────────────────────
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('assessments', 'assessment_responses', 'category_scores', 'organizations', 'action_plans', 'profiles')
ORDER BY tablename, policyname;

COMMIT;
