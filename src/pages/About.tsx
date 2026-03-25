import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Award, ShieldCheck, Users } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Badge className="mb-4" variant="secondary">
            About SIPMAA
          </Badge>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            More than an HR platform, we are a movement.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We are building India's first digital HR ecosystem that seamlessly connects HR knowledge providers with learners, while creating pathways for skill development, employability, and livelihood enhancement.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-foreground">Vision</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            To be a global leader in HR certification and recognition of HR best practices.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-foreground">Mission</h2>
          <ul className="mt-2 list-inside list-disc text-lg text-muted-foreground">
            <li>Build a robust HR assessment and certification platform</li>
            <li>Create a live digital HR ecosystem for HR knowledge sharing</li>
            <li>Provide skill development and livelihood programs through CSR initiatives</li>
          </ul>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Data-driven assessment</CardTitle>
                <CardDescription>Structured questions with consistent scoring.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Assess across categories, validate inputs, and compute scores consistently across the app.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cert-gold/20">
                  <Award className="h-5 w-5 text-cert-gold" />
                </div>
                <CardTitle className="text-base">Certification outcomes</CardTitle>
                <CardDescription>Silver → Diamond based on your results.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Certification level is derived from your score and presented with downloadable evidence.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
                <CardTitle className="text-base">Organization-first</CardTitle>
                <CardDescription>Built around teams and org context.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Your data is scoped to your organization and accessible through role-aware flows.
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-base">Designed for real HR work</CardTitle>
                <CardDescription>Simple UI, measurable progress.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Focus on what matters: completion, consistency, and actionable insights from the scores.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;

