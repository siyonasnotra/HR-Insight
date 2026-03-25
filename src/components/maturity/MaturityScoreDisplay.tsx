import { HRMaturityScore } from '@/types';
import { TrendingUp, Target } from 'lucide-react';

interface MaturityScoreDisplayProps {
  maturityScore: HRMaturityScore;
  showDetails?: boolean;
}

export const MaturityScoreDisplay = ({ maturityScore, showDetails = true }: MaturityScoreDisplayProps) => {
  const getLevelColor = (level: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      diamond: { bg: 'from-purple-100 to-pink-100', text: 'text-purple-900', border: 'border-purple-300' },
      gold: { bg: 'from-yellow-100 to-amber-100', text: 'text-yellow-900', border: 'border-yellow-300' },
      silver: { bg: 'from-slate-100 to-gray-100', text: 'text-slate-900', border: 'border-slate-300' },
      none: { bg: 'from-red-100 to-orange-100', text: 'text-red-900', border: 'border-red-300' }
    };
    return colors[level] || colors.none;
  };

  const levelInfo = {
    diamond: { label: 'Diamond - Elite Excellence', min: 85, max: 100 },
    gold: { label: 'Gold - Excellent Performance', min: 65, max: 84 },
    silver: { label: 'Silver - Good Performance', min: 45, max: 64 },
    none: { label: 'Not Certified - Needs Improvement', min: 0, max: 44 }
  };

  const colors = getLevelColor(maturityScore.certificationLevel);
  const info = levelInfo[maturityScore.certificationLevel as keyof typeof levelInfo];

  // Create circular progress
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (maturityScore.overallScore / 100) * circumference;

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-xl p-8`}>
      {/* Main Score Display */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-300 dark:text-gray-600"
            />
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={colors.text}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${colors.text}`}>
              {maturityScore.overallScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">out of 100</div>
          </div>
        </div>

        <h2 className={`text-xl font-bold ${colors.text} text-center`}>
          {info.label}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
          Score Range: {info.min} - {info.max}
        </p>
      </div>

      {showDetails && (
        <>
          {/* Category Breakdown */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" />
              <h3 className="font-semibold">Domain Breakdown</h3>
            </div>

            <div className="space-y-3">
              {Object.entries(maturityScore.categoryScores).map(([_, category]) => (
                <div key={_}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{category.categoryName}</span>
                    <span className="text-sm font-bold">{category.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600`}
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">Strengths</h4>
              </div>
              <ul className="text-xs space-y-1">
                {maturityScore.strengths.map((strength, idx) => (
                  <li key={idx} className="text-green-700 dark:text-green-300">• {strength}</li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-600" />
                <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100">Improvements</h4>
              </div>
              <ul className="text-xs space-y-1">
                {maturityScore.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-orange-700 dark:text-orange-300">• {improvement}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
