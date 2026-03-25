import { supabase } from '@/integrations/supabase/client';
import { Assessment, AssessmentCategory, Organization } from '@/types';

// Static benchmark data for each HR domain - varied and realistic
const STATIC_BENCHMARKS: Record<string, { category: string; industryAvg: number; topPerformers: number }> = {
  'Talent Acquisition & Onboarding': { category: 'Talent Acquisition & Onboarding', industryAvg: 68, topPerformers: 88 },
  'Performance Management': { category: 'Performance Management', industryAvg: 72, topPerformers: 91 },
  'Learning & Development': { category: 'Learning & Development', industryAvg: 64, topPerformers: 85 },
  'Compensation & Benefits': { category: 'Compensation & Benefits', industryAvg: 70, topPerformers: 89 },
  'Employee Engagement & Culture': { category: 'Employee Engagement & Culture', industryAvg: 66, topPerformers: 87 },
  'Diversity, Equity & Inclusion': { category: 'Diversity, Equity & Inclusion', industryAvg: 62, topPerformers: 83 }
};

// Static sample organizations for leaderboard comparison
const STATIC_SAMPLE_ORGANIZATIONS = [
  { name: 'GlobeCore Solutions', score: 94 },
  { name: 'Apex Enterprise Ltd', score: 91 },
  { name: 'Zenith Human Capital', score: 88 },
  { name: 'Prism Innovations Inc', score: 85 },
  { name: 'Nexus Dynamics', score: 82 },
  { name: 'Summit & Associates', score: 79 },
  { name: 'Catalyst Business Group', score: 76 },
  { name: 'Horizon Tech Services', score: 73 },
  { name: 'Quantum People Solutions', score: 70 },
  { name: 'Bridge Corporate Partners', score: 67 },
  { name: 'Frontier HR Systems', score: 64 },
  { name: 'Unified Workforce Inc', score: 61 }
];

export interface BenchmarkMetrics {
  yourScore: number;
  industryAverage: number;
  globalAverage: number;
  rank: number;
  totalOrganizations: number;
  percentile: number;
  radarData: Array<{
    category: string;
    you: number;
    industry: number;
    global: number;
    topPerformers: number;
  }>;
  leaderboard: Array<{
    name: string;
    score: number;
    rank: number;
    isYou: boolean;
  }>;
}

export const benchmarkService = {
  async getBenchmarkData(organizationId: string): Promise<BenchmarkMetrics> {
    // 1. Fetch current organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    // 2. Fetch assessment for your organization only
    const { data: assessments, error: asstError } = await supabase
      .from('assessments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (asstError) throw asstError;

    const myAssessment = assessments?.[0];
    if (!myAssessment) {
      throw new Error('No completed assessment found for this organization. Please complete an assessment first.');
    }

    const myScore = Number(myAssessment.overall_score || 0);

    // 3. Calculate industry and global averages from static benchmarks
    const benchmarkValues = Object.values(STATIC_BENCHMARKS);
    const industryAverage = Math.round(benchmarkValues.reduce((sum, b) => sum + b.industryAvg, 0) / benchmarkValues.length);
    const topPerformersAverage = Math.round(benchmarkValues.reduce((sum, b) => sum + b.topPerformers, 0) / benchmarkValues.length);
    const globalAverage = Math.round((industryAverage + topPerformersAverage) / 2);

    // 4. Calculate rank based on static sample organizations + our score
    const allScores = [...STATIC_SAMPLE_ORGANIZATIONS.map(org => org.score), myScore].sort((a, b) => b - a);
    const myRank = allScores.indexOf(myScore) + 1;
    const totalOrgs = allScores.length;
    const scoresBelow = allScores.filter(s => s < myScore).length;
    const percentile = totalOrgs > 0 ? (scoresBelow / totalOrgs) * 100 : 0;

    // 5. Get category scores for your organization
    const { data: allCategories, error: catError } = await supabase
      .from('assessment_categories')
      .select('*')
      .order('display_order');
    
    if (catError) throw catError;

    const categories = (allCategories || []).slice(0, 6);

    // Get your category scores
    const { data: myCategoryScores, error: myScoresError } = await supabase
      .from('category_scores')
      .select('*')
      .eq('assessment_id', myAssessment.id);

    if (myScoresError) throw myScoresError;

    // Build radar data with static benchmarks and dynamic your scores
    const radarData = categories.map((cat: AssessmentCategory) => {
      const myCatScore = myCategoryScores?.find(cs => cs.category_id === cat.id);
      const benchmark = STATIC_BENCHMARKS[cat.name] || { industryAvg: 70, topPerformers: 85 };

      return {
        category: cat.name,
        you: Math.round(myCatScore?.percentage || 0),
        industry: benchmark.industryAvg,
        global: Math.round((benchmark.industryAvg + benchmark.topPerformers) / 2),
        topPerformers: benchmark.topPerformers
      };
    });

    // 6. Build leaderboard with static organizations + your organization positioned dynamically
    const leaderboardWithYou = [
      ...STATIC_SAMPLE_ORGANIZATIONS,
      { name: org.name, score: Math.round(myScore), isStatic: false }
    ]
      .sort((a, b) => b.score - a.score)
      .map((org, index) => ({
        name: org.name,
        score: org.score,
        rank: index + 1,
        isYou: !('isStatic' in org) || !org.isStatic
      }));

    return {
      yourScore: myScore,
      industryAverage,
      globalAverage,
      rank: myRank,
      totalOrganizations: totalOrgs,
      percentile,
      radarData,
      leaderboard: leaderboardWithYou
    };
  }
};
