// ─── Posture Profiles ─────────────────────────────────────────────────────────
//
// Maps riding goals to target body-angle ranges.
// These are approximate targets; actual angles depend on individual proportions.

import type { RidingGoal } from '@/types/rider';

export interface PostureProfile {
  label: string;
  /** Torso angle from vertical (0° = fully upright, 90° = horizontal) */
  forwardLeanDeg: number;
  /** Hip flexion angle at the 3-o'clock crank position */
  targetHipAngle: number;
  /** Knee angle at bottom dead centre — target for saddle height */
  targetKneeAngleBDC: [number, number]; // [min, max] degrees
  /** Short description for UI display */
  description: string;
}

export const POSTURE_PROFILES: Record<RidingGoal, PostureProfile> = {
  comfort: {
    label: 'Upright / Comfort',
    forwardLeanDeg: 30,
    targetHipAngle: 40,
    targetKneeAngleBDC: [143, 152],
    description: 'Minimal forward lean for maximum comfort and upright visibility.',
  },
  endurance: {
    label: 'Endurance / Balanced',
    forwardLeanDeg: 42,
    targetHipAngle: 50,
    targetKneeAngleBDC: [145, 154],
    description: 'Balanced position sustainable for long hours in the saddle.',
  },
  sport: {
    label: 'Sport / Performance',
    forwardLeanDeg: 48,
    targetHipAngle: 55,
    targetKneeAngleBDC: [147, 155],
    description: 'Performance-oriented position with moderate aerodynamics.',
  },
  aggressive: {
    label: 'Aggressive / Race',
    forwardLeanDeg: 56,
    targetHipAngle: 60,
    targetKneeAngleBDC: [148, 156],
    description: 'Aerodynamic race position requiring good flexibility and core strength.',
  },
  race: {
    label: 'Full Race / Aero',
    forwardLeanDeg: 62,
    targetHipAngle: 65,
    targetKneeAngleBDC: [150, 158],
    description: 'Maximum aerodynamic efficiency for competitive racing.',
  },
};
