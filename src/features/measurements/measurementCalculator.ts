// ─── Measurement Calculator ───────────────────────────────────────────────────
//
// Converts MediaPipe pose landmarks into cm-based body measurements.
// All distance calculations use the calibration's pixelsPerCm scale.
//
// Coordinate conventions:
//   Normalized landmarks: x,y ∈ [0,1], y increases downward
//   World landmarks: metric, hip-centred, y increases upward
//
// We prefer WORLD landmarks for distances (scale-corrected by MediaPipe's
// internal model) and use NORMALIZED landmarks only for on-screen drawing.

import type { BodyMeasurements, CalibrationData, MeasuredValue, NormalizedLandmark, PoseCapture, ConfidenceLevel } from '@/types/measurements';
import type { RiderProfile } from '@/types/rider';
import { LM, isVisible, meanVisibility } from '@/utils/poseUtils';
import { distance3D, distance2D, angleDeg, angleFromVertical, pxToCm, clamp } from '@/utils/geometryUtils';
import { estimateInseam, estimateFemur, estimateTibia, estimateTorso, estimateUpperArm, estimateForearm, estimateShoulder, estimateHipWidth } from '@/config/fitFormulas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5)  return 'medium';
  if (confidence >= 0.25) return 'low';
  return 'none';
}

export function makeCameraValue(
  valueCm: number,
  visibilityScore: number,
  frameCount: number,
): MeasuredValue {
  const confidence = clamp(visibilityScore, 0, 1);
  return {
    valueCm,
    source: 'camera',
    confidence,
    confidenceLevel: toConfidenceLevel(confidence),
    frameCount,
  };
}

function makeManualValue(valueCm: number): MeasuredValue {
  return {
    valueCm,
    source: 'manual',
    confidence: 0.85,
    confidenceLevel: 'high',
  };
}

/** Convert world-landmark distance (metres) to cm */
function worldToCm(metres: number): number {
  return metres * 100;
}

/** Average two numbers */
function avg(a: number, b: number): number {
  return (a + b) / 2;
}

// ─── Front-view measurements ──────────────────────────────────────────────────
//
// Best computed from neutral-front and t-pose-front landmarks.
// Uses image-space (normalized) distances converted via pixelsPerCm.

export function computeFrontMeasurements(
  neutralFront: PoseCapture,
  tPoseFront: PoseCapture | null,
  _pixelsPerCm: number,
  frameWidth: number,
  frameHeight: number,
): Partial<BodyMeasurements> {
  const lm = neutralFront.landmarks;
  const wl = neutralFront.worldLandmarks;

  // --- Shoulder width ---
  const shoulderVisibility = meanVisibility(lm, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER]);
  let shoulderWidthVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_SHOULDER]) && isVisible(lm[LM.RIGHT_SHOULDER]) && wl.length > 12) {
    const distM = distance3D(wl[LM.LEFT_SHOULDER], wl[LM.RIGHT_SHOULDER]);
    shoulderWidthVal = makeCameraValue(worldToCm(distM), shoulderVisibility, neutralFront.frameCount);
  }

  // --- Hip width ---
  const hipVisibility = meanVisibility(lm, [LM.LEFT_HIP, LM.RIGHT_HIP]);
  let hipWidthVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.RIGHT_HIP]) && wl.length > 24) {
    const distM = distance3D(wl[LM.LEFT_HIP], wl[LM.RIGHT_HIP]);
    hipWidthVal = makeCameraValue(worldToCm(distM), hipVisibility, neutralFront.frameCount);
  }

  // --- Arm span (from T-pose) ---
  let armSpanVal: MeasuredValue | undefined;
  let upperArmVal: MeasuredValue | undefined;
  let forearmVal: MeasuredValue | undefined;

  if (tPoseFront) {
    const tlm  = tPoseFront.landmarks;
    const twl  = tPoseFront.worldLandmarks;

    if (isVisible(tlm[LM.LEFT_WRIST]) && isVisible(tlm[LM.RIGHT_WRIST]) && twl.length > 16) {
      const armSpanVis = meanVisibility(tlm, [LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER]);
      const distM = distance3D(twl[LM.LEFT_WRIST], twl[LM.RIGHT_WRIST]);
      armSpanVal = makeCameraValue(worldToCm(distM), armSpanVis, tPoseFront.frameCount);
    }

    // Upper arm: shoulder to elbow (both sides)
    if (twl.length > 14) {
      const visL = meanVisibility(tlm, [LM.LEFT_SHOULDER, LM.LEFT_ELBOW]);
      const visR = meanVisibility(tlm, [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW]);
      const uaL  = worldToCm(distance3D(twl[LM.LEFT_SHOULDER],  twl[LM.LEFT_ELBOW]));
      const uaR  = worldToCm(distance3D(twl[LM.RIGHT_SHOULDER], twl[LM.RIGHT_ELBOW]));
      upperArmVal = makeCameraValue(avg(uaL, uaR), avg(visL, visR), tPoseFront.frameCount);
    }

    // Forearm: elbow to wrist (both sides)
    if (twl.length > 16) {
      const visL = meanVisibility(tlm, [LM.LEFT_ELBOW, LM.LEFT_WRIST]);
      const visR = meanVisibility(tlm, [LM.RIGHT_ELBOW, LM.RIGHT_WRIST]);
      const faL  = worldToCm(distance3D(twl[LM.LEFT_ELBOW],  twl[LM.LEFT_WRIST]));
      const faR  = worldToCm(distance3D(twl[LM.RIGHT_ELBOW], twl[LM.RIGHT_WRIST]));
      forearmVal = makeCameraValue(avg(faL, faR), avg(visL, visR), tPoseFront.frameCount);
    }
  }

  // --- Total height (for calibration cross-check) ---
  let totalHeightVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.NOSE], 0.4) && wl.length > 28) {
    const headTop  = lm[LM.NOSE].y - 0.05; // approximate top of head above nose
    const ankleY   = avg(lm[LM.LEFT_ANKLE].y, lm[LM.RIGHT_ANKLE].y);
    const heightNorm = ankleY - headTop;
    const heightPx   = heightNorm * frameHeight;
    const heightCm   = pxToCm(heightPx, _pixelsPerCm);
    const vis = meanVisibility(lm, [LM.NOSE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]);
    totalHeightVal = makeCameraValue(heightCm, vis, neutralFront.frameCount);
  }

  return {
    shoulderWidth: shoulderWidthVal,
    hipWidth:      hipWidthVal,
    armSpan:       armSpanVal,
    upperArmLength: upperArmVal,
    forearmLength:  forearmVal,
    totalHeight:    totalHeightVal,
  };
}

// ─── Side-view measurements ───────────────────────────────────────────────────
//
// Use LEFT-side landmarks (rider stands with left side toward camera).
// World landmarks are used for distances; normalized for angles.

export function computeSideMeasurements(
  neutralSide: PoseCapture,
  kneeLiftSide: PoseCapture | null,
  _squatSide: PoseCapture | null,
  forwardBendSide: PoseCapture | null,
  _pixelsPerCm: number,
  _frameWidth: number,
  _frameHeight: number,
): Partial<BodyMeasurements> {
  const lm = neutralSide.landmarks;
  const wl = neutralSide.worldLandmarks;

  // --- Femur (hip to knee) ---
  let femurVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.LEFT_KNEE]) && wl.length > 26) {
    const distM = distance3D(wl[LM.LEFT_HIP], wl[LM.LEFT_KNEE]);
    const vis   = meanVisibility(lm, [LM.LEFT_HIP, LM.LEFT_KNEE]);
    femurVal    = makeCameraValue(worldToCm(distM), vis, neutralSide.frameCount);
  }

  // --- Tibia (knee to ankle) ---
  let tibiaVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_KNEE]) && isVisible(lm[LM.LEFT_ANKLE]) && wl.length > 28) {
    const distM = distance3D(wl[LM.LEFT_KNEE], wl[LM.LEFT_ANKLE]);
    const vis   = meanVisibility(lm, [LM.LEFT_KNEE, LM.LEFT_ANKLE]);
    tibiaVal    = makeCameraValue(worldToCm(distM), vis, neutralSide.frameCount);
  }

  // --- Torso (hip to shoulder) ---
  let torsoVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.LEFT_SHOULDER]) && wl.length > 12) {
    const distM = distance3D(wl[LM.LEFT_HIP], wl[LM.LEFT_SHOULDER]);
    const vis   = meanVisibility(lm, [LM.LEFT_HIP, LM.LEFT_SHOULDER]);
    torsoVal    = makeCameraValue(worldToCm(distM), vis, neutralSide.frameCount);
  }

  // --- Inseam (hip-joint height above floor, approximated as hip-y minus ankle-y) ---
  // In image coords, y increases downward, so inseam = (ankle.y - hip.y) * frameHeight
  let inseamVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.LEFT_ANKLE]) && wl.length > 28) {
    // Use world landmark y for vertical distance (y increases upward in world space)
    const hipY   = wl[LM.LEFT_HIP].y;
    const ankleY = wl[LM.LEFT_ANKLE].y;
    const inseamM = Math.abs(hipY - ankleY);
    const vis   = meanVisibility(lm, [LM.LEFT_HIP, LM.LEFT_ANKLE]);
    inseamVal   = makeCameraValue(worldToCm(inseamM), vis, neutralSide.frameCount);
  }

  // --- Posture angle (spine from vertical) ---
  let postureAngleVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.LEFT_SHOULDER])) {
    const angleDeg_ = angleFromVertical(lm[LM.LEFT_HIP], lm[LM.LEFT_SHOULDER]);
    const vis = meanVisibility(lm, [LM.LEFT_HIP, LM.LEFT_SHOULDER]);
    postureAngleVal = makeCameraValue(angleDeg_, vis, neutralSide.frameCount);
  }

  // --- Flexibility proxy (forward bend: how far wrist reaches toward ankle) ---
  let flexVal: MeasuredValue | undefined;
  if (forwardBendSide) {
    const flm = forwardBendSide.landmarks;
    const fwl = forwardBendSide.worldLandmarks;
    if (isVisible(flm[LM.LEFT_WRIST]) && isVisible(flm[LM.LEFT_ANKLE]) && fwl.length > 28) {
      // Compute wrist-to-ankle distance relative to inseam (lower = more flexible)
      const wristAnkleDist = Math.abs(fwl[LM.LEFT_WRIST].y - fwl[LM.LEFT_ANKLE].y);
      const hipAnkleDist   = Math.abs(fwl[LM.LEFT_HIP].y   - fwl[LM.LEFT_ANKLE].y);
      // score 0 = wrist touches ankle, 1 = barely reaches hip level
      const rawScore = hipAnkleDist > 0 ? (wristAnkleDist / hipAnkleDist) : 0.5;
      // Invert so 1 = very flexible
      const flexScore = clamp(1 - rawScore, 0, 1) * 100; // 0–100
      const vis = meanVisibility(flm, [LM.LEFT_WRIST, LM.LEFT_ANKLE]);
      flexVal = makeCameraValue(flexScore, vis, forwardBendSide.frameCount);
    }
  }

  // --- Foot length (heel to foot index) ---
  let footLengthVal: MeasuredValue | undefined;
  if (isVisible(lm[LM.LEFT_HEEL], 0.5) && isVisible(lm[LM.LEFT_FOOT_INDEX], 0.5) && wl.length > 31) {
    const distM = distance3D(wl[LM.LEFT_HEEL], wl[LM.LEFT_FOOT_INDEX]);
    const vis   = meanVisibility(lm, [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX]);
    footLengthVal = makeCameraValue(worldToCm(distM), vis, neutralSide.frameCount);
  }

  return {
    inseam:         inseamVal,
    femurLength:    femurVal,
    tibiaLength:    tibiaVal,
    torsoLength:    torsoVal,
    postureAngle:   postureAngleVal,
    flexibilityProxy: flexVal,
    footLength:     footLengthVal,
  };
}

// ─── Merge and resolve measurements ──────────────────────────────────────────

/**
 * Merge front and side measurements, apply manual overrides, and fill gaps
 * with statistical estimates based on rider height/inseam.
 */
export function mergeMeasurements(
  front: Partial<BodyMeasurements>,
  side: Partial<BodyMeasurements>,
  manualOverrides: Partial<Record<keyof BodyMeasurements, number>>,
  riderProfile: Pick<RiderProfile, 'heightCm' | 'manualMeasurements'>,
): BodyMeasurements {
  const { heightCm, manualMeasurements } = riderProfile;

  // Helper: apply manual override if present
  function withOverride(
    key: keyof BodyMeasurements,
    cameraVal?: MeasuredValue,
  ): MeasuredValue | undefined {
    if (manualOverrides[key] !== undefined) {
      return makeManualValue(manualOverrides[key]!);
    }
    if (manualMeasurements) {
      const mm = manualMeasurements as Record<string, number | undefined>;
      const manKey = key === 'inseam' ? 'inseamCm'
        : key === 'armSpan' ? 'armSpanCm'
        : key === 'shoulderWidth' ? 'shoulderWidthCm'
        : key === 'torsoLength' ? 'torsoLengthCm'
        : null;
      if (manKey && mm[manKey] !== undefined) {
        return makeManualValue(mm[manKey]!);
      }
    }
    return cameraVal;
  }

  // Resolve inseam first (needed for estimates below)
  const inseamRaw = withOverride('inseam', side.inseam);
  const inseamCm  = inseamRaw?.valueCm ?? heightCm * 0.47;

  return {
    inseam:         inseamRaw ?? estimateInseam(heightCm),
    femurLength:    withOverride('femurLength',    side.femurLength)    ?? estimateFemur(inseamCm),
    tibiaLength:    withOverride('tibiaLength',    side.tibiaLength)    ?? estimateTibia(inseamCm),
    torsoLength:    withOverride('torsoLength',    side.torsoLength ?? front.torsoLength) ?? estimateTorso(heightCm, inseamCm),
    upperArmLength: withOverride('upperArmLength', front.upperArmLength ?? side.upperArmLength) ?? estimateUpperArm(heightCm),
    forearmLength:  withOverride('forearmLength',  front.forearmLength ?? side.forearmLength)   ?? estimateForearm(heightCm * 0.19),
    shoulderWidth:  withOverride('shoulderWidth',  front.shoulderWidth) ?? estimateShoulder(heightCm),
    hipWidth:       withOverride('hipWidth',       front.hipWidth)      ?? estimateHipWidth(heightCm),
    armSpan:        withOverride('armSpan',        front.armSpan),
    footLength:     withOverride('footLength',     side.footLength),
    postureAngle:   withOverride('postureAngle',   side.postureAngle),
    flexibilityProxy: withOverride('flexibilityProxy', side.flexibilityProxy),
    totalHeight:    withOverride('totalHeight',    front.totalHeight),
  };
}

// ─── Asymmetry detection ──────────────────────────────────────────────────────

export function detectAsymmetries(
  neutralFront: PoseCapture | null,
  _pixelsPerCm: number,
  _frameWidth: number,
  _frameHeight: number,
): string[] {
  if (!neutralFront) return [];
  const wl = neutralFront.worldLandmarks;
  if (!wl || wl.length < 25) return [];

  const warnings: string[] = [];

  // Check shoulder height asymmetry
  const lShoulderY = wl[LM.LEFT_SHOULDER]?.y;
  const rShoulderY = wl[LM.RIGHT_SHOULDER]?.y;
  if (lShoulderY !== undefined && rShoulderY !== undefined) {
    const diff = Math.abs(lShoulderY - rShoulderY) * 100; // convert to cm
    if (diff > 2) {
      warnings.push(
        `Shoulder height asymmetry detected (~${diff.toFixed(1)} cm). ` +
        'Consider a professional bike fit if this is structural rather than a camera alignment issue.',
      );
    }
  }

  // Check hip height asymmetry
  const lHipY = wl[LM.LEFT_HIP]?.y;
  const rHipY = wl[LM.RIGHT_HIP]?.y;
  if (lHipY !== undefined && rHipY !== undefined) {
    const diff = Math.abs(lHipY - rHipY) * 100;
    if (diff > 1.5) {
      warnings.push(
        `Hip height asymmetry detected (~${diff.toFixed(1)} cm). ` +
        'Leg length discrepancy or pelvic tilt may benefit from specialist assessment.',
      );
    }
  }

  return warnings;
}
