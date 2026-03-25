import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, Building2, MapPin, Users, Award,
  ClipboardCheck, TrendingUp, Download, CheckCircle2, Clock, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { organizationService } from '@/services/organizationService';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  BRAND,
  drawPageHeader,
  drawPageFooter,
  drawSectionHeading,
  drawDivider,
  drawKV,
  drawProgressRow,
  drawScoreBadge,
  drawInfoBox,
  drawTable,
} from '@/lib/pdfUtils';

interface OrgDetail {
  id: string;
  name: string;
  industry: string;
  region: string;
  company_size: string;
  website?: string | null;
  created_at: string;
}

interface Assessment {
  id: string;
  title: string;
  status: string;
  overall_score: number | null;
  certification_level: string | null;
  created_at: string;
  completed_at: string | null;
}

interface CategoryScore {
  category_id: string;
  percentage: number;
  score: number;
  max_possible_score: number;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

const certBg: Record<string, string> = {
  diamond: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  silver: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  none: 'bg-muted text-muted-foreground',
};

const OrganizationProfile = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const activeToast = useRef<string | number | null>(null);

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Dismiss any lingering toast when the component unmounts (prevents stuck loaders)
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (activeToast.current != null) {
        toast.dismiss(activeToast.current);
        activeToast.current = null;
      }
    };
  }, []);

  const fetchAll = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch org + categories in parallel; assessments separately to get reliable count
      const [{ data: orgData, error: orgErr }, { data: catsData }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', id).single(),
        supabase.from('assessment_categories').select('id, name, description').order('display_order'),
      ]);

      if (orgErr || !orgData) throw new Error('Organization not found');

      // Ensure the given organization has the latest assessment linkage & status fields
      try {
        const syncedOrg = await organizationService.syncOrganizationData(id);
        if (syncedOrg && isMounted.current) {
          setOrg(syncedOrg as OrgDetail);
        }
      } catch (syncError) {
        console.warn('Sync fallback failed for organization profile:', syncError);
        if (isMounted.current) {
          setOrg(orgData as OrgDetail);
        }
      }

      if (!isMounted.current) return;

      const catList = ((catsData || []) as Category[]).slice(0, 6);
      setCategories(catList);

      // Fetch assessments — using two separate filters to catch both
      // orgs where organization_id is set AND legacy ones that may have been null
      const { data: aData, error: aErr } = await supabase
        .from('assessments')
        .select('id, title, status, overall_score, certification_level, created_at, completed_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false });

      if (aErr) console.error('Assessment fetch error:', aErr);
      const assessList = (aData || []) as Assessment[];
      if (!isMounted.current) return;
      setAssessments(assessList);

      // Fetch category scores for the latest completed assessment
      const completed = assessList.filter((a) => a.status === 'completed');
      if (completed.length > 0) {
        const { data: scoresData, error: scoresErr } = await supabase
          .from('category_scores')
          .select('category_id, percentage, score, max_possible_score')
          .eq('assessment_id', completed[0].id);

        if (scoresErr) console.error('Category scores fetch error:', scoresErr);
        if (isMounted.current) {
          setCategoryScores((scoresData || []) as CategoryScore[]);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgId) fetchAll(orgId);
  }, [orgId, fetchAll]);

  // ─── PDF Generation ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!org || generating) return;
    setGenerating(true);
    const toastId = toast.loading('Building organization report…');
    activeToast.current = toastId;

    try {
      const latestCompleted = assessments.find((a) => a.status === 'completed') ?? null;
      const score = latestCompleted?.overall_score != null
        ? Math.round(Number(latestCompleted.overall_score)) : null;
      const certLevel = latestCompleted?.certification_level ?? 'none';
      const completedList = assessments.filter((a) => a.status === 'completed');

      const doc = new jsPDF('portrait', 'pt', 'a4');
      const pW = doc.internal.pageSize.getWidth();

      // ── PAGE 1 ────────────────────────────────────────────────────────────
      let y = drawPageHeader(doc, `Organization Summary Report — ${org.name}`);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...BRAND.dark);
      doc.text(org.name, pW / 2, y + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...BRAND.muted);
      doc.text(
        `Industry: ${org.industry.replace(/_/g, ' ')} · Region: ${org.region.replace(/_/g, ' ')} · Size: ${org.company_size.replace(/_/g, '-')} employees`,
        pW / 2, y + 34, { align: 'center' }
      );
      y += 60;

      // Score badge + cert pill
      const certLabelMap: Record<string, string> = { diamond: 'DIAMOND', gold: 'GOLD', silver: 'SILVER', none: 'NO CERT' };
      if (score != null) {
        drawScoreBadge(doc, score, 'Overall Score', pW / 2 - 60, y + 44, 38);
        const certColor: [number, number, number] = certLevel === 'diamond' ? BRAND.diamond : certLevel === 'gold' ? BRAND.gold : certLevel === 'silver' ? BRAND.silver : BRAND.muted;
        doc.setFillColor(...certColor);
        doc.roundedRect(pW / 2 + 28, y + 16, 110, 36, 6, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...BRAND.white);
        doc.text(certLabelMap[certLevel] ?? 'NO CERT', pW / 2 + 83, y + 39, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Certification', pW / 2 + 83, y + 50, { align: 'center' });
        y += 100;
      } else {
        y = drawInfoBox(doc, 'No completed assessment found for this organization. The report sections below will be empty until an assessment is completed.', y, 'info');
        y += 8;
      }

      y = drawDivider(doc, y);

      // ── SECTION 1 — Organization Details ────────────────────────────────
      y = drawSectionHeading(doc, '1. Organization Details', y);
      y = drawKV(doc, 'Organization Name', org.name, y);
      y = drawKV(doc, 'Industry', org.industry.replace(/_/g, ' '), y);
      y = drawKV(doc, 'Region', org.region.replace(/_/g, ' '), y);
      y = drawKV(doc, 'Company Size', `${org.company_size.replace(/_/g, '-')} employees`, y);
      if (org.website) y = drawKV(doc, 'Website', org.website, y);
      y = drawKV(doc, 'Registered On', new Date(org.created_at).toLocaleDateString('en-IN'), y);
      y += 8;

      // ── SECTION 2 — Assessment Summary ──────────────────────────────────
      y = drawSectionHeading(doc, '2. Assessment Summary', y);
      y = drawKV(doc, 'Total Assessments', String(assessments.length), y);
      y = drawKV(doc, 'Completed', String(completedList.length), y);
      y = drawKV(doc, 'In Progress', String(assessments.filter((a) => a.status === 'in_progress').length), y);
      if (latestCompleted) {
        y = drawKV(doc, 'Latest Assessment', latestCompleted.title, y);
        y = drawKV(doc, 'Latest Score', score != null ? `${score} / 100` : 'N/A', y);
        y = drawKV(doc, 'Certification Level', certLevel.charAt(0).toUpperCase() + certLevel.slice(1), y);
        if (latestCompleted.completed_at)
          y = drawKV(doc, 'Completed On', new Date(latestCompleted.completed_at).toLocaleDateString('en-IN'), y);
      } else {
        y = drawInfoBox(doc, 'This organization has not completed any assessments yet.', y, 'warning');
      }
      y += 8;

      // ── SECTION 3 — Category-Wise Scores ────────────────────────────────
      if (categoryScores.length > 0 && categories.length > 0) {
        y = drawSectionHeading(doc, '3. Category-Wise Performance', y);
        for (const cat of categories) {
          const cs = categoryScores.find((s) => s.category_id === cat.id);
          const pct = cs?.percentage ?? 0;
          y = drawProgressRow(doc, cat.name, pct, y);
          if (y > 720) { doc.addPage(); drawPageFooter(doc); y = 40; }
        }
        y += 8;
      }

      drawPageFooter(doc, 1);

      // ── PAGE 2 — Gap Analysis + Benchmark + Strengths ──────────────────
      doc.addPage();
      y = drawPageHeader(doc, `Organization Report — ${org.name} (continued)`);

      // ── SECTION 4 — Gap Analysis ─────────────────────────────────────────
      y = drawSectionHeading(doc, '4. Gap Analysis', y);
      if (categoryScores.length > 0 && categories.length > 0) {
        const IND_AVG = 58;
        const TOP_AVG = 85;
        const rows = categories.map((cat) => {
          const cs = categoryScores.find((s) => s.category_id === cat.id);
          const pct = cs?.percentage ?? 0;
          const vsInd = pct - IND_AVG;
          const vsTop = pct - TOP_AVG;
          return [cat.name, `${pct}%`, `${IND_AVG}%`, `${vsInd >= 0 ? '+' : ''}${vsInd}`, `${TOP_AVG}%`, `${vsTop >= 0 ? '+' : ''}${vsTop}`];
        });
        y = drawTable(doc, ['Domain', 'Your Score', 'Ind. Avg', 'Gap vs Ind.', 'Top 10%', 'Gap vs Top'], rows, y, [145, 65, 55, 65, 55, 65]);
      } else {
        y = drawInfoBox(doc, 'No category scores available. Complete an assessment to see gap analysis.', y, 'info');
      }
      y += 10;

      // ── SECTION 5 — Benchmark Comparison ────────────────────────────────
      y = drawSectionHeading(doc, '5. Benchmark Comparison', y);
      y = drawProgressRow(doc, `${org.name} (This Org)`, score ?? 0, y, BRAND.primary);
      y = drawProgressRow(doc, 'Industry Average', 58, y, BRAND.silver);
      y = drawProgressRow(doc, 'Top 10% Performers', 85, y, BRAND.success);
      y += 10;

      if (score != null) {
        const vs = score - 58;
        y = drawInfoBox(doc,
          vs > 0
            ? `✓ ${org.name} scores ${vs} points above the industry average (58/100).`
            : vs === 0
              ? `○ ${org.name} matches the industry average exactly.`
              : `⚠ ${org.name} is ${Math.abs(vs)} points below the industry average. Targeted improvement is recommended.`,
          y, vs >= 5 ? 'success' : vs >= -5 ? 'info' : 'warning'
        );
      }
      y += 10;

      // ── SECTION 6 — Strengths & Improvement Areas ───────────────────────
      y = drawSectionHeading(doc, '6. Strengths & Improvement Areas', y);
      if (categoryScores.length > 0 && categories.length > 0) {
        const sorted = [...categoryScores]
          .map((cs) => ({ ...cs, name: categories.find((c) => c.id === cs.category_id)?.name ?? cs.category_id }))
          .sort((a, b) => b.percentage - a.percentage);
        const strengths = sorted.filter((s) => s.percentage >= 65).slice(0, 3);
        const weaknesses = sorted.filter((s) => s.percentage < 65).slice(-3).reverse();
        if (strengths.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...BRAND.success);
          doc.text('Strengths (≥ 65%)', 40, y); y += 16;
          strengths.forEach((s) => { y = drawProgressRow(doc, s.name, s.percentage, y, BRAND.success); });
          y += 4;
        }
        if (weaknesses.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...BRAND.warning);
          doc.text('Priority Improvement Areas (< 65%)', 40, y); y += 16;
          weaknesses.forEach((s) => { y = drawProgressRow(doc, s.name, s.percentage, y, BRAND.warning); });
        }
      } else {
        y = drawInfoBox(doc, 'No domain scores available yet.', y, 'info');
      }
      y += 12;

      // ── SECTION 7 — Final Summary ────────────────────────────────────────
      y = drawSectionHeading(doc, '7. Final Summary & Recommendations', y);
      const summaryLines: string[] = [];
      if (score != null) {
        if (score >= 85) summaryLines.push('• Diamond-tier: Industry-leading HR maturity.');
        else if (score >= 65) summaryLines.push('• Gold-tier: Strong HR foundation. Target Diamond with focused improvements.');
        else if (score >= 45) summaryLines.push('• Silver-tier: Core practices established. Accelerate weaker domains.');
        else summaryLines.push('• Below Silver: Foundational gaps exist. Structured improvement roadmap required.');
        summaryLines.push('');
        summaryLines.push(`• Score: ${score}/100  |  Certification: ${certLevel.toUpperCase()}`);
        summaryLines.push(`• Completed Assessments: ${completedList.length}  |  Total: ${assessments.length}`);
        if (categoryScores.length > 0) {
          const w = [...categoryScores]
            .map((cs) => ({ ...cs, name: categories.find((c) => c.id === cs.category_id)?.name ?? '' }))
            .sort((a, b) => a.percentage - b.percentage)[0];
          if (w.name) summaryLines.push(`• Priority: Improve "${w.name}" (${w.percentage}%) to lift overall score.`);
        }
        summaryLines.push('• Recommended: Re-assess quarterly to track progress and maintain certification standing.');
      } else {
        summaryLines.push('• No completed assessments. Complete an assessment to generate a full evaluation.');
      }
      summaryLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, pW - 80);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...BRAND.body);
        doc.text(wrapped, 40, y);
        y += wrapped.length * 13 + 3;
        if (y > 720) { doc.addPage(); drawPageFooter(doc); y = 40; }
      });

      drawPageFooter(doc, 2);

      // ── PAGE 3 — Assessment History ──────────────────────────────────────
      if (assessments.length > 0) {
        doc.addPage();
        y = drawPageHeader(doc, `Organization Report — ${org.name} (Assessment History)`);
        y = drawSectionHeading(doc, '8. Full Assessment History', y);
        const histRows = assessments.map((a) => [
          a.title.slice(0, 38),
          a.status.replace(/_/g, ' '),
          a.overall_score != null ? `${Math.round(Number(a.overall_score))}/100` : '—',
          (a.certification_level || 'none').toUpperCase(),
          a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-IN') : '—',
        ]);
        drawTable(doc, ['Assessment Title', 'Status', 'Score', 'Cert. Level', 'Completed'], histRows, y, [205, 65, 60, 70, 100]);
        drawPageFooter(doc, 3);
      }

      doc.save(`${org.name.replace(/\s+/g, '_')}_HR_Report_${new Date().toISOString().slice(0, 10)}.pdf`);

      // Always clean up toast and state — check mount before calling setGenerating
      toast.dismiss(toastId);
      activeToast.current = null;
      toast.success('Report downloaded successfully!');
      if (isMounted.current) setGenerating(false);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.dismiss(toastId);
      activeToast.current = null;
      toast.error('Failed to generate report. Please try again.');
      if (isMounted.current) setGenerating(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !org) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-8">
          <Button variant="outline" onClick={() => navigate('/organizations')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Organizations
          </Button>
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Error</p>
                <p className="text-sm text-muted-foreground">{error || 'Organization not found'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  const latestCompleted = completedAssessments[0] ?? null;
  const latestScore = latestCompleted?.overall_score != null
    ? Math.round(Number(latestCompleted.overall_score)) : null;
  const certLevel = latestCompleted?.certification_level ?? null;

  return (
    <AppLayout title={org.name}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/organizations')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Organizations
          </Button>
          <Button onClick={handleDownload} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Download Full Report'}
          </Button>
        </div>

        {/* Org header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{org.name}</CardTitle>
                  <CardDescription>
                    Registered {new Date(org.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </CardDescription>
                </div>
              </div>
              {certLevel && (
                <Badge className={`capitalize text-sm px-3 py-1 ${certBg[certLevel] ?? certBg.none}`}>
                  <Award className="w-3.5 h-3.5 mr-1 inline" />{certLevel}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: Building2, label: 'Industry', value: org.industry.replace(/_/g, ' ') },
                { icon: MapPin, label: 'Region', value: org.region.replace(/_/g, ' ') },
                { icon: Users, label: 'Size', value: `${org.company_size.replace(/_/g, '-')} employees` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium capitalize">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, bg: 'bg-success/10', iconColor: 'text-success', value: completedAssessments.length, label: 'Completed Assessments' },
            { icon: TrendingUp, bg: 'bg-primary/10', iconColor: 'text-primary', value: latestScore != null ? `${latestScore}/100` : '—', label: 'Latest Score' },
            { icon: Award, bg: 'bg-cert-gold/20', iconColor: 'text-cert-gold', value: certLevel ? certLevel.charAt(0).toUpperCase() + certLevel.slice(1) : '—', label: 'Certification Level' },
          ].map(({ icon: Icon, bg, iconColor, value, label }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Latest assessment */}
        {latestCompleted ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Latest Completed Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{latestCompleted.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Completed {latestCompleted.completed_at
                      ? new Date(latestCompleted.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <Badge className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Overall Score</span>
                  <span className="font-bold text-primary">{latestScore ?? 0}/100</span>
                </div>
                <Progress value={latestScore ?? 0} className="h-2.5" />
              </div>

              {categoryScores.length > 0 && categories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Domain Breakdown</p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {categories.map((cat) => {
                      const cs = categoryScores.find((s) => s.category_id === cat.id);
                      const pct = cs?.percentage ?? 0;
                      return (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium truncate">{cat.name}</span>
                            <span className="text-muted-foreground ml-2 shrink-0">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {categoryScores.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Domain scores not available — either the assessment hasn't been scored yet or category_scores records are pending.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No completed assessments yet</p>
              <p className="text-sm">
                {assessments.length > 0
                  ? `${assessments.length} assessment(s) in progress — none completed yet.`
                  : 'No assessments found for this organization.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Benchmark insights */}
        {latestScore != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Key Benchmark Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className={`rounded-lg border p-3 ${latestScore >= 65 ? 'border-success/40 bg-success/5' : 'border-orange-300/40 bg-orange-50/40 dark:bg-orange-950/20'}`}>
                <p className={latestScore >= 65 ? 'text-success font-medium' : 'text-orange-700 dark:text-orange-300 font-medium'}>
                  {latestScore >= 85 ? '🏆 Diamond-tier: Industry-leading HR maturity.'
                    : latestScore >= 65 ? '🥇 Gold-tier: Strong HR practices with select areas for refinement.'
                      : latestScore >= 45 ? '🥈 Silver-tier: Foundational practices in place — accelerate weaker domains.'
                        : '⚠️ Below Silver: Significant improvements needed.'}
                </p>
              </div>
              {categoryScores.length > 0 && (
                <>
                  {(() => {
                    const s = [...categoryScores].sort((a, b) => b.percentage - a.percentage)[0];
                    const n = categories.find((c) => c.id === s.category_id)?.name;
                    return n ? <p>⭐ <strong>Strongest Domain:</strong> {n} ({s.percentage}%)</p> : null;
                  })()}
                  {(() => {
                    const s = [...categoryScores].sort((a, b) => a.percentage - b.percentage)[0];
                    const n = categories.find((c) => c.id === s.category_id)?.name;
                    return n ? <p>🎯 <strong>Priority Improvement:</strong> {n} ({s.percentage}%)</p> : null;
                  })()}
                </>
              )}
              <p className="text-muted-foreground">🌐 Benchmark: Industry average ≈ 58/100 · Top 10% ≈ 85+/100.</p>
            </CardContent>
          </Card>
        )}

        {/* Assessment history */}
        {assessments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment History</CardTitle>
              <CardDescription>All {assessments.length} assessment(s) for this organization</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {assessments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.completed_at
                          ? `Completed ${new Date(a.completed_at).toLocaleDateString('en-IN')}`
                          : `Started ${new Date(a.created_at).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.overall_score != null && (
                        <span className="text-sm font-semibold">{Math.round(Number(a.overall_score))}/100</span>
                      )}
                      <Badge variant={a.status === 'completed' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                        {a.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {a.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default OrganizationProfile;
