// ─── ConfidenceIndicator Component ───────────────────────────────────────────

import { confidenceColor, confidenceLabel, formatConfidence } from '@/utils/formatUtils';

interface ConfidenceIndicatorProps {
  score: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBar?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  score,
  size = 'md',
  showLabel = true,
  showBar = false,
  className = '',
}: ConfidenceIndicatorProps) {
  const label  = confidenceLabel(score);
  const color  = confidenceColor(score);
  const pct    = Math.round(score * 100);

  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const dotColor =
    score >= 0.75 ? 'bg-green-500' :
    score >= 0.5  ? 'bg-amber-500' :
    score >= 0.25 ? 'bg-red-400'   : 'bg-gray-300';

  const barColor =
    score >= 0.75 ? 'bg-green-500' :
    score >= 0.5  ? 'bg-amber-500' :
    score >= 0.25 ? 'bg-red-400'   : 'bg-gray-300';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`rounded-full flex-shrink-0 ${dotSize} ${dotColor}`} />
      {showLabel && (
        <span className={`${textSize} font-medium ${color}`}>
          {label} ({pct}%)
        </span>
      )}
      {!showLabel && (
        <span className={`${textSize} ${color}`}>{pct}%</span>
      )}
      {showBar && (
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[40px]">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function ConfidenceBadge({ score, className = '' }: ConfidenceBadgeProps) {
  const label  = confidenceLabel(score);
  const bgColor =
    score >= 0.75 ? 'bg-green-100 text-green-700' :
    score >= 0.5  ? 'bg-amber-100 text-amber-700' :
    score >= 0.25 ? 'bg-red-100 text-red-700'     : 'bg-gray-100 text-gray-500';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${className}`}>
      {label}
    </span>
  );
}
