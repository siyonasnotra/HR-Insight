import { useState, useEffect } from "react";
import {
  ClipboardCheck, Search, Loader2, Building2, ExternalLink,
  CheckCircle2, Clock, AlertCircle, RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AssessmentRow {
  id: string;
  title: string;
  status: string;
  overall_score: number | null;
  certification_level: string | null;
  created_at: string;
  completed_at: string | null;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
    industry: string;
    region: string;
  } | null;
}

const statusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'default' as const, icon: CheckCircle2 };
    case 'in_progress':
      return { label: 'In Progress', variant: 'secondary' as const, icon: Clock };
    default:
      return { label: status.replace(/_/g, ' '), variant: 'outline' as const, icon: AlertCircle };
  }
};

const AssessmentsAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [searchTerm, setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select(`
          id,
          title,
          status,
          overall_score,
          certification_level,
          created_at,
          completed_at,
          organization_id,
          organizations (id, name, industry, region)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssessments((data || []) as AssessmentRow[]);
    } catch (err) {
      console.error("Error fetching assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssessments(); }, []);

  const industries = Array.from(new Set(assessments.map((a) => a.organizations?.industry).filter(Boolean))) as string[];

  const filtered = assessments.filter((a) => {
    const orgName = a.organizations?.name?.toLowerCase() ?? '';
    const matchSearch =
      orgName.includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus   = filterStatus === "all"   || a.status === filterStatus;
    const matchIndustry = filterIndustry === "all" || a.organizations?.industry === filterIndustry;
    return matchSearch && matchStatus && matchIndustry;
  });

  const completedCount  = assessments.filter((a) => a.status === 'completed').length;
  const inProgressCount = assessments.filter((a) => a.status === 'in_progress').length;

  return (
    <AppLayout title="Platform Assessments">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6" /> Assessments
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              All assessments across every organization — linked to real data.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchAssessments} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',       value: assessments.length, cls: 'text-foreground' },
            { label: 'Completed',   value: completedCount,     cls: 'text-success' },
            { label: 'In Progress', value: inProgressCount,    cls: 'text-amber-500' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by organization or assessment title…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Assessment Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Score</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading assessments…</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                    {assessments.length === 0
                      ? 'No assessments found in the database.'
                      : 'No assessments match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => {
                  const cfg = statusConfig(a.status);
                  const StatusIcon = cfg.icon;
                  const orgId = a.organizations?.id ?? a.organization_id;
                  const scoreNum = a.overall_score != null ? Math.round(Number(a.overall_score)) : null;

                  return (
                    <TableRow key={a.id} className="hover:bg-accent/30 transition-colors">
                      {/* Organization */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">
                              {a.organizations?.name ?? '(Unknown Org)'}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {a.organizations?.industry?.replace(/_/g, ' ') ?? '—'}
                              {a.organizations?.region ? ` · ${a.organizations.region.replace(/_/g, ' ')}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Assessment Title */}
                      <TableCell>
                        <p className="font-medium text-sm text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Started {new Date(a.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit capitalize">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>

                      {/* Score */}
                      <TableCell>
                        {scoreNum != null ? (
                          <span className="font-bold text-primary">{scoreNum}/100</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Certification */}
                      <TableCell>
                        {a.certification_level && a.certification_level !== 'none' ? (
                          <Badge
                            variant={a.certification_level === 'gold' || a.certification_level === 'diamond' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {a.certification_level}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Completion date */}
                      <TableCell className="text-sm">
                        {a.completed_at
                          ? new Date(a.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => navigate(`/organization/${orgId}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Org
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer count */}
        {!loading && assessments.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} of {assessments.length} assessments
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default AssessmentsAdmin;
