import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Star,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  improvementService,
  skillTagLabels,
} from "@/services/improvementService";
import { UserImprovementSuggestion, UserSkillScore } from "@/types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";

const suggestionConfig = {
  strength: {
    label: "Strength",
    icon: Star,
    color: "text-success",
    bg: "bg-success/10",
    badgeClass: "bg-success/20 text-success",
  },
  weakness: {
    label: "Needs Work",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    badgeClass: "bg-destructive/20 text-destructive",
  },
  recommendation: {
    label: "Recommendation",
    icon: Lightbulb,
    color: "text-primary",
    bg: "bg-primary/10",
    badgeClass: "bg-primary/20 text-primary",
  },
};

const ImprovementTracking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skillScores, setSkillScores] = useState<UserSkillScore[]>([]);
  const [suggestions, setSuggestions] = useState<UserImprovementSuggestion[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "strength" | "weakness" | "recommendation">("all");

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scores, suggs] = await Promise.all([
        improvementService.getUserSkillScores(user!.id),
        improvementService.getUserImprovements(user!.id),
      ]);
      setSkillScores(scores);
      setSuggestions(suggs);
    } catch {
      toast.error("Failed to load improvement data");
    } finally {
      setLoading(false);
    }
  };

  const radarData = skillScores.map((s) => ({
    skill: skillTagLabels[s.skill_tag] || s.skill_tag,
    score: s.percentage,
    fullMark: 100,
  }));

  const filteredSuggestions = suggestions.filter((s) =>
    activeFilter === "all" ? true : s.suggestion_type === activeFilter
  );

  const strengthCount = suggestions.filter((s) => s.suggestion_type === "strength").length;
  const weaknessCount = suggestions.filter((s) => s.suggestion_type === "weakness").length;
  const recCount = suggestions.filter((s) => s.suggestion_type === "recommendation").length;

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Improvement Tracking</h2>
          <p className="text-muted-foreground">
            Your personalized skill analysis based on self-assessment results.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-muted-foreground">Loading your data…</div>
      ) : skillScores.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No data yet</h3>
            <p className="mb-6 text-muted-foreground">
              Complete a self-assessment to generate your skill analysis.
            </p>
            <Button onClick={() => navigate("/assessments?tab=self")}>
              Take Self-Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Radar Chart + Summary */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Radar</CardTitle>
                <CardDescription>Your score across all HR domains</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.25}
                    />
                    <Tooltip formatter={(v: unknown) => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skill Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Breakdown</CardTitle>
                <CardDescription>Percentage score per skill tag</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillScores.map((s) => (
                  <div key={s.skill_tag}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {skillTagLabels[s.skill_tag] || s.skill_tag}
                      </span>
                      <span className="text-muted-foreground">{s.percentage}%</span>
                    </div>
                    <Progress value={s.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Summary badges */}
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { type: "strength", count: strengthCount, icon: TrendingUp, label: "Strengths" },
              { type: "weakness", count: weaknessCount, icon: TrendingDown, label: "Needs Work" },
              { type: "recommendation", count: recCount, icon: Lightbulb, label: "Recommendations" },
            ] as const).map(({ type, count, icon: Icon, label }) => {
              const cfg = suggestionConfig[type];
              return (
                <Card
                  key={type}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    activeFilter === type ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setActiveFilter(activeFilter === type ? "all" : type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.bg}`}>
                        <Icon className={`h-6 w-6 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{count}</p>
                        <p className="text-sm text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Suggestions list */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {activeFilter === "all" ? "All Insights" : suggestionConfig[activeFilter].label + "s"}
              </h3>
              {activeFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setActiveFilter("all")}>
                  Show All
                </Button>
              )}
            </div>

            {filteredSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this category.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSuggestions.map((s) => {
                  const cfg = suggestionConfig[s.suggestion_type];
                  const Icon = cfg.icon;
                  return (
                    <Card key={s.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                              <span className="text-xs text-muted-foreground capitalize">
                                {skillTagLabels[s.skill_tag] || s.skill_tag}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{s.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovementTracking;
