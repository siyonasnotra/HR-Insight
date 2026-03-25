import { useState, useEffect } from 'react';
import { Download, FileText, Calendar, TrendingUp, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { assessmentService } from "@/services/assessmentService";
import { maturityScoringService } from "@/services/maturityScoringService";
import { certificationService } from "@/services/certificationService";
import { actionPlanService } from "@/services/actionPlanService";
import { Assessment, Certification, ActionPlan } from "@/types";
import jsPDF from "jspdf";
import UserReportPage from "./UserReport";

const Reports = () => {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [categoryScores, setCategoryScores] = useState<any[]>([]);
  const [benchmarkComparison, setBenchmarkComparison] = useState<any>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchReportData();
    }
  }, [organization?.id]);

  useEffect(() => {
    if (selectedAssessment) {
      fetchSelectedAssessmentDetails(selectedAssessment.id);
    }
  }, [selectedAssessment]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [assts, certs, plans] = await Promise.all([
        assessmentService.getOrganizationAssessments(organization!.id),
        certificationService.getOrganizationCertifications(organization!.id),
        actionPlanService.getOrganizationActionPlans(organization!.id)
      ]);

      setAssessments(assts || []);
      setCertifications(certs || []);
      setActionPlans(plans || []);
      
      if (assts && assts.length > 0) {
        setSelectedAssessment(assts[0]);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedAssessmentDetails = async (assessmentId: string) => {
    try {
      const scores = await assessmentService.getAssessmentCategoryScores(assessmentId);
      setCategoryScores(scores || []);

      const benchmark = await maturityScoringService.getBenchmarkComparison(assessmentId, scores || []);
      setBenchmarkComparison(benchmark);
    } catch (error) {
      console.error('Error fetching selected assessment details:', error);
      setCategoryScores([]);
      setBenchmarkComparison(null);
    }
  };

  const getReportHeadingText = (type: string, assessment: Assessment) => {
    switch (type) {
      case 'SUMMARY':
        return `Executive Summary for ${assessment.title}: snapshot of HR maturity and operational health.`;
      case 'CATEGORY':
        return `Category Analysis for ${assessment.title}: domain-level insights and recommendations.`;
      case 'GAP':
        return `Gap Analysis for ${assessment.title}: risk gaps, root causes, and mitigation actions.`;
      case 'BENCHMARK':
        return `Industry Benchmark for ${assessment.title}: peer comparison and positioning.`;
      case 'ACTION':
        return `Action Plan for ${assessment.title}: priority steps and owner accountability.`;
      default:
        return `Comprehensive report for ${assessment.title}`;
    }
  };

  const getReportPoints = (type: string, assessment: Assessment) => {
    const points: string[] = [];
    switch (type) {
      case 'SUMMARY':
        points.push(`Overall Score: ${assessment.overall_score?.toFixed(1) ?? 'N/A'}/100`);
        points.push(`Certification Level: ${(assessment.certification_level || 'none').toUpperCase()}`);
        points.push(`Assessment Status: ${assessment.status}`);
        points.push(`Organization Maturity Trend: ${assessments.length > 1 ? 'Stable/Improving' : 'Baseline established'}`);
        break;
      case 'CATEGORY': {
        if (categoryScores.length > 0) {
          const sorted = [...categoryScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
          points.push(`Top domain: ${sorted[0]?.assessment_categories?.name || 'n/a'} (${sorted[0]?.percentage?.toFixed(1)}%)`);
          points.push(`Area to improve: ${sorted[sorted.length - 1]?.assessment_categories?.name || 'n/a'} (${sorted[sorted.length - 1]?.percentage?.toFixed(1)}%)`);
        } else {
          points.push('Category scores are being calculated.');
        }
        points.push('Domain-level strengths and weaknesses are summarized.');
        break;
      }
      case 'GAP':
        const gaps = actionPlans.filter(p => p.status !== 'completed');
        points.push(`Open gap items: ${gaps.length}`);
        points.push(`High priority gaps: ${gaps.filter(p => p.priority >= 4).length}`);
        points.push('Focused improvement opportunities identified for critical HR practices.');
        break;
      case 'BENCHMARK':
        if (benchmarkComparison) {
          points.push(`Industry average score: ${benchmarkComparison.industryAverage}%`);
          points.push(`Your percentile: ${benchmarkComparison.percentile}%`);
          points.push(`Performance band: ${benchmarkComparison.performance.replace('_', ' ')}`);
        } else {
          points.push('Benchmark data is being gathered for your profile.');
        }
        points.push('Provides competitive positioning and improvement priorities.');
        break;
      case 'ACTION': {
        const activePlans = actionPlans.filter(p => p.status !== 'completed').slice(0, 3);
        if (activePlans.length > 0) {
          points.push(`${activePlans.length} active action plans highlighted for execution.`);
          points.push(`Next due action: ${activePlans[0]?.title || 'Not available'}`);
        } else {
          points.push('No active action plans available yet.');
        }
        points.push('Step-by-step deliverables for certification readiness.');
        break;
      }
      default:
        points.push('General report highlights.');
    }

    return points;
  };

  const downloadReport = (assessment: Assessment, type: string) => {
    const doc = new jsPDF('portrait', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(40, 53, 147);
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('HR-Insight', 40, 45);

    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text(`${type.replace('_', ' ')} Report`, 40, 120);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Assessment: ${assessment.title}`, 40, 150);
    doc.text(`Organization: ${organization?.name || 'N/A'}`, 40, 170);
    doc.text(`Date: ${new Date(assessment.created_at).toLocaleDateString()}`, 40, 190);
    doc.text(`Status: ${assessment.status}`, 40, 210);

    doc.setDrawColor(200, 200, 200);
    doc.line(40, 230, pageWidth - 40, 230);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text(`Overall Score: ${assessment.overall_score?.toFixed(1) ?? 'N/A'}/100`, 40, 260);
    doc.text(`Certification Level: ${(assessment.certification_level || 'NONE').toUpperCase()}`, 40, 280);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    const introText = getReportHeadingText(type, assessment);
    const introParagraph = doc.splitTextToSize(introText, pageWidth - 80);
    doc.text(introParagraph, 40, 320);

    const points = getReportPoints(type, assessment);
    let yPos = 380;
    doc.setFont('helvetica', 'bold');
    doc.text('Key Highlights:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 20;
    points.forEach((point) => {
      const wrapped = doc.splitTextToSize(`• ${point}`, pageWidth - 80);
      doc.text(wrapped, 45, yPos);
      yPos += wrapped.length * 16;
    });

    if (type === 'CATEGORY' && categoryScores.length > 0) {
      const scoredCategories = [...categoryScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      doc.setFont('helvetica', 'bold');
      doc.text('Category Breakdown:', 40, yPos + 10);
      doc.setFont('helvetica', 'normal');
      yPos += 30;
      scoredCategories.slice(0, 5).forEach((cs, index) => {
        doc.text(`${index + 1}. ${cs.assessment_categories?.name || 'Unknown'}: ${cs.percentage?.toFixed(1) || '0'}%`, 45, yPos);
        yPos += 18;
      });
    }

    if (type === 'ACTION' && actionPlans.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Action Plan Summary:', 40, yPos + 10);
      doc.setFont('helvetica', 'normal');
      yPos += 30;
      actionPlans.filter(p => p.assessment_id === assessment.id).slice(0, 8).forEach((plan, i) => {
        doc.text(`${i + 1}. ${plan.title} [${plan.status}]`, 45, yPos);
        yPos += 18;
      });
    }

    if (type === 'BENCHMARK' && benchmarkComparison) {
      doc.setFont('helvetica', 'bold');
      doc.text('Benchmark Metrics:', 40, yPos + 10);
      doc.setFont('helvetica', 'normal');
      yPos += 30;
      doc.text(`Industry Avg: ${benchmarkComparison.industryAverage}%`, 45, yPos); yPos += 18;
      doc.text(`Organization Percentile: ${benchmarkComparison.percentile}%`, 45, yPos); yPos += 18;
      doc.text(`Performance: ${benchmarkComparison.performance.replace('_', ' ')}`, 45, yPos);
      yPos += 22;
    }

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by HR-Insight', pageWidth / 2, 800, { align: 'center' });

    doc.save(`${assessment.title.replace(/\s+/g, '_')}-${type.toLowerCase()}-report.pdf`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    );
  }

  const reportTypes = [
    {
      id: 1,
      title: "Executive Summary Report",
      description: "High-level overview of HR maturity assessment results with key metrics",
      type: "SUMMARY",
      icon: FileText,
    },
    {
      id: 2,
      title: "Category Analysis Report",
      description: "Detailed breakdown by the 6 SIPMAA HR practice domains",
      type: "CATEGORY",
      icon: BarChart3,
    },
    {
      id: 3,
      title: "Gap Analysis Report",
      description: "Identified gaps and improvement recommendations by priority",
      type: "GAP",
      icon: TrendingUp,
    },
    {
      id: 4,
      title: "Industry Benchmark Report",
      description: "Comparison with industry peers and best practices",
      type: "BENCHMARK",
      icon: BarChart3,
    },
    {
      id: 5,
      title: "Action Plan Report",
      description: "Detailed action items with timeline and responsibility",
      type: "ACTION",
      icon: Calendar,
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="organization">🏢 Organization Reports</TabsTrigger>
            <TabsTrigger value="user">👤 My Report</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold flex items-center gap-2 mb-2">
                <BarChart3 className="w-10 h-10" />
                Reports & Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive assessment reports and insights
              </p>
            </div>

            {assessments.length === 0 && (
              <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <h3 className="font-semibold text-yellow-900">No Assessments Yet</h3>
                      <p className="text-sm text-yellow-800">
                        Complete an assessment first to generate reports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {assessments.length > 0 && (
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-2">Select Assessment</label>
                <select
                  value={selectedAssessment?.id || ''}
                  onChange={(e) => {
                    const assessment = assessments.find(a => a.id === e.target.value);
                    setSelectedAssessment(assessment || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {assessments.map(assessment => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title} - {new Date(assessment.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedAssessment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {reportTypes.map(report => {
                  const Icon = report.icon;
                  return (
                    <Card key={report.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-6 h-6 text-blue-500" />
                          <Badge variant="outline">{report.type}</Badge>
                        </div>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 gap-4">
                        <ul className="list-disc ml-5 text-sm space-y-1 text-gray-700 dark:text-gray-200">
                          {getReportPoints(report.type, selectedAssessment).map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => downloadReport(selectedAssessment, report.type)}
                          className="w-full flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Report
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {certifications.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Certifications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certifications.map(cert => (
                    <Card key={cert.id}>
                      <CardHeader>
                        <CardTitle className="capitalize flex items-center justify-between">
                          <span>{cert.level} Certificate</span>
                          <Badge>{cert.is_active ? 'Active' : 'Expired'}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <strong>Issued:</strong> {new Date(cert.issued_at).toLocaleDateString()}
                          </p>
                          {cert.expires_at && (
                            <p className="text-sm">
                              <strong>Expires:</strong> {new Date(cert.expires_at).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm">
                            <strong>Code:</strong> {cert.verification_code}
                          </p>
                        </div>
                        {cert.certificate_url && (
                          <Button variant="outline" className="w-full mt-4">
                            <Download className="w-4 h-4 mr-2" />
                            Download Certificate
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="user">
            <UserReportPage />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
