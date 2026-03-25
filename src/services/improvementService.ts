import { supabase } from '@/integrations/supabase/client';
import {
  SelfAssessmentQuestion,
  SelfAssessmentResponse,
  UserImprovementSuggestion,
  UserSkillScore,
} from '@/types';

// Skill-tag to readable label mapping
export const skillTagLabels: Record<string, string> = {
  talent_acquisition: 'Talent Acquisition',
  performance_management: 'Performance Management',
  learning_development: 'Learning & Development',
  employee_engagement: 'Employee Engagement',
  csr_social_impact: 'CSR & Social Impact',
  organizational_culture: 'Organizational Culture',
};

// Recommendation messages per skill tag
const recommendations: Record<string, { strength: string; weakness: string; recommendation: string }> = {
  talent_acquisition: {
    strength: 'You have strong recruitment capabilities. Consider mentoring others in talent sourcing best practices.',
    weakness: 'Focus on improving structured interview techniques and employer branding strategies.',
    recommendation: 'Explore modern ATS tools and data-driven hiring to further sharpen talent acquisition.',
  },
  performance_management: {
    strength: 'Your performance management processes are robust. Keep leveraging continuous feedback loops.',
    weakness: 'Shift from informal goal-setting to SMART goals or OKR frameworks for better accountability.',
    recommendation: 'Implement quarterly performance reviews with 360-degree feedback for holistic evaluation.',
  },
  learning_development: {
    strength: 'Your L&D initiatives are effective. Continue tracking learning ROI for strategic value.',
    weakness: 'Prioritize identifying skill gaps proactively and create personalized learning paths.',
    recommendation: 'Adopt a Learning Management System (LMS) to scale training programs efficiently.',
  },
  employee_engagement: {
    strength: 'Employees are highly engaged due to your efforts. Maintain open communication channels.',
    weakness: 'Employee engagement may be suffering. Conduct pulse surveys to identify friction points.',
    recommendation: 'Introduce recognition programs and flexible work policies to boost morale.',
  },
  csr_social_impact: {
    strength: 'Your CSR programs are making a positive impact. Quantify outcomes for better reporting.',
    weakness: 'Formalize your CSR initiatives with measurable goals and dedicated budget allocation.',
    recommendation: 'Align CSR activities with UN Sustainable Development Goals for global recognition.',
  },
  organizational_culture: {
    strength: 'Your organizational culture is strong and inclusive. Continue promoting shared values.',
    weakness: 'Culture may not be well-defined or communicated. Document your core values clearly.',
    recommendation: 'Conduct culture assessments annually and involve leadership in cultural transformation.',
  },
};

function getRecommendationContent(skillTag: string, type: 'strength' | 'weakness' | 'recommendation'): string {
  return recommendations[skillTag]?.[type] ?? `Work on improving ${skillTagLabels[skillTag] || skillTag} practices.`;
}

// ─── Local JSON falback for dev without migrations ─────────────────────────
const LS_SUGGEST_KEY = 'hr_improvement_suggestions';
const LS_SCORES_KEY = 'hr_skill_scores';
const db = () => supabase;

function loadLocalSuggestions(): UserImprovementSuggestion[] {
  try { return JSON.parse(localStorage.getItem(LS_SUGGEST_KEY) || '[]'); } catch { return []; }
}
function saveLocalSuggestions(data: UserImprovementSuggestion[]) { localStorage.setItem(LS_SUGGEST_KEY, JSON.stringify(data)); }
function loadLocalScores(): UserSkillScore[] {
  try { return JSON.parse(localStorage.getItem(LS_SCORES_KEY) || '[]'); } catch { return []; }
}
function saveLocalScores(data: UserSkillScore[]) { localStorage.setItem(LS_SCORES_KEY, JSON.stringify(data)); }

export const improvementService = {
  // ─── Analyze responses and store improvements ─────────────────────
  async analyzeAndStoreImprovements(
    userId: string,
    selfAssessmentId: string,
    responses: SelfAssessmentResponse[],
    questions: SelfAssessmentQuestion[]
  ): Promise<void> {
    const skillScores: Record<string, { earned: number; max: number }> = {};
    for (const q of questions) {
      if (!q.skill_tag) continue;
      const tag = q.skill_tag;
      if (!skillScores[tag]) skillScores[tag] = { earned: 0, max: 0 };
      if (q.question_type !== 'descriptive') {
        skillScores[tag].max += q.max_score;
        const resp = responses.find(r => r.question_id === q.id);
        if (resp?.score != null) {
          skillScores[tag].earned += Number(resp.score);
        }
      }
    }

    const suggestionsToInsert: UserImprovementSuggestion[] = [];
    const skillScoresToUpsert: UserSkillScore[] = [];

    for (const [tag, { earned, max }] of Object.entries(skillScores)) {
      if (max === 0) continue;
      const pct = Math.round((earned / max) * 100);

      const newScoreObj = {
        id: `s-${userId}-${tag}`,
        user_id: userId,
        skill_tag: tag,
        score: earned,
        max_score: max,
        percentage: pct,
        last_assessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      skillScoresToUpsert.push(newScoreObj);

      let suggestionType: 'strength' | 'weakness' | 'recommendation';
      if (pct >= 70) {
        suggestionType = 'strength';
      } else if (pct < 40) {
        suggestionType = 'weakness';
      } else {
        suggestionType = 'recommendation';
      }

      suggestionsToInsert.push({
        id: `sg-${userId}-${selfAssessmentId}-${tag}`,
        user_id: userId,
        self_assessment_id: selfAssessmentId,
        skill_tag: tag,
        suggestion_type: suggestionType,
        content: getRecommendationContent(tag, suggestionType),
        updated_at: new Date().toISOString(),
      });
    }

    try {
      if (skillScoresToUpsert.length > 0) {
        const { error } = await db().from('user_skill_scores').upsert(skillScoresToUpsert, { onConflict: 'user_id, skill_tag' });
        if (error) throw error;
      }
      if (selfAssessmentId) {
        const { error } = await db().from('user_improvement_suggestions').delete().eq('user_id', userId).eq('self_assessment_id', selfAssessmentId);
        if (error) throw error;
      }
      if (suggestionsToInsert.length > 0) {
        const { error } = await db().from('user_improvement_suggestions').insert(suggestionsToInsert);
        if (error) throw error;
      }
    } catch (err) {
      // Local storage fallback
      let allScores = loadLocalScores();
      skillScoresToUpsert.forEach(newScore => {
        allScores = allScores.filter(s => !(s.user_id === userId && s.skill_tag === newScore.skill_tag));
        allScores.push(newScore as UserSkillScore);
      });
      saveLocalScores(allScores);

      const allSugg = loadLocalSuggestions().filter(s => !(s.user_id === userId && s.self_assessment_id === selfAssessmentId));
      suggestionsToInsert.forEach(s => allSugg.push(s as UserImprovementSuggestion));
      saveLocalSuggestions(allSugg);
    }
  },

  // ─── Get improvements for a user ─────────────────────────────────
  async getUserImprovements(userId: string): Promise<UserImprovementSuggestion[]> {
    try {
      const { data, error } = await db()
        .from('user_improvement_suggestions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) return data as UserImprovementSuggestion[];
    } catch { /* DB missing fallback */ }
    return loadLocalSuggestions().filter(s => s.user_id === userId);
  },

  // ─── Get skill scores for a user ─────────────────────────────────
  async getUserSkillScores(userId: string): Promise<UserSkillScore[]> {
    try {
      const { data, error } = await db()
        .from('user_skill_scores')
        .select('*')
        .eq('user_id', userId)
        .order('skill_tag');
      if (error) throw error;
      if (data && data.length > 0) return data as UserSkillScore[];
    } catch { /* DB missing fallback */ }
    return loadLocalScores().filter(s => s.user_id === userId);
  },
};
