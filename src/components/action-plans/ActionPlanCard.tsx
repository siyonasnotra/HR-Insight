import { ActionPlan } from '@/types';
import { CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ActionPlanCardProps {
  actionPlan: ActionPlan;
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const ActionPlanCard = ({ actionPlan, onStatusChange, onDelete }: ActionPlanCardProps) => {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'border-red-500 bg-red-50 dark:bg-red-950';
    if (priority >= 3) return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
    return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
  };

  const isPastDue = actionPlan.due_date && new Date(actionPlan.due_date) < new Date() && actionPlan.status !== 'completed';

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      setLoading(true);
      try {
        await onStatusChange(actionPlan.id, newStatus);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Are you sure you want to delete this action plan?')) {
      setLoading(true);
      try {
        await onDelete(actionPlan.id);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`border-l-4 ${getPriorityColor(actionPlan.priority)} p-4 rounded-lg shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{actionPlan.title}</h3>
          {actionPlan.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{actionPlan.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete action plan"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Status & Priority */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(actionPlan.status)}`}>
          {getStatusIcon(actionPlan.status)}
          {actionPlan.status.replace(/_/g, ' ').toUpperCase()}
        </span>
        
        {isPastDue && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="w-3 h-3" />
            OVERDUE
          </span>
        )}
      </div>

      {/* Due Date and Actions */}
      {actionPlan.due_date && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Due: {new Date(actionPlan.due_date).toLocaleDateString()}
          </span>
          
          {actionPlan.status !== 'completed' && (
            <div className="flex gap-1">
              {actionPlan.status !== 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Start
                </button>
              )}
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={loading}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                Complete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
