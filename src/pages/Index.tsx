import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CertificationLevels from "@/components/landing/CertificationLevels";
import OrganizationsShowcase from "@/components/landing/OrganizationsShowcase";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <CertificationLevels />
        <OrganizationsShowcase />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
