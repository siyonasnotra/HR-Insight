import { useState } from "react";
import { Settings, Shield, Bell, Mail, Database, Save, Loader2, Info } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const SystemSettings = () => {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("System configuration updated successfully");
    }, 1000);
  };

  return (
    <AppLayout title="System Settings">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Platform Configuration</h2>
            <p className="text-muted-foreground">Manage global system parameters and security policies.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="thresholds" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Certification Score Thresholds
                </CardTitle>
                <CardDescription>Define the minimum score percentages required for each certification level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="silver">Silver Threshold (%)</Label>
                    <Input id="silver" type="number" defaultValue="60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gold">Gold Threshold (%)</Label>
                    <Input id="gold" type="number" defaultValue="75" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diamond">Diamond Threshold (%)</Label>
                    <Input id="diamond" type="number" defaultValue="90" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Templates
                </CardTitle>
                <CardDescription>Configure system transactional emails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="space-y-0.5">
                    <Label>New User Welcome</Label>
                    <p className="text-xs text-muted-foreground">Sent to users after successful registration.</p>
                  </div>
                  <Button variant="ghost" size="sm">Edit Template</Button>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="space-y-0.5">
                    <Label>Certification Awarded</Label>
                    <p className="text-xs text-muted-foreground">Sent when an organization achieves a new level.</p>
                  </div>
                  <Button variant="ghost" size="sm">Edit Template</Button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label>Assessment Reminder</Label>
                    <p className="text-xs text-muted-foreground">Periodic reminder for in-progress assessments.</p>
                  </div>
                  <Button variant="ghost" size="sm">Edit Template</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Platform Security
                </CardTitle>
                <CardDescription>Global security policies and access controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Multi-Tenant Isolation</Label>
                    <p className="text-sm text-muted-foreground">Enforce strict data boundaries between organizations.</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Organization Approval</Label>
                    <p className="text-sm text-muted-foreground">Require super admin approval for new accounts.</p>
                  </div>
                  <Switch checked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Access Restriction</Label>
                    <p className="text-sm text-muted-foreground">Limit access based on organization's registered IPs.</p>
                  </div>
                  <Switch checked={false} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Platform Branding
                </CardTitle>
                <CardDescription>Customize the look and feel of the platform globally.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input id="platform-name" defaultValue="HR-Insight" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="support-email">Support Email Address</Label>
                  <Input id="support-email" defaultValue="support@hrbenchmark.pro" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Put the platform in read-only mode for maintenance.</p>
                  </div>
                  <Switch checked={false} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

// Internal icons helper
const Award = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
    <circle cx="12" cy="8" r="6" />
  </svg>
);

export default SystemSettings;
