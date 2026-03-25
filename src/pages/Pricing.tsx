import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For small teams exploring HR benchmarking.",
    features: ["Practice assessment", "Certification level", "Basic history"],
    cta: { label: "Get started", to: "/register" },
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹9,999/mo",
    description: "For growing organizations running regular assessments.",
    features: ["Assessments + scoring", "Team access", "Benchmark views"],
    cta: { label: "Start trial", to: "/register" },
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large orgs with tailored workflows and governance.",
    features: ["Custom question library", "Advanced reporting", "Dedicated support"],
    cta: { label: "Talk to sales", to: "/contact" },
    highlight: false,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge className="mb-4" variant="secondary">
              Pricing
            </Badge>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Choose a plan that fits</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Start free, then upgrade as your assessment cadence and team grows.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? "border-2 border-primary shadow-md" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.highlight && <Badge>Popular</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-foreground">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">Billed monthly where applicable</div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"} asChild>
                    <Link to={plan.cta.to}>{plan.cta.label}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;

