// ─── Issue Modifiers ──────────────────────────────────────────────────────────

import type { IssueEntry } from '@/types/fit';
import type { FlexibilityLevel, RidingGoal } from '@/types/rider';
import type { BodyMeasurements } from '@/types/measurements';
import type { BikeCategoryConfig } from '@/config/bikeCategories';
import { ISSUE_ADJUSTMENTS } from '@/config/issueAdjustments';
import { GOAL_MODIFIERS, FLEXIBILITY_FACTORS } from '@/config/fitFormulas';
import { clamp } from '@/utils/geometryUtils';

export interface FitDimensions {
  saddleHeightMm: number;
  saddleSetbackMm: number;
  barDropMm: number;
  barWidthMm: number;
  stemLengthMm: number;
  crankLengthMm: number;
}

export interface AdjustmentRecord {
  location: string;
  dimension: string;
  deltaMm: number;
  rationale: string;
}

// ─── Issue adjustments ────────────────────────────────────────────────────────

export function applyIssueAdjustments(
  dimensions: FitDimensions,
  issues: IssueEntry[],
  category: BikeCategoryConfig,
): { adjusted: FitDimensions; appliedAdjustments: AdjustmentRecord[]; warnings: string[] } {
  const result = { ...dimensions };
  const applied: AdjustmentRecord[] = [];
  const warnings: string[] = [];

  // Process issues from most severe to least severe
  const sorted = [...issues].sort((a, b) => b.severity - a.severity);

  for (const issue of sorted) {
    const adjustments = ISSUE_ADJUSTMENTS[issue.location];
    for (const adj of adjustments) {
      if (issue.severity < adj.minSeverity) continue;

      if (adj.warningOnly) {
        warnings.push(adj.rationale);
        continue;
      }

      // Apply the delta to the matching dimension
      switch (adj.dimension) {
        case 'saddleHeightMm':  result.saddleHeightMm  += adj.deltaMm; break;
        case 'saddleSetbackMm': result.saddleSetbackMm += adj.deltaMm; break;
        case 'barDropMm':       result.barDropMm       += adj.deltaMm; break;
        case 'barWidthMm':      result.barWidthMm      += adj.deltaMm; break;
        case 'stemLengthMm':    result.stemLengthMm    += adj.deltaMm; break;
        case 'crankLengthMm':   result.crankLengthMm   += adj.deltaMm; break;
      }

      applied.push({
        location:  issue.location,
        dimension: adj.dimension,
        deltaMm:   adj.deltaMm,
        rationale: adj.rationale,
      });
    }
  }

  return {
    adjusted: result,
    appliedAdjustments: applied,
    warnings,
  };
}

// ─── Goal modifiers ───────────────────────────────────────────────────────────

export function applyGoalModifiers(
  dimensions: FitDimensions,
  goal: RidingGoal,
  fitnessLevel: FlexibilityLevel,
): FitDimensions {
  const mods = GOAL_MODIFIERS[goal];
  const flexibility = FLEXIBILITY_FACTORS[fitnessLevel];

  return {
    saddleHeightMm:  dimensions.saddleHeightMm  + mods.saddleHeightDeltaMm,
    saddleSetbackMm: dimensions.saddleSetbackMm + mods.saddleSetbackDeltaMm,
    barDropMm:       dimensions.barDropMm       + mods.barDropDeltaMm + (flexibility - 0.5) * 10,
    barWidthMm:      dimensions.barWidthMm      + mods.barWidthDeltaMm,
    stemLengthMm:    dimensions.stemLengthMm    + mods.stemLengthDeltaMm,
    crankLengthMm:   dimensions.crankLengthMm, // goal doesn't change crank
  };
}

// ─── Sanity clamps ────────────────────────────────────────────────────────────

export function clampDimensions(
  dimensions: FitDimensions,
  category: BikeCategoryConfig,
  inseamCm: number,
): FitDimensions {
  return {
    saddleHeightMm:  clamp(dimensions.saddleHeightMm,  inseamCm * 7.5, inseamCm * 9.5),
    saddleSetbackMm: clamp(dimensions.saddleSetbackMm, 10, 80),
    barDropMm:       clamp(dimensions.barDropMm, category.barDropMin - 20, category.barDropMax + 20),
    barWidthMm:      clamp(dimensions.barWidthMm, 340, 900),
    stemLengthMm:    clamp(dimensions.stemLengthMm, 30, 160),
    crankLengthMm:   clamp(dimensions.crankLengthMm, 155, 185),
  };
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function generateFitWarnings(
  dimensions: FitDimensions,
  measurements: BodyMeasurements,
  issues: IssueEntry[],
  kneeAngle: number,
): string[] {
  const warnings: string[] = [];

  if (kneeAngle < 140) {
    warnings.push(`Knee angle at BDC is ${kneeAngle}° (below target 145–155°). Saddle may be too low — verify inseam measurement.`);
  }
  if (kneeAngle > 158) {
    warnings.push(`Knee angle at BDC is ${kneeAngle}° (above target 145–155°). Saddle may be too high — check cleat height and socks.`);
  }
  if (dimensions.stemLengthMm > 130) {
    warnings.push('Stem length above 130 mm can reduce steering responsiveness. Consider a longer frame reach if available.');
  }
  if (dimensions.stemLengthMm < 60) {
    warnings.push('Very short stem may affect handling. A longer stem (60–80 mm) with a more relaxed frame geometry may be preferable.');
  }

  // Low-confidence measurements
  const lowConf: string[] = [];
  if ((measurements.inseam?.confidence ?? 0) < 0.4) lowConf.push('inseam');
  if ((measurements.femurLength?.confidence ?? 0) < 0.4) lowConf.push('thigh length');
  if ((measurements.torsoLength?.confidence ?? 0) < 0.4) lowConf.push('torso length');
  if (lowConf.length > 0) {
    warnings.push(`Low-confidence measurements: ${lowConf.join(', ')}. Consider entering these manually for better accuracy.`);
  }

  // Knee issues flag
  const hasKneeIssue = issues.some(i => i.location === 'front-knee' || i.location === 'back-knee');
  if (hasKneeIssue) {
    warnings.push('Knee pain issues noted. Adjustments have been applied but professional fitter assessment is strongly recommended.');
  }

  return warnings;
}

// ─── Assumptions list ─────────────────────────────────────────────────────────

export function generateAssumptions(measurements: BodyMeasurements): string[] {
  const assumptions: string[] = [];

  function check(label: string, val?: { source?: string; confidence?: number }) {
    if (!val || val.source === 'estimated') {
      assumptions.push(`${label} was estimated from statistical ratios (not directly measured).`);
    } else if ((val.confidence ?? 0) < 0.5) {
      assumptions.push(`${label} had low camera confidence and may have reduced accuracy.`);
    }
  }

  check('Inseam',         measurements.inseam);
  check('Thigh length',   measurements.femurLength);
  check('Shin length',    measurements.tibiaLength);
  check('Torso length',   measurements.torsoLength);
  check('Upper arm',      measurements.upperArmLength);
  check('Shoulder width', measurements.shoulderWidth);

  return assumptions;
}
