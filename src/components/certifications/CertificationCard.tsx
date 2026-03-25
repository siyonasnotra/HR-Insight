import { Certification } from '@/types';
import { Award, Check, AlertCircle, Copy } from 'lucide-react';
import { useState } from 'react';

interface CertificationCardProps {
  certification: Certification & {
    organizations?: { name: string };
    assessments?: { overall_score: number };
  };
}

export const CertificationCard = ({ certification }: CertificationCardProps) => {
  const [copied, setCopied] = useState(false);

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      diamond: 'from-purple-500 to-pink-500',
      gold: 'from-yellow-400 to-yellow-600',
      silver: 'from-gray-300 to-gray-400',
      none: 'from-gray-200 to-gray-300'
    };
    return colors[level] || 'from-gray-300 to-gray-400';
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      diamond: 'Diamond - Elite Excellence',
      gold: 'Gold - Excellent',
      silver: 'Silver - Good',
      none: 'Not Certified'
    };
    return labels[level] || level;
  };

  const isExpired = certification.expires_at && new Date(certification.expires_at) < new Date();
  const isExpiringSoon = !isExpired && certification.expires_at && 
    new Date(certification.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certification.verification_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg shadow-lg bg-gradient-to-br ${getLevelColor(certification.level)} text-white p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8" />
          <div>
            <h3 className="font-bold text-lg">{getLevelLabel(certification.level)}</h3>
            <p className="text-sm opacity-90">{certification.organizations?.name}</p>
          </div>
        </div>
        {isExpired && (
          <div className="flex items-center gap-1 bg-red-500 px-3 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            Expired
          </div>
        )}
        {isExpiringSoon && !isExpired && (
          <div className="flex items-center gap-1 bg-yellow-500 px-3 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            Expiring Soon
          </div>
        )}
        {!isExpired && !isExpiringSoon && (
          <div className="flex items-center gap-1 bg-green-500 px-3 py-1 rounded-full text-xs font-semibold">
            <Check className="w-4 h-4" />
            Active
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm opacity-90 mb-4">
        <div className="flex justify-between">
          <span>Assessment Score:</span>
          <span className="font-semibold">{certification.assessments?.overall_score?.toFixed(1) || 'N/A'}%</span>
        </div>
        <div className="flex justify-between">
          <span>Issued:</span>
          <span>{new Date(certification.issued_at).toLocaleDateString()}</span>
        </div>
        {certification.expires_at && (
          <div className="flex justify-between">
            <span>Expires:</span>
            <span>{new Date(certification.expires_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Verification Code */}
      <div className="pt-4 border-t border-white border-opacity-20">
        <div className="flex items-center justify-between bg-white bg-opacity-20 rounded p-2">
          <code className="text-xs font-mono">{certification.verification_code}</code>
          <button
            onClick={handleCopyCode}
            className="p-1 hover:bg-white hover:bg-opacity-30 rounded transition-colors"
            title="Copy verification code"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs opacity-75 mt-2">Verification Code</p>
        {copied && <p className="text-xs text-green-200 mt-1">✓ Copied!</p>}
      </div>
    </div>
  );
};
