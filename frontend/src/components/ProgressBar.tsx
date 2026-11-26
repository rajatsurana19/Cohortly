import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface ProgressBarProps {
  percent: number;
  label?: string;
  sublabel?: string;
  status?: 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'OVERDUE';
  showBadge?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  label,
  sublabel,
  status,
  showBadge = true,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const barColor =
    status === 'ACKNOWLEDGED' || clamped === 100
      ? 'bg-emerald-500'
      : status === 'OVERDUE'
      ? 'bg-red-500'
      : status === 'SUBMITTED'
      ? 'bg-blue-500'
      : 'bg-amber-500';

  const getBadge = () => {
    if (!showBadge || !status) return null;

    switch (status) {
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-scale-pop">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledged</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Submitted</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Overdue</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {(label || sublabel || showBadge) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {label && <span className="font-semibold text-text-primary truncate">{label}</span>}
            {sublabel && <span className="text-[11px] text-text-secondary truncate">{sublabel}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {getBadge()}
            <span className="text-[11px] font-bold text-text-primary tabular-nums">{clamped}%</span>
          </div>
        </div>
      )}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/70">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
