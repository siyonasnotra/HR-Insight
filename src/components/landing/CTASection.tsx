import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-hero opacity-95" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 h-40 w-40 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 h-40 w-40 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to Transform Your HR Practices?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Join leading organizations across India who have elevated their HR practices 
            and achieved recognized certification through our platform.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button 
              size="xl" 
              className="bg-card text-foreground hover:bg-card/90 shadow-lg"
              asChild
            >
              <Link to="/register">
                Start Free Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link to="/contact">
                Talk to Sales
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
