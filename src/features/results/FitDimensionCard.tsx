// ─── FitDimensionCard Component ───────────────────────────────────────────────

import { useState } from 'react';
import type { FitDimension } from '@/types/fit';
import { ConfidenceBadge } from './ConfidenceIndicator';
import { formatMm, formatRange, sourceInfo } from '@/utils/formatUtils';

interface FitDimensionCardProps {
  dimension: FitDimension;
  className?: string;
}

export function FitDimensionCard({ dimension, className = '' }: FitDimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { label: srcLabel, color: srcColor } = sourceInfo(dimension.source);

  const rangeWidth = dimension.rangeMm[1] - dimension.rangeMm[0];
  const valuePct = rangeWidth > 0
    ? ((dimension.valueMm - dimension.rangeMm[0]) / rangeWidth) * 100
    : 50;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
              {dimension.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatMm(dimension.valueMm)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Range: {formatRange(dimension.rangeMm[0], dimension.rangeMm[1])}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <ConfidenceBadge score={dimension.confidenceScore} />
            <span className={`text-xs px-1.5 py-0.5 rounded ${srcColor}`}>
              {srcLabel}
            </span>
          </div>
        </div>

        {/* Range bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full relative overflow-visible">
            {/* Range fill */}
            <div className="absolute inset-0 bg-brand-100 rounded-full" />
            {/* Value marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-600 rounded-full border-2 border-white shadow-sm"
              style={{ left: `clamp(4px, ${valuePct}%, calc(100% - 4px))`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{dimension.rangeMm[0]} mm</span>
            <span className="text-xs text-gray-400">{dimension.rangeMm[1]} mm</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {dimension.warnings.length > 0 && (
        <div className="px-4 pb-2">
          {dimension.warnings.map((w, i) => (
            <div key={i} className="flex gap-1.5 items-start text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-1">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable explanation */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left border-t border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-medium text-brand-600">
          {expanded ? 'Hide explanation' : 'Why this recommendation?'}
        </span>
        <svg
          className={`w-4 h-4 text-brand-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {dimension.explanation}
        </div>
      )}
    </div>
  );
}
