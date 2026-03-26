// ─── Cockpit Engine ───────────────────────────────────────────────────────────

import type { MeasuredValue } from '@/types/measurements';
import type { Experience, FlexibilityLevel, RidingGoal } from '@/types/rider';
import type { BikeCategoryConfig } from '@/config/bikeCategories';
import { barWidth, crankLength, FLEXIBILITY_FACTORS } from '@/config/fitFormulas';
import { clamp, roundToNearest } from '@/utils/geometryUtils';

// ─── Total cockpit reach ──────────────────────────────────────────────────────

export interface ReachResult {
  totalReachMm: number;
  confidence: number;
}

/**
 * Estimates how far the rider needs to reach to the bars.
 * Based on (torso + upper arm + forearm) × cockpitReachFactor.
 * The factor is category-specific and reflects the intended position.
 */
export function computeTotalReach(
  torso: MeasuredValue,
  upperArm: MeasuredValue,
  forearm: MeasuredValue,
  category: BikeCategoryConfig,
  goal: RidingGoal,
  fitnessLevel: FlexibilityLevel,
): ReachResult {
  const flexibility = FLEXIBILITY_FACTORS[fitnessLevel];

  // Combine segment lengths
  const combinedCm = torso.valueCm + upperArm.valueCm + forearm.valueCm;

  // Goal and flexibility further modulate effective reach
  const goalScale: Record<RidingGoal, number> = {
    comfort:    -0.04,
    endurance:  -0.02,
    sport:       0.00,
    aggressive:  0.02,
    race:        0.03,
  };
  const flexScale = (flexibility - 0.5) * 0.02; // ±1% effect

  const effectiveFactor = category.cockpitReachFactor + goalScale[goal] + flexScale;
  const totalReachMm = combinedCm * 10 * effectiveFactor;

  const confidence = Math.min(torso.confidence, upperArm.confidence, forearm.confidence) * 0.9;

  return {
    totalReachMm: clamp(totalReachMm, 350, 700),
    confidence,
  };
}

// ─── Stem length ──────────────────────────────────────────────────────────────

export interface StemResult {
  stemMm: number;
  rangeMin: number;
  rangeMax: number;
  confidence: number;
}

/**
 * Derives stem length from total reach minus the frame's own reach (ETT × ~0.6).
 * The "frame reach" portion absorbed into the frame's ETT is category-specific.
 */
export function computeStemLength(
  totalReachMm: number,
  frameETTmm: number,
  _category: BikeCategoryConfig,
  confidence: number,
): StemResult {
  // Frame contributes approximately 60% of ETT to total cockpit
  // Handlebar extension: assume ~60-80 mm for drop bars, ~20 mm for flat bars
  const frameContribution = frameETTmm * 0.60;
  const stemMm = totalReachMm - frameContribution;
  const clamped = clamp(roundToNearest(stemMm, 5), 40, 160);

  return {
    stemMm: clamped,
    rangeMin: Math.max(40,  clamped - 15),
    rangeMax: Math.min(160, clamped + 15),
    confidence,
  };
}

// ─── Bar drop ─────────────────────────────────────────────────────────────────

export interface BarDropResult {
  dropMm: number;
  rangeMin: number;
  rangeMax: number;
}

/**
 * Computes saddle-to-bar height difference.
 * Positive = bars lower than saddle (aggressive road).
 * Negative = bars higher than saddle (city / comfort).
 */
export function computeBarDrop(
  category: BikeCategoryConfig,
  goal: RidingGoal,
  fitnessLevel: FlexibilityLevel,
  experience: Experience,
): BarDropResult {
  const flexibility = FLEXIBILITY_FACTORS[fitnessLevel];

  // Start from category default
  let drop = category.barDropDefault;

  // Goal modifier (accumulated on top)
  const goalAdj: Record<RidingGoal, number> = {
    comfort:    -25,
    endurance:  -10,
    sport:        0,
    aggressive:  15,
    race:        25,
  };
  drop += goalAdj[goal];

  // Flexibility modifier: less flexible = less drop
  drop += (flexibility - 0.5) * 20;

  // Experience: beginners get less drop
  if (experience === 'beginner') drop -= 10;
  if (experience === 'intermediate') drop -= 5;

  const clamped = clamp(drop, category.barDropMin, category.barDropMax);

  return {
    dropMm:   Math.round(clamped),
    rangeMin: Math.max(category.barDropMin, clamped - 20),
    rangeMax: Math.min(category.barDropMax, clamped + 20),
  };
}

// ─── Bar width ────────────────────────────────────────────────────────────────

export interface BarWidthResult {
  widthMm: number;
  confidence: number;
}

export function computeBarWidth(
  shoulderWidth: MeasuredValue,
  category: BikeCategoryConfig,
): BarWidthResult {
  const widthMm = barWidth(shoulderWidth.valueCm, category.barWidthOffsetMm);
  return {
    widthMm: clamp(widthMm, 360, 820),
    confidence: shoulderWidth.confidence * 0.9,
  };
}

// ─── Crank length ─────────────────────────────────────────────────────────────

export interface CrankResult {
  crankMm: number;
  confidence: number;
}

export function computeCrankLength(
  inseam: MeasuredValue,
  _category: BikeCategoryConfig,
): CrankResult {
  const crankMm = crankLength(inseam.valueCm);
  return {
    crankMm,
    confidence: inseam.confidence * 0.9,
  };
}

// ─── Stem angle suggestion ────────────────────────────────────────────────────

export function computeStemAngle(
  barDropMm: number,
  _stemLengthMm: number,
): number {
  // Suggest a common stem angle based on drop
  if (barDropMm < 0)  return 17;  // positive (raised) for comfort
  if (barDropMm < 20) return 6;   // flat for endurance
  if (barDropMm < 50) return 0;   // 0° for balanced road
  return -6;                       // negative for aggressive/aero
}
