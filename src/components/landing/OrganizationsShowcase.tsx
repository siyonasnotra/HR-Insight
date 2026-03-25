import { Building2 } from "lucide-react";

const OrganizationsShowcase = () => {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Trusted by Top HR Organizations
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Join hundreds of forward-thinking companies measuring their HR maturity globally.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 cursor-default">
          {["Acme Corp", "GlobalTech HR", "Innovate Inc", "Nexus Solutions", "Pinnacle People"].map((name) => (
            <div key={name} className="flex items-center gap-2 text-xl font-bold text-gray-400 dark:text-gray-600 grayscale hover:grayscale-0 transition-all duration-300">
              <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm">
                🏢
              </span>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OrganizationsShowcase;
