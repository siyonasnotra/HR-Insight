import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Search, Building2, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CertificationLevel } from "@/types";

interface VerificationResult {
  is_active: boolean;
  level: CertificationLevel;
  issued_at: string;
  organizations?: {
    name: string;
  };
}

const VerifyCertificate = () => {
  const { code } = useParams<{ code?: string }>();
  const [searchInput, setSearchInput] = useState(code || "");
  const [loading, setLoading] = useState(!!code);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (code) {
      verifyCode(code);
    }
  }, [code]);

  const verifyCode = async (verificationCode: string) => {
    if (!verificationCode) return;
    
    setLoading(true);
    setSearched(true);
    setError(false);
    
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verificationCode);
      
      let query = supabase
        .from("certifications")
        .select("is_active, level, issued_at, organizations(name)");
        
      if (isUUID) {
        // Query by id directly, as verification_code.eq... syntax can be tricky with UUIDs in the `.or` filter
        query = query.eq("id", verificationCode);
      } else {
        query = query.eq("verification_code", verificationCode);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        setResult(null);
        setError(true);
      } else {
        setResult(data as unknown as VerificationResult);
      }
    } catch (err) {
      console.error(err);
      setResult(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(searchInput);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "diamond": return "text-blue-500 bg-blue-500/10";
      case "gold": return "text-yellow-500 bg-yellow-500/10";
      case "silver": return "text-gray-400 bg-gray-400/10";
      default: return "text-foreground bg-muted";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-xl z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Verify Certificate</h1>
          <p className="mt-2 text-muted-foreground">
            Enter a certificate code to verify its authenticity
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input 
                placeholder="Enter verification code (e.g. CERT-12345)" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !searchInput}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </form>
          </CardHeader>

          {searched && !loading && (
            <CardContent className="pt-6 border-t">
              {error || !result ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <XCircle className="h-16 w-16 text-destructive mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">Certificate Not Found</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    We couldn't find a valid certificate matching this code. Please check the code and try again.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    {result.is_active ? (
                      <CheckCircle2 className="h-16 w-16 text-success" />
                    ) : (
                      <XCircle className="h-16 w-16 text-destructive" />
                    )}
                    <h3 className="text-2xl font-bold">
                      {result.is_active ? "Valid Certificate" : "Inactive Certificate"}
                    </h3>
                  </div>

                  <div className="rounded-lg border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Organization</p>
                        <p className="text-lg font-semibold">{result.organizations?.name || "Unknown Organization"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getLevelColor(result.level)}`}>
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Certification Level</p>
                        <p className="text-lg font-semibold capitalize">{result.level}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
                        <p className="text-lg font-semibold">
                          {new Date(result.issued_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
