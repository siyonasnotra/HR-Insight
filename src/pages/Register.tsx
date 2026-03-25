import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, BarChart3, Mail, Lock, Building2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { organizationService } from "@/services/organizationService";
import { supabase } from "@/integrations/supabase/client";

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
  { value: "1_50", label: "1-50 employees" },
  { value: "51_200", label: "51-200 employees" },
  { value: "201_500", label: "201-500 employees" },
  { value: "501_1000", label: "501-1000 employees" },
  { value: "1001_5000", label: "1001-5000 employees" },
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

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [invitation, setInvitation] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "hr_admin" as "hr_admin",
    organizationName: "",
    industry: "",
    companySize: "",
    region: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (inviteToken) {
      const loadInvitation = async () => {
        try {
          const inv = await organizationService.getInvitationByToken(inviteToken);
          setInvitation(inv);
          setFormData((prev) => ({ ...prev, email: inv.email }));
        } catch (error) {
          toast.error("Invalid or expired invitation");
          navigate("/register");
        }
      };
      loadInvitation();
    }
  }, [inviteToken, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Invited user — complete immediately
    if (invitation) {
      setIsLoading(true);
      try {
        await signUp(formData.email, formData.password, {
          full_name: formData.fullName,
          organization_id: invitation.organization_id,
          role: invitation.role,
        });

        // Get the newly created user to access their ID
        const { data: { user: newUser } } = await supabase.auth.getUser();
        
        if (newUser) {
          // Create or update the profile with full_name and organization_id
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: newUser.id,
              email: formData.email,
              full_name: formData.fullName,
              organization_id: invitation.organization_id,
            }, {
              onConflict: 'user_id'
            });

          if (profileError) {
            console.warn("Could not create/update profile:", profileError);
          }
        }

        try {
          const { data, error: inviteError } = await supabase.rpc("accept_team_invitation" as any, {
            invite_token: inviteToken,
          });

          if (inviteError) {
            console.error("Invite acceptance failed:", inviteError.message);
          } else {
            console.log("Invite accepted:", data);
          }
        } catch (e) {
          console.warn("Could not mark invitation as accepted immediately", e);
        }
        toast.success("Account created successfully and joined organization!");
        navigate("/dashboard");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // HR Admin — proceed to org info step
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        organization_name: formData.organizationName,
        industry: formData.industry,
        company_size: formData.companySize,
        region: formData.region,
        role: "hr_admin",
      });

      // Get the newly created user to create their profile
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (newUser) {
        // Create the profile with full_name
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: newUser.id,
            email: formData.email,
            full_name: formData.fullName,
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.warn("Could not create/update profile:", profileError);
        }
      }

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSteps = invitation ? 1 : 2;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center">
          <Link to="/" className="mb-4 inline-flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">HR-Insight</span>
          </Link>
          <CardTitle className="text-2xl">
            {invitation ? "Accept Invitation" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {invitation
              ? `Join ${invitation.organizations?.name || "your organization"}`
              : totalSteps === 1
              ? "Your account details"
              : `Step ${step} of 2: ${step === 1 ? "Your details" : "Organization info"}`}
          </CardDescription>
          {!invitation && totalSteps > 1 && (
            <div className="mt-4 flex gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Role selector removed: Super Admin accounts are created through admin provisioning only */}
              {!invitation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    🏢 Registering as <strong>HR Admin</strong> — you'll be able to create your organization and invite your team.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10"
                    required
                    disabled={!!invitation}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processing..." : invitation ? "Accept & Join" : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Acme Corporation"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange("organizationName", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(v) => handleInputChange("industry", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={formData.companySize} onValueChange={(v) => handleInputChange("companySize", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select value={formData.region} onValueChange={(v) => handleInputChange("region", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
