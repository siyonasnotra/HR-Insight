import { supabase } from '@/integrations/supabase/client';
import { CategoryScore, Assessment, AssessmentCategory, HRMaturityScore, CertificationLevel, BenchmarkComparison } from '@/types';

interface CategoryScoreWithCategory extends CategoryScore {
  assessment_categories: {
    name: string;
    weight: number;
  };
}

interface AssessmentWithOrg extends Assessment {
  organizations: {
    industry: string;
    region: string;
    company_size: string;
  };
}

interface BenchmarkAggregate {
  avg_score: number;
}

// 6 Core SIPMAA HR Domains
const HR_DOMAINS = {
  TALENT_ACQUISITION: { id: 'talent_acquisition', name: 'Talent Acquisition', weight: 1.0 },
  PERFORMANCE_MGT: { id: 'performance_management', name: 'Performance Management', weight: 1.0 },
  LEARNING_DEV: { id: 'learning_development', name: 'Learning & Development', weight: 1.0 },
  ENGAGEMENT: { id: 'employee_engagement', name: 'Employee Engagement', weight: 1.0 },
  CSR_IMPACT: { id: 'csr_social_impact', name: 'CSR & Social Impact', weight: 1.0 },
  ORG_CLIMATE: { id: 'organizational_climate', name: 'Organizational Climate', weight: 1.0 }
};

export const maturityScoringService = {
  // Certification level ranges (out of 100)
  LEVEL_RANGES: {
    'diamond': { min: 85, max: 100, label: 'Diamond - Elite Excellence' },
    'gold': { min: 65, max: 84, label: 'Gold - Excellent Performance' },
    'silver': { min: 45, max: 64, label: 'Silver - Good Performance' },
    'none': { min: 0, max: 44, label: 'Not Certified - Needs Improvement' }
  },

  // Calculate overall HR maturity score
  async calculateMaturityScore(assessmentId: string): Promise<HRMaturityScore> {
    try {
      // Get assessment and category scores
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*, organization_id')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      // Get all category scores for this assessment
      const { data: categoryScores, error: scoresError } = await supabase
        .from('category_scores')
        .select('*, assessment_categories(name, weight)')
        .eq('assessment_id', assessmentId);

      if (scoresError) throw scoresError;

      // Get categories for weight calculation
      const { data: categories, error: categoriesError } = await supabase
        .from('assessment_categories')
        .select('*');

      if (categoriesError) throw categoriesError;

      // Calculate weighted overall score
      let totalWeightedScore = 0;
      let totalWeight = 0;
      const categoryScoresMap: HRMaturityScore['categoryScores'] = {};

      categoryScores?.forEach((cs: CategoryScoreWithCategory) => {
        const percentage = (cs.score / cs.max_possible_score) * 100;
        const category = categories?.find((c: AssessmentCategory) => c.id === cs.category_id);
        const weight = category?.weight || 1.0;

        categoryScoresMap[cs.category_id] = {
          categoryName: category?.name || 'Unknown',
          score: cs.score,
          percentage: Math.round(percentage * 100) / 100,
          weight
        };

        totalWeightedScore += percentage * weight;
        totalWeight += weight;
      });

      const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
      const certificationLevel = this.determineCertificationLevel(overallScore);

      // Identify strengths and improvements
      const scores = Object.entries(categoryScoresMap)
        .map(([_, data]) => data)
        .sort((a, b) => b.percentage - a.percentage);

      const strengths = scores.slice(0, 2).map(s => `${s.categoryName}: ${s.percentage.toFixed(1)}%`);
      const improvements = scores.slice(-2).map(s => `${s.categoryName}: ${s.percentage.toFixed(1)}%`);

      return {
        organizationId: assessment.organization_id,
        overallScore: Math.round(overallScore * 100) / 100,
        certificationLevel,
        categoryScores: categoryScoresMap,
        strengths,
        improvements
      };
    } catch (error) {
      console.error('Error calculating maturity score:', error);
      throw error;
    }
  },

  determineCertificationLevel(score: number): CertificationLevel {
    if (score >= 85) return 'diamond';
    if (score >= 65) return 'gold';
    if (score >= 45) return 'silver';
    return 'none';
  },

  // Update assessment with maturity score
  async updateAssessmentWithScore(assessmentId: string, maturityScore: HRMaturityScore) {
    const { data, error } = await supabase
      .from('assessments')
      .update({
        overall_score: maturityScore.overallScore,
        certification_level: maturityScore.certificationLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;
    return data as Assessment;
  },

  // Get benchmark comparison
  async getBenchmarkComparison(
    assessmentId: string,
    categoryScores: CategoryScore[]
  ): Promise<BenchmarkComparison | null> {
    try {
      const { data: assessment } = await supabase
        .from('assessments')
        .select('organizations(industry, region, company_size)')
        .eq('id', assessmentId)
        .single();

      if (!assessment) return null;

      const org = (assessment as AssessmentWithOrg).organizations;
      const avgCategoryScore = categoryScores.reduce((sum, cs) => sum + cs.percentage, 0) / categoryScores.length;

      // Get benchmarks for this organization profile
      const { data: benchmarks } = await supabase
        .from('benchmark_aggregates')
        .select('avg_score')
        .eq('industry', org.industry)
        .eq('region', org.region)
        .eq('company_size', org.company_size);

      if (!benchmarks || benchmarks.length === 0) return null;

      const industryAverage = benchmarks.reduce((sum, b: BenchmarkAggregate) => sum + b.avg_score, 0) / benchmarks.length;
      const percentile = this.calculatePercentile(avgCategoryScore, benchmarks.map((b: BenchmarkAggregate) => b.avg_score));

      let performance: 'below_average' | 'average' | 'above_average' | 'excellent' = 'average';
      if (avgCategoryScore < industryAverage - 10) performance = 'below_average';
      else if (avgCategoryScore > industryAverage + 10) performance = 'excellent';
      else if (avgCategoryScore > industryAverage + 5) performance = 'above_average';

      return {
        industryAverage: Math.round(industryAverage * 100) / 100,
        regionAverage: industryAverage, // Simplified - in production would be separate
        sizeAverage: industryAverage, // Simplified - in production would be separate
        percentile,
        performance
      };
    } catch (error) {
      console.error('Error getting benchmark comparison:', error);
      return null;
    }
  },

  // Calculate percentile rank
  calculatePercentile(value: number, allValues: number[]): number {
    const sorted = [...allValues].sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return Math.round((rank / sorted.length) * 100);
  },

  // Get maturity trends over time
  async getMaturityTrends(organizationId: string, limit: number = 5) {
    const { data, error } = await supabase
      .from('assessments')
      .select('id, overall_score, certification_level, completed_at')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.reverse() || [];
  },

  // Get all HR domains for reference
  getHRDomains() {
    return Object.values(HR_DOMAINS);
  }
};
