// ─── Fit Calculator ───────────────────────────────────────────────────────────
//
// Main orchestrator for bike fit calculations.
// Chains: saddle → cockpit → frame → issue adjustments → validation → output.
//
// All outputs are in millimetres unless labelled otherwise.

import type { BikeCategory, FitDimension, FitResult, IssueEntry } from '@/types/fit';
import type { BodyMeasurements, MeasuredValue } from '@/types/measurements';
import type { RiderProfile } from '@/types/rider';
import { BIKE_CATEGORIES } from '@/config/bikeCategories';
import {
  resolveMeasurement,
  estimateInseam,
  estimateFemur,
  estimateTibia,
  estimateTorso,
  estimateUpperArm,
  estimateForearm,
  estimateShoulder,
  FLEXIBILITY_FACTORS,
  kneeAngleBDC,
} from '@/config/fitFormulas';
import { computeSaddleHeight, computeSaddleSetback, adjustSaddleForKneeAngle } from './saddleEngine';
import { computeTotalReach, computeStemLength, computeBarDrop, computeBarWidth, computeCrankLength } from './cockpitEngine';
import { selectFrameSize, computeStackReach } from './frameEngine';
import { applyIssueAdjustments, applyGoalModifiers, clampDimensions, generateFitWarnings, generateAssumptions, type FitDimensions } from './issueModifiers';
import { clamp } from '@/utils/geometryUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDim(
  key: string,
  label: string,
  valueMm: number,
  rangePercent: number,
  source: MeasuredValue,
  explanation: string,
  warnings: string[] = [],
  unit: 'mm' | 'cm' | 'deg' = 'mm',
): FitDimension {
  const delta = valueMm * rangePercent;
  return {
    key,
    label,
    valueMm: Math.round(valueMm),
    rangeMm: [Math.round(valueMm - delta), Math.round(valueMm + delta)],
    confidenceScore: source.confidence,
    source: source.source,
    warnings,
    explanation,
    unit,
  };
}

function weightedConfidence(values: MeasuredValue[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v.confidence, 0);
  return sum / values.length;
}

// ─── Main calculation function ────────────────────────────────────────────────

export function calculateFit(
  measurements: BodyMeasurements,
  profile: RiderProfile,
  bikeCategory: BikeCategory,
  issues: IssueEntry[],
  _frameWidth = 1280,
  _frameHeight = 720,
): FitResult {
  const category = BIKE_CATEGORIES[bikeCategory];
  const flexibility = FLEXIBILITY_FACTORS[profile.fitnessLevel];

  // ── 1. Resolve all measurements (prefer camera, fall back to estimates) ────

  const inseam    = resolveMeasurement(measurements.inseam,         estimateInseam(profile.heightCm));
  const femur     = resolveMeasurement(measurements.femurLength,     estimateFemur(inseam.valueCm));
  const tibia     = resolveMeasurement(measurements.tibiaLength,     estimateTibia(inseam.valueCm));
  const torso     = resolveMeasurement(measurements.torsoLength,     estimateTorso(profile.heightCm, inseam.valueCm));
  const upperArm  = resolveMeasurement(measurements.upperArmLength,  estimateUpperArm(profile.heightCm));
  const forearm   = resolveMeasurement(measurements.forearmLength,   estimateForearm(upperArm.valueCm));
  const shoulder  = resolveMeasurement(measurements.shoulderWidth,   estimateShoulder(profile.heightCm));

  // ── 2. Base saddle height ─────────────────────────────────────────────────

  const saddleHeightResult = computeSaddleHeight(inseam, category, profile.ridingGoal, profile.fitnessLevel);
  const saddleSetbackResult = computeSaddleSetback(femur, category);

  // ── 3. Validate knee angle ────────────────────────────────────────────────

  const { heightMm: validatedSaddleHeight, kneeAngle } = adjustSaddleForKneeAngle(
    saddleHeightResult.heightMm,
    femur.valueCm,
    tibia.valueCm,
    profile.ridingGoal,
  );

  // ── 4. Cockpit ────────────────────────────────────────────────────────────

  const barDropResult  = computeBarDrop(category, profile.ridingGoal, profile.fitnessLevel, profile.experienceLevel);
  const barWidthResult = computeBarWidth(shoulder, category);
  const crankResult    = computeCrankLength(inseam, category);

  // ── 5. Frame size ─────────────────────────────────────────────────────────

  const frameSizeResult = selectFrameSize(profile.heightCm, inseam, category);

  // ── 6. Total reach → stem length ──────────────────────────────────────────

  const reachResult = computeTotalReach(torso, upperArm, forearm, category, profile.ridingGoal, profile.fitnessLevel);
  const stemResult  = computeStemLength(reachResult.totalReachMm, frameSizeResult.entry.typicalETTmm, category, reachResult.confidence);

  // ── 7. Stack / reach / ETT targets ───────────────────────────────────────

  const { stack, reach, ett } = computeStackReach(frameSizeResult, validatedSaddleHeight, barDropResult.dropMm, stemResult.stemMm);

  // ── 8. Assemble initial dimensions ───────────────────────────────────────

  let dims: FitDimensions = {
    saddleHeightMm:  validatedSaddleHeight,
    saddleSetbackMm: saddleSetbackResult.setbackMm,
    barDropMm:       barDropResult.dropMm,
    barWidthMm:      barWidthResult.widthMm,
    stemLengthMm:    stemResult.stemMm,
    crankLengthMm:   crankResult.crankMm,
  };

  // ── 9. Apply goal modifiers ───────────────────────────────────────────────

  dims = applyGoalModifiers(dims, profile.ridingGoal, profile.fitnessLevel);

  // ── 10. Apply issue adjustments ───────────────────────────────────────────

  const { adjusted, appliedAdjustments, warnings: issueWarnings } = applyIssueAdjustments(dims, issues, category);
  dims = adjusted;

  // ── 11. Clamp to sanity ranges ────────────────────────────────────────────

  dims = clampDimensions(dims, category, inseam.valueCm);

  // ── 12. Final knee angle with adjusted saddle height ─────────────────────

  const finalKneeAngle = kneeAngleBDC(femur.valueCm, tibia.valueCm, dims.saddleHeightMm);

  // ── 13. Generate warnings and assumptions ─────────────────────────────────

  const fitWarnings = generateFitWarnings(dims, measurements, issues, finalKneeAngle);
  const allWarnings = [...fitWarnings, ...issueWarnings];
  const assumptions = generateAssumptions(measurements);

  if (appliedAdjustments.length > 0) {
    assumptions.push(
      `${appliedAdjustments.length} comfort/pain adjustment(s) applied: ` +
      appliedAdjustments.map(a => a.location.replace('-', ' ')).join(', ') + '.',
    );
  }

  // ── 14. Overall confidence ────────────────────────────────────────────────

  const overallConfidence = weightedConfidence([inseam, femur, tibia, torso, upperArm, shoulder]);

  // ── 15. Build FitDimension array ──────────────────────────────────────────

  const dimensions: FitDimension[] = [
    buildDim(
      'saddleHeightMm', 'Saddle Height', dims.saddleHeightMm, 0.02, inseam,
      `Computed using the adjusted LeMond formula (inseam × 0.883) modified for your flexibility level ` +
      `(${profile.fitnessLevel}) and riding goal (${profile.ridingGoal}). Validated against target knee ` +
      `angle of 145–155° at bottom dead centre — your estimated angle is ${finalKneeAngle}°. ` +
      `Measure from BB centre to top of saddle rail.`,
      finalKneeAngle < 143 || finalKneeAngle > 158
        ? [`Knee angle ${finalKneeAngle}° is outside the ideal 145–155° range.`] : [],
    ),

    buildDim(
      'saddleSetbackMm', 'Saddle Setback', dims.saddleSetbackMm, 0.10, femur,
      `Saddle fore-aft position is calculated to place the knee over (or slightly behind) the pedal ` +
      `axle when cranks are horizontal — the Knee-Over-Pedal-Spindle method. Based on your thigh length ` +
      `and the ${category.label} geometry profile. Measure horizontally from BB axle centre to saddle nose.`,
    ),

    buildDim(
      'barDropMm', 'Saddle-to-Bar Drop', dims.barDropMm, 0.25, inseam,
      `The height difference between the saddle and handlebar tops. Positive = bars lower than saddle ` +
      `(more aerodynamic). Computed from the ${category.label} defaults, adjusted for your riding goal ` +
      `(${profile.ridingGoal}) and flexibility (${profile.fitnessLevel}). ` +
      `A professional fitter can fine-tune this with spacers and stem angle.`,
    ),

    buildDim(
      'barWidthMm', 'Handlebar Width', dims.barWidthMm, 0.05, shoulder,
      `Handlebar width is matched to your shoulder width (${shoulder.valueCm.toFixed(1)} cm) with a ` +
      `category-specific offset of ${category.barWidthOffsetMm > 0 ? '+' : ''}${category.barWidthOffsetMm} mm. ` +
      `Wider bars improve control; narrower bars improve aerodynamics. ` +
      `Measure centre-to-centre (road) or end-to-end (MTB flat bars).`,
    ),

    buildDim(
      'stemLengthMm', 'Stem Length', dims.stemLengthMm, 0.15, torso,
      `Stem length bridges the gap between your total cockpit reach (torso + arm length × reach factor) ` +
      `and the frame's own ETT/reach contribution. Computed reach: ${Math.round(reachResult.totalReachMm)} mm. ` +
      `Stems are typically available in 10 mm increments. ` +
      `Try adjacent sizes (±10 mm) if comfort adjustments are needed.`,
    ),

    buildDim(
      'crankLengthMm', 'Crank Length', dims.crankLengthMm, 0.03, inseam,
      `Crank length is selected from the industry-standard inseam-based table. ` +
      `Your inseam (${inseam.valueCm.toFixed(1)} cm) suggests ${dims.crankLengthMm} mm cranks. ` +
      `Shorter cranks reduce peak hip flexion angle, which benefits riders with hip impingement or ` +
      `those transitioning to more aggressive positions. Most riders are comfortable within ±5 mm of this value.`,
    ),

    buildDim(
      'stemLengthMm-ETT', 'Effective Top Tube Target', ett, 0.03, torso,
      `Target ETT (horizontal top tube length) for this fit. When evaluating bikes, look for frames ` +
      `with ETT close to ${Math.round(ett)} mm combined with the recommended stem length. ` +
      `The same fit can be achieved with different ETT + stem combinations.`,
    ),

    buildDim(
      'stackMm', 'Target Stack', stack, 0.03, inseam,
      `Stack is the vertical distance from BB centre to head-tube top. A higher stack = more upright ` +
      `front end (less spacers needed). For your ${profile.ridingGoal} goal on a ${category.label}, ` +
      `aim for frames with stack near ${Math.round(stack)} mm.`,
    ),

    buildDim(
      'reachMm', 'Target Reach', reach, 0.03, torso,
      `Reach is the horizontal distance from BB centre to head-tube top. Combined with stem length ` +
      `and bar type, it determines total cockpit reach. For your proportions, target ` +
      `${Math.round(reach)} mm reach in the frame.`,
    ),
  ];

  // ── 16. Assemble FitResult ─────────────────────────────────────────────────

  return {
    bikeCategory,
    ridingGoal: profile.ridingGoal,
    frameSize:      frameSizeResult.primary,
    frameSizeRange: [frameSizeResult.smaller, frameSizeResult.larger],
    ettMm:          Math.round(ett),
    stackMm:        Math.round(stack),
    reachMm:        Math.round(reach),
    saddleHeightMm:  Math.round(dims.saddleHeightMm),
    saddleSetbackMm: Math.round(dims.saddleSetbackMm),
    barDropMm:       Math.round(dims.barDropMm),
    barWidthMm:      Math.round(dims.barWidthMm),
    stemLengthMm:    Math.round(dims.stemLengthMm),
    crankLengthMm:   Math.round(dims.crankLengthMm),
    kneeAngleAtBDC:  Math.round(finalKneeAngle),
    dimensions,
    overallConfidence,
    warnings: allWarnings,
    assumptions: [
      ...assumptions,
      frameSizeResult.biasNote,
      `Frame size method: ${frameSizeResult.method}.`,
      `Category: ${category.label} — ${category.description}`,
    ],
    generatedAt:            Date.now(),
    riderSnapshot:          profile,
    measurementsSnapshot:   measurements,
  };
}

// ─── Empty measurements helper ────────────────────────────────────────────────

export function createEmptyMeasurements(): BodyMeasurements {
  return {};
}
