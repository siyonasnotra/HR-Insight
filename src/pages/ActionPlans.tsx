import { useState, useEffect } from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ActionPlanCard } from "@/components/action-plans/ActionPlanCard";
import { actionPlanService } from "@/services/actionPlanService";
import { ActionPlan, ActionStatus } from "@/types";
import ImprovementTracking from "./ImprovementTracking";

const ActionPlans = () => {
  const { organization } = useAuth();
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });

  useEffect(() => {
    if (organization?.id) {
      fetchActionPlans();
    }
  }, [organization?.id]);

  const fetchActionPlans = async () => {
    try {
      setLoading(true);
      const plans = await actionPlanService.getOrganizationActionPlans(organization!.id);
      setActionPlans(plans || []);
      const planStats = await actionPlanService.getActionPlanStats(organization!.id);
      setStats(planStats);
    } catch (error) {
      console.error("Error fetching action plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await actionPlanService.updateActionPlanStatus(id, newStatus as ActionStatus);
      await fetchActionPlans();
    } catch (error) {
      console.error('Error updating action plan:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await actionPlanService.deleteActionPlan(id);
      await fetchActionPlans();
    } catch (error) {
      console.error('Error deleting action plan:', error);
    }
  };

  const filteredPlans = filterStatus
    ? actionPlans.filter(plan => plan.status === filterStatus)
    : actionPlans;

  const statuses: { id: string; label: string; count: number; color: string }[] = [
    { id: 'pending', label: 'Pending', count: stats.pending, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'in_progress', label: 'In Progress', count: stats.inProgress, color: 'bg-blue-100 text-blue-800' },
    { id: 'completed', label: 'Completed', count: stats.completed, color: 'bg-green-100 text-green-800' },
    { id: 'overdue', label: 'Overdue', count: stats.overdue, color: 'bg-red-100 text-red-800' }
  ];

  const completedCount = stats.completed;
  const progress = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Improvements & Actions">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Improvements & Actions</h1>
          <p className="text-muted-foreground mt-2">
            Track your personal skill development and manage organizational action plans.
          </p>
        </div>

        <Tabs defaultValue="org-actions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="org-actions">Organization Actions</TabsTrigger>
            <TabsTrigger value="my-improvements">My Improvements</TabsTrigger>
          </TabsList>

          <TabsContent value="org-actions" className="border-none p-0 outline-none space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <CardDescription>Total Actions</CardDescription>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <CardDescription>Completed</CardDescription>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <CardDescription>In Progress</CardDescription>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <CardDescription>Progress</CardDescription>
                  <div className="mt-2">
                    <Progress value={progress} className="h-2" />
                    <p className="mt-1 text-sm text-gray-600">{Math.round(progress)}% complete</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Filter */}
            <div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === '' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                  }`}
                >
                  All ({stats.total})
                </button>
                {statuses.map(status => (
                  <button
                    key={status.id}
                    onClick={() => setFilterStatus(status.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filterStatus === status.id
                        ? `${status.color}`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {status.label} ({status.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Action Plans List */}
            {filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No action plans {filterStatus ? 'with this status' : 'yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {filterStatus ? 'Try changing the filter.' : 'Complete an assessment to generate action plans.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPlans.map((plan) => (
                  <ActionPlanCard
                    key={plan.id}
                    actionPlan={plan}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-improvements" className="border-none p-0 outline-none">
            <ImprovementTracking />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ActionPlans;
