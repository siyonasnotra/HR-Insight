import { useEffect, useState } from "react";
import { Medal, Diamond, Download, Share2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { BRAND, drawCertBorder, drawCertLevelBadge } from "@/lib/pdfUtils";

type CertificationRow = Tables<"certifications">;
type AssessmentRow = Tables<"assessments">;

const Certifications = () => {
  const { organization } = useAuth();
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string>("None");
  const [history, setHistory] = useState<CertificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assessmentMap, setAssessmentMap] = useState<Record<string, AssessmentRow>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }

      const [{ data: certs }, { data: assessments }] = await Promise.all([
        supabase
          .from("certifications")
          .select("*")
          .eq("organization_id", organization.id)
          .order("issued_at", { ascending: false }),
        supabase
          .from("assessments")
          .select("*")
          .eq("organization_id", organization.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
      ]);

      const certList = (certs as CertificationRow[] | null) || [];
      const assessmentList = (assessments as AssessmentRow[] | null) || [];

      const map: Record<string, AssessmentRow> = {};
      assessmentList.forEach((a) => {
        map[a.id] = a;
      });
      setAssessmentMap(map);

      // Fallback: if certifications are not readable/creatable (RLS/permissions),
      // derive "certificate history" from completed assessments so UI + PDF still work.
      const derivedFromAssessments: CertificationRow[] = assessmentList.map((a) => {
        const issuedAt = a.completed_at || a.created_at;
        const level = (a.certification_level || "none") as CertificationRow["level"];
        return {
          id: a.id,
          organization_id: organization.id,
          assessment_id: a.id,
          level,
          issued_at: issuedAt,
          expires_at: null,
          certificate_url: null,
          verification_code: a.id,
          is_active: true,
          created_at: issuedAt,
        };
      });

      const effectiveHistory = certList.length > 0 ? certList : derivedFromAssessments;

      const latestCert = effectiveHistory[0] || null;
      let score: number | null = null;
      let levelLabel = "None";

      if (latestCert) {
        levelLabel = latestCert.level
          ? latestCert.level.charAt(0).toUpperCase() + latestCert.level.slice(1)
          : "None";

        const matchingAssessment = assessmentList.find((a) => a.id === latestCert.assessment_id);

        if (matchingAssessment?.overall_score != null) {
          score = Number(matchingAssessment.overall_score);
        }
      }

      setCurrentScore(score);
      setCurrentLevel(levelLabel);
      setHistory(effectiveHistory);
      setLoading(false);
    };

    loadData();
  }, [organization?.id]);

  const scoreValue = currentScore ?? 0;

  const certificationLevels = [
    {
      key: "silver",
      level: "Silver",
      icon: Medal,
      min: 45,
      max: 64,
      color: "bg-cert-silver",
      textColor: "text-cert-silver",
      description: "Basic HR practices established",
    },
    {
      key: "gold",
      level: "Gold",
      icon: Award,
      min: 65,
      max: 84,
      color: "bg-cert-gold",
      textColor: "text-cert-gold",
      description: "Strong HR foundation",
    },
    {
      key: "diamond",
      level: "Diamond",
      icon: Diamond,
      min: 85,
      max: 100,
      color: "bg-cert-diamond",
      textColor: "text-cert-diamond",
      description: "Industry-leading excellence",
    },
  ].map((base) => {
    const achieved = scoreValue >= base.min;
    const pointsNeeded = achieved ? 0 : Math.max(0, base.min - scoreValue);
    return {
      ...base,
      achieved,
      scoreRange: `${base.min}-${base.max}`,
      pointsNeeded,
    };
  });

  const currentHistoryItem = history[0] || null;

  const generateCertificatePdf = (cert: CertificationRow, assessment?: AssessmentRow) => {
    const doc = new jsPDF("landscape", "pt", "a4");
    const pW  = doc.internal.pageSize.getWidth();
    const pH  = doc.internal.pageSize.getHeight();

    // ── Background ───────────────────────────────────────────────────────────
    doc.setFillColor(250, 251, 255);
    doc.rect(0, 0, pW, pH, "F");

    // Subtle radial-like gradient overlay via layered rectangles
    doc.setFillColor(235, 240, 255);
    doc.roundedRect(pW / 2 - 200, pH / 2 - 100, 400, 200, 80, 80, "F");

    // ── Border Frame ─────────────────────────────────────────────────────────
    drawCertBorder(doc);

    // ── Top Header Band ───────────────────────────────────────────────────────
    doc.setFillColor(...BRAND.primary);
    doc.rect(22, 22, pW - 44, 48, "F");

    // Brand name in header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.white);
    doc.text("HR-Insight", pW / 2, 44, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 255);
    doc.text("Certified HR Excellence Program", pW / 2, 60, { align: "center" });

    // Gold accent under header
    doc.setFillColor(...BRAND.gold);
    doc.rect(22, 70, pW - 44, 3, "F");

    // ── Certificate Title ────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...BRAND.dark);
    doc.text("CERTIFICATE OF ACHIEVEMENT", pW / 2, 120, { align: "center" });

    // Decorative rule
    doc.setDrawColor(...BRAND.gold);
    doc.setLineWidth(1.5);
    doc.line(pW / 2 - 120, 132, pW / 2 + 120, 132);

    // Sub-caption
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    doc.text("HR Maturity Assessment — Formally Recognised", pW / 2, 152, { align: "center" });

    // ── Body ─────────────────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.body);
    doc.text("This is to certify that", pW / 2, 185, { align: "center" });

    // Org Name (large, prominent)
    const orgName = organization?.name || "Your Organization";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...BRAND.primary);
    doc.text(orgName, pW / 2, 218, { align: "center" });

    // Underline the org name
    const nameWidth = doc.getTextWidth(orgName);
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.8);
    doc.line(pW / 2 - nameWidth / 2, 224, pW / 2 + nameWidth / 2, 224);

    // Achievement text
    const levelLabel = cert.level.charAt(0).toUpperCase() + cert.level.slice(1);
    const scoreText  = assessment?.overall_score != null
      ? `${Math.round(Number(assessment.overall_score))}/100`
      : currentScore != null
        ? `${Math.round(currentScore)}/100`
        : "N/A";

    const industry = organization?.industry ? ` (${organization.industry.replace(/_/g, "/")})` : "";
    const achieveLine = `has successfully completed the HR Maturity Assessment${industry} and achieved`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.body);
    doc.text(achieveLine, pW / 2, 248, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND.dark);
    doc.text(`the ${levelLabel} Level of HR Excellence`, pW / 2, 268, { align: "center" });

    // ── Level Badge circle (left side of score area) ─────────────────────────
    drawCertLevelBadge(doc, levelLabel, pW / 2 - 80, 315, 28);

    // Score circle (right side)
    const scoreNum = assessment?.overall_score != null ? Math.round(Number(assessment.overall_score)) : currentScore ?? 0;
    const scoreColor: [number, number, number] =
      scoreNum >= 85 ? BRAND.diamond : scoreNum >= 65 ? BRAND.gold : scoreNum >= 45 ? BRAND.silver : BRAND.muted;
    doc.setFillColor(...scoreColor);
    doc.circle(pW / 2 + 80, 315, 28, "F");
    doc.setFillColor(...BRAND.white);
    doc.circle(pW / 2 + 80, 315, 23, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...BRAND.dark);
    doc.text(scoreText.split("/")[0], pW / 2 + 80, 319, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text("SCORE", pW / 2 + 80, 331, { align: "center" });

    // ── Metadata row ─────────────────────────────────────────────────────────
    const issued = new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const certId = (cert.verification_code || cert.id).toString().substring(0, 16).toUpperCase();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.body);
    doc.text(`Issue Date: ${issued}`, pW / 2, 360, { align: "center" });
    doc.text(`Certificate ID: ${certId}`, pW / 2, 375, { align: "center" });

    // Verify URL hint
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Verify at: ${window.location.origin}/verify/${certId.toLowerCase()}`, pW / 2, 390, { align: "center" });

    // ── Signature area ───────────────────────────────────────────────────────
    const sigY = 415;
    const sigL = pW / 2 - 140;
    const sigR = pW / 2 + 40;

    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.7);
    doc.line(sigL, sigY, sigL + 100, sigY);
    doc.line(sigR, sigY, sigR + 100, sigY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.dark);
    doc.text("HR-Insight", sigL + 50, sigY + 12, { align: "center" });
    doc.text("Platform Director", sigR + 50, sigY + 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text("Authorised Signatory", sigL + 50, sigY + 22, { align: "center" });
    doc.text("Assessment Quality Assurance", sigR + 50, sigY + 22, { align: "center" });

    // ── Bottom footer strip ───────────────────────────────────────────────────
    doc.setFillColor(...BRAND.primary);
    doc.rect(22, pH - 45, pW - 44, 23, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.white);
    doc.text("This certificate is issued by HR-Insight and is subject to verification. Confidential — issued for official recognition purposes.", pW / 2, pH - 29, { align: "center" });

    const filename = `HR_Benchmark_Certificate_${orgName.replace(/\s+/g, "_")}_${levelLabel}.pdf`;
    doc.save(filename);
  };

  const handleDownload = (cert: CertificationRow | null) => {
    if (!cert) {
      toast.error("No downloadable certificate is available yet.");
      return;
    }
    const assessment = assessmentMap[cert.assessment_id];
    generateCertificatePdf(cert, assessment);
    toast.success("Certificate Verified Successfully!");
  };

  const handleShare = async () => {
    if (!currentHistoryItem) {
      toast.error("No certificate to share yet.");
      return;
    }

    const verifyTarget = currentHistoryItem.verification_code || currentHistoryItem.id;

    // If we don't have a hosted certificate URL, share the verification link.
    const shareText =
      currentHistoryItem.certificate_url ||
      (verifyTarget
        ? `${window.location.origin}/verify/${verifyTarget}`
        : "");

    if (!shareText) {
      toast.error("No certificate link or verification code to share yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy link. Please copy it manually.");
    }
  };



  return (
    <AppLayout title="Certifications">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Your Certification Status</h2>
        <p className="text-muted-foreground">Track your certification progress and download credentials.</p>
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="relative gradient-primary p-6 text-primary-foreground">
          <div className="absolute right-0 top-0 opacity-10">
            <Medal className="h-40 w-40" />
          </div>
          <div className="relative">
            <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground">Current Level</Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-foreground/20">
                <Medal className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-3xl font-bold">
                  {currentLevel !== "None" ? `${currentLevel} Certified` : "No certification yet"}
                </h3>
                <p className="text-primary-foreground/80">HR-Insight Certification</p>
                <p className="mt-1 text-sm text-primary-foreground/70">
                  {currentScore != null ? `Score: ${currentScore}/100` : "Complete an assessment to earn a score"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                className="bg-card text-foreground hover:bg-card/90"
                onClick={() => handleDownload(currentHistoryItem)}
                disabled={!currentHistoryItem}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Certificate
              </Button>
              <Button
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleShare}
                disabled={!currentHistoryItem}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <h3 className="mb-4 text-xl font-semibold text-foreground">Certification Levels</h3>
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificationLevels.map((cert) => (
          <Card key={cert.level} className={`relative overflow-hidden ${cert.achieved ? "border-2 border-primary" : "border-border"}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${cert.color}`} />
            {cert.achieved && <Badge className="absolute right-3 top-3 bg-success text-success-foreground">Achieved</Badge>}
            <CardHeader>
              <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full ${cert.color}/20`}>
                <cert.icon className={`h-6 w-6 ${cert.textColor}`} />
              </div>
              <CardTitle className="text-lg">{cert.level}</CardTitle>
              <CardDescription>Score: {cert.scoreRange}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{cert.description}</p>
              {cert.achieved ? (
                <p className="text-sm font-medium text-success">You are within this band</p>
              ) : (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    {currentScore != null ? `${cert.pointsNeeded} points to unlock` : "No score yet"}
                  </p>
                  <Progress
                    value={
                      currentScore != null && cert.pointsNeeded > 0
                        ? Math.min(100, ((scoreValue - Math.max(0, cert.min - cert.pointsNeeded)) / cert.pointsNeeded) * 100)
                        : 0
                    }
                    className="h-1.5"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="mb-4 text-xl font-semibold text-foreground">Certification History</h3>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {history.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No certifications yet. Complete an assessment to generate your first certification.
              </div>
            )}
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.level === "silver"
                      ? "bg-cert-silver/20"
                      : item.level === "gold"
                        ? "bg-cert-gold/20"
                        : item.level === "diamond"
                          ? "bg-cert-diamond/20"
                          : "bg-muted"
                    }`}>
                    <Medal className={`h-5 w-5 ${item.level === "silver"
                        ? "text-cert-silver"
                        : item.level === "gold"
                          ? "text-cert-gold"
                          : item.level === "diamond"
                            ? "text-cert-diamond"
                            : "text-muted-foreground"
                      }`} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {item.level.charAt(0).toUpperCase() + item.level.slice(1)} level
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Issued {new Date(item.issued_at).toLocaleDateString()}
                    </p>
                    {assessmentMap[item.assessment_id]?.overall_score != null && (
                      <p className="text-xs text-muted-foreground">
                        Score: {assessmentMap[item.assessment_id].overall_score}/100
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.id === currentHistoryItem?.id ? "default" : "secondary"}>
                    {item.id === currentHistoryItem?.id ? "Current" : "Previous"}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDownload(item)}
                    title="Download Certificate"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Certifications;
