// ─── Saddle Engine ────────────────────────────────────────────────────────────

import type { MeasuredValue } from '@/types/measurements';
import type { FlexibilityLevel, RidingGoal } from '@/types/rider';
import type { BikeCategoryConfig } from '@/config/bikeCategories';
import { saddleHeight, saddleSetback, kneeAngleBDC, FLEXIBILITY_FACTORS } from '@/config/fitFormulas';
import { clamp } from '@/utils/geometryUtils';

// ─── Saddle height ────────────────────────────────────────────────────────────

export interface SaddleHeightResult {
  heightMm: number;
  method: string;
  confidence: number;
}

export function computeSaddleHeight(
  inseam: MeasuredValue,
  _category: BikeCategoryConfig,
  goal: RidingGoal,
  fitnessLevel: FlexibilityLevel,
): SaddleHeightResult {
  const flexibility = FLEXIBILITY_FACTORS[fitnessLevel];
  const heightMm = saddleHeight.adjusted(inseam.valueCm, flexibility, goal);

  return {
    heightMm: clamp(heightMm, 550, 900), // sanity clamp
    method: 'adjusted-lemond',
    confidence: inseam.confidence * 0.9,
  };
}

// ─── Saddle setback ───────────────────────────────────────────────────────────

export interface SaddleSetbackResult {
  setbackMm: number;
  confidence: number;
}

export function computeSaddleSetback(
  femur: MeasuredValue,
  category: BikeCategoryConfig,
): SaddleSetbackResult {
  const raw = saddleSetback(femur.valueCm, category.saddleSetbackFactor);
  return {
    setbackMm: clamp(raw, 15, 70),
    confidence: femur.confidence * 0.85,
  };
}

// ─── Knee angle validation ────────────────────────────────────────────────────

/**
 * Checks if the knee angle at BDC is within the acceptable range for the
 * rider's goal, and adjusts saddle height incrementally if not.
 * Returns the final saddle height and the achieved knee angle.
 */
export function adjustSaddleForKneeAngle(
  initialHeightMm: number,
  femurCm: number,
  tibiaCm: number,
  goal: RidingGoal,
): { heightMm: number; kneeAngle: number; adjusted: boolean } {
  const targetMin = goal === 'race' || goal === 'aggressive' ? 148 : 145;
  const targetMax = goal === 'race' || goal === 'aggressive' ? 157 : 154;

  let height = initialHeightMm;
  let angle  = kneeAngleBDC(femurCm, tibiaCm, height);
  let adjusted = false;

  // Iterative adjustment (max 10 steps of 2 mm)
  for (let i = 0; i < 10; i++) {
    if (angle < targetMin) {
      height  += 2;
      adjusted = true;
    } else if (angle > targetMax) {
      height  -= 2;
      adjusted = true;
    } else {
      break;
    }
    angle = kneeAngleBDC(femurCm, tibiaCm, height);
  }

  return { heightMm: clamp(height, 550, 900), kneeAngle: angle, adjusted };
}
