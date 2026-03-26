// ─── Frame Engine ─────────────────────────────────────────────────────────────

import type { MeasuredValue } from '@/types/measurements';
import type { BikeCategoryConfig, FrameSizeEntry } from '@/config/bikeCategories';
import { clamp } from '@/utils/geometryUtils';

// ─── Frame size selection ─────────────────────────────────────────────────────

export interface FrameSizeResult {
  primary: string;        // recommended label
  smaller: string;        // one size down
  larger: string;         // one size up
  entry: FrameSizeEntry;  // full geometry for primary
  biasNote: string;       // advice when between sizes
  method: 'height+inseam' | 'height-only';
}

/**
 * Selects the best frame size from the category's frameSizeTable.
 * Scoring: height within range scores 1 point, inseam within range scores 1 point.
 * Best match wins; ties broken by height range centrality.
 */
export function selectFrameSize(
  heightCm: number,
  inseam: MeasuredValue,
  category: BikeCategoryConfig,
): FrameSizeResult {
  const table = category.frameSizeTable;
  if (table.length === 0) {
    return fallbackFrameSize(heightCm, category);
  }

  let bestIdx = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < table.length; i++) {
    const entry = table[i];
    const heightOk = heightCm >= entry.heightMin && heightCm < entry.heightMax;
    const inseamOk = inseam.valueCm >= entry.inseamMin && inseam.valueCm < entry.inseamMax;

    // Continuous score: how well the rider sits within each range
    const heightMid = (entry.heightMin + entry.heightMax) / 2;
    const inseamMid = (entry.inseamMin + entry.inseamMax) / 2;
    const heightRange = entry.heightMax - entry.heightMin;
    const inseamRange = entry.inseamMax - entry.inseamMin;

    const heightScore = heightRange > 0 ? 1 - Math.abs(heightCm - heightMid) / heightRange : 0;
    const inseamScore = inseam.confidence > 0.4 && inseamRange > 0
      ? 1 - Math.abs(inseam.valueCm - inseamMid) / inseamRange
      : 0;

    // Bonus for exact range match
    const bonus = (heightOk ? 2 : 0) + (inseamOk ? 2 : 0);
    const score = heightScore + inseamScore * inseam.confidence + bonus;

    if (score > bestScore) {
      bestScore = score;
      bestIdx   = i;
    }
  }

  const primary = table[bestIdx];
  const smaller = table[Math.max(0, bestIdx - 1)];
  const larger  = table[Math.min(table.length - 1, bestIdx + 1)];

  const biasNote = buildBiasNote(heightCm, inseam.valueCm, bestIdx, table);

  return {
    primary: primary.label,
    smaller: smaller.label,
    larger:  larger.label,
    entry:   primary,
    biasNote,
    method:  inseam.confidence > 0.4 ? 'height+inseam' : 'height-only',
  };
}

function buildBiasNote(
  heightCm: number,
  inseamCm: number,
  idx: number,
  table: FrameSizeEntry[],
): string {
  const entry = table[idx];
  const heightMid  = (entry.heightMin + entry.heightMax) / 2;
  const inseamMid  = (entry.inseamMin + entry.inseamMax) / 2;

  const heightHigh = heightCm > heightMid;
  const inseamHigh = inseamCm > inseamMid;

  if (heightHigh && inseamHigh && idx < table.length - 1) {
    return `You sit in the upper part of this size. Consider sizing up (${table[idx + 1].label}) for more standover clearance and longer ETT.`;
  }
  if (!heightHigh && !inseamHigh && idx > 0) {
    return `You sit in the lower part of this size. Consider sizing down (${table[idx - 1].label}) for more aggressive positioning or if the frame feels large.`;
  }
  return `${entry.label} fits well for your proportions.`;
}

function fallbackFrameSize(heightCm: number, _category: BikeCategoryConfig): FrameSizeResult {
  // Generic road-based fallback
  let label: string;
  if      (heightCm < 160) label = '48cm / XS';
  else if (heightCm < 165) label = '50cm / S';
  else if (heightCm < 170) label = '52cm / S-M';
  else if (heightCm < 175) label = '54cm / M';
  else if (heightCm < 180) label = '56cm / M-L';
  else if (heightCm < 185) label = '58cm / L';
  else if (heightCm < 190) label = '60cm / L-XL';
  else                      label = '62cm / XL';

  const fakeEntry: FrameSizeEntry = {
    label,
    heightMin: heightCm - 3,
    heightMax: heightCm + 3,
    inseamMin: 70,
    inseamMax: 90,
    typicalETTmm: 540,
    typicalStackMm: 560,
    typicalReachMm: 380,
  };

  return {
    primary: label,
    smaller: label,
    larger:  label,
    entry:   fakeEntry,
    biasNote: 'Frame size estimated from height only. Verify with actual bike geometry.',
    method:  'height-only',
  };
}

// ─── Stack / reach / ETT from frame + position ───────────────────────────────

export interface GeometryResult {
  stack: number;
  reach: number;
  ett:   number;
}

/**
 * Computes the target frame geometry based on the selected frame size entry
 * and the rider's saddle height, bar drop, and stem length.
 *
 * These are TARGETS to look for in a bike, not predictions of absolute geometry.
 */
export function computeStackReach(
  frameSizeResult: FrameSizeResult,
  saddleHeightMm: number,
  barDropMm: number,
  stemLengthMm: number,
): GeometryResult {
  const entry = frameSizeResult.entry;

  // Use the frame's typical stack/reach, then adjust for position
  const stack = clamp(entry.typicalStackMm + Math.max(0, -barDropMm) * 0.3, 400, 680);
  const reach = clamp(entry.typicalReachMm + (stemLengthMm - 100) * 0.4, 320, 500);
  const ett   = clamp(entry.typicalETTmm, 460, 640);

  return { stack, reach, ett };
}
