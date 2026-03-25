import { useState, useEffect } from "react";
import { TrendingUp, BarChart3, Users, Building2, Map, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { maturityScoringService } from "@/services/maturityScoringService";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface IndustryStats {
  name: string;
  avg: number;
  count: number;
}

interface OrgSummary {
  name: string;
  latestStatus: string;
  latestScore: number | null;
  latestCertification: string;
  totalAssessments: number;
  latestAssessmentAt: string | null;
  gapInsights: string[];
  categoryBreakdown: Array<{ category: string; score: number }>;
}

interface AnalyticsState {
  avgScore: number;
  topIndustries: IndustryStats[];
  scoreDistribution: Array<{ range: string; value: number }>;
  totalAssessments: number;
  activeRegions: number;
}

const BenchmarkAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsState>({
    avgScore: 0,
    topIndustries: [],
    scoreDistribution: [],
    totalAssessments: 0,
    activeRegions: 0,
  });
  const [acneOrgSummary, setAcneOrgSummary] = useState<OrgSummary>({
    name: 'Acne Corporation',
    latestStatus: 'unknown',
    latestScore: null,
    latestCertification: 'unknown',
    totalAssessments: 0,
    latestAssessmentAt: null,
    gapInsights: [],
    categoryBreakdown: [],
  });

  const SYNC_ORG_ID = '49e4e2d1-bc30-4ec5-aa05-42425929790f';

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Global benchmark metrics
      type AssessmentRow = {
        overall_score: number | null;
        organizations: {
          industry: string;
          region?: string;
        };
      };

      const { data: assessments, error: assessmentError } = await supabase
        .from<AssessmentRow>('assessments')
        .select('overall_score, organizations(industry, region)')
        .not('overall_score', 'is', null);

      if (assessmentError) throw assessmentError;

      let avgScore = 0;
      let topIndustries: IndustryStats[] = [];
      let scoreDistribution: Array<{ range: string; value: number }> = [];
      let activeRegions = 0;
      let totalAssessments = 0;

      if (assessments && assessments.length > 0) {
        totalAssessments = assessments.length;
        const totalScore = assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0);
        avgScore = Math.round(totalScore / totalAssessments);

        const industryGroups = assessments.reduce((acc: Record<string, any>, a) => {
          const ind = a.organizations?.industry || 'other';
          const region = a.organizations?.region;

          if (!acc[ind]) acc[ind] = { name: ind, total: 0, count: 0 };
          acc[ind].total += a.overall_score || 0;
          acc[ind].count += 1;

          if (region) acc._regions = acc._regions ? new Set([...acc._regions, region]) : new Set([region]);
          return acc;
        }, {});

        activeRegions = industryGroups._regions ? industryGroups._regions.size : 0;
        delete industryGroups._regions;

        topIndustries = Object.values(industryGroups)
          .map((ind: any) => ({
            name: ind.name.replace(/_/g, ' ').toUpperCase(),
            avg: Math.round(ind.total / ind.count),
            count: ind.count,
          }))
          .sort((a: any, b: any) => b.avg - a.avg);

        const bins = [0, 20, 40, 60, 80, 100];
        const distCounts = bins.map(() => 0);
        assessments.forEach((r: any) => {
          const score = Number(r.overall_score || 0);
          const idx = bins.findIndex((b) => score <= b);
          distCounts[Math.min(Math.max(0, idx), bins.length - 1)] += 1;
        });

        scoreDistribution = bins.map((b, i) => ({
          range: i === 0 ? `0-${b}` : `${bins[i - 1] + 1}-${b}`,
          value: distCounts[i],
        }));
      }

      setAnalytics({
        avgScore,
        topIndustries,
        scoreDistribution,
        totalAssessments,
        activeRegions,
      });

      // Sync target organization by ID/name with assessments & latest fields in DB
      try {
        await organizationService.syncAnchorOrganization();
      } catch (err) {
        console.warn('Benchmark analytics: organization sync failed', err);
      }

      // Fetch focused organization data for Acne Corporation
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', SYNC_ORG_ID)
        .single();

      if (orgError) throw orgError;
      const assessmentsForOrg = await supabase
        .from('assessments')
        .select('id,title,status,overall_score,certification_level,completed_at')
        .eq('organization_id', SYNC_ORG_ID)
        .order('completed_at', { ascending: false });

      const latestOrg = assessmentsForOrg.data?.find((a: { status: string }) => a.status === 'completed') || assessmentsForOrg.data?.[0] || null;

      const gapInsights: string[] = [];
      let categoryBreakdown: Array<{ category: string; score: number }> = [];

      if (latestOrg) {
        const categoryScores = await supabase
          .from('category_scores')
          .select('category_id, percentage')
          .eq('assessment_id', latestOrg.id);

        if (categoryScores.error) throw categoryScores.error;

        categoryBreakdown = (categoryScores.data || []).map((item: any) => ({
          category: item.category_id.replace(/_/g, ' '),
          score: Math.round(Number(item.percentage || 0)),
        }));

        const calculated = await maturityScoringService.calculateMaturityScore(latestOrg.id);
        const industryAvg = topIndustries.find((i: IndustryStats) =>
          i.name.toLowerCase().includes(orgData.industry.replace(/_/g, ' '))
        )?.avg || avgScore;
        const delta = Math.round((calculated.overallScore || 0) - industryAvg);

        gapInsights.push(
          `Latest completed assessment: ${latestOrg.title} (${latestOrg.status}).`,
          `Acne Corp score ${calculated.overallScore}/100 vs industry average ${industryAvg}/100 (${delta >= 0 ? '+' : ''}${delta}).`,
          `Recommended target: ${Math.max(0, Math.min(100, calculated.overallScore + 10))}/100 for next cycle.`,
        );
      } else {
        gapInsights.push('No completed assessment yet for Acne Corporation to build full gap analysis.');
      }

      setAcneOrgSummary({
        name: orgData?.name ?? 'Acne Corporation',
        latestStatus: latestOrg?.status ?? 'none',
        latestScore: latestOrg?.overall_score != null ? Math.round(Number(latestOrg.overall_score)) : null,
        latestCertification: latestOrg?.certification_level ?? 'none',
        totalAssessments: assessmentsForOrg.data?.length || 0,
        latestAssessmentAt: latestOrg?.completed_at ?? null,
        gapInsights,
        categoryBreakdown,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Failed to load benchmark analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <AppLayout title="Benchmark Analytics">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Global Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgScore}%</div>
                <p className="text-xs text-muted-foreground">Across {analytics.totalAssessments} assessments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Industry</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.topIndustries[0]?.name || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">{analytics.topIndustries[0]?.avg}% average maturity</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participation</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalAssessments}</div>
                <p className="text-xs text-muted-foreground">Completed assessments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
                <Map className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.activeRegions || '–'}</div>
                <p className="text-xs text-muted-foreground">Distinct regions with completed assessments</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Acne Corporation Spotlight</h3>
            <p className="text-sm text-muted-foreground">Organization ID: 49e4e2d1-bc30-4ec5-aa05-42425929790f</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wide">Latest Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{acneOrgSummary.latestScore ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">
                    {acneOrgSummary.latestCertification.toUpperCase()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wide">Latest Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{acneOrgSummary.latestStatus || 'n/a'}</div>
                  <p className="text-xs text-muted-foreground">Assessments: {acneOrgSummary.totalAssessments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wide">Most Recent  (Date)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {acneOrgSummary.latestAssessmentAt ? new Date(acneOrgSummary.latestAssessmentAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed assessment timestamp</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wide">Gap Insight</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                    {acneOrgSummary.gapInsights.slice(0, 3).map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Acne Corporation Category-wise Analysis</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {acneOrgSummary.categoryBreakdown.length > 0 ? (
                acneOrgSummary.categoryBreakdown.map((item) => (
                  <Card key={item.category} className="p-2">
                    <CardContent>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
                      <p className="text-xl font-bold">{item.score}%</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No category score details yet. Complete an assessment for Acne Corporation first.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Acne Corporation Gap Insights</h3>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              {acneOrgSummary.gapInsights.map((insight, idx) => (
                <p key={idx}>• {insight}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Industry Performance Comparison</CardTitle>
                <CardDescription>Average HR Maturity scores by industry vertical</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topIndustries} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 10 }} 
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Organization Distribution</CardTitle>
                <CardDescription>Breakdown by industry participation</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.topIndustries}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="avg"
                      nameKey="name"
                    >
                      {analytics.topIndustries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.1})`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default BenchmarkAnalytics;
