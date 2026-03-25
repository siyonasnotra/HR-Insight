-- ============================================================
-- Migration: Self-Assessment, Improvement Tracking, User Reports
-- ============================================================

-- Extend question_type enum for self-assessment question types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'self_question_type') THEN
    CREATE TYPE public.self_question_type AS ENUM ('mcq', 'rating', 'descriptive');
  END IF;
END $$;

-- Extend suggestion_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_type') THEN
    CREATE TYPE public.suggestion_type AS ENUM ('strength', 'weakness', 'recommendation');
  END IF;
END $$;

-- ============================================================
-- Add skill_tag column to assessment_categories
-- ============================================================
ALTER TABLE public.assessment_categories
  ADD COLUMN IF NOT EXISTS skill_tag TEXT;

-- Update existing categories with default skill tags
UPDATE public.assessment_categories SET skill_tag = 'talent_acquisition' WHERE name = 'Talent Acquisition';
UPDATE public.assessment_categories SET skill_tag = 'performance_management' WHERE name = 'Performance Management';
UPDATE public.assessment_categories SET skill_tag = 'learning_development' WHERE name = 'Learning & Development';
UPDATE public.assessment_categories SET skill_tag = 'employee_engagement' WHERE name = 'Employee Engagement';
UPDATE public.assessment_categories SET skill_tag = 'csr_social_impact' WHERE name = 'CSR & Social Impact';
UPDATE public.assessment_categories SET skill_tag = 'organizational_culture' WHERE name = 'Organizational Culture';

-- ============================================================
-- Add user_id to certifications for user-level certificates
-- ============================================================
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

-- ============================================================
-- Self-assessments table (user-level)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.self_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  overall_score NUMERIC(5,2),
  total_questions INTEGER NOT NULL DEFAULT 0,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Self-assessment questions (template + per-assessment)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.self_assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  self_assessment_id UUID REFERENCES public.self_assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type self_question_type NOT NULL DEFAULT 'rating',
  options JSONB, -- For MCQ: [{value, label, score}]
  max_score NUMERIC(5,2) NOT NULL DEFAULT 5,
  skill_tag TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_template BOOLEAN NOT NULL DEFAULT false, -- If true, shown to all users
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Self-assessment responses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.self_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  self_assessment_id UUID REFERENCES public.self_assessments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.self_assessment_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response_value JSONB NOT NULL,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (self_assessment_id, question_id)
);

-- ============================================================
-- User improvement suggestions (strength / weakness / recommendation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  self_assessment_id UUID REFERENCES public.self_assessments(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  skill_tag TEXT NOT NULL,
  suggestion_type suggestion_type NOT NULL DEFAULT 'recommendation',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- User skill scores (aggregated per skill tag)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_tag TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 5,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_tag)
);

-- ============================================================
-- Enable RLS on new tables
-- ============================================================
ALTER TABLE public.self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_improvement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Self assessments
CREATE POLICY "Users can manage own self assessments" ON public.self_assessments
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all self assessments" ON public.self_assessments
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Self assessment questions: templates are publicly readable; own-assessment questions by owner
CREATE POLICY "Anyone can view template questions" ON public.self_assessment_questions
  FOR SELECT USING (is_template = true AND is_active = true);

CREATE POLICY "Users can view their assessment questions" ON public.self_assessment_questions
  FOR SELECT USING (
    self_assessment_id IN (
      SELECT id FROM public.self_assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert questions" ON public.self_assessment_questions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admins can manage all questions" ON public.self_assessment_questions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Self assessment responses
CREATE POLICY "Users can manage own responses" ON public.self_assessment_responses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all responses" ON public.self_assessment_responses
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- User improvement suggestions
CREATE POLICY "Users can view own suggestions" ON public.user_improvement_suggestions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can upsert suggestions" ON public.user_improvement_suggestions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all suggestions" ON public.user_improvement_suggestions
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- User skill scores
CREATE POLICY "Users can view own skill scores" ON public.user_skill_scores
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can upsert skill scores" ON public.user_skill_scores
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all skill scores" ON public.user_skill_scores
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super admins to view all certifications (add policy for user_id column)
CREATE POLICY "Super admins can manage all certifications" ON public.certifications
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own user certifications" ON public.certifications
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- Updated_at triggers for new tables
-- ============================================================
CREATE TRIGGER update_self_assessments_updated_at
  BEFORE UPDATE ON public.self_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_self_assessment_responses_updated_at
  BEFORE UPDATE ON public.self_assessment_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_improvement_suggestions_updated_at
  BEFORE UPDATE ON public.user_improvement_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_skill_scores_updated_at
  BEFORE UPDATE ON public.user_skill_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed template questions for self-assessment
-- ============================================================

-- Rating questions (skill: talent_acquisition)
INSERT INTO public.self_assessment_questions (question_text, question_type, max_score, skill_tag, display_order, is_template) VALUES
('How effectively do you identify and attract top talent?', 'rating', 5, 'talent_acquisition', 1, true),
('How well do you conduct structured interviews?', 'rating', 5, 'talent_acquisition', 2, true),
('How proficient are you in using recruitment tools and platforms?', 'rating', 5, 'talent_acquisition', 3, true);

-- MCQ questions (skill: performance_management)
INSERT INTO public.self_assessment_questions (question_text, question_type, options, max_score, skill_tag, display_order, is_template) VALUES
(
  'Which approach best describes how you set employee performance goals?',
  'mcq',
  '[{"value":"no_goals","label":"We do not formally set goals","score":1},{"value":"informal","label":"Goals are set informally","score":2},{"value":"annual","label":"Annual goals using basic KPIs","score":3},{"value":"smart","label":"SMART goals with quarterly reviews","score":4},{"value":"okr","label":"OKRs with continuous feedback loops","score":5}]'::jsonb,
  5,
  'performance_management',
  4,
  true
),
(
  'How frequently do you conduct formal performance reviews?',
  'mcq',
  '[{"value":"never","label":"Never","score":1},{"value":"annual","label":"Annually","score":2},{"value":"biannual","label":"Twice a year","score":3},{"value":"quarterly","label":"Quarterly","score":4},{"value":"continuous","label":"Continuously with regular check-ins","score":5}]'::jsonb,
  5,
  'performance_management',
  5,
  true
);

-- Rating questions (skill: learning_development)
INSERT INTO public.self_assessment_questions (question_text, question_type, max_score, skill_tag, display_order, is_template) VALUES
('How effectively do you identify training needs for your team?', 'rating', 5, 'learning_development', 6, true),
('How well do you track learning outcomes and apply them to work?', 'rating', 5, 'learning_development', 7, true);

-- Descriptive questions (skill: employee_engagement)
INSERT INTO public.self_assessment_questions (question_text, question_type, max_score, skill_tag, display_order, is_template) VALUES
('Describe the strategies you use to keep employees motivated and engaged.', 'descriptive', 0, 'employee_engagement', 8, true),
('How do you handle employee grievances or concerns in your organization?', 'descriptive', 0, 'employee_engagement', 9, true);

-- Rating questions (skill: organizational_culture)
INSERT INTO public.self_assessment_questions (question_text, question_type, max_score, skill_tag, display_order, is_template) VALUES
('How strongly do you believe your organization promotes an inclusive workplace?', 'rating', 5, 'organizational_culture', 10, true),
('How well are company values communicated and lived by leadership?', 'rating', 5, 'organizational_culture', 11, true);

-- MCQ (skill: csr_social_impact)
INSERT INTO public.self_assessment_questions (question_text, question_type, options, max_score, skill_tag, display_order, is_template) VALUES
(
  'What best describes your organization''s CSR maturity?',
  'mcq',
  '[{"value":"none","label":"No formal CSR programs","score":1},{"value":"ad_hoc","label":"Ad-hoc initiatives","score":2},{"value":"structured","label":"Structured annual programs","score":3},{"value":"strategic","label":"CSR is part of business strategy","score":4},{"value":"leader","label":"Industry-leading CSR with measurable impact","score":5}]'::jsonb,
  5,
  'csr_social_impact',
  12,
  true
);
