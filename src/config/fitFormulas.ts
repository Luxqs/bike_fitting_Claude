// ─── Fit Formulas and Estimation Helpers ──────────────────────────────────────
//
// All formula outputs are in millimetres unless noted otherwise.
// Sources: LeMond, Hamley-Thomas, Holmes, Peveler bike-fit literature.
// These are heuristics — not clinically validated prescriptions.

import type { FlexibilityLevel, RidingGoal } from '@/types/rider';
import type { BodyMeasurements, ConfidenceLevel, MeasuredValue } from '@/types/measurements';

// ─── Flexibility factor (0 = poor, 1 = excellent) ────────────────────────────

export const FLEXIBILITY_FACTORS: Record<FlexibilityLevel, number> = {
  poor:      0.0,
  average:   0.33,
  good:      0.67,
  excellent: 1.0,
};

// ─── Saddle height formulas (return mm, BB centre to saddle top) ──────────────

export const saddleHeight = {
  /**
   * LeMond formula: inseam × 0.883
   * Most widely used starting point for road cycling.
   */
  lemond: (inseamCm: number): number => inseamCm * 0.883 * 10,

  /**
   * Hamley-Thomas formula: inseam × 1.09 − 10 mm
   * Slightly different starting point; tends to be 3-5 mm lower than LeMond.
   */
  hamley: (inseamCm: number): number => inseamCm * 1.09 * 10 - 10,

  /**
   * Adjusted formula blending LeMond with flexibility and goal modifiers.
   * flexibility: 0 (poor) → 1 (excellent)
   * goal: comfort → race
   */
  adjusted: (inseamCm: number, flexibility: number, goal: RidingGoal): number => {
    const base = inseamCm * 0.883 * 10; // LeMond baseline in mm
    // Flexible riders can tolerate (and may benefit from) slightly higher saddle
    const flexDelta = (flexibility - 0.33) * 8; // ±~5 mm range across flexibility
    const goalDelta: Record<RidingGoal, number> = {
      comfort:    -8,
      endurance:  -3,
      sport:       0,
      aggressive:  3,
      race:        6,
    };
    return Math.round(base + flexDelta + goalDelta[goal]);
  },
};

// ─── Saddle setback ───────────────────────────────────────────────────────────

/**
 * Horizontal distance behind BB plumb line.
 * factor comes from BikeCategoryConfig.saddleSetbackFactor (mm per cm of femur).
 */
export function saddleSetback(femurCm: number, factor: number): number {
  return Math.round(femurCm * factor * 10);
}

// ─── Bar width ────────────────────────────────────────────────────────────────

/**
 * Handlebar width (centre-to-centre) in mm.
 * Rounded to nearest 5 mm (standard increment).
 */
export function barWidth(shoulderWidthCm: number, offsetMm: number): number {
  const raw = shoulderWidthCm * 10 + offsetMm;
  return Math.round(raw / 5) * 5;
}

// ─── Crank length (standard industry table, by inseam) ───────────────────────

/**
 * Standard crank length recommendations by inseam.
 * Short cranks: less hip flexion, better for riders with hip issues.
 * Long cranks: more leverage, traditional road.
 */
export function crankLength(inseamCm: number): number {
  if (inseamCm < 69) return 160;
  if (inseamCm < 71) return 165;
  if (inseamCm < 74) return 167.5;
  if (inseamCm < 77) return 170;
  if (inseamCm < 80) return 172.5;
  if (inseamCm < 84) return 175;
  if (inseamCm < 88) return 177.5;
  return 180;
}

// ─── Knee angle at BDC ────────────────────────────────────────────────────────

/**
 * Estimates knee angle (degrees) at bottom dead centre.
 * Uses law of cosines on a simplified triangle:
 *   - thigh = femur + ~30 mm (hip-to-greater-trochanter offset)
 *   - shank = tibia + ~50 mm (ankle to pedal axle)
 *   - distance = saddleHeight + ~30 mm (BB rise offset)
 * Target range: 145–155°. Outside this a warning is shown.
 */
export function kneeAngleBDC(femurCm: number, tibiaCm: number, saddleHeightMm: number): number {
  const thighMm  = femurCm * 10 + 30;  // femur + hip-joint offset
  const shankMm  = tibiaCm * 10 + 50;  // tibia + foot/pedal offset
  const distMm   = saddleHeightMm + 30; // saddle height + BB-rise offset

  const cosC = (thighMm ** 2 + shankMm ** 2 - distMm ** 2) / (2 * thighMm * shankMm);
  const clamped = Math.max(-1, Math.min(1, cosC));
  return Math.round((Math.acos(clamped) * 180) / Math.PI);
}

// ─── Statistical fallback estimators ─────────────────────────────────────────

function makeEstimate(valueCm: number): MeasuredValue {
  return {
    valueCm,
    source: 'estimated',
    confidence: 0.45,
    confidenceLevel: 'low' as ConfidenceLevel,
    notes: 'Estimated from statistical anthropometric ratio.',
  };
}

/** Inseam ≈ height × 0.47 (population mean) */
export function estimateInseam(heightCm: number): MeasuredValue {
  return makeEstimate(heightCm * 0.47);
}

/** Femur ≈ inseam × 0.54 */
export function estimateFemur(inseamCm: number): MeasuredValue {
  return makeEstimate(inseamCm * 0.54);
}

/** Tibia ≈ inseam × 0.46 */
export function estimateTibia(inseamCm: number): MeasuredValue {
  return makeEstimate(inseamCm * 0.46);
}

/** Torso ≈ (height − inseam) × 0.55 */
export function estimateTorso(heightCm: number, inseamCm: number): MeasuredValue {
  return makeEstimate((heightCm - inseamCm) * 0.55);
}

/** Upper arm ≈ height × 0.19 */
export function estimateUpperArm(heightCm: number): MeasuredValue {
  return makeEstimate(heightCm * 0.19);
}

/** Forearm ≈ upper arm × 0.85 */
export function estimateForearm(upperArmCm: number): MeasuredValue {
  return makeEstimate(upperArmCm * 0.85);
}

/** Shoulder width ≈ height × 0.23 */
export function estimateShoulder(heightCm: number): MeasuredValue {
  return makeEstimate(heightCm * 0.23);
}

/** Hip width ≈ height × 0.18 */
export function estimateHipWidth(heightCm: number): MeasuredValue {
  return makeEstimate(heightCm * 0.18);
}

// ─── Goal-based modifiers (deltas in mm applied to base dimensions) ───────────

export interface GoalModifiers {
  saddleHeightDeltaMm: number;
  barDropDeltaMm: number;
  stemLengthDeltaMm: number;
  saddleSetbackDeltaMm: number;
  barWidthDeltaMm: number;
}

export const GOAL_MODIFIERS: Record<RidingGoal, GoalModifiers> = {
  comfort: {
    saddleHeightDeltaMm:  -8,
    barDropDeltaMm:       -30,
    stemLengthDeltaMm:    -15,
    saddleSetbackDeltaMm: +10,
    barWidthDeltaMm:       +5,
  },
  endurance: {
    saddleHeightDeltaMm:  -3,
    barDropDeltaMm:       -10,
    stemLengthDeltaMm:     -5,
    saddleSetbackDeltaMm:  +5,
    barWidthDeltaMm:        0,
  },
  sport: {
    saddleHeightDeltaMm:   0,
    barDropDeltaMm:         0,
    stemLengthDeltaMm:      0,
    saddleSetbackDeltaMm:   0,
    barWidthDeltaMm:        0,
  },
  aggressive: {
    saddleHeightDeltaMm:  +3,
    barDropDeltaMm:       +20,
    stemLengthDeltaMm:    +10,
    saddleSetbackDeltaMm:  -5,
    barWidthDeltaMm:        0,
  },
  race: {
    saddleHeightDeltaMm:  +5,
    barDropDeltaMm:       +35,
    stemLengthDeltaMm:    +15,
    saddleSetbackDeltaMm: -10,
    barWidthDeltaMm:       -5,
  },
};

// ─── Resolve measurement with fallback ───────────────────────────────────────

/**
 * Pick the best available measurement.
 * Prefers camera > manual > user-reported > estimated.
 * If camera confidence is below minConfidence, falls back to next best.
 */
export function resolveMeasurement(
  measured: MeasuredValue | undefined,
  fallback: MeasuredValue,
  minConfidence = 0.35,
): MeasuredValue {
  if (measured && measured.confidence >= minConfidence) return measured;
  return fallback;
}

// ─── Missing measurements helper ─────────────────────────────────────────────

export type MissingKey = keyof BodyMeasurements;

export const MEASUREMENT_LABELS: Record<MissingKey, string> = {
  inseam:         'Inseam',
  femurLength:    'Thigh length',
  tibiaLength:    'Shin length',
  torsoLength:    'Torso length',
  upperArmLength: 'Upper arm length',
  forearmLength:  'Forearm length',
  shoulderWidth:  'Shoulder width',
  hipWidth:       'Hip width',
  armSpan:        'Arm span',
  footLength:     'Foot length',
  postureAngle:   'Posture angle',
  flexibilityProxy: 'Flexibility score',
  totalHeight:    'Standing height',
};
