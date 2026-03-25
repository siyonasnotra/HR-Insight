import { useState, useEffect } from "react";
import {
  User,
  Building2,
  Award,
  TrendingUp,
  BarChart3,
  Download,
  FileText,
  ClipboardList,
  Star,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { userReportService } from "@/services/userReportService";
import { skillTagLabels } from "@/services/improvementService";
import { UserReport, Certification } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";
import {
  BRAND,
  drawPageHeader,
  drawPageFooter,
  drawSectionHeading,
  drawDivider,
  drawKV,
  drawProgressRow,
  drawInfoBox,
} from "@/lib/pdfUtils";

const suggestionIcons = {
  strength: { icon: Star, color: "text-success", bg: "bg-success/10" },
  weakness: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  recommendation: { icon: Lightbulb, color: "text-primary", bg: "bg-primary/10" },
};

const UserReportPage = () => {
  const { user, profile, organization } = useAuth();
  const [report, setReport] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchReport();
  }, [user?.id]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await userReportService.getUserReport(user!.id, organization?.id);
      setReport(data);
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF("portrait", "pt", "a4");
    const pW  = doc.internal.pageSize.getWidth();

    // ── Page 1 ────────────────────────────────────────────────────────────────
    let y = drawPageHeader(doc, "Individual HR Performance Report");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...BRAND.dark);
    doc.text(report.profile.full_name || "Employee Report", pW / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text("HR Maturity & Self-Assessment Report", pW / 2, y + 28, { align: "center" });
    y += 52;
    y = drawDivider(doc, y);

    // ── 1. Profile ────────────────────────────────────────────────────────────
    y = drawSectionHeading(doc, "1. Profile Overview", y);
    y = drawKV(doc, "Name",          report.profile.full_name || "—", y);
    y = drawKV(doc, "Email",         report.profile.email, y);
    y = drawKV(doc, "Job Title",     report.profile.job_title || "—", y);
    if (report.organization) {
      y = drawKV(doc, "Organization", report.organization.name, y);
      y = drawKV(doc, "Industry",    report.organization.industry?.replace(/_/g, " ") || "—", y);
    }
    y += 8;

    // ── 2. Assessment Summary ─────────────────────────────────────────────────
    y = drawSectionHeading(doc, "2. Assessment Summary", y);
    y = drawKV(doc, "Average Score",          `${report.averageScore}%`, y);
    y = drawKV(doc, "Total Assessments",      `${report.orgAssessments.length + report.selfAssessments.length}`, y);
    y = drawKV(doc, "Org Assessments",        `${report.orgAssessments.length}`, y);
    y = drawKV(doc, "Self-Assessments",       `${report.selfAssessments.length}`, y);
    y = drawKV(doc, "Certifications Earned",  `${report.certifications.length}`, y);
    y += 8;

    const avgScore = report.averageScore;
    const insightType = avgScore >= 65 ? "success" : avgScore >= 45 ? "info" : "warning";
    const insightMsg = avgScore >= 85
      ? "✓ Excellent performance across assessments. Maintain current HR practices and explore advanced certifications."
      : avgScore >= 65
      ? "✓ Strong performance. Continue focused improvements in weaker skill areas to reach the Diamond tier."
      : avgScore >= 45
      ? "⚠ Moderate performance. Prioritise targeted skill development to elevate overall HR competency."
      : "⚠ Performance needs significant improvement. Recommended: structured training and reassessment.";
    y = drawInfoBox(doc, insightMsg, y, insightType);
    y += 8;

    // ── 3. Skill Scores ───────────────────────────────────────────────────────
    if (report.skillScores.length > 0) {
      y = drawSectionHeading(doc, "3. Skill Domain Scores", y);
      for (const s of report.skillScores) {
        y = drawProgressRow(doc, skillTagLabels[s.skill_tag] || s.skill_tag, s.percentage, y);
        if (y > 720) { doc.addPage(); drawPageFooter(doc); y = 40; }
      }
      y += 8;
    }

    drawPageFooter(doc, 1);

    // ── Page 2 ────────────────────────────────────────────────────────────────
    if (report.improvements.length > 0) {
      doc.addPage();
      y = drawPageHeader(doc, "Individual HR Report (continued)");

      const strengths  = report.improvements.filter((i) => i.suggestion_type === "strength");
      const weaknesses = report.improvements.filter((i) => i.suggestion_type === "weakness");
      const recs       = report.improvements.filter((i) => i.suggestion_type === "recommendation");

      const renderGroup = (title: string, list: typeof report.improvements, color: [number,number,number]) => {
        if (list.length === 0) return;
        doc.setFillColor(...BRAND.light);
        doc.roundedRect(32, y - 2, pW - 64, 22, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...color);
        doc.text(title.toUpperCase(), 40, y + 13);
        y += 30;
        list.slice(0, 6).forEach((imp) => {
          const skill = skillTagLabels[imp.skill_tag] || imp.skill_tag;
          const lines = doc.splitTextToSize(`• ${skill}: ${imp.content}`, pW - 80);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...BRAND.body);
          doc.text(lines, 40, y);
          y += lines.length * 14 + 4;
          if (y > 720) { doc.addPage(); drawPageFooter(doc); y = 40; }
        });
        y += 8;
      };

      renderGroup("4. Strengths", strengths, BRAND.success);
      renderGroup("5. Areas for Improvement", weaknesses, BRAND.warning);
      renderGroup("6. Recommendations", recs, BRAND.primary);

      drawPageFooter(doc, 2);
    }

    const name = (report.profile.full_name || "user").replace(/\s+/g, "_");
    doc.save(`HR_Report_${name}_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("Report downloaded!");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) return null;

  // Build trend data from all assessments sorted by date
  const allAssessmentsSorted = [
    ...report.orgAssessments.filter((a) => a.overall_score != null && a.completed_at),
    ...report.selfAssessments
      .filter((a) => a.overall_score != null && a.completed_at)
      .map((a) => ({
        ...a,
        organization_id: "",
        certification_level: "none" as const,
        completed_at: a.completed_at,
        updated_at: a.updated_at,
      })),
  ].sort(
    (a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
  );

  const trendData = allAssessmentsSorted.map((a, i) => ({
    name: `#${i + 1}`,
    score: Math.round(Number(a.overall_score) || 0),
    date: new Date(a.completed_at!).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  const strengths = report.improvements.filter((s) => s.suggestion_type === "strength");
  const weaknesses = report.improvements.filter((s) => s.suggestion_type === "weakness");
  const recommendations = report.improvements.filter((s) => s.suggestion_type === "recommendation");

  return (
    <div className="w-full">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Unified User Report</h2>
          <p className="text-muted-foreground">A complete view of your HR performance and growth.</p>
        </div>
        <Button onClick={downloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{report.averageScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <ClipboardList className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {report.orgAssessments.length + report.selfAssessments.length}
                </p>
                <p className="text-xs text-muted-foreground">Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cert-gold/20">
                <Award className="h-5 w-5 text-cert-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{report.certifications.length}</p>
                <p className="text-xs text-muted-foreground">Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Star className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{strengths.length}</p>
                <p className="text-xs text-muted-foreground">Strengths</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{report.profile.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{report.profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Title</p>
                <p className="font-medium">{report.profile.job_title || "—"}</p>
              </div>
              {report.organization && (
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {report.organization.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill snapshot */}
          {report.skillScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.skillScores.map((s) => (
                  <div key={s.skill_tag}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{skillTagLabels[s.skill_tag] || s.skill_tag}</span>
                      <span className="text-muted-foreground">{s.percentage}%</span>
                    </div>
                    <Progress value={s.percentage} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Assessments ──────────────────────────────────── */}
        <TabsContent value="assessments" className="space-y-4">
          {/* Org assessments */}
          {report.orgAssessments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organizational Assessments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {report.orgAssessments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-foreground">{a.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.completed_at
                            ? `Completed ${new Date(a.completed_at).toLocaleDateString()}`
                            : a.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.overall_score != null && (
                          <span className="font-semibold">{Math.round(Number(a.overall_score))}%</span>
                        )}
                        <Badge variant="secondary" className="capitalize">
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self assessments */}
          {report.selfAssessments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Self-Assessments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {report.selfAssessments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-foreground">{a.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.completed_at
                            ? `Completed ${new Date(a.completed_at).toLocaleDateString()}`
                            : a.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.overall_score != null && (
                          <span className="font-semibold">{a.overall_score}%</span>
                        )}
                        <Badge variant="secondary" className="capitalize">
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.orgAssessments.length === 0 && report.selfAssessments.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No assessments found.</p>
          )}
        </TabsContent>

        {/* ── Certifications ──────────────────────────────── */}
        <TabsContent value="certifications">
          {report.certifications.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No certifications yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {report.certifications.map((c: Certification) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base capitalize">
                      <Award className="h-4 w-4 text-cert-gold" />
                      {c.level} Certificate
                    </CardTitle>
                    <CardDescription>
                      Issued {new Date(c.issued_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {c.verification_code && (
                        <p>
                          <span className="font-medium">ID:</span> {c.verification_code}
                        </p>
                      )}
                      {c.score && (
                        <p>
                          <span className="font-medium">Score:</span> {c.score}%
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Improvements ────────────────────────────────── */}
        <TabsContent value="improvements" className="space-y-6">
          {[
            { list: strengths, type: "strength" as const, title: "Strengths" },
            { list: weaknesses, type: "weakness" as const, title: "Areas Needing Work" },
            { list: recommendations, type: "recommendation" as const, title: "Recommendations" },
          ].map(({ list, type, title }) => {
            const cfg = suggestionIcons[type];
            const Icon = cfg.icon;
            if (list.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  {title}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="p-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground capitalize">
                          {skillTagLabels[s.skill_tag] || s.skill_tag}
                        </p>
                        <p className="text-sm">{s.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {report.improvements.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Complete a self-assessment to generate improvement insights.
            </p>
          )}
        </TabsContent>

        {/* ── Trends ──────────────────────────────────────── */}
        <TabsContent value="trends">
          {trendData.length < 2 ? (
            <div className="py-8 text-center text-muted-foreground">
              Complete at least 2 assessments to see your performance trend.
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> Score Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => `${v}%`} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserReportPage;
