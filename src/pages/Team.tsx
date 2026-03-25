import { useState, useEffect } from "react";
import { Plus, Mail, MoreHorizontal, Shield, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { organizationService } from "@/services/organizationService";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  role?: string;
}

const getRoleBadge = (role: string) => {
  const colors: Record<string, string> = {
    super_admin: "bg-destructive text-destructive-foreground",
    hr_admin: "bg-primary text-primary-foreground",
    hr_manager: "bg-accent text-accent-foreground",
    viewer: "bg-secondary text-secondary-foreground",
  };
  return (
    <Badge className={colors[role] || colors.viewer}>
      {role.replace("_", " ").toUpperCase()}
    </Badge>
  );
};

const Team = () => {
  const { organization, user, userRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [generatedLink, setGeneratedLink] = useState("");

  useEffect(() => {
    if (organization?.id) {
      fetchTeamMembers();
    }
  }, [organization?.id]);

  const fetchTeamMembers = async () => {
    if (!organization?.id) return;
    
    // 1. Fetch profiles for this organization
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true });

    if (profileError) {
      console.error("Error fetching team members:", profileError);
      setLoading(false);
      return;
    }

    if (!profiles || profiles.length === 0) {
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    // 2. Fetch roles for these users
    const userIds = profiles.map(p => p.user_id);
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // 3. Merge profiles and roles
    const mergedMembers: TeamMember[] = profiles.map(profile => {
      const userRole = rolesData?.find(r => r.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole ? userRole.role : "viewer"
      };
    });

    setTeamMembers(mergedMembers);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !organization?.id || !user?.id) {
      toast.error("Please enter an email address");
      return;
    }

    // Generate a secure token
    const token = crypto.randomUUID();

    const { data, error } = await supabase.from("team_invitations").insert({
      organization_id: organization.id,
      email: inviteEmail,
      role: inviteRole as "hr_admin" | "hr_manager" | "viewer",
      invited_by: user.id,
      token: token
    }).select().single();

    if (error) {
      toast.error("Error sending invitation");
      console.error(error);
    } else {
      toast.success("Invitation generated!");
      
      const inviteCode = data?.token || token;
      const inviteLink = `${window.location.origin}/register?invite=${inviteCode}`;
      setGeneratedLink(inviteLink);
      
      const subject = encodeURIComponent("You have been invited to join HR-Insight");
      const body = encodeURIComponent(`Hello,\n\nYou have been invited to join an organization on HR-Insight as a ${inviteRole.replace("_", " ").toUpperCase()}.\n\nClick the link below to accept the invitation and set up your account:\n${inviteLink}\n\nBest regards,\nThe HR-Insight Team`);
      
      // Attempt to send the email via user's default email client
      // It might be blocked if there's no email client configured, which is why we show the link on-screen.
      window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await organizationService.removeTeamMember(targetUserId);
      toast.success("Member removed successfully");
      fetchTeamMembers();
    } catch (e) {
      console.error("Error removing member:", e);
      toast.error("Failed to remove member");
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as AppRole })
        .eq("user_id", targetUserId);

      if (error) throw error;
      toast.success("Role updated successfully");
      fetchTeamMembers();
    } catch (e) {
      console.error("Error updating role:", e);
      toast.error("Failed to update role");
    }
  };

  // No fake fallback — show actual members only

  return (
    <AppLayout title="Team">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your organization's team and access permissions.
          </p>
        </div>
        
        {(userRole === "hr_admin" || userRole === "super_admin") && (
          <Dialog open={inviteOpen} onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) {
              setGeneratedLink("");
              setInviteEmail("");
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {generatedLink ? (
                  <div className="space-y-4">
                    <div className="rounded border bg-muted/50 p-4">
                      <p className="mb-2 text-sm text-muted-foreground">
                        If your email client didn't open automatically, you can copy the invitation link below and send it to your colleague directly.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input value={generatedLink} readOnly className="bg-background" />
                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedLink);
                            toast.success("Link copied to clipboard!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setGeneratedLink("");
                        setInviteEmail("");
                        setInviteOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hr_manager">HR Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleInvite} className="w-full">
                      Send Invitation
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team members list */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>{teamMembers.length} team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No team members yet. Invite colleagues using the button above.
                </p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {(member.full_name || member.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {member.full_name || member.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      {member.job_title && (
                        <p className="text-sm text-muted-foreground">{member.job_title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(member.role || "viewer")}
                    
                    {(userRole === "hr_admin" || userRole === "super_admin") && member.user_id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== "hr_admin" && (
                            <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "hr_admin")}>
                              Make HR Admin
                            </DropdownMenuItem>
                          )}
                          {member.role !== "hr_manager" && (
                            <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "hr_manager")}>
                              Make HR Manager
                            </DropdownMenuItem>
                          )}
                          {member.role !== "viewer" && (
                            <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "viewer")}>
                              Make Viewer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Team;
