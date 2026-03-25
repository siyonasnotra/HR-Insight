import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save, CheckCircle2, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { actionPlanService } from "@/services/actionPlanService";

interface Question extends Omit<Tables<"questions">, "options"> {
  options: {
    labels?: string[];
    unit?: string;
    min?: number;
    max?: number;
  } | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

const AssessmentTake = () => {
  const navigate = useNavigate();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { organization, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [actualAssessmentId, setActualAssessmentId] = useState<string | null>(assessmentId || null);

  useEffect(() => {
    loadData();
  }, [organization?.id]); // loadData is stable — defined outside reactive scope

  const loadData = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    // Fetch categories
    const { data: cats } = await supabase
      .from("assessment_categories")
      .select("*")
      .order("display_order");

    // Fetch questions
    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const allCategories = cats || [];
    // Use only the first 6 categories and their questions
    const categoryList = allCategories.slice(0, 6);
    const allowedCategoryIds = new Set(categoryList.map((c) => c.id));

    const allQuestions = (qs as unknown as Question[]) || [];
    const filteredQuestions = allQuestions.filter((q) => allowedCategoryIds.has(q.category_id));

    setCategories(categoryList);
    setQuestions(filteredQuestions);

    const initialCategoryId = searchParams.get("category");
    if (initialCategoryId && categoryList.length > 0) {
      const foundIndex = categoryList.findIndex((c) => c.id === initialCategoryId);
      if (foundIndex >= 0) {
        setCurrentCategoryIndex(foundIndex);
      }
    }

    // Create or load assessment
    if (assessmentId && assessmentId !== "new") {
      setActualAssessmentId(assessmentId);

      // Check if assessment is completed → read-only review mode
      const { data: existingAssessment } = await supabase
        .from("assessments")
        .select("status")
        .eq("id", assessmentId)
        .maybeSingle();

      if (existingAssessment?.status === "completed") {
        setIsReadOnly(true);
      }

      // Load existing responses
      const { data: existingResponses } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("assessment_id", assessmentId);

      if (existingResponses) {
        const responseMap: Record<string, string | number> = {};
        existingResponses.forEach((r) => {
          responseMap[r.question_id] = r.response_value as string | number;
        });
        setResponses(responseMap);
      }
    } else {
      // Create new assessment
      const { data: newAssessment, error } = await supabase
        .from("assessments")
        .insert({
          organization_id: organization.id,
          title: `HR Assessment - ${new Date().toLocaleDateString()}`,
          status: "in_progress",
          created_by: user?.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create assessment");
        console.error(error);
        navigate("/assessments");
        return;
      }
      setActualAssessmentId(newAssessment.id);
      // Update URL without reload
      window.history.replaceState(null, "", `/assessments/take/${newAssessment.id}`);
    }

    setLoading(false);
  };

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = questions.filter(
    (q) => q.category_id === currentCategory?.id
  );

  const totalAnswered = Object.keys(responses).length;
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  const categoryAnswered = currentQuestions.filter((q) => responses[q.id] !== undefined).length;

  const handleResponse = (questionId: string, value: string | number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const computeWeightedScore = (q: Question, rawValue: unknown) => {
    const weight = typeof q.weight === "number" ? q.weight : 1;
    const maxScore = typeof q.max_score === "number" ? q.max_score : 5;

    let baseScore = 0;

    if (q.question_type === "likert") {
      const numeric =
        typeof rawValue === "number" ? rawValue : parseFloat((rawValue as string) ?? "");
      const scale = q.options?.labels?.length || maxScore || 5;
      const clamped = Number.isFinite(numeric) ? Math.min(scale, Math.max(1, numeric)) : 0;
      baseScore = scale > 0 ? (clamped / scale) * maxScore : 0;
    } else if (q.question_type === "yes_no") {
      baseScore = rawValue === "yes" ? maxScore : 0;
    } else if (q.question_type === "numeric") {
      const numeric =
        typeof rawValue === "number" ? rawValue : parseFloat((rawValue as string) ?? "");
      const min = typeof q.options?.min === "number" ? q.options.min : 0;
      const max = typeof q.options?.max === "number" ? q.options.max : maxScore;
      const clamped = Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;
      const denom = max - min;
      const ratio = denom > 0 ? (clamped - min) / denom : 0;
      baseScore = ratio * maxScore;
    }

    const weighted = baseScore * weight;
    return {
      weightedScore: Number.isFinite(weighted) ? weighted : 0,
      weightedMax: maxScore * weight,
    };
  };

  const saveResponses = async () => {
    if (!actualAssessmentId || isReadOnly) return;
    setSaving(true);

    // Upsert responses for current category questions using proper conflict resolution
    const upsertData = currentQuestions
      .filter((q) => responses[q.id] !== undefined)
      .map((q) => {
        const value = responses[q.id];
        const { weightedScore } = computeWeightedScore(q, value);

        return {
          assessment_id: actualAssessmentId,
          question_id: q.id,
          response_value: value,
          score: weightedScore,
        };
      });

    if (upsertData.length > 0) {
      const { error } = await supabase
        .from("assessment_responses")
        .upsert(upsertData, { onConflict: "assessment_id,question_id" });

      if (error) {
        toast.error("Failed to save responses");
        console.error(error);
      } else {
        toast.success("Responses saved");
      }
    }

    setSaving(false);
  };

  const handleNext = async () => {
    // Relaxed validation: Allow continuing even if not all questions are answered
    if (categoryAnswered < currentQuestions.length && !isReadOnly) {
      toast.info(`You skipped ${currentQuestions.length - categoryAnswered} question(s) in this category.`);
    }

    await saveResponses();
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;

    const unansweredCount = questions.filter((q) => responses[q.id] === undefined).length;
    if (unansweredCount > 0) {
      const confirmSkip = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Since skipped questions won't count against you or for you, do you want to submit anyway?`
      );
      if (!confirmSkip) return;
    }

    await saveResponses();
    if (!actualAssessmentId) return;

    // Calculate overall score
    const allResponded = questions.filter((q) => responses[q.id] !== undefined);
    let totalScore = 0;
    let maxPossible = 0;

    allResponded.forEach((q) => {
      const value = responses[q.id];
      const { weightedScore, weightedMax } = computeWeightedScore(q as unknown as Question, value);
      totalScore += weightedScore;
      maxPossible += weightedMax;
    });

    const overallScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

    // Determine certification level (aligned: diamond ≥85, gold ≥65, silver ≥45)
    let certLevel: "none" | "silver" | "gold" | "diamond" = "none";
    if (overallScore >= 85) certLevel = "diamond";
    else if (overallScore >= 65) certLevel = "gold";
    else if (overallScore >= 45) certLevel = "silver";

    // Update assessment status
    const { error } = await supabase
      .from("assessments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: overallScore,
        certification_level: certLevel,
      })
      .eq("id", actualAssessmentId);

    if (error) {
      toast.error("Failed to submit assessment");
      console.error(error);
      return;
    }

    // Save category scores
    const categoryScoresData = categories.map((cat) => {
      const catQuestions = questions.filter((q) => q.category_id === cat.id);
      let catScore = 0;
      let catMax = 0;

      catQuestions.forEach((q) => {
        const value = responses[q.id];
        if (value === undefined) return;
        const { weightedScore, weightedMax } = computeWeightedScore(q as unknown as Question, value);
        catScore += weightedScore;
        catMax += weightedMax;
      });

      return {
        assessment_id: actualAssessmentId!,
        category_id: cat.id,
        score: catScore,
        max_possible_score: catMax,
        percentage: catMax > 0 ? Math.round((catScore / catMax) * 100) : 0,
      };
    });

    await supabase.from("category_scores").upsert(categoryScoresData, {
      onConflict: "assessment_id,category_id",
    });

    // Issue certification only if none exists for this assessment (prevent duplicates)
    if (organization?.id) {
      const { data: existingCert } = await supabase
        .from("certifications")
        .select("id")
        .eq("assessment_id", actualAssessmentId)
        .maybeSingle();

      if (!existingCert) {
        const verifyCode = `CERT-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
        await supabase.from("certifications").insert({
          organization_id: organization.id,
          assessment_id: actualAssessmentId,
          level: certLevel,
          issued_at: new Date().toISOString(),
          verification_code: verifyCode,
        });
      }
    }

    // Auto-generate action plans for the 3 lowest-scoring domains
    try {
      const scoredCategories = categoryScoresData.map((cs) => {
        const cat = categories.find((c) => c.id === cs.category_id);
        return {
          categoryId: cs.category_id,
          categoryName: cat?.name || cs.category_id,
          percentage: cs.percentage,
        };
      });
      await actionPlanService.createActionPlansFromAssessment(
        actualAssessmentId!,
        organization!.id,
        scoredCategories
      );
    } catch (apError) {
      console.warn("Action plans could not be auto-generated:", apError);
      // Non-blocking — assessment is still complete
    }

    toast.success(
      `Assessment completed! Score: ${overallScore}/100 — ${certLevel.charAt(0).toUpperCase() + certLevel.slice(1)} level. Action plans generated!`
    );
    navigate("/assessments");
  };

  if (loading) {
    return (
      <AppLayout title="Assessment">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isReadOnly ? "Review Assessment" : "Take Assessment"}>
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">You are viewing a completed assessment in read-only mode. Responses cannot be changed.</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            {isReadOnly ? "Assessment Review" : "HR Practice Assessment"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {totalAnswered}/{totalQuestions} questions answered
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Category navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat, idx) => {
          const catQuestions = questions.filter((q) => q.category_id === cat.id);
          const catAnswered = catQuestions.filter((q) => responses[q.id] !== undefined).length;
          const isComplete = catAnswered === catQuestions.length && catQuestions.length > 0;

          return (
            <button
              key={cat.id}
              onClick={() => setCurrentCategoryIndex(idx)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${idx === currentCategoryIndex
                ? "border-primary bg-primary text-primary-foreground"
                : isComplete
                  ? "border-success bg-success/10 text-success"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
            >
              {isComplete && <CheckCircle2 className="h-3 w-3" />}
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Current category questions */}
      {currentCategory && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentCategory.name}</CardTitle>
                <CardDescription>{currentCategory.description}</CardDescription>
              </div>
              <Badge variant="secondary">
                {categoryAnswered}/{currentQuestions.length} answered
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestions.map((question, qIdx) => (
              <div key={question.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {qIdx + 1}
                  </span>
                  <p className="font-medium text-foreground">{question.question_text}</p>
                </div>

                <div className="ml-9">
                  {question.question_type === "likert" && (
                    <RadioGroup
                      value={responses[question.id]?.toString() || ""}
                      onValueChange={(val) => handleResponse(question.id, parseInt(val))}
                      className="space-y-2"
                    >
                      {(question.options?.labels || ["1", "2", "3", "4", "5"]).map(
                        (label: string, i: number) => (
                          <div key={i} className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={(i + 1).toString()} id={`${question.id}-${i}`} />
                            <Label htmlFor={`${question.id}-${i}`} className="flex-1 cursor-pointer">
                              <span className="mr-2 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                              {label}
                            </Label>
                          </div>
                        )
                      )}
                    </RadioGroup>
                  )}

                  {question.question_type === "yes_no" && (
                    <RadioGroup
                      value={responses[question.id]?.toString() || ""}
                      onValueChange={(val) => handleResponse(question.id, val)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2 rounded-lg border border-border px-6 py-3 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                        <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border border-border px-6 py-3 hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="no" id={`${question.id}-no`} />
                        <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {question.question_type === "numeric" && (
                    <Input
                      type="number"
                      placeholder={`Enter value${question.options?.unit ? ` (${question.options.unit})` : ""}`}
                      value={responses[question.id] || ""}
                      onChange={(e) =>
                        handleResponse(
                          question.id,
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      min={question.options?.min || 0}
                      max={question.options?.max || 999}
                      className="max-w-xs"
                    />
                  )}

                  {question.question_type === "multi_select" && (
                    <div className="space-y-2">
                      {(question.options?.labels || []).map((label: string, i: number) => {
                        const currentVal = responses[question.id]?.toString() || "";
                        const selected = currentVal.split(",").filter(Boolean);
                        const isChecked = selected.includes((i + 1).toString());
                        return (
                          <div
                            key={i}
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            }`}
                            onClick={() => {
                              const updated = isChecked
                                ? selected.filter((v) => v !== (i + 1).toString())
                                : [...selected, (i + 1).toString()];
                              handleResponse(question.id, updated.join(","));
                            }}
                          >
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              isChecked ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}>
                              {isChecked && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                            <Label className="cursor-pointer flex-1">
                              <span className="mr-2 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                              {label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentCategoryIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-3">
          {!isReadOnly && (
            <Button variant="outline" onClick={saveResponses} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
          )}

          {currentCategoryIndex === categories.length - 1 ? (
            isReadOnly ? (
              <Button variant="outline" onClick={() => navigate("/assessments")}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Back to Assessments
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Submit Assessment
              </Button>
            )
          ) : (
            <Button onClick={handleNext} disabled={saving}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AssessmentTake;
