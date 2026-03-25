import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  Award,
  Download,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { selfAssessmentService } from "@/services/selfAssessmentService";
import { improvementService } from "@/services/improvementService";
import { SelfAssessment, SelfAssessmentQuestion, SelfAssessmentResponse, MCQOption } from "@/types";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CERT_THRESHOLD = 60; // percent

const SelfAssessmentTake = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [assessment, setAssessment] = useState<SelfAssessment | null>(null);
  const [questions, setQuestions] = useState<SelfAssessmentQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, SelfAssessmentResponse>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (user?.id && id) loadData();
  }, [user?.id, id]);

  const loadData = async () => {
    try {
      const [asst, templateQs] = await Promise.all([
        selfAssessmentService.getSelfAssessmentById(id!),
        selfAssessmentService.getTemplateQuestions(),
      ]);

      if (!asst) {
        toast.error("Assessment not found");
        navigate("/assessments?tab=self");
        return;
      }

      setAssessment(asst);
      setQuestions(templateQs);

      if (asst.status === "completed") {
        // Reload responses & show summary
        const existing = await selfAssessmentService.getResponses(id!);
        const map: Record<string, SelfAssessmentResponse> = {};
        existing.forEach((r) => (map[r.question_id] = r));
        setResponses(map);
        const { overallScore } = selfAssessmentService.calculateScore(existing, templateQs);
        setFinalScore(overallScore);
        setCompleted(true);
      } else {
        const existing = await selfAssessmentService.getResponses(id!);
        const map: Record<string, SelfAssessmentResponse> = {};
        existing.forEach((r) => (map[r.question_id] = r));
        setResponses(map);
      }
    } catch (err) {
      toast.error("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const getResponseValue = (questionId: string) => {
    return responses[questionId]?.response_value ?? null;
  };

  const scoreForResponse = (q: SelfAssessmentQuestion, value: unknown): number | undefined => {
    if (q.question_type === "rating") {
      return Number(value);
    }
    if (q.question_type === "mcq" && q.options) {
      const opt = (q.options as MCQOption[]).find((o) => o.value === value);
      return opt?.score;
    }
    return undefined;
  };

  const handleAnswer = useCallback(
    async (value: unknown) => {
      if (!currentQuestion || !user?.id || !id) return;

      const score = scoreForResponse(currentQuestion, value);
      const resp = await selfAssessmentService.saveResponse(
        id,
        currentQuestion.id,
        user.id,
        value,
        score
      );

      setResponses((prev) => ({ ...prev, [currentQuestion.id]: resp }));
      await selfAssessmentService.updateAnsweredCount(
        id,
        Object.keys({ ...responses, [currentQuestion.id]: resp }).length
      );
    },
    [currentQuestion, user?.id, id, responses]
  );

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleComplete = async () => {
    if (!id || !user?.id) return;
    setSubmitting(true);
    try {
      const allResponses = await selfAssessmentService.getResponses(id);
      const { overallScore } = selfAssessmentService.calculateScore(allResponses, questions);
      await selfAssessmentService.completeAssessment(id, overallScore, allResponses.length);

      // Run improvement analysis
      await improvementService.analyzeAndStoreImprovements(
        user.id,
        id,
        allResponses,
        questions
      );

      setFinalScore(overallScore);
      setCompleted(true);
      toast.success("Self-assessment completed!");
    } catch (err) {
      toast.error("Failed to complete assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCertificate = () => {
    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Border
    doc.setDrawColor(40, 53, 147);
    doc.setLineWidth(4);
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(40, 53, 147);
    doc.text("HR-Insight", pageWidth / 2, 80, { align: "center" });

    doc.setFontSize(20);
    doc.setTextColor(33, 33, 33);
    doc.text("Certificate of Self-Assessment", pageWidth / 2, 120, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(97, 97, 97);
    doc.text("This certifies that", pageWidth / 2, 165, { align: "center" });

    const recipientName = profile?.full_name || "HR Professional";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(recipientName, pageWidth / 2, 200, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(97, 97, 97);
    const levelText =
      finalScore >= 85 ? "Diamond" : finalScore >= 65 ? "Gold" : finalScore >= 45 ? "Silver" : "Participant";
    doc.text(
      `has successfully completed the HR Self-Assessment with a score of ${finalScore}%,`,
      pageWidth / 2,
      235,
      { align: "center" }
    );
    doc.text(`achieving the ${levelText} level.`, pageWidth / 2, 258, { align: "center" });

    const certId = `SA-${id?.substring(0, 8).toUpperCase()}`;
    doc.setFontSize(11);
    doc.text(
      `Issued: ${new Date().toLocaleDateString("en-IN")}   •   Certificate ID: ${certId}`,
      pageWidth / 2,
      295,
      { align: "center" }
    );

    doc.setDrawColor(200, 200, 200);
    doc.line(80, 340, pageWidth - 80, 340);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("HR-Insight — Self-Assessment Certificate", pageWidth / 2, 365, {
      align: "center",
    });

    doc.save(`self-assessment-cert-${certId}.pdf`);
    toast.success("Certificate downloaded!");
  };

  if (loading) {
    return (
      <AppLayout title="Self Assessment">
        <div className="py-24 text-center text-muted-foreground">Loading assessment…</div>
      </AppLayout>
    );
  }

  // ── Completed Summary ───────────────────────────────────────────────
  if (completed) {
    const isCertified = finalScore >= CERT_THRESHOLD;
    const levelLabel =
      finalScore >= 85 ? "Diamond" : finalScore >= 65 ? "Gold" : finalScore >= 45 ? "Silver" : "Participant";
    const levelColor =
      finalScore >= 85
        ? "text-cert-diamond"
        : finalScore >= 65
        ? "text-cert-gold"
        : finalScore >= 45
        ? "text-cert-silver"
        : "text-muted-foreground";

    return (
      <AppLayout title="Assessment Complete">
        <div className="mx-auto max-w-2xl">
          <Card className="overflow-hidden">
            <div className="gradient-primary p-8 text-center text-primary-foreground">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16" />
              <h2 className="text-3xl font-bold">Assessment Complete!</h2>
              <p className="mt-2 text-primary-foreground/80">
                {assessment?.title}
              </p>
            </div>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <p className="text-6xl font-bold text-foreground">{finalScore}%</p>
                <p className={`mt-2 text-xl font-semibold capitalize ${levelColor}`}>
                  {levelLabel} Level
                </p>
              </div>

              {isCertified ? (
                <div className="mb-6 rounded-lg bg-success/10 p-4">
                  <Award className="mx-auto mb-2 h-8 w-8 text-success" />
                  <p className="font-medium text-success">
                    Congratulations! You qualify for a certificate.
                  </p>
                </div>
              ) : (
                <div className="mb-6 rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    Score ≥ {CERT_THRESHOLD}% required for certification. Keep practicing!
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {isCertified && (
                  <Button onClick={downloadCertificate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate("/action-plans")}>
                  <Star className="mr-2 h-4 w-4" />
                  View Improvements
                </Button>
                <Button variant="outline" onClick={() => navigate("/assessments?tab=self")}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  All Assessments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!currentQuestion) {
    return (
      <AppLayout title="Self Assessment">
        <div className="py-24 text-center text-muted-foreground">No questions available.</div>
      </AppLayout>
    );
  }

  const currentResponse = getResponseValue(currentQuestion.id);
  const isAnswered = currentResponse !== null && currentResponse !== undefined;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = questions.every((q) => responses[q.id] !== undefined);

  // ── Question View ───────────────────────────────────────────────────
  return (
    <AppLayout title="Self Assessment">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQuestion.skill_tag && (
              <Badge variant="secondary" className="capitalize">
                {currentQuestion.skill_tag.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-snug">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MCQ */}
            {currentQuestion.question_type === "mcq" && currentQuestion.options && (
              <div className="space-y-2">
                {(currentQuestion.options as MCQOption[]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all hover:border-primary/50 ${
                      currentResponse === option.value
                        ? "border-primary bg-primary/5 font-medium text-primary"
                        : "border-border"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Rating 1–5 */}
            {currentQuestion.question_type === "rating" && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleAnswer(val)}
                      className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-all hover:border-primary/70 ${
                        Number(currentResponse) === val
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {val}
                      <Star
                        className={`mx-auto mt-1 h-3 w-3 ${
                          Number(currentResponse) >= val ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Descriptive */}
            {currentQuestion.question_type === "descriptive" && (
              <div>
                <Textarea
                  placeholder="Type your answer here…"
                  rows={5}
                  value={typeof currentResponse === "string" ? currentResponse : ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Descriptive answers are saved manually when you move to the next question.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={currentIndex === 0} onClick={handlePrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(responses).length} / {questions.length} answered
          </span>

          {isLastQuestion ? (
            <Button
              onClick={handleComplete}
              disabled={submitting || !allAnswered}
            >
              {submitting ? "Submitting…" : "Complete Assessment"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {isLastQuestion && !allAnswered && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Please answer all questions before completing.
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default SelfAssessmentTake;
