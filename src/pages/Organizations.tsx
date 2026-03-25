import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Building2, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { organizationService } from '@/services/organizationService';
import { Organization } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OrgWithLatest extends Organization {
  _latestScore: number | null;
  _latestStatus: string | null;
  _latestCertLevel: string | null;
  _assessmentCount: number;
}

const certBadgeVariant = (level: string | null): 'default' | 'secondary' | 'outline' =>
  level === 'diamond' || level === 'gold' ? 'default' : level === 'silver' ? 'secondary' : 'outline';

/** Fetch the latest assessment summary for a single org — never throws */
const fetchLatestForOrg = async (orgId: string) => {
  try {
    const { data } = await supabase
      .from('assessments')
      .select('status, overall_score, certification_level')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5); // grab up to 5 to count totals

    if (!data || data.length === 0) return { _latestScore: null, _latestStatus: null, _latestCertLevel: null, _assessmentCount: 0 };

    // Prefer a completed assessment's data over the latest in-progress
    const completed = data.find((a) => a.status === 'completed');
    const latest    = completed ?? data[0];

    return {
      _latestScore:     latest.overall_score != null ? Math.round(Number(latest.overall_score)) : null,
      _latestStatus:    latest.status ?? null,
      _latestCertLevel: latest.certification_level ?? null,
      _assessmentCount: data.length,
    };
  } catch {
    return { _latestScore: null, _latestStatus: null, _latestCertLevel: null, _assessmentCount: 0 };
  }
};

const Organizations = () => {
  const navigate = useNavigate();
  const { userRole, organization } = useAuth();
  const [organizations, setOrganizations] = useState<OrgWithLatest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterIndustry, setFilterIndustry] = useState<string>('');

  useEffect(() => {
    if (userRole && userRole !== 'super_admin') {
      if (organization?.id) {
        navigate(`/organization/${organization.id}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    if (userRole === 'super_admin') {
      fetchOrganizations();
    }
  }, [userRole, organization?.id, navigate]);

  const fetchOrganizations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await organizationService.getOrganizations();

      if (!data || data.length === 0) {
        setOrganizations([]);
        return;
      }

      // Enrich each org with its latest assessment data (SELECT only — no writes)
      const enriched: OrgWithLatest[] = await Promise.all(
        data.map(async (org) => {
          const latest = await fetchLatestForOrg(org.id);
          return { ...org, ...latest } as OrgWithLatest;
        })
      );

      setOrganizations(enriched);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => fetchOrganizations(true);

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !filterIndustry || org.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  const industries = Array.from(new Set(organizations.map((o) => o.industry)));

  return (
    <AppLayout title="Organizations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6" /> Organizations
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Click any row to view the full detail, assessment summary, and download its report.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh assessment data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/organizations/new')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Organization
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or industry…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Table */}
        {!loading && filteredOrganizations.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Latest Status</TableHead>
                  <TableHead>Latest Score</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/organization/${org.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.company_size.replace(/_/g, '-')} employees
                          {org._assessmentCount > 0 && (
                            <span className="ml-2 text-primary/70">· {org._assessmentCount} assessment{org._assessmentCount > 1 ? 's' : ''}</span>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {org.industry.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {(org.region || '—').replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {org._latestStatus ? (
                        <Badge
                          variant={org._latestStatus === 'completed' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {org._latestStatus.replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No assessment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {org._latestScore != null ? (
                        <span className="font-bold text-primary">{org._latestScore}/100</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {org._latestCertLevel && org._latestCertLevel !== 'none' ? (
                        <Badge variant={certBadgeVariant(org._latestCertLevel)} className="capitalize">
                          {org._latestCertLevel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrganizations.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-1">
              {organizations.length === 0 ? 'No organizations yet' : 'No results found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {organizations.length === 0
                ? 'Create the first organization to get started.'
                : 'Try adjusting your search or filters.'}
            </p>
            {organizations.length === 0 && (
              <Button onClick={() => navigate('/organizations/new')}>
                <Plus className="w-4 h-4 mr-2" /> Create First Organization
              </Button>
            )}
          </div>
        )}

        {/* Count footer */}
        {!loading && organizations.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Showing {filteredOrganizations.length} of {organizations.length} organizations
            {refreshing && <span className="ml-2 italic">· Refreshing…</span>}
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default Organizations;
