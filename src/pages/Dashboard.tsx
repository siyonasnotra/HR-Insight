import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Target, ClipboardCheck, Users, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { organization, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [latestAssessment, setLatestAssessment] = useState<Tables<"assessments"> | null>(null);
  const [categoryScores, setCategoryScores] = useState<Tables<"category_scores">[]>([]);
  const [categories, setCategories] = useState<Tables<"assessment_categories">[]>([]);
  const [actionPlans, setActionPlans] = useState<Tables<"action_plans">[]>([]);

  useEffect(() => {
    if (userRole === "super_admin") {
      navigate("/super-admin-dashboard", { replace: true });
      return;
    }

    if (!organization?.id) {
      if (!loading || userRole !== null) {
        setLoading(false);
      }
      return;
    }

    fetchDashboardData();

    const assessmentChannel = supabase
      .channel("dashboard-assessments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments", filter: `organization_id=eq.${organization.id}` },
        () => fetchDashboardData(),
      )
      .subscribe();

    const categoryScoreChannel = supabase
      .channel("dashboard-category-scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_scores" },
        () => fetchDashboardData(),
      )
      .subscribe();

    const responseChannel = supabase
      .channel("dashboard-assessment-responses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessment_responses" },
        () => fetchDashboardData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assessmentChannel);
      supabase.removeChannel(categoryScoreChannel);
      supabase.removeChannel(responseChannel);
    };
  }, [organization?.id, userRole, navigate]);

  const fetchDashboardData = async () => {
    if (!organization?.id) return;

    const [
      { data: assessments },
      { data: cats },
      { data: plans },
    ] = await Promise.all([
      supabase
        .from("assessments")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("assessment_categories").select("*").order("display_order"),
      supabase
        .from("action_plans")
        .select("*")
        .eq("organization_id", organization.id)
        .limit(10),
    ]);

    // Limit categories to 6 domains
    setCategories((cats || []).slice(0, 6) as typeof cats);
    setActionPlans(plans || []);

    if (assessments && assessments.length > 0) {
      setLatestAssessment(assessments[0]);
      const { data: scores } = await supabase
        .from("category_scores")
        .select("*")
        .eq("assessment_id", assessments[0].id);
      setCategoryScores(scores || []);
    }

    setLoading(false);
  };

  const overallScore = latestAssessment?.overall_score || 0;
  const certLevel = latestAssessment?.certification_level || "none";
  const totalCategories = categories.length || 6;

  const completedCategories = categories.reduce((count, category) => {
    const score = categoryScores.find((s) => s.category_id === category.id);
    return count + (score && Number(score.percentage) >= 100 ? 1 : 0);
  }, 0);

  const inProgressCategories = categories.reduce((count, category) => {
    const score = categoryScores.find((s) => s.category_id === category.id);
    return count + (score && Number(score.percentage) > 0 && Number(score.percentage) < 100 ? 1 : 0);
  }, 0);

  const overallCategoryPercentSum = categories.reduce((sum, category) => {
    const score = categoryScores.find((s) => s.category_id === category.id);
    return sum + (score ? Number(score.percentage) : 0);
  }, 0);

  const assessmentProgress = totalCategories > 0
    ? Math.round(overallCategoryPercentSum / totalCategories)
    : 0;

  const pendingCategories = Math.max(totalCategories - completedCategories - inProgressCategories, 0);

  const stats = [
    { label: "Overall Score", value: overallScore.toString(), suffix: "/100", trend: certLevel !== "none" ? `${certLevel} level` : "Complete assessment", color: "text-primary" },
    { label: "Categories Assessed", value: `${completedCategories}`, suffix: `/${totalCategories}`, trend: `${pendingCategories} remaining`, color: "text-accent" },
    { label: "Action Plans", value: actionPlans.length.toString(), suffix: "", trend: `${actionPlans.filter(a => a.status === "completed").length} completed`, color: "text-success" },
    { label: "Certification", value: certLevel === "none" ? "—" : certLevel.charAt(0).toUpperCase() + certLevel.slice(1), suffix: "", trend: certLevel === "none" ? "Complete assessment" : "Active", color: "text-cert-gold" },
  ];

  const canManageAssessments = userRole === "hr_admin" || userRole === "hr_manager" || userRole === "super_admin";
  const canManageTeam = userRole === "hr_admin" || userRole === "super_admin";

  return (
    <AppLayout title="Dashboard">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name || "User"}!
        </h2>
        <p className="text-muted-foreground">Here's an overview of your HR assessment progress.</p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-muted-foreground">{stat.suffix}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground capitalize">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assessment progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assessment Progress</CardTitle>
                <CardDescription>Complete all {totalCategories} core domains for full certification</CardDescription>
              </div>
              {canManageAssessments && (
                <Button onClick={() => navigate("/assessments")}>
                  {latestAssessment ? "Continue" : "Start"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium text-foreground">{assessmentProgress}%</span>
              </div>
              <Progress value={assessmentProgress} className="h-2" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => {
                const score = categoryScores.find((s) => s.category_id === category.id);
                const percentage = score ? Number(score.percentage) : 0;
                const status = score
                  ? percentage >= 100
                    ? "Complete"
                    : "In Progress"
                  : "Pending";

                const badgeVariant = status === "Complete" ? "default" : "secondary";

                return (
                  <div key={category.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm text-foreground">{category.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{percentage}%</span>
                      <Badge variant={badgeVariant} className={status === "In Progress" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : ""}>{status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManageAssessments && (
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/assessments/take/new")}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Start New Assessment
                </Button>
              )}
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/benchmarks")}>
                <Target className="mr-2 h-4 w-4" />
                View Benchmarks
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/team")}>
                <Users className="mr-2 h-4 w-4" />
                {canManageTeam ? "Manage Team" : "View Team"}
              </Button>
            </CardContent>
          </Card>

          {/* Action plans summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Action Plans</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionPlans.length > 0 ? (
                actionPlans.slice(0, 3).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{plan.status.replace("_", " ")}</p>
                    </div>
                    <Badge
                      variant={plan.priority === 1 ? "destructive" : plan.priority === 2 ? "default" : "secondary"}
                    >
                      {plan.priority === 1 ? "High" : plan.priority === 2 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete your first assessment to generate action plans.
                </p>
              )}
              {actionPlans.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/action-plans")}>
                  View all {actionPlans.length} plans
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
