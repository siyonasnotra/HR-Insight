import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { organizationService } from "@/services/organizationService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { IndustryVertical } from "@/types";

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

const NewOrganization = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    company_size: "",
    region: "",
    website: "",
  });

  // Only super_admin can create organizations manually
  if (userRole && userRole !== "super_admin") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.industry || !formData.company_size || !formData.region) {
      toast.error("Please fill all required fields.");
      return;
    }

    setSaving(true);
    try {
      const org = await organizationService.createOrganization({
        ...formData,
        industry: formData.industry as IndustryVertical,
      });
      toast.success(`Organization "${org.name}" created successfully!`);
      navigate(`/organization/${org.id}`);
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("Failed to create organization. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="New Organization">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Create New Organization
        </h2>
        <p className="text-muted-foreground mt-1">
          Add a new organization to the platform for assessment and certification.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Fill in the details below to register the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select value={formData.industry} onValueChange={(v) => handleChange("industry", v)}>
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
                <Label>Company Size *</Label>
                <Select value={formData.company_size} onValueChange={(v) => handleChange("company_size", v)}>
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

            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={formData.region} onValueChange={(v) => handleChange("region", v)}>
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

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/organizations")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default NewOrganization;
