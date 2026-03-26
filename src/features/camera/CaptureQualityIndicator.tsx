import React from 'react';
import type { CaptureQuality } from '@/types/camera';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CaptureQualityIndicatorProps {
  quality: CaptureQuality;
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const RING_CLASSES: Record<CaptureQuality['color'], string> = {
  green: 'border-emerald-400 text-emerald-400',
  yellow: 'border-yellow-400 text-yellow-400',
  red: 'border-red-400 text-red-400',
};

const BG_CLASSES: Record<CaptureQuality['color'], string> = {
  green: 'bg-emerald-400/10',
  yellow: 'bg-yellow-400/10',
  red: 'bg-red-400/10',
};

const DOT_CLASSES: Record<CaptureQuality['color'], string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

// ─── Sub-indicator ────────────────────────────────────────────────────────────

interface SubIndicatorProps {
  label: string;
  ok: boolean;
}

function SubIndicator({ label, ok }: SubIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`text-xs font-bold leading-none ${ok ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {ok ? '✓' : '✗'}
      </span>
      <span className="text-[10px] text-white/70">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CaptureQualityIndicator({ quality }: CaptureQualityIndicatorProps) {
  const { color, overallScore, message, poseDetected, allLandmarksVisible, distanceOk, motionScore } =
    quality;

  const ringClass = RING_CLASSES[color];
  const bgClass = BG_CLASSES[color];
  const dotClass = DOT_CLASSES[color];

  // Motion stability: low motion score means stable
  const isStable = motionScore < 0.008;
  const scoreInt = Math.round(overallScore);

  // Pulse animation only when yellow/red to draw attention
  const pulseClass = color !== 'green' ? 'animate-pulse' : '';

  return (
    <div
      className={`
        flex flex-col gap-1.5 rounded-xl p-2 backdrop-blur-sm
        border ${ringClass} ${bgClass}
        transition-all duration-300
        min-w-[120px]
      `}
      role="status"
      aria-label={`Capture quality: ${message}`}
    >
      {/* Score ring + dot */}
      <div className="flex items-center gap-2">
        {/* Animated dot */}
        <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${dotClass} ${pulseClass}`}
          />
          <span className={`relative inline-flex h-3 w-3 rounded-full ${dotClass}`} />
        </div>

        {/* Percentage score */}
        <span className={`text-sm font-bold tabular-nums ${ringClass}`}>
          {scoreInt}%
        </span>
      </div>

      {/* Status message */}
      <p className="text-[10px] leading-tight text-white/90 font-medium">{message}</p>

      {/* Sub-indicators */}
      <div className="flex flex-col gap-0.5 pt-0.5 border-t border-white/10">
        <SubIndicator label="Pose detected" ok={poseDetected} />
        <SubIndicator label="Landmarks" ok={allLandmarksVisible} />
        <SubIndicator label="Distance" ok={distanceOk} />
        <SubIndicator label="Stable" ok={isStable} />
      </div>
    </div>
  );
}
