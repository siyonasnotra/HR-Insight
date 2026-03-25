import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, CheckCircle2, Clock, TrendingUp, Award, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { selfAssessmentService } from "@/services/selfAssessmentService";
import { SelfAssessment } from "@/types";
import { toast } from "sonner";

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-success text-success-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "bg-warning text-warning-foreground" },
  draft: { label: "Draft", icon: Clock, color: "bg-secondary text-secondary-foreground" },
};

const SelfAssessments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.id) fetchAssessments();
  }, [user?.id]);

  const fetchAssessments = async () => {
    try {
      const data = await selfAssessmentService.getSelfAssessmentsByUser(user!.id);
      setAssessments(data);
    } catch (err) {
      toast.error("Failed to load self-assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = async () => {
    if (!user?.id) return;
    setCreating(true);
    try {
      const assessment = await selfAssessmentService.createSelfAssessment(
        user.id,
        `Self-Assessment — ${new Date().toLocaleDateString()}`
      );
      navigate(`/self-assessments/take/${assessment.id}`);
    } catch (err) {
      toast.error("Failed to create assessment");
    } finally {
      setCreating(false);
    }
  };

  const completedCount = assessments.filter((a) => a.status === "completed").length;
  const avgScore =
    assessments.filter((a) => a.overall_score != null).length > 0
      ? Math.round(
          assessments
            .filter((a) => a.overall_score != null)
            .reduce((s, a) => s + (a.overall_score || 0), 0) /
            assessments.filter((a) => a.overall_score != null).length
        )
      : null;

  return (
    <AppLayout title="Self Assessments">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Self-Assessments</h2>
          <p className="text-muted-foreground">
            Evaluate your HR knowledge across 6 core skill areas with MCQ, rating & descriptive questions.
          </p>
        </div>
        <Button onClick={handleStartNew} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Creating…" : "New Assessment"}
        </Button>
      </div>

      {/* Summary stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
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
                <p className="text-2xl font-bold text-foreground">
                  {avgScore != null ? `${avgScore}%` : "—"}
                </p>
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
                <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">Total Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment list */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : assessments.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No assessments yet</h3>
            <p className="mb-6 text-muted-foreground">
              Take your first self-assessment to discover your HR strengths and areas to grow.
            </p>
            <Button onClick={handleStartNew} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              Start First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assessments.map((assessment) => {
            const config = statusConfig[assessment.status] || statusConfig.draft;
            const Icon = config.icon;
            return (
              <Card key={assessment.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{assessment.title}</CardTitle>
                    <Badge className={`shrink-0 ${config.color}`}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(assessment.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {assessment.overall_score != null ? (
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            {assessment.overall_score}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {assessment.overall_score >= 60 ? "Certified" : "Below threshold"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {assessment.answered_questions}/{assessment.total_questions} answered
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={assessment.status === "completed" ? "outline" : "default"}
                      onClick={() => navigate(`/self-assessments/take/${assessment.id}`)}
                    >
                      {assessment.status === "completed" ? (
                        "Review"
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Continue
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default SelfAssessments;
