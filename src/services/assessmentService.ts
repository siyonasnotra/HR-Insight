import { supabase } from '@/integrations/supabase/client';
import { Assessment, AssessmentResponse, AssessmentCategory, Question } from '@/types';

interface RawQuestion {
  id: string;
  category_id: string;
  question_text: string;
  question_type: string;
  options: string | Record<string, unknown>;
  weight: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const assessmentService = {
  // Get assessment categories (limited to 6 domains)
  async getAssessmentCategories(): Promise<AssessmentCategory[]> {
    const { data, error } = await supabase
      .from('assessment_categories')
      .select('*')
      .order('display_order')
      .limit(6);

    if (error) throw error;
    return data || [];
  },

  // Get category by ID
  async getCategoryById(id: string): Promise<AssessmentCategory | null> {
    const { data, error } = await supabase
      .from('assessment_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Get questions for a category
  async getQuestionsByCategory(categoryId: string): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return (data || []).map((q: RawQuestion) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options as Record<string, unknown>)
    })) as Question[];
  },

  // Get all active questions
  async getAllQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return (data || []).map((q: RawQuestion) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options as Record<string, unknown>)
    })) as Question[];
  },

  // Create new assessment
  async createAssessment(
    organizationId: string,
    title: string,
    createdBy?: string
  ): Promise<Assessment> {
    const { data, error } = await supabase
      .from('assessments')
      .insert([{
        organization_id: organizationId,
        title,
        status: 'draft',
        created_by: createdBy,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Assessment;
  },

  // Save assessment response
  async saveAssessmentResponse(
    assessmentId: string,
    questionId: string,
    responseValue: unknown,
    score?: number
  ): Promise<AssessmentResponse> {
    const { data, error } = await supabase
      .from('assessment_responses')
      .upsert([{
        assessment_id: assessmentId,
        question_id: questionId,
        response_value: responseValue,
        score,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'assessment_id, question_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as AssessmentResponse;
  },

  // Get assessment responses
  async getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    const { data, error } = await supabase
      .from('assessment_responses')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (error) throw error;
    return data || [];
  },

  // Complete assessment
  async completeAssessment(assessmentId: string): Promise<Assessment> {
    const { data, error } = await supabase
      .from('assessments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;
    return data as Assessment;
  },

  // Get assessment by ID
  async getAssessmentById(id: string): Promise<Assessment | null> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Get assessments by organization
  async getOrganizationAssessments(organizationId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Save category score
  async saveCategoryScore(
    assessmentId: string,
    categoryId: string,
    score: number,
    maxScore: number = 100
  ) {
    const percentage = (score / maxScore) * 100;

    const { data, error } = await supabase
      .from('category_scores')
      .upsert([{
        assessment_id: assessmentId,
        category_id: categoryId,
        score,
        max_possible_score: maxScore,
        percentage
      }], {
        onConflict: 'assessment_id, category_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all category scores for assessment
  async getAssessmentCategoryScores(assessmentId: string) {
    const { data, error } = await supabase
      .from('category_scores')
      .select('*, assessment_categories(name)')
      .eq('assessment_id', assessmentId);

    if (error) throw error;
    return data || [];
  }
};
