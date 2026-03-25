
-- =============================================================================
-- Comprehensive Super Admin RLS Policies
-- Ensures Super Admins can view and manage data across all organizations
-- =============================================================================

BEGIN;

-- 1. Organizations: Super admins should be able to view and manage all organizations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' AND policyname = 'Super admins can manage all organizations'
    ) THEN
        CREATE POLICY "Super admins can manage all organizations" ON public.organizations
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 2. Assessments: Super admins should be able to manage all assessments
DO $$ 
BEGIN
    -- Remove existing restricted policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assessments' AND policyname = 'Super admins can view all assessments'
    ) THEN
        DROP POLICY "Super admins can view all assessments" ON public.assessments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assessments' AND policyname = 'Super admins can manage all assessments'
    ) THEN
        CREATE POLICY "Super admins can manage all assessments" ON public.assessments
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 3. Assessment Responses: Super admins should be able to view all responses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assessment_responses' AND policyname = 'Super admins can view all assessment responses'
    ) THEN
        CREATE POLICY "Super admins can view all assessment responses" ON public.assessment_responses
          FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 4. Category Scores: Super admins should be able to view all category scores
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'category_scores' AND policyname = 'Super admins can view all category scores'
    ) THEN
        CREATE POLICY "Super admins can view all category scores" ON public.category_scores
          FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 5. Action Plans: Super admins should be able to view and manage all action plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'action_plans' AND policyname = 'Super admins can manage all action plans'
    ) THEN
        CREATE POLICY "Super admins can manage all action plans" ON public.action_plans
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 6. Team Invitations: Super admins should be able to view and manage all invitations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_invitations' AND policyname = 'Super admins can manage all team invitations'
    ) THEN
        CREATE POLICY "Super admins can manage all team invitations" ON public.team_invitations
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 7. Benchmark Aggregates: Super admins should be able to manage all benchmarks (already handled but ensuring)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'benchmark_aggregates' AND policyname = 'Super admins can manage all benchmarks'
    ) THEN
        CREATE POLICY "Super admins can manage all benchmarks" ON public.benchmark_aggregates
          FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

COMMIT;
