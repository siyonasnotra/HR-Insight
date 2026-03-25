// Auth & User Types
export type AppRole = 'super_admin' | 'hr_admin' | 'hr_manager' | 'viewer';
export type SelfQuestionType = 'mcq' | 'rating' | 'descriptive';
export type SuggestionType = 'strength' | 'weakness' | 'recommendation';
export type SelfAssessmentStatus = 'draft' | 'in_progress' | 'completed';
export type IndustryVertical = 'it_software' | 'manufacturing' | 'healthcare' | 'banking_finance' | 'retail' | 'education' | 'hospitality' | 'automotive' | 'pharma' | 'telecom' | 'other';
export type CompanySize = '1_50' | '51_200' | '201_500' | '501_1000' | '1001_5000' | '5000_plus';
export type Region = 'north' | 'south' | 'east' | 'west' | 'central' | 'pan_india';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  user_id: string;
  organization_id?: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  industry: IndustryVertical;
  region: Region;
  state?: string;
  company_size: CompanySize;
  logo_url?: string;
  website?: string;
  latest_assessment_id?: string;
  latest_score?: number;
  latest_status?: string;
  latest_report_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  invited_by: string;
  token: string;
  accepted_at?: string;
  expires_at: string;
  created_at: string;
}

// Assessment Types
export type AssessmentStatus = 'draft' | 'in_progress' | 'completed' | 'certified';
export type CertificationLevel = 'none' | 'silver' | 'gold' | 'diamond';
export type QuestionType = 'likert' | 'yes_no' | 'numeric' | 'multi_select';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface AssessmentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  weight: number;
  display_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: Record<string, any>;
  weight: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Assessment {
  id: string;
  organization_id: string;
  title: string;
  status: AssessmentStatus;
  overall_score?: number;
  certification_level: CertificationLevel;
  certified_at?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  response_value: any;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryScore {
  id: string;
  assessment_id: string;
  category_id: string;
  score: number;
  max_possible_score: number;
  percentage: number;
  created_at: string;
}

export interface HRMaturityScore {
  organizationId: string;
  overallScore: number;
  certificationLevel: CertificationLevel;
  categoryScores: {
    [categoryId: string]: {
      categoryName: string;
      score: number;
      percentage: number;
      weight: number;
    };
  };
  strengths: string[];
  improvements: string[];
}

// Certification Types
export interface Certification {
  id: string;
  organization_id: string;
  assessment_id: string;
  level: CertificationLevel;
  issued_at: string;
  expires_at?: string;
  certificate_url?: string;
  verification_code: string;
  is_active: boolean;
  created_at: string;
}

// Action Plan Types
export interface ActionPlan {
  id: string;
  organization_id: string;
  assessment_id?: string;
  category_id?: string;
  title: string;
  description?: string;
  priority: number; // 1-5, 5 being highest
  status: ActionStatus;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Benchmark Types
export interface BenchmarkAggregate {
  id: string;
  industry: IndustryVertical;
  region: Region;
  company_size: CompanySize;
  category_id: string;
  avg_score: number;
  percentile_25?: number;
  percentile_50?: number;
  percentile_75?: number;
  sample_count: number;
  calculated_at: string;
}

// Dashboard Types
export interface DashboardMetrics {
  totalOrganizations: number;
  certifiedOrganizations: number;
  totalAssessments: number;
  completedAssessments: number;
  averageMaturityScore: number;
  certificationBreakdown: {
    bronze: number;
    silver: number;
    gold: number;
    diamond: number;
  };
}

// Report Types
export interface AssessmentReport {
  assessment: Assessment;
  categoryScores: CategoryScore[];
  maturityScore: HRMaturityScore;
  benchmark?: BenchmarkComparison;
  actionPlans: ActionPlan[];
}

export interface BenchmarkComparison {
  industryAverage: number;
  regionAverage: number;
  sizeAverage: number;
  percentile: number;
  performance: 'below_average' | 'average' | 'above_average' | 'excellent';
}

// Self-Assessment Types
export interface SelfAssessment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: SelfAssessmentStatus;
  overall_score?: number;
  total_questions: number;
  answered_questions: number;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface MCQOption {
  value: string;
  label: string;
  score: number;
}

export interface SelfAssessmentQuestion {
  id: string;
  self_assessment_id?: string;
  question_text: string;
  question_type: SelfQuestionType;
  options?: MCQOption[];
  max_score: number;
  skill_tag?: string;
  display_order: number;
  is_template: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SelfAssessmentResponse {
  id: string;
  self_assessment_id: string;
  question_id: string;
  user_id: string;
  response_value: any;
  score?: number;
  created_at: string;
  updated_at: string;
}

// Improvement Tracking Types
export interface UserImprovementSuggestion {
  id: string;
  user_id: string;
  self_assessment_id?: string;
  assessment_id?: string;
  skill_tag: string;
  suggestion_type: SuggestionType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UserSkillScore {
  id: string;
  user_id: string;
  skill_tag: string;
  score: number;
  max_score: number;
  percentage: number;
  last_assessed_at: string;
  updated_at: string;
}

// Unified User Report Type
export interface UserReport {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    job_title: string | null;
    avatar_url: string | null;
    created_at?: string;
  };
  organization: {
    id: string;
    name: string;
    industry: string;
  } | null;
  orgAssessments: Assessment[];
  selfAssessments: SelfAssessment[];
  certifications: Certification[];
  skillScores: UserSkillScore[];
  improvements: UserImprovementSuggestion[];
  totalScore: number;
  averageScore: number;
}
