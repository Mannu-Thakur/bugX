import React from 'react';
import { Award, Clock, Calendar, CheckCircle } from 'lucide-react';
import type { BestSubmissionResponse } from '../../../shared/lib/api';
import { safeParseDate } from '../../../shared/lib/date';
import { Badge } from '../../../shared/ui/badge/Badge';

interface BestSubmissionDetailsProps {
  bestSubmission?: BestSubmissionResponse | null;
}

export const BestSubmissionDetails: React.FC<BestSubmissionDetailsProps> = ({
  bestSubmission,
}) => {
  if (!bestSubmission) return null;

  const formattedDate = safeParseDate(bestSubmission.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-dark-bg/40 border border-dark-border/60 rounded-xl p-4 shadow-sm space-y-3.5 select-none animate-fade-in">
      <div className="flex items-center gap-2 border-b border-dark-border pb-2.5">
        <Award className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-extrabold uppercase text-gray-300 tracking-wider">Your Best Submission</h3>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 font-semibold block uppercase">Status</span>
          <Badge variant={bestSubmission.status === 'ACCEPTED' ? 'success' : 'warning'}>
            {bestSubmission.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 font-semibold block uppercase">Score Awarded</span>
          <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
            {bestSubmission.score} pts
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 font-semibold block uppercase">Runtime</span>
          <span className="text-xs font-mono text-gray-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            {bestSubmission.runtime_ms !== null ? `${bestSubmission.runtime_ms} ms` : '--'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-500 font-semibold block uppercase">Passed Cases</span>
          <span className="text-xs font-mono text-gray-300 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-gray-500" />
            {bestSubmission.passed_count} / {bestSubmission.total_count}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-2 border-t border-dark-border/40">
        <Calendar className="w-3 h-3" />
        <span>Submitted {formattedDate}</span>
      </div>
    </div>
  );
};
