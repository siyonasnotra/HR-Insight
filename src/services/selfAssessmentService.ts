import { supabase } from '@/integrations/supabase/client';
import {
  SelfAssessment,
  SelfAssessmentQuestion,
  SelfAssessmentResponse,
  MCQOption,
} from '@/types';

interface RawSelfAssessmentQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string | MCQOption[];
  max_score: number;
  skill_tag: string;
  display_order: number;
  is_template: boolean;
  is_active: boolean;
  created_at: string;
}

// ─── Hardcoded fallback template questions ────────────────────────────────────
export const FALLBACK_QUESTIONS: SelfAssessmentQuestion[] = [
  { id: 'q1', question_text: 'How effectively do you identify and attract top talent?', question_type: 'rating', max_score: 5, skill_tag: 'talent_acquisition', display_order: 1, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q2', question_text: 'How well do you conduct structured interviews?', question_type: 'rating', max_score: 5, skill_tag: 'talent_acquisition', display_order: 2, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q3', question_text: 'Which approach best describes how you set employee performance goals?', question_type: 'mcq', options: [{ value: 'no_goals', label: 'No formal goals', score: 1 }, { value: 'informal', label: 'Goals set informally', score: 2 }, { value: 'annual', label: 'Annual KPI goals', score: 3 }, { value: 'smart', label: 'SMART goals with quarterly reviews', score: 4 }, { value: 'okr', label: 'OKRs with continuous feedback', score: 5 }], max_score: 5, skill_tag: 'performance_management', display_order: 3, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q4', question_text: 'How frequently do you conduct formal performance reviews?', question_type: 'mcq', options: [{ value: 'never', label: 'Never', score: 1 }, { value: 'annual', label: 'Annually', score: 2 }, { value: 'biannual', label: 'Twice a year', score: 3 }, { value: 'quarterly', label: 'Quarterly', score: 4 }, { value: 'continuous', label: 'Continuously', score: 5 }], max_score: 5, skill_tag: 'performance_management', display_order: 4, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q5', question_text: 'How effectively do you identify training needs for your team?', question_type: 'rating', max_score: 5, skill_tag: 'learning_development', display_order: 5, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q6', question_text: 'How well do you track learning outcomes and apply them at work?', question_type: 'rating', max_score: 5, skill_tag: 'learning_development', display_order: 6, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q7', question_text: 'Describe the strategies you use to keep employees motivated and engaged.', question_type: 'descriptive', max_score: 0, skill_tag: 'employee_engagement', display_order: 7, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q8', question_text: 'How do you handle employee grievances or concerns in your organization?', question_type: 'descriptive', max_score: 0, skill_tag: 'employee_engagement', display_order: 8, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q9', question_text: 'How strongly do you believe your organization promotes an inclusive workplace?', question_type: 'rating', max_score: 5, skill_tag: 'organizational_culture', display_order: 9, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q10', question_text: 'How well are company values communicated and lived by leadership?', question_type: 'rating', max_score: 5, skill_tag: 'organizational_culture', display_order: 10, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q11', question_text: "What best describes your organization's CSR maturity?", question_type: 'mcq', options: [{ value: 'none', label: 'No formal CSR programs', score: 1 }, { value: 'ad_hoc', label: 'Ad-hoc initiatives', score: 2 }, { value: 'structured', label: 'Structured annual programs', score: 3 }, { value: 'strategic', label: 'CSR is part of business strategy', score: 4 }, { value: 'leader', label: 'Industry-leading CSR', score: 5 }], max_score: 5, skill_tag: 'csr_social_impact', display_order: 11, is_template: true, is_active: true, created_at: new Date().toISOString() },
  { id: 'q12', question_text: 'How proficient are you in using recruitment tools and HR platforms?', question_type: 'rating', max_score: 5, skill_tag: 'talent_acquisition', display_order: 12, is_template: true, is_active: true, created_at: new Date().toISOString() },
];

// ─── Local-storage based data store (fallback when DB tables don't exist) ─────
const LS_KEY = 'hr_self_assessments';
const LS_RESPONSES_KEY = 'hr_self_assessment_responses';
const db = () => (supabase as unknown);

function loadLocalAssessments(): SelfAssessment[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLocalAssessments(data: SelfAssessment[]) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function loadLocalResponses(): SelfAssessmentResponse[] {
  try { return JSON.parse(localStorage.getItem(LS_RESPONSES_KEY) || '[]'); } catch { return []; }
}
function saveLocalResponses(data: SelfAssessmentResponse[]) { localStorage.setItem(LS_RESPONSES_KEY, JSON.stringify(data)); }

export const selfAssessmentService = {
  async getTemplateQuestions(): Promise<SelfAssessmentQuestion[]> {
    try {
      const { data, error } = await db().from('self_assessment_questions').select('*').eq('is_template', true).eq('is_active', true).order('display_order');
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((q: RawSelfAssessmentQuestion) => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options })) as SelfAssessmentQuestion[];
      }
    } catch { /* DB tables don't exist yet — use fallback */ }
    return FALLBACK_QUESTIONS;
  },

  async createSelfAssessment(userId: string, title: string, description?: string): Promise<SelfAssessment> {
    const questions = await this.getTemplateQuestions();
    try {
      const { data, error } = await db().from('self_assessments').insert([{ user_id: userId, title, description, status: 'in_progress', total_questions: questions.length, answered_questions: 0 }]).select().single();
      if (error) throw error;
      return data as SelfAssessment;
    } catch {
      const newA: SelfAssessment = { id: `local-${Date.now()}`, user_id: userId, title, description, status: 'in_progress', total_questions: questions.length, answered_questions: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const all = loadLocalAssessments(); all.unshift(newA); saveLocalAssessments(all);
      return newA;
    }
  },

  async getSelfAssessmentsByUser(userId: string): Promise<SelfAssessment[]> {
    try {
      const { data, error } = await db().from('self_assessments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) return data as SelfAssessment[];
    } catch { /* fall-through */ }
    return loadLocalAssessments().filter(a => a.user_id === userId);
  },

  async getSelfAssessmentById(id: string): Promise<SelfAssessment | null> {
    if (id.startsWith('local-')) return loadLocalAssessments().find(a => a.id === id) || null;
    try {
      const { data, error } = await db().from('self_assessments').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as SelfAssessment | null;
    } catch { return loadLocalAssessments().find(a => a.id === id) || null; }
  },

  async getResponses(selfAssessmentId: string): Promise<SelfAssessmentResponse[]> {
    if (selfAssessmentId.startsWith('local-')) return loadLocalResponses().filter(r => r.self_assessment_id === selfAssessmentId);
    try {
      const { data, error } = await db().from('self_assessment_responses').select('*').eq('self_assessment_id', selfAssessmentId);
      if (error) throw error;
      return data as SelfAssessmentResponse[];
    } catch { return loadLocalResponses().filter(r => r.self_assessment_id === selfAssessmentId); }
  },

  async saveResponse(selfAssessmentId: string, questionId: string, userId: string, responseValue: unknown, score?: number): Promise<SelfAssessmentResponse> {
    const resp: SelfAssessmentResponse = { id: `r-${selfAssessmentId}-${questionId}`, self_assessment_id: selfAssessmentId, question_id: questionId, user_id: userId, response_value: responseValue, score, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (selfAssessmentId.startsWith('local-')) {
      const all = loadLocalResponses().filter(r => !(r.self_assessment_id === selfAssessmentId && r.question_id === questionId));
      all.push(resp); saveLocalResponses(all); return resp;
    }
    try {
      const { data, error } = await db().from('self_assessment_responses').upsert([{ self_assessment_id: selfAssessmentId, question_id: questionId, user_id: userId, response_value: responseValue, score, updated_at: new Date().toISOString() }], { onConflict: 'self_assessment_id, question_id' }).select().single();
      if (error) throw error;
      return data as SelfAssessmentResponse;
    } catch {
      const all = loadLocalResponses().filter(r => !(r.self_assessment_id === selfAssessmentId && r.question_id === questionId));
      all.push(resp); saveLocalResponses(all); return resp;
    }
  },

  async completeAssessment(selfAssessmentId: string, overallScore: number, answeredQuestions: number): Promise<SelfAssessment> {
    if (selfAssessmentId.startsWith('local-')) {
      const all = loadLocalAssessments(); const idx = all.findIndex(a => a.id === selfAssessmentId);
      if (idx >= 0) { all[idx] = { ...all[idx], status: 'completed', overall_score: overallScore, answered_questions: answeredQuestions, completed_at: new Date().toISOString() }; saveLocalAssessments(all); return all[idx]; }
    }
    try {
      const { data, error } = await db().from('self_assessments').update({ status: 'completed', overall_score: overallScore, answered_questions: answeredQuestions, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selfAssessmentId).select().single();
      if (error) throw error;
      return data as SelfAssessment;
    } catch {
      const all = loadLocalAssessments(); const a = all.find(a => a.id === selfAssessmentId)!;
      return { ...a, status: 'completed', overall_score: overallScore };
    }
  },

  async updateAnsweredCount(selfAssessmentId: string, count: number): Promise<void> {
    if (selfAssessmentId.startsWith('local-')) {
      const all = loadLocalAssessments(); const idx = all.findIndex(a => a.id === selfAssessmentId);
      if (idx >= 0) { all[idx].answered_questions = count; saveLocalAssessments(all); } return;
    }
    try { await db().from('self_assessments').update({ answered_questions: count, updated_at: new Date().toISOString() }).eq('id', selfAssessmentId); } catch { /* ignore */ }
  },

  calculateScore(responses: SelfAssessmentResponse[], questions: SelfAssessmentQuestion[]): { overallScore: number; maxPossible: number } {
    let earned = 0, maxPossible = 0;
    for (const q of questions) {
      if (q.question_type === 'descriptive') continue;
      maxPossible += q.max_score;
      const resp = responses.find(r => r.question_id === q.id);
      if (resp?.score != null) earned += Number(resp.score);
    }
    return { overallScore: maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0, maxPossible };
  },
};
