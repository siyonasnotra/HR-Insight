import { useState, useEffect } from "react";
import { Users, Search, Filter, MoreVertical, Shield, UserMinus, UserCheck, Building2, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types";

interface UserWithDetails {
  id: string;
  full_name: string | null;
  email: string;
  organization_id: string | null;
  created_at: string;
  organizations?: {
    name: string;
  } | null;
  user_roles?: {
    role: string;
  }[] | {
    role: string;
  } | null;
}

const UsersAdmin = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_super_admin_users");
      console.log("Super admin users RPC data:", data);

      if (error) throw error;

      const mappedUsers = (data || []).map((user: any) => ({
        id: user.user_id,
        full_name: user.full_name || "",
        email: user.email || "",
        organization_id: user.organization_id || null,
        created_at: user.created_at,
        organizations: user.organization_name
          ? { name: user.organization_name }
          : null,
        user_roles: user.role
          ? { role: user.role }
          : null,
      }));

      setUsers(mappedUsers as UserWithDetails[]);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRole = (user: UserWithDetails): string | undefined => {
    if (!user.user_roles) return undefined;
    if (Array.isArray(user.user_roles)) return user.user_roles[0]?.role;
    return (user.user_roles as { role: string }).role;
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const filteredUsers = users.filter((user) => {
    const role = getRole(user);
    const matchesSearch =
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesRole = filterRole === "all" || role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <AppLayout title="User Management">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-background border border-input h-10 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="hr_admin">HR Admin</option>
              <option value="hr_manager">HR Manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{user.organizations?.name || "No Organization"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const role = getRole(user);
                        return (
                          <Badge variant={role === "super_admin" ? "default" : "secondary"}>
                            {role || "No Role"}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user.id, "super_admin")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Make Super Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user.id, "hr_admin")}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Make HR Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user.id, "hr_manager")}>
                            <Users className="mr-2 h-4 w-4" />
                            Make HR Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user.id, "viewer")}>
                            <Search className="mr-2 h-4 w-4" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <UserMinus className="mr-2 h-4 w-4" />
                            Deactivate User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default UsersAdmin;
