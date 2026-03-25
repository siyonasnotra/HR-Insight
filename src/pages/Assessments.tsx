import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Play, CheckCircle2, Clock, TrendingUp, Award, Briefcase, Target, BookOpen,
  LineChart, Heart, Users, Laptop, Scale, Crown, Repeat, Plus, ClipboardList,
  Star, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { selfAssessmentService } from "@/services/selfAssessmentService";
import { SelfAssessment } from "@/types";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  UserPlus: Briefcase, Target, GraduationCap: BookOpen, Wallet: LineChart,
  Heart, Users, BarChart3: Laptop, Shield: Scale, Crown, TrendingUp: Repeat,
};

interface Category {
  id: string; name: string; description: string | null;
  icon: string | null; display_order: number;
}
interface OrgAssessment {
  id: string; title: string; status: string; overall_score: number | null;
  certification_level: string | null; created_at: string; completed_at: string | null;
}
interface CategoryScore {
  assessment_id: string; category_id: string; percentage: number;
}

const selfStatusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "bg-warning text-warning-foreground" },
  draft: { label: "Draft", icon: Clock, color: "bg-secondary text-secondary-foreground" },
};

const getOrgStatusBadge = (status: string) => {
  switch (status) {
    case "completed": return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
    case "in_progress": return <Badge className="bg-warning text-warning-foreground"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>;
    default: return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Not Started</Badge>;
  }
};

const Assessments = () => {
  const navigate = useNavigate();
  const { user, organization, userRole } = useAuth();

  // ── Org assessment state ──────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [orgAssessments, setOrgAssessments] = useState<OrgAssessment[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [orgLoading, setOrgLoading] = useState(true);

  // ── Self-assessment state ─────────────────────────────────────────────────
  const [selfAssessments, setSelfAssessments] = useState<SelfAssessment[]>([]);
  const [selfLoading, setSelfLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => { if (organization?.id) fetchOrgData(); }, [organization?.id]);
  useEffect(() => { if (user?.id) fetchSelfAssessments(); }, [user?.id]);

  useEffect(() => {
    if (!organization?.id) return;

    const questionChannel = supabase
      .channel("questions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, () => {
        fetchOrgData();
      })
      .subscribe();

    const categoryChannel = supabase
      .channel("categories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_categories" }, () => {
        fetchOrgData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(questionChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, [organization?.id]);

  const fetchOrgData = async () => {
    setOrgLoading(true);
    const [{ data: cats }, { data: assessData }, { data: scores }, { data: qs }] = await Promise.all([
      supabase.from("assessment_categories").select("*").order("display_order", { ascending: true }),
      organization?.id
        ? supabase.from("assessments").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("category_scores").select("*"),
      supabase.from("questions").select("id, category_id, is_active").eq("is_active", true),
    ]);
    const categoryList = (cats || []).slice(0, 6);
    setCategories(categoryList);
    setOrgAssessments((assessData || []) as OrgAssessment[]);
    setCategoryScores((scores || []) as CategoryScore[]);
    const allowedIds = new Set(categoryList.map((c) => c.id));
    const counts: Record<string, number> = {};
    (qs || []).forEach((q: { category_id: string }) => {
      if (!q.category_id || !allowedIds.has(q.category_id)) return;
      counts[q.category_id] = (counts[q.category_id] || 0) + 1;
    });
    setQuestionCounts(counts);
    setOrgLoading(false);
  };

  const fetchSelfAssessments = async () => {
    setSelfLoading(true);
    try {
      const data = await selfAssessmentService.getSelfAssessmentsByUser(user!.id);
      setSelfAssessments(data);
    } catch { toast.error("Failed to load self-assessments"); }
    finally { setSelfLoading(false); }
  };

  const handleStartNewSelf = async () => {
    if (!user?.id) return;
    setCreatingNew(true);
    try {
      const assessment = await selfAssessmentService.createSelfAssessment(
        user.id, `Self-Assessment — ${new Date().toLocaleDateString("en-IN")}`
      );
      navigate(`/self-assessments/take/${assessment.id}`);
    } catch { toast.error("Failed to create assessment"); }
    finally { setCreatingNew(false); }
  };

  // ── Org calculations ───────────────────────────────────────────────────────
  const latestOrg = orgAssessments[0];
  const completedOrg = orgAssessments.filter((a) => a.status === "completed");
  const inProgressOrg = orgAssessments.find((a) => a.status === "in_progress");
  const latestCatScores = latestOrg ? categoryScores.filter((s) => s.assessment_id === latestOrg.id) : [];

  const getCategoryStatus = (categoryId: string) => {
    if (!latestOrg) return { status: "not_started", score: null };
    const score = latestCatScores.find((s) => s.category_id === categoryId);
    if (score) return { status: "completed", score: score.percentage };
    if (inProgressOrg && latestCatScores.length > 0) return { status: "in_progress", score: null };
    return { status: "not_started", score: null };
  };

  // ── Self calculations ──────────────────────────────────────────────────────
  const completedSelf = selfAssessments.filter((a) => a.status === "completed");
  const avgSelfScore = completedSelf.length > 0
    ? Math.round(completedSelf.reduce((s, a) => s + (a.overall_score || 0), 0) / completedSelf.length)
    : null;

  const canManage = userRole === "hr_admin" || userRole === "hr_manager" || userRole === "super_admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "organization";

  return (
    <AppLayout title="Assessments">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Assessments</h2>
        <p className="text-muted-foreground">
          Complete organization benchmarks or take personal self-assessments across 6 HR domains.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList className="mb-6">
          <TabsTrigger value="organization">🏢 Organization Assessments</TabsTrigger>
          <TabsTrigger value="self">👤 Self Assessments</TabsTrigger>
        </TabsList>

        {/* ══════════════════════ ORG ASSESSMENTS TAB ══════════════════════ */}
        <TabsContent value="organization">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Benchmark your organization across 6 core HR practice domains.
            </p>
            {canManage && (
              <Button onClick={() => inProgressOrg ? navigate(`/assessments/take/${inProgressOrg.id}`) : navigate("/assessments/take/new")}>
                {inProgressOrg ? <><Play className="mr-2 h-4 w-4" />Continue Assessment</> : <><Plus className="mr-2 h-4 w-4" />New Assessment</>}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{completedOrg.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{latestOrg?.overall_score || 0}</p>
                    <p className="text-sm text-muted-foreground">Latest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cert-gold/20">
                    <Award className="h-6 w-6 text-cert-gold" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground capitalize">
                      {latestOrg?.certification_level || "None"}
                    </p>
                    <p className="text-sm text-muted-foreground">Current Level</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category cards */}
          {orgLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading categories…</div>
          ) : (
            <>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Assessment Categories</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {categories.map((category) => {
                  const status = getCategoryStatus(category.id);
                  const IconComp = iconMap[category.icon || "Target"] || Target;
                  const qCount = questionCounts[category.id] ?? 0;
                  return (
                    <Card key={category.id} className="group cursor-pointer transition-all hover:shadow-md"
                      onClick={() => {
                        if (!canManage) { toast.info("You only have view access."); return; }
                        inProgressOrg
                          ? navigate(`/assessments/take/${inProgressOrg.id}?category=${category.id}`)
                          : navigate(`/assessments/take/new?category=${category.id}`);
                      }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <IconComp className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{category.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getOrgStatusBadge(status.status)}
                            <span className="text-sm text-muted-foreground">
                              {qCount === 1 ? "1 question" : `${qCount} questions`}
                            </span>
                          </div>
                          {status.score !== null && (
                            <span className="text-lg font-semibold text-foreground">{status.score}/100</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* History */}
          {completedOrg.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Assessment History</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {completedOrg.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-foreground">{a.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Completed {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">{a.overall_score}/100</span>
                          <Badge variant="secondary" className="capitalize">{a.certification_level}</Badge>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/assessments/take/${a.id}`)}>
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════ SELF ASSESSMENTS TAB ══════════════════════ */}
        <TabsContent value="self">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Evaluate your personal HR skills — MCQ, rating (1–5), and descriptive questions across 6 domains.
            </p>
            <Button onClick={handleStartNewSelf} disabled={creatingNew}>
              <Plus className="mr-2 h-4 w-4" />
              {creatingNew ? "Creating…" : "New Self-Assessment"}
            </Button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedSelf.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgSelfScore != null ? `${avgSelfScore}%` : "—"}</p>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <ClipboardList className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selfAssessments.length}</p>
                    <p className="text-sm text-muted-foreground">Total Taken</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question types info */}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Multiple Choice", desc: "Select the best practice from given options", icon: "🔘" },
              { label: "Rating (1–5)", desc: "Rate your proficiency on a 5-point scale", icon: "⭐" },
              { label: "Descriptive", desc: "Describe your approach in your own words", icon: "✍️" },
            ].map((t) => (
              <Card key={t.label} className="border border-border/60">
                <CardContent className="p-4">
                  <p className="mb-1 text-2xl">{t.icon}</p>
                  <p className="font-medium text-foreground text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Self Assessment list */}
          {selfLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading assessments…</div>
          ) : selfAssessments.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent>
                <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No self-assessments yet</h3>
                <p className="mb-6 text-muted-foreground max-w-sm mx-auto">
                  Take your first 12-question self-assessment covering Talent Acquisition, Performance Management, L&D, Employee Engagement, Organizational Culture, and CSR.
                </p>
                <Button onClick={handleStartNewSelf} disabled={creatingNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start First Assessment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {selfAssessments.map((assessment) => {
                const config = selfStatusConfig[assessment.status] || selfStatusConfig.draft;
                const Icon = config.icon;
                return (
                  <Card key={assessment.id} className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{assessment.title}</CardTitle>
                        <Badge className={`shrink-0 ${config.color}`}>
                          <Icon className="mr-1 h-3 w-3" />{config.label}
                        </Badge>
                      </div>
                      <CardDescription>
                        {new Date(assessment.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {assessment.overall_score != null ? (
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-primary" />
                              <span className="font-semibold">{assessment.overall_score}%</span>
                              <span className="text-xs text-muted-foreground">
                                {assessment.overall_score >= 60 ? "✓ Certificate earned" : "Below 60% threshold"}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-sm text-muted-foreground">
                                {assessment.answered_questions}/{assessment.total_questions} answered
                              </span>
                              {assessment.total_questions > 0 && (
                                <Progress
                                  value={(assessment.answered_questions / assessment.total_questions) * 100}
                                  className="mt-1.5 h-1"
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={assessment.status === "completed" ? "outline" : "default"}
                          onClick={() => navigate(`/self-assessments/take/${assessment.id}`)}
                        >
                          {assessment.status === "completed" ? (
                            <><RotateCcw className="mr-1 h-3 w-3" />Review</>
                          ) : (
                            <><Play className="mr-1 h-3 w-3" />Continue</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Improvement CTA */}
          {completedSelf.length > 0 && (
            <Card className="mt-6 bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">🎯 View your improvement insights</p>
                  <p className="text-sm text-muted-foreground">Strengths, weaknesses, and recommendations based on your results.</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/action-plans")}>
                  <Star className="mr-2 h-4 w-4" />View Insights
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Assessments;
