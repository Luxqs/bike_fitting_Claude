import type { RiderProfile } from '@/types/rider';

// ─── Per-field validators ─────────────────────────────────────────────────────
// Each returns a string error message, or null when the value is valid.

export const validators = {
  heightCm: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return 'Height is required.';
    if (!Number.isFinite(v)) return 'Height must be a valid number.';
    if (v < 120) return 'Height must be at least 120 cm.';
    if (v > 230) return 'Height must be 230 cm or less.';
    return null;
  },

  weightKg: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return 'Weight is required.';
    if (!Number.isFinite(v)) return 'Weight must be a valid number.';
    if (v < 30) return 'Weight must be at least 30 kg.';
    if (v > 300) return 'Weight must be 300 kg or less.';
    return null;
  },

  name: (v: string | undefined): string | null => {
    if (!v || v.trim().length === 0) return 'Name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    if (v.trim().length > 60) return 'Name must be 60 characters or fewer.';
    return null;
  },

  inseamCm: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return null; // optional field
    if (!Number.isFinite(v)) return 'Inseam must be a valid number.';
    if (v < 55) return 'Inseam must be at least 55 cm.';
    if (v > 110) return 'Inseam must be 110 cm or less.';
    return null;
  },

  armSpanCm: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return null; // optional field
    if (!Number.isFinite(v)) return 'Arm span must be a valid number.';
    if (v < 130) return 'Arm span must be at least 130 cm.';
    if (v > 240) return 'Arm span must be 240 cm or less.';
    return null;
  },

  shoulderWidthCm: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return null; // optional field
    if (!Number.isFinite(v)) return 'Shoulder width must be a valid number.';
    if (v < 28) return 'Shoulder width must be at least 28 cm.';
    if (v > 60) return 'Shoulder width must be 60 cm or less.';
    return null;
  },

  torsoLengthCm: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return null; // optional field
    if (!Number.isFinite(v)) return 'Torso length must be a valid number.';
    if (v < 35) return 'Torso length must be at least 35 cm.';
    if (v > 80) return 'Torso length must be 80 cm or less.';
    return null;
  },

  shoeSize: (v: number | undefined): string | null => {
    if (v === undefined || v === null) return null; // optional field
    if (!Number.isFinite(v)) return 'Shoe size must be a valid number.';
    if (v < 30) return 'Shoe size must be at least 30.';
    if (v > 56) return 'Shoe size must be 56 or less.';
    return null;
  },
} as const;

// ─── Anatomical plausibility ranges ──────────────────────────────────────────
// Keyed by BodyMeasurements field name. Values are [minCm, maxCm].

const MEASUREMENT_RANGES: Record<string, [number, number]> = {
  inseam: [55, 110],
  femurLength: [30, 60],
  tibiaLength: [28, 55],
  torsoLength: [35, 80],
  upperArmLength: [20, 45],
  forearmLength: [18, 40],
  shoulderWidth: [28, 60],
  hipWidth: [22, 50],
  armSpan: [130, 240],
  footLength: [18, 36],
  postureAngle: [0, 45],  // degrees stored as "cm" per interface contract
  flexibilityProxy: [0, 100], // score 0-100 stored as "cm"
  totalHeight: [120, 230],
};

/**
 * Validate a body measurement key against anatomically plausible ranges.
 * Returns an error string if out of range, or null if acceptable.
 */
export function validateMeasurement(key: string, valueCm: number): string | null {
  const range = MEASUREMENT_RANGES[key];
  if (!range) return null; // unknown key — don't block
  const [min, max] = range;
  if (valueCm < min || valueCm > max) {
    return `${key} value of ${valueCm.toFixed(1)} cm is outside the expected range (${min}–${max} cm).`;
  }
  return null;
}

// ─── Profile completeness validation ─────────────────────────────────────────

/**
 * Validate a (possibly partial) RiderProfile and return a list of human-readable
 * error messages for all required fields that are missing or invalid.
 * Returns an empty array when the profile is complete and valid.
 */
export function validateRiderProfile(profile: Partial<RiderProfile>): string[] {
  const errors: string[] = [];

  const nameError = validators.name(profile.name);
  if (nameError) errors.push(nameError);

  const heightError = validators.heightCm(profile.heightCm);
  if (heightError) errors.push(heightError);

  const weightError = validators.weightKg(profile.weightKg);
  if (weightError) errors.push(weightError);

  if (!profile.fitnessLevel) {
    errors.push('Flexibility / fitness level is required.');
  }

  if (!profile.experienceLevel) {
    errors.push('Riding experience level is required.');
  }

  if (!profile.ridingGoal) {
    errors.push('Riding goal is required.');
  }

  if (!profile.preferredTerrain || profile.preferredTerrain.trim().length === 0) {
    errors.push('Preferred terrain is required.');
  }

  // Optional fields — only validate if provided
  if (profile.manualMeasurements) {
    const m = profile.manualMeasurements;

    const inseamErr = validators.inseamCm(m.inseamCm);
    if (inseamErr) errors.push(inseamErr);

    const armSpanErr = validators.armSpanCm(m.armSpanCm);
    if (armSpanErr) errors.push(armSpanErr);

    const shoulderErr = validators.shoulderWidthCm(m.shoulderWidthCm);
    if (shoulderErr) errors.push(shoulderErr);

    const torsoErr = validators.torsoLengthCm(m.torsoLengthCm);
    if (torsoErr) errors.push(torsoErr);
  }

  const shoeErr = validators.shoeSize(profile.shoeSize);
  if (shoeErr) errors.push(shoeErr);

  return errors;
}
