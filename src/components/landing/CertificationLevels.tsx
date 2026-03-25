import { Award, Medal, Crown, Diamond } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const certifications = [
  {
    level: "Silver",
    icon: Medal,
    score: "45-64",
    color: "bg-cert-silver",
    textColor: "text-cert-silver",
    borderColor: "border-cert-silver/30",
    description: "Basic HR practices established",
    features: ["Core HR processes defined", "Compliance fundamentals in place", "Foundation for growth"],
  },
  {
    level: "Gold",
    icon: Award,
    score: "65-84",
    color: "bg-cert-gold",
    textColor: "text-cert-gold",
    borderColor: "border-cert-gold/30",
    description: "Strong HR foundation",
    features: ["Advanced recruitment strategies", "Performance management systems", "Employee development programs"],
  },
  {
    level: "Diamond",
    icon: Diamond,
    score: "85-100",
    color: "bg-cert-diamond",
    textColor: "text-cert-diamond",
    borderColor: "border-cert-diamond/30",
    description: "Industry-leading excellence",
    features: ["Innovation in HR practices", "Industry thought leadership", "Best-in-class employee experience"],
  },
];

const CertificationLevels = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Certification Levels
          </h2>
          <p className="text-lg text-muted-foreground">
            Achieve recognition for your HR excellence with our tiered certification system.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {certifications.map((cert, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden border-2 ${cert.borderColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${cert.color}`} />
              <CardHeader className="pb-2 pt-6">
                <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full ${cert.color}/20`}>
                  <cert.icon className={`h-6 w-6 ${cert.textColor}`} />
                </div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {cert.level}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {cert.score}
                  </span>
                </CardTitle>
                <CardDescription className="font-medium">{cert.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {cert.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${cert.color}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CertificationLevels;
