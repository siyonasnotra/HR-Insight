import { useState, useEffect } from "react";
import { FileText, Download, PieChart, BarChart3, Users, Building2, Loader2, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface PlatformStats {
  totalOrgs: number;
  totalAssessments: number;
  totalCertifications: number;
  totalUsers: number;
  certBreakdown: { silver: number; gold: number; diamond: number; none: number };
  topOrgs: { name: string; score: number; level: string }[];
}

const PlatformReports = () => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [{ data: orgs }, { data: assessments }, { data: certs }, { count: userCount }] =
        await Promise.all([
          supabase.from("organizations").select("id, name"),
          supabase
            .from("assessments")
            .select("id, overall_score, certification_level, status, organizations(name)")
            .eq("status", "completed")
            .order("overall_score", { ascending: false }),
          supabase.from("certifications").select("level"),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
        ]);

      const certBreakdown = { silver: 0, gold: 0, diamond: 0, none: 0 };
      (certs || []).forEach((c) => {
        const l = c.level as keyof typeof certBreakdown;
        if (l in certBreakdown) certBreakdown[l]++;
      });

      const topOrgs = (assessments || []).slice(0, 10).map((a) => ({
        name: (a.organizations as { name: string } | null)?.name ?? "Unknown",
        score: Math.round(Number(a.overall_score) || 0),
        level: a.certification_level ?? "none",
      }));

      setStats({
        totalOrgs: orgs?.length ?? 0,
        totalAssessments: assessments?.length ?? 0,
        totalCertifications: certs?.length ?? 0,
        totalUsers: userCount ?? 0,
        certBreakdown,
        topOrgs,
      });
    } catch {
      toast.error("Failed to load platform stats");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const generatePDF = (reportId: string) => {
    if (!stats) { toast.error("Stats not loaded yet."); return; }
    setGenerating(reportId);

    const doc = new jsPDF("portrait", "pt", "a4");
    const pW = doc.internal.pageSize.getWidth();
    let y = 0;

    // Header
    doc.setFillColor(40, 53, 147);
    doc.rect(0, 0, pW, 70, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("HR-Insight — Platform Report", 40, 44);

    y = 90;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(33, 33, 33);

    if (reportId === "maturity") {
      doc.text("Industry HR Maturity Report", 40, y); y += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 40, y); y += 20;
      doc.text(`Total Organizations: ${stats.totalOrgs}`, 40, y); y += 16;
      doc.text(`Completed Assessments: ${stats.totalAssessments}`, 40, y); y += 16;

      if (stats.topOrgs.length > 0) {
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Top Performing Organizations (by Score):", 40, y); y += 20;
        doc.setFont("helvetica", "normal");
        stats.topOrgs.forEach((org, i) => {
          doc.text(`${i + 1}. ${org.name} — ${org.score}/100 (${org.level.toUpperCase()})`, 50, y); y += 16;
          if (y > 760) { doc.addPage(); y = 60; }
        });
      }
    } else if (reportId === "cert-dist") {
      doc.text("Certification Distribution Report", 40, y); y += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 40, y); y += 20;
      doc.text(`Total Certifications Issued: ${stats.totalCertifications}`, 40, y); y += 25;
      doc.setFont("helvetica", "bold");
      doc.text("Breakdown by Level:", 40, y); y += 20;
      doc.setFont("helvetica", "normal");
      doc.text(`Diamond: ${stats.certBreakdown.diamond}`, 50, y); y += 16;
      doc.text(`Gold: ${stats.certBreakdown.gold}`, 50, y); y += 16;
      doc.text(`Silver: ${stats.certBreakdown.silver}`, 50, y); y += 16;
      doc.text(`None: ${stats.certBreakdown.none}`, 50, y); y += 16;
    } else if (reportId === "org-perf") {
      doc.text("Organization Performance Summary", 40, y); y += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 40, y); y += 20;
      doc.text(`Total Organizations: ${stats.totalOrgs}`, 40, y); y += 25;
      doc.setFont("helvetica", "bold");
      doc.text("Latest Benchmark Scores (Completed Assessments):", 40, y); y += 20;
      doc.setFont("helvetica", "normal");
      stats.topOrgs.forEach((org, i) => {
        doc.text(`${i + 1}. ${org.name} — Score: ${org.score}, Level: ${org.level.toUpperCase()}`, 50, y); y += 16;
        if (y > 760) { doc.addPage(); y = 60; }
      });
    } else if (reportId === "participation") {
      doc.text("Assessment Participation Statistics", 40, y); y += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 40, y); y += 20;
      doc.text(`Registered Users: ${stats.totalUsers}`, 40, y); y += 16;
      doc.text(`Registered Organizations: ${stats.totalOrgs}`, 40, y); y += 16;
      doc.text(`Completed Assessments: ${stats.totalAssessments}`, 40, y); y += 16;
      const rate = stats.totalOrgs > 0 ? Math.round((stats.totalAssessments / stats.totalOrgs) * 100) : 0;
      doc.text(`Completion Rate: ~${rate}%`, 40, y); y += 16;
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by HR-Insight — Super Admin", pW / 2, 820, { align: "center" });

    const reportNames: Record<string, string> = {
      maturity: "HR_Maturity_Report",
      "cert-dist": "Certification_Distribution",
      "org-perf": "Org_Performance_Summary",
      participation: "Participation_Stats",
    };
    doc.save(`${reportNames[reportId] || "Platform_Report"}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Report downloaded successfully!");
    setGenerating(null);
  };

  const reports = [
    {
      id: "maturity",
      title: "Industry HR Maturity Report",
      description: "Aggregated analysis of HR performance across all organizations with top performer rankings.",
      icon: BarChart3,
      category: "Performance",
      stat: stats ? `${stats.totalAssessments} assessments` : "—",
    },
    {
      id: "cert-dist",
      title: "Certification Distribution",
      description: "Breakdown of Silver, Gold, and Diamond certifications issued across all tenants.",
      icon: PieChart,
      category: "Recognition",
      stat: stats ? `${stats.totalCertifications} certs total` : "—",
    },
    {
      id: "org-perf",
      title: "Organization Performance Summary",
      description: "Tabular report of all organizations with their latest benchmark scores and certification levels.",
      icon: Building2,
      category: "Operational",
      stat: stats ? `${stats.totalOrgs} organizations` : "—",
    },
    {
      id: "participation",
      title: "Assessment Participation Stats",
      description: "Platform-wide engagement overview including completion rates, user counts, and org coverage.",
      icon: Users,
      category: "Analytics",
      stat: stats ? `${stats.totalUsers} users` : "—",
    },
  ];

  return (
    <AppLayout title="Platform Reports">
      <div className="flex flex-col space-y-6">
        <div className="bg-muted/50 p-6 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Reports Engine</h2>
            <p className="text-sm text-muted-foreground">
              Download comprehensive platform insights and live aggregated data as PDF.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={fetchStats} disabled={loadingStats}>
            <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh Stats
          </Button>
        </div>

        {/* Live stat pills */}
        {!loadingStats && stats && (
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {stats.totalOrgs} Organizations
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {stats.totalUsers} Users
            </Badge>
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              {stats.totalAssessments} Completed Assessments
            </Badge>
            <Badge className="px-3 py-1.5 text-sm">
              {stats.certBreakdown.diamond} Diamond · {stats.certBreakdown.gold} Gold · {stats.certBreakdown.silver} Silver
            </Badge>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} className="group hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <report.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{report.stat}</Badge>
                    <Badge variant="outline">{report.category}</Badge>
                  </div>
                </div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full gap-2"
                  onClick={() => generatePDF(report.id)}
                  disabled={generating === report.id || loadingStats || !stats}
                >
                  {generating === report.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Download PDF Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Performers Preview */}
        {!loadingStats && stats && stats.topOrgs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Live: Top Performing Organizations
              </CardTitle>
              <CardDescription>
                Real-time ranking of organizations by latest assessment score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {stats.topOrgs.slice(0, 5).map((org, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{org.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={org.level === "diamond" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {org.level}
                      </Badge>
                      <span className="font-bold text-sm text-primary">{org.score}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loadingStats && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground text-sm">Loading live platform data...</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PlatformReports;
