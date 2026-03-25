import { Organization } from '@/types';
import { Building2, Globe, Briefcase, MapPin } from 'lucide-react';

interface OrganizationCardProps {
  organization: Organization;
  onClick?: () => void;
  isSelected?: boolean;
}

export const OrganizationCard = ({ organization, onClick, isSelected }: OrganizationCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
      }`}
    >
      {organization.logo_url && (
        <img src={organization.logo_url} alt={organization.name} className="w-16 h-16 rounded-lg object-cover mb-4" />
      )}
      
      <h3 className="font-semibold text-lg mb-2">{organization.name}</h3>
      
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          <span className="capitalize">{organization.industry.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>{organization.company_size.replace(/_/g, '-')} employees</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{organization.state || 'Pan India'}</span>
        </div>
      </div>

      {organization.website && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={organization.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            Visit Website
          </a>
        </div>
      )}
    </div>
  );
};
