import { 
  ClipboardCheck, 
  LineChart, 
  Award, 
  Target, 
  TrendingUp, 
  Users,
  BookOpen,
  Shield,
  Briefcase,
  Heart
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const assessmentCategories = [
  { icon: Briefcase, title: "Talent Acquisition", description: "Hiring & onboarding practices" },
  { icon: Target, title: "Performance Management", description: "Goal setting & reviews" },
  { icon: BookOpen, title: "Learning & Development", description: "Training programs" },
  { icon: Heart, title: "Employee Engagement", description: "Culture & wellbeing" },
  { icon: Shield, title: "CSR & Social Impact", description: "Corporate social responsibility" },
  { icon: Users, title: "Organizational Culture", description: "Workplace climate & values" },
];

const Features = () => {
  return (
    <section className="bg-secondary/30 py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Comprehensive HR Assessment
          </h2>
          <p className="text-lg text-muted-foreground">
            Evaluate your organization across 6 core HR practice areas with our 
            scientifically designed assessment framework.
          </p>
        </div>

        {/* Assessment categories grid */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assessmentCategories.map((category, index) => (
            <Card key={index} className="group border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <category.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{category.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm lg:p-12">
          <h3 className="mb-8 text-center text-2xl font-bold text-foreground">How It Works</h3>
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground font-bold text-lg">
                1
              </div>
              <h4 className="mb-2 font-semibold text-foreground">Register</h4>
              <p className="text-sm text-muted-foreground">Create your organization profile</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground font-bold text-lg">
                2
              </div>
              <h4 className="mb-2 font-semibold text-foreground">Assess</h4>
              <p className="text-sm text-muted-foreground">Complete the HR questionnaire</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground font-bold text-lg">
                3
              </div>
              <h4 className="mb-2 font-semibold text-foreground">Benchmark</h4>
              <p className="text-sm text-muted-foreground">Compare with industry peers</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground font-bold text-lg">
                4
              </div>
              <h4 className="mb-2 font-semibold text-foreground">Certify</h4>
              <p className="text-sm text-muted-foreground">Earn your certification level</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
