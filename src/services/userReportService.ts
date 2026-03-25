import { supabase } from '@/integrations/supabase/client';
import { UserReport, Certification } from '@/types';
import { assessmentService } from './assessmentService';
import { selfAssessmentService } from './selfAssessmentService';
import { improvementService } from './improvementService';

export const userReportService = {
  // ─── Build unified user report ────────────────────────────────────
  async getUserReport(userId: string, organizationId?: string): Promise<UserReport> {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch organization info
    let orgData = null;
    if (organizationId) {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, industry')
        .eq('id', organizationId)
        .maybeSingle();
      orgData = data;
    }

    // Fetch certifications (org-level + user-level)
    const { data: certData } = await supabase
      .from('certifications')
      .select('*')
      .or(
        organizationId
          ? `organization_id.eq.${organizationId},user_id.eq.${userId}`
          : `user_id.eq.${userId}`
      )
      .order('issued_at', { ascending: false });

    // Fetch in parallel: org assessments, self assessments, improvements, skill scores
    const [orgAssessments, selfAssessments, improvements, skillScores] = await Promise.all([
      organizationId
        ? assessmentService.getOrganizationAssessments(organizationId)
        : Promise.resolve([]),
      selfAssessmentService.getSelfAssessmentsByUser(userId),
      improvementService.getUserImprovements(userId),
      improvementService.getUserSkillScores(userId),
    ]);

    const completedOrgScores = orgAssessments
      .filter(a => a.overall_score != null)
      .map(a => a.overall_score as number);

    const completedSelfScores = selfAssessments
      .filter(a => a.overall_score != null)
      .map(a => a.overall_score as number);

    const allScores = [...completedOrgScores, ...completedSelfScores];
    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
        : 0;

    return {
      profile: {
        id: profileData?.id || '',
        full_name: profileData?.full_name || null,
        email: profileData?.email || '',
        job_title: profileData?.job_title || null,
        avatar_url: profileData?.avatar_url || null,
        created_at: profileData?.created_at,
      },
      organization: orgData
        ? { id: orgData.id, name: orgData.name, industry: orgData.industry }
        : null,
      orgAssessments: orgAssessments || [],
      selfAssessments: selfAssessments || [],
      certifications: (certData as Certification[]) || [],
      skillScores: skillScores || [],
      improvements: improvements || [],
      totalScore: allScores.reduce((sum, s) => sum + s, 0),
      averageScore,
    };
  },
};
