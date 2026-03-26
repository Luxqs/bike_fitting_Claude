// ─── useMeasurements hook ─────────────────────────────────────────────────────

import type { BodyMeasurements, CalibrationData, MeasuredValue, PoseId, PoseCapture } from '@/types/measurements';
import type { RiderProfile } from '@/types/rider';
import {
  computeFrontMeasurements,
  computeSideMeasurements,
  mergeMeasurements,
  detectAsymmetries,
} from './measurementCalculator';

// ─── Keys that are meaningful to prompt the user to fill in manually ──────────

const PROMPT_KEYS: Array<{ key: keyof BodyMeasurements; label: string; reason: string }> = [
  { key: 'inseam',         label: 'Inseam',        reason: 'Side-view pose not captured or low confidence' },
  { key: 'femurLength',    label: 'Thigh length',   reason: 'Could not be reliably measured from camera' },
  { key: 'tibiaLength',    label: 'Shin length',    reason: 'Could not be reliably measured from camera' },
  { key: 'torsoLength',    label: 'Torso length',   reason: 'Could not be reliably measured from camera' },
  { key: 'upperArmLength', label: 'Upper arm',      reason: 'T-pose not captured or low confidence' },
  { key: 'shoulderWidth',  label: 'Shoulder width', reason: 'Front pose not captured or low confidence' },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseMeasurementsReturn {
  computeFromPoses: (
    poses: Partial<Record<PoseId, PoseCapture>>,
    calibration: CalibrationData,
    profile: RiderProfile,
    frameWidth: number,
    frameHeight: number,
  ) => { measurements: BodyMeasurements; asymmetryWarnings: string[] };

  applyManualOverride: (
    measurements: BodyMeasurements,
    key: keyof BodyMeasurements,
    valueCm: number,
  ) => BodyMeasurements;

  getMissingOrLowConfidence: (measurements: BodyMeasurements) => Array<{
    key: keyof BodyMeasurements;
    label: string;
    reason: string;
  }>;
}

export function useMeasurements(): UseMeasurementsReturn {
  function computeFromPoses(
    poses: Partial<Record<PoseId, PoseCapture>>,
    calibration: CalibrationData,
    profile: RiderProfile,
    frameWidth: number,
    frameHeight: number,
  ): { measurements: BodyMeasurements; asymmetryWarnings: string[] } {
    const neutralFront = poses['neutral-front'] ?? null;
    const tPose        = poses['t-pose-front']  ?? null;
    const neutralSide  = poses['neutral-side']  ?? null;
    const kneeLift     = poses['knee-lift-side'] ?? null;
    const squat        = poses['squat-side']    ?? null;
    const forwardBend  = poses['forward-bend-side'] ?? null;

    const front: Partial<BodyMeasurements> = neutralFront
      ? computeFrontMeasurements(neutralFront, tPose, calibration.pixelsPerCm, frameWidth, frameHeight)
      : {};

    const side: Partial<BodyMeasurements> = neutralSide
      ? computeSideMeasurements(neutralSide, kneeLift, squat, forwardBend, calibration.pixelsPerCm, frameWidth, frameHeight)
      : {};

    const asymmetryWarnings = detectAsymmetries(neutralFront, calibration.pixelsPerCm, frameWidth, frameHeight);

    const measurements = mergeMeasurements(front, side, {}, profile);

    return { measurements, asymmetryWarnings };
  }

  function applyManualOverride(
    measurements: BodyMeasurements,
    key: keyof BodyMeasurements,
    valueCm: number,
  ): BodyMeasurements {
    return {
      ...measurements,
      [key]: {
        valueCm,
        source: 'manual',
        confidence: 0.85,
        confidenceLevel: 'high',
      } satisfies MeasuredValue,
    };
  }

  function getMissingOrLowConfidence(measurements: BodyMeasurements): Array<{
    key: keyof BodyMeasurements;
    label: string;
    reason: string;
  }> {
    return PROMPT_KEYS.filter(({ key }) => {
      const val = measurements[key];
      return !val || val.confidence < 0.45 || val.source === 'estimated';
    });
  }

  return { computeFromPoses, applyManualOverride, getMissingOrLowConfidence };
}
