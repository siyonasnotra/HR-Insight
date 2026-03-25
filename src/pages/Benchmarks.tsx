import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Users, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { benchmarkService } from "@/services/benchmarkService";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Benchmarks = () => {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['benchmarks', organization?.id],
    queryFn: () => benchmarkService.getBenchmarkData(organization!.id),
    enabled: !!organization?.id,
  });

  if (isLoading) {
    return (
      <AppLayout title="Benchmarks">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Calculating benchmarks...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout title="Benchmarks">
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Insufficient Data</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {isError ? (error as Error).message : "Ensure you have completed at least one assessment to view benchmarks."}
          </p>
          <Button onClick={() => navigate("/assessments")}>
            Go to Assessments
          </Button>
        </Card>
      </AppLayout>
    );
  }

  const {
    yourScore,
    industryAverage,
    globalAverage,
    rank,
    totalOrganizations,
    percentile,
    radarData,
    leaderboard
  } = data;

  const diffFromIndustry = yourScore - industryAverage;
  const diffFromGlobal = yourScore - globalAverage;

  return (
    <AppLayout title="Benchmarks">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Industry Benchmarking</h2>
        <p className="text-muted-foreground">Compare your HR practices with industry peers.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Badge variant="default" className="px-4 py-2 capitalize">
          <Building2 className="mr-2 h-4 w-4" />
          {organization?.industry?.replace('_', '/')}
        </Badge>
        <Badge variant="secondary" className="px-4 py-2 capitalize">
          <MapPin className="mr-2 h-4 w-4" />
          {organization?.region?.replace('_', ' ')}
        </Badge>
        <Badge variant="secondary" className="px-4 py-2">
          <Users className="mr-2 h-4 w-4" />
          {organization?.company_size?.replace('_', '-')} Employees
        </Badge>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={diffFromIndustry >= 0 ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="p-4">
            <CardDescription>Your Overall Score</CardDescription>
            <p className="text-3xl font-bold text-primary">{Math.round(yourScore)}/100</p>
            <p className="text-sm text-muted-foreground">Assessment Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CardDescription>Global Percentile</CardDescription>
            <p className="text-3xl font-bold text-primary">{Math.round(percentile)}th</p>
            <p className="text-sm text-muted-foreground">Out of {totalOrganizations} organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CardDescription>Industry Rank</CardDescription>
            <p className="text-3xl font-bold text-foreground">#{rank}</p>
            <p className="text-sm text-muted-foreground">Among {organization?.industry?.replace('_', '/')} sector</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Category Breakdown</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis & Insights</TabsTrigger>
          <TabsTrigger value="ranking">Industry Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your HR Maturity Assessment</CardTitle>
              <CardDescription>Overall performance across 6 core HR practice domains</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Your Organization Score</p>
                    <p className="text-sm text-muted-foreground">Assessment-based evaluation</p>
                  </div>
                  <span className="text-4xl font-bold text-primary">{Math.round(yourScore)}</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-destructive via-yellow-500 to-success rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min(yourScore, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Benchmark Metrics</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Industry Average ({organization?.industry?.replace('_', '/')})</span>
                      <span className="font-semibold">{Math.round(industryAverage)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Global Average</span>
                      <span className="font-semibold">{Math.round(globalAverage)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Top Performer Level</span>
                      <span className="font-semibold">85+</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Your Position</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">vs Industry</span>
                      <span className={`font-semibold ${diffFromIndustry >= 0 ? "text-success" : "text-destructive"}`}>
                        {diffFromIndustry >= 0 ? "+" : ""}{diffFromIndustry.toFixed(1)} points
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">vs Global</span>
                      <span className={`font-semibold ${diffFromGlobal >= 0 ? "text-success" : "text-destructive"}`}>
                        {diffFromGlobal >= 0 ? "+" : ""}{diffFromGlobal.toFixed(1)} points
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Global Rank</span>
                      <span className="font-semibold">#{rank} of {totalOrganizations}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-foreground">
                  {diffFromIndustry > 0 
                    ? `✓ Your organization is performing ${Math.abs(diffFromIndustry).toFixed(1)} points above your industry peers, indicating stronger HR maturity.`
                    : diffFromIndustry < 0 
                    ? `⚠ Your organization is ${Math.abs(diffFromIndustry).toFixed(1)} points below industry peers. Focus on key improvement areas to close the gap.`
                    : `○ Your organization matches the industry average. Target high-performing organizations to identify advancement opportunities.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>HR Practice Comparison (6 Domains)</CardTitle>
              <CardDescription>Your performance vs industry average and top performers across each practice area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Your Score" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    <Radar name="Industry Avg" dataKey="industry" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} />
                    <Radar name="Top 10%" dataKey="topPerformers" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.08} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip formatter={(value) => `${Math.round(value)}`} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                The radar chart shows your organization's maturity level (blue) compared to industry peers (gray) and top-performing organizations (green) across all 6 HR practice domains. Wider areas indicate stronger performance. Focus areas appear as narrower sections relative to benchmarks.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain-Level Gap Analysis</CardTitle>
              <CardDescription>Identify your strengths and improvement areas by comparing with industry benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%" minWidth={600}>
                  <BarChart data={radarData} layout="vertical" margin={{ top: 10, right: 30, left: 150, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `${Math.round(value)}`} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="you" name="Your Score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="industry" name="Industry Avg" fill="hsl(var(--muted-foreground))" opacity={0.6} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="topPerformers" name="Top Performers" fill="hsl(var(--success))" opacity={0.4} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {radarData.map((domain, idx) => {
              const gap = domain.you - domain.industry;
              const isStrength = gap >= 0;
              return (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{domain.category}</span>
                      <Badge variant={isStrength ? "default" : "secondary"}>
                        {isStrength ? "Strength" : "Gap"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Your Score</span>
                      <span className="font-semibold">{domain.you}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Industry Avg</span>
                      <span className="font-semibold">{domain.industry}</span>
                    </div>
                    <div className={`flex justify-between items-center text-sm font-medium mt-2 pt-2 border-t ${isStrength ? "text-success" : "text-destructive"}`}>
                      <span>{isStrength ? "Above Industry" : "Below Industry"}</span>
                      <span>{isStrength ? "+" : ""}{gap}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benchmark Organizations Comparison</CardTitle>
              <CardDescription>See how your performance compares to similar organizations in your industry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Performer */}
                <div className="p-4 border rounded-lg bg-success/5 border-success/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">⭐ Top Performer Example</p>
                      <p className="text-xs text-muted-foreground">{organization?.industry?.replace('_', '/')} Sector Leader</p>
                    </div>
                    <Badge className="bg-success">{Math.round(radarData.reduce((sum, d) => sum + d.topPerformers, 0) / radarData.length)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {radarData.map((domain, idx) => (
                      <div key={idx}>
                        <p className="text-muted-foreground capitalize truncate">{domain.category}</p>
                        <p className="font-semibold text-success">{domain.topPerformers}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Industry Average */}
                <div className="p-4 border rounded-lg bg-muted/30 border-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">📊 Industry Average Org</p>
                      <p className="text-xs text-muted-foreground">Typical {organization?.industry?.replace('_', '/')} organization</p>
                    </div>
                    <Badge variant="secondary">{Math.round(industryAverage)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {radarData.map((domain, idx) => (
                      <div key={idx}>
                        <p className="text-muted-foreground capitalize truncate">{domain.category}</p>
                        <p className="font-semibold text-foreground">{domain.industry}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your Organization */}
                <div className="p-4 border-2 rounded-lg bg-primary/5 border-primary/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">🎯 Your Organization</p>
                      <p className="text-xs text-muted-foreground">{organization?.name}</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">{Math.round(yourScore)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {radarData.map((domain, idx) => (
                      <div key={idx}>
                        <p className="text-muted-foreground capitalize truncate">{domain.category}</p>
                        <p className="font-semibold text-primary">{domain.you}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle className="text-base">Key Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {radarData.filter(d => d.you < d.industry).length > 0 && (
                <p>
                  🎯 <strong>Priority Areas:</strong> Focus on {radarData
                    .filter(d => d.you < d.industry)
                    .slice(0, 2)
                    .map(d => d.category)
                    .join(' and ')} where your organization lags industry benchmarks.
                </p>
              )}
              {radarData.filter(d => d.you >= d.topPerformers * 0.9).length > 0 && (
                <p>
                  ⭐ <strong>Leveraging Strengths:</strong> {radarData
                    .filter(d => d.you >= d.topPerformers * 0.9)
                    .map(d => d.category)
                    .join(', ')} are competitive advantages—document and share these practices.
                </p>
              )}
              <p>⏱️ <strong>Action Timeline:</strong> Address critical gaps within 6-12 months through targeted action plans and initiatives.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle>Industry Leaderboard</CardTitle>
              <CardDescription>Top performing organizations in {organization?.industry?.replace('_', '/')} sector</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((org) => (
                  <div key={`${org.name}-${org.rank}`} className={`flex items-center justify-between rounded-lg border p-4 ${org.isYou ? "border-primary bg-primary/10 shadow-sm" : "border-border"}`}>
                    <div className="flex items-center gap-4">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${org.rank === 1 ? "bg-yellow-400 text-yellow-900" : org.rank === 2 ? "bg-gray-300 text-gray-900" : org.rank === 3 ? "bg-orange-400 text-orange-900" : "bg-muted text-muted-foreground"}`}>
                        {org.rank === 1 ? "🥇" : org.rank === 2 ? "🥈" : org.rank === 3 ? "🥉" : org.rank}
                      </span>
                      <div>
                        <p className={`font-medium ${org.isYou ? "text-primary font-bold" : "text-foreground"}`}>
                          {org.name}
                          {org.isYou && <Badge className="ml-2" variant="secondary">Your Organization</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">Score: {org.score}/100</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 hidden sm:block"><Progress value={org.score} className="h-2" /></div>
                      <span className="text-lg font-bold text-foreground">{org.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Benchmarks;
