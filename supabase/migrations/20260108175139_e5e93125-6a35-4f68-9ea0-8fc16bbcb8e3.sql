
-- Create enums for the system
CREATE TYPE public.app_role AS ENUM ('super_admin', 'hr_admin', 'hr_manager', 'viewer');
CREATE TYPE public.industry_vertical AS ENUM ('it_software', 'manufacturing', 'healthcare', 'banking_finance', 'retail', 'education', 'hospitality', 'automotive', 'pharma', 'telecom', 'other');
CREATE TYPE public.company_size AS ENUM ('1_50', '51_200', '201_500', '501_1000', '1001_5000', '5000_plus');
CREATE TYPE public.region AS ENUM ('north', 'south', 'east', 'west', 'central', 'pan_india');
CREATE TYPE public.certification_level AS ENUM ('none', 'silver', 'gold', 'diamond');
CREATE TYPE public.assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'certified');
CREATE TYPE public.question_type AS ENUM ('likert', 'yes_no', 'numeric', 'multi_select');
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry industry_vertical NOT NULL DEFAULT 'other',
  region region NOT NULL DEFAULT 'pan_india',
  state TEXT,
  company_size company_size NOT NULL DEFAULT '1_50',
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Assessment categories (10 core HR practice areas)
CREATE TABLE public.assessment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions library
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.assessment_categories(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'likert',
  options JSONB,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  max_score INTEGER NOT NULL DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessments (organization's assessment attempts)
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status assessment_status NOT NULL DEFAULT 'draft',
  overall_score NUMERIC(5,2),
  certification_level certification_level DEFAULT 'none',
  certified_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment responses
CREATE TABLE public.assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  response_value JSONB NOT NULL,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

-- Category scores (per assessment)
CREATE TABLE public.category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.assessment_categories(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_possible_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, category_id)
);

-- Certifications history
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  level certification_level NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  certificate_url TEXT,
  verification_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action plans
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.assessment_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  status action_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team invitations
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Benchmark aggregates (anonymized for comparison)
CREATE TABLE public.benchmark_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry industry_vertical NOT NULL,
  region region NOT NULL,
  company_size company_size NOT NULL,
  category_id UUID REFERENCES public.assessment_categories(id) ON DELETE CASCADE NOT NULL,
  avg_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentile_25 NUMERIC(5,2),
  percentile_50 NUMERIC(5,2),
  percentile_75 NUMERIC(5,2),
  sample_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (industry, region, company_size, category_id)
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_aggregates ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessment_responses_updated_at BEFORE UPDATE ON public.assessment_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Organizations: Users can view their own org
CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "HR Admins can update own organization" ON public.organizations
  FOR UPDATE USING (
    id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Super admins can view all organizations" ON public.organizations
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Profiles: Users can view profiles in their org
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view org member profiles" ON public.profiles
  FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- User roles: Only viewable by super admin or self
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

-- Assessment categories: Public read
CREATE POLICY "Anyone can view categories" ON public.assessment_categories
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage categories" ON public.assessment_categories
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Questions: Public read for active questions
CREATE POLICY "Anyone can view active questions" ON public.questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage questions" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Assessments: Org-based access
CREATE POLICY "Users can view org assessments" ON public.assessments
  FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "HR can manage org assessments" ON public.assessments
  FOR ALL USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Assessment responses: Org-based access
CREATE POLICY "Users can view org assessment responses" ON public.assessment_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "HR can manage assessment responses" ON public.assessment_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Category scores: Org-based access
CREATE POLICY "Users can view org category scores" ON public.category_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND a.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "System can manage category scores" ON public.category_scores
  FOR ALL USING (true);

-- Certifications: Org-based access
CREATE POLICY "Users can view org certifications" ON public.certifications
  FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Public can verify certifications" ON public.certifications
  FOR SELECT USING (is_active = true AND verification_code IS NOT NULL);

-- Action plans: Org-based access
CREATE POLICY "Users can view org action plans" ON public.action_plans
  FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "HR can manage action plans" ON public.action_plans
  FOR ALL USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'hr_manager') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Team invitations: Org-based access
CREATE POLICY "Users can view org invitations" ON public.team_invitations
  FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "HR admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    organization_id = public.get_user_organization_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- Benchmark aggregates: Public read
CREATE POLICY "Anyone can view benchmarks" ON public.benchmark_aggregates
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage benchmarks" ON public.benchmark_aggregates
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
  org_name text;
  user_role app_role;
BEGIN
  -- Get organization info from metadata
  org_name := NEW.raw_user_meta_data->>'organization_name';
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'hr_admin');
  
  -- Create organization if name provided
  IF org_name IS NOT NULL AND org_name != '' THEN
    INSERT INTO public.organizations (name, industry, region, company_size)
    VALUES (
      org_name,
      COALESCE((NEW.raw_user_meta_data->>'industry')::industry_vertical, 'other'),
      COALESCE((NEW.raw_user_meta_data->>'region')::region, 'pan_india'),
      COALESCE((NEW.raw_user_meta_data->>'company_size')::company_size, '1_50')
    )
    RETURNING id INTO org_id;
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
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default assessment categories
INSERT INTO public.assessment_categories (name, description, icon, weight, display_order) VALUES
('Talent Acquisition', 'Recruitment processes, employer branding, and new hire integration', 'UserPlus', 1.0, 1),
('Performance Management', 'Goal setting, feedback systems, and performance evaluation', 'Target', 1.0, 2),
('Learning & Development', 'Training programs, skill development, and career growth opportunities', 'GraduationCap', 1.0, 3),
('Employee Engagement', 'Workplace culture, employee satisfaction, and retention initiatives', 'Heart', 1.0, 4),
('CSR & Social Impact', 'Corporate social responsibility, community programs, and social initiatives', 'Shield', 1.0, 5),
('Organizational Culture', 'Workplace climate, shared values, and inclusive practices', 'Users', 1.0, 6);
