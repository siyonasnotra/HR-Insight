import { useState, useEffect } from "react";
import { Save, Building2, User, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { organizationService } from "@/services/organizationService";
import { IndustryVertical, CompanySize, Region } from "@/types";
import { toast } from "sonner";

const industries = [
  { value: "it_software", label: "IT/Software" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "healthcare", label: "Healthcare" },
  { value: "banking_finance", label: "Banking/Finance" },
  { value: "retail", label: "Retail" },
  { value: "education", label: "Education" },
  { value: "hospitality", label: "Hospitality" },
  { value: "automotive", label: "Automotive" },
  { value: "pharma", label: "Pharma" },
  { value: "telecom", label: "Telecom" },
  { value: "other", label: "Other" },
];

const companySizes = [
  { value: "1_50", label: "1–50 employees" },
  { value: "51_200", label: "51–200 employees" },
  { value: "201_500", label: "201–500 employees" },
  { value: "501_1000", label: "501–1000 employees" },
  { value: "1001_5000", label: "1001–5000 employees" },
  { value: "5000_plus", label: "5000+ employees" },
];

const regions = [
  { value: "north", label: "North India" },
  { value: "south", label: "South India" },
  { value: "east", label: "East India" },
  { value: "west", label: "West India" },
  { value: "central", label: "Central India" },
  { value: "pan_india", label: "Pan India" },
];

const Settings = () => {
  const { profile, organization, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || "",
    job_title: profile?.job_title || "",
  });

  const [orgData, setOrgData] = useState({
    name: organization?.name || "",
    website: "",
    industry: organization?.industry || "",
    company_size: organization?.company_size || "",
    region: organization?.region || "",
  });


  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        job_title: profile.job_title || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || "",
        // @ts-ignore
        website: organization.website || "",
        industry: organization.industry || "",
        company_size: organization.company_size || "",
        region: organization.region || "",
      });
    }
  }, [organization]);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileData.full_name,
        job_title: profileData.job_title,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      refreshProfile(); // Refresh the global context
    }
    setSaving(false);
  };

  const handleSaveOrganization = async () => {
    if (!organization?.id) return;

    setSaving(true);
    try {
      await organizationService.updateOrganization(organization.id, {
        name: orgData.name,
        // @ts-ignore
        website: orgData.website,
        industry: orgData.industry as IndustryVertical,
        company_size: orgData.company_size as CompanySize,
        region: orgData.region as Region,
      });
      toast.success("Organization updated successfully");
      refreshProfile(); // re-fetch organization
    } catch (e) {
      toast.error("Failed to update organization");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">
          Manage your profile, organization, and notification preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profileData.job_title}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, job_title: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Manage your organization details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgData.name}
                    onChange={(e) => setOrgData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select 
                    value={orgData.industry} 
                    onValueChange={(v) => setOrgData(prev => ({ ...prev, industry: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select 
                    value={orgData.region} 
                    onValueChange={(v) => setOrgData(prev => ({ ...prev, region: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select 
                    value={orgData.company_size} 
                    onValueChange={(v) => setOrgData(prev => ({ ...prev, company_size: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveOrganization} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Assessment Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders for incomplete assessments
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Certification Expiry</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified before your certification expires
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Action Plan Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications for action plan deadlines
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Team Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when team members join
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="flex gap-2">
                  <Input type="password" placeholder="New password" />
                  <Button variant="outline">Update</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">2FA Status</p>
                    <p className="text-sm text-muted-foreground">Not enabled</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
