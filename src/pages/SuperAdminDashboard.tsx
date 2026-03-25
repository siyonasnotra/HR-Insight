import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Settings,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Loader2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";

interface SuperAdminOrg {
  id: string;
  name: string;
  industry: string;
  created_at: string;
}

interface IndustryStat {
  name: string;
  value: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SuperAdminDashboard = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    organizations: 0,
    users: 0,
    assessments: 0,
    avgScore: 0,
  });
  const [recentOrgs, setRecentOrgs] = useState<SuperAdminOrg[]>([]);
  const [industryData, setIndustryData] = useState<IndustryStat[]>([]);

  useEffect(() => {
    if (userRole && userRole !== "super_admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    const fetchGlobalStats = async () => {
      try {
        setLoading(true);
        const [
          { count: orgCount },
          { count: userCount },
          { count: assCount },
          { data: allAssessments },
          { data: allOrgs }
        ] = await Promise.all([
          supabase.from("organizations").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("assessments").select("*", { count: "exact", head: true }),
          supabase.from("assessments").select("overall_score").eq("status", "completed"),
          supabase.from("organizations").select("industry")
        ]);

        // Calculate average score
        let avg = 0;
        if (allAssessments && allAssessments.length > 0) {
          const total = allAssessments.reduce((sum, a) => sum + (Number(a.overall_score) || 0), 0);
          avg = Math.round(total / allAssessments.length);
        }

        setStats({
          organizations: orgCount || 0,
          users: userCount || 0,
          assessments: assCount || 0,
          avgScore: avg,
        });

        // Group by industry
        if (allOrgs) {
          const counts: Record<string, number> = {};
          allOrgs.forEach(o => {
            const ind = o.industry.replace(/_/g, ' ').toUpperCase();
            counts[ind] = (counts[ind] || 0) + 1;
          });
          setIndustryData(Object.entries(counts).map(([name, value]) => ({ name, value })));
        }

        // Fetch recent activity
        const { data: recentOrgData } = await supabase.from("organizations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10); // Increase limit since it's now in a bigger section

        if (recentOrgData) setRecentOrgs(recentOrgData);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        toast.error("Failed to load platform analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalStats();
  }, [userRole, navigate]);

  const quickActions = [
    { title: "New Org", icon: Plus, onClick: () => navigate("/organizations/new"), color: "bg-blue-50 text-blue-600 border-blue-100" },
    { title: "Configure", icon: Settings, onClick: () => navigate("/assessment-config"), color: "bg-purple-50 text-purple-600 border-purple-100" },
    { title: "System", icon: ShieldCheck, onClick: () => navigate("/system-settings"), color: "bg-green-50 text-green-600 border-green-100" },
    { title: "Analytics", icon: TrendingUp, onClick: () => navigate("/benchmark-analytics"), color: "bg-orange-50 text-orange-600 border-orange-100" },
  ];

  return (
    <AppLayout title="Super Admin Dashboard">
      {/* Header Section */}
      <div className="mb-8 relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase">
              Platform Overview
            </span>
          </div>
          <h2 className="text-4xl font-black mb-3">Welcome, Super Admin</h2>
          <p className="text-indigo-100 max-w-xl text-lg font-medium">
            You have full control over the HR maturity platform. Monitor multi-tenant growth, configure global assessments, and manage platform-wide settings.
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />
      </div>

      {loading ? (
        <div className="flex flex-col h-64 items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="text-muted-foreground animate-pulse">Gathering platform intelligence...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Quick Actions & High-Level Stats */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" /> Key Metrics
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="group hover:shadow-lg transition-all duration-300 border-indigo-100 bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-black mt-4">{stats.organizations}</CardTitle>
                  <CardDescription className="font-semibold text-xs tracking-tight">TOTAL ORGANIZATIONS</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-purple-100 bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-black mt-4">{stats.users}</CardTitle>
                  <CardDescription className="font-semibold text-xs tracking-tight">ACTIVE USERS</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-pink-100 bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-black mt-4">{stats.assessments}</CardTitle>
                  <CardDescription className="font-semibold text-xs tracking-tight">TOTAL ASSESSMENTS</CardDescription>
                </CardHeader>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-orange-100 bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-black mt-4">{stats.avgScore}%</CardTitle>
                  <CardDescription className="font-semibold text-xs tracking-tight">PLATFORM AVG SCORE</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>

          {/* Platform Distribution & Activity */}
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Recent Growth - Now Main Content */}
            <section className="lg:col-span-8 flex flex-col gap-6">
              <Card className="flex-1 border-none shadow-md overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="bg-zinc-50 dark:bg-zinc-800/50 border-b">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      Recent Growth
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>Latest companies to join the platform</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recentOrgs.length === 0 ? (
                      <p className="col-span-2 text-sm text-muted-foreground italic text-center py-8">No new registrations</p>
                    ) : (
                      recentOrgs.map(org => (
                        <div 
                          key={org.id} 
                          className="group flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-indigo-200 transition-all cursor-pointer"
                          onClick={() => navigate(`/organization/${org.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm group-hover:text-indigo-600 transition-colors">{org.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  {org.industry.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Joined</p>
                             <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">{new Date(org.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Side Panel: Management & Distribution */}
            <section className="lg:col-span-4 flex flex-col gap-6">
              {/* Quick Management */}
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Management</CardTitle>
                  <CardDescription>Platform admin operations</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.title}
                      onClick={action.onClick}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 hover:scale-105 active:scale-95 transition-all duration-200 ${action.color}`}
                    >
                      <action.icon className="h-6 w-6 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-tight">{action.title}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Industry Distribution Chart - Now Sidebar Item */}
              <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <PieChartIcon className="h-5 w-5 text-indigo-500" />
                    Market Sectors
                  </CardTitle>
                  <CardDescription>Distribution by industry</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    {industryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={industryData} layout="vertical" margin={{ left: -20, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }}
                             cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                            {industryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground italic text-xs">No data</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default SuperAdminDashboard;
