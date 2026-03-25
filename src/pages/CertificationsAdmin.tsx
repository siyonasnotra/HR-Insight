import { useState, useEffect } from "react";
import { Award, Search, Filter, ShieldAlert, CheckCircle2, XCircle, Loader2, Building2, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Certification } from "@/types";
import { toast } from "sonner";

interface CertificationWithOrg {
  id: string;
  organization_id: string;
  assessment_id: string;
  level: string;
  issued_at: string;
  expires_at: string | null;
  verification_code: string;
  is_active: boolean;
  organizations: {
    name: string;
  };
}

const CertificationsAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [certifications, setCertifications] = useState<CertificationWithOrg[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("certifications")
        .select(`
          *,
          organizations (name)
        `)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      setCertifications(data as Certification[]);
    } catch (err) {
      console.error("Error fetching certifications:", err);
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const handleToggleStatus = async (certId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("certifications")
        .update({ is_active: !currentStatus })
        .eq("id", certId);

      if (error) throw error;
      toast.success(`Certification ${currentStatus ? 'revoked' : 'activated'} successfully`);
      fetchCertifications();
    } catch (err) {
      toast.error("Failed to update certification status");
    }
  };

  const filteredCertifications = certifications.filter((c) =>
    c.organizations.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.verification_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'diamond': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AppLayout title="Platform Certifications">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by organization or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchCertifications} size="sm">
            Refresh Data
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading certifications...
                  </TableCell>
                </TableRow>
              ) : filteredCertifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No certifications found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertifications.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{c.organizations.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLevelColor(c.level)}>
                        {c.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {c.verification_code}
                      </code>
                    </TableCell>
                    <TableCell>{new Date(c.issued_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {c.is_active ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Revoked</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={c.is_active ? "Revoke" : "Activate"}
                          onClick={() => handleToggleStatus(c.id, c.is_active)}
                        >
                          {c.is_active ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/verify/${c.verification_code}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default CertificationsAdmin;
