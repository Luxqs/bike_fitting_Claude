// ─── Rider domain types ──────────────────────────────────────────────────────

export type AgeRange =
  | 'under-25'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65-plus';

export type BiologicalSex =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer-not-to-say';

export type RidingGoal =
  | 'comfort'
  | 'endurance'
  | 'sport'
  | 'aggressive'
  | 'race';

export type Experience =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'racer';

export type FlexibilityLevel =
  | 'poor'
  | 'average'
  | 'good'
  | 'excellent';

// ─── Current bike info (all fields optional — rider may not have a bike yet) ─

export interface CurrentBikeInfo {
  /** General style of bike the rider currently owns */
  bikeType?: string;
  /** Frame size as stamped on the bike (e.g. "54cm", "M") */
  frameSize?: string;
  /** Current stem length in millimetres */
  stemLengthMm?: number;
  /** Current handlebar width (centre-to-centre) in millimetres */
  handlebarWidthMm?: number;
  /** Current crank arm length in millimetres */
  crankLengthMm?: number;
  /** Current saddle height measured from centre of BB to top of saddle in millimetres */
  saddleHeightMm?: number;
  /** Free-text notes the rider can add about their current setup */
  notes?: string;
}

// ─── Optional manual body measurements entered by the rider ──────────────────

export interface ManualBodyMeasurements {
  /** Inside leg measurement (floor to crotch) in centimetres */
  inseamCm?: number;
  /** Wingspan / arm-span measured fingertip-to-fingertip in centimetres */
  armSpanCm?: number;
  /** Biacromial (shoulder) width in centimetres */
  shoulderWidthCm?: number;
  /** Torso length (C7 vertebra to greater trochanter) in centimetres */
  torsoLengthCm?: number;
}

// ─── Full rider profile ───────────────────────────────────────────────────────

export interface RiderProfile {
  /** Display name or alias */
  name: string;

  /** Rider age bracket */
  ageRange?: AgeRange;

  /** Biological sex used for fit reference ranges */
  biologicalSex?: BiologicalSex;

  /** Standing height in centimetres — required for all calculations */
  heightCm: number;

  /** Body weight in kilograms */
  weightKg: number;

  /**
   * Flexibility / hip-hinge mobility.
   * Used to soften or stiffen recommended bar drop and saddle setback.
   */
  fitnessLevel: FlexibilityLevel;

  /** Riding experience tier */
  experienceLevel: Experience;

  /** Primary performance / comfort goal that drives geometry selection */
  ridingGoal: RidingGoal;

  /**
   * Free-text terrain preference (e.g. "road + light gravel", "singletrack").
   * Used for narrative output only.
   */
  preferredTerrain: string;

  /** EU/US shoe size — used for cleat-position notes */
  shoeSize?: number;

  /** Information about the rider's existing bicycle */
  currentBikeInfo?: CurrentBikeInfo;

  /** Body measurements the rider entered manually */
  manualMeasurements?: ManualBodyMeasurements;

  /**
   * Free-text notes about injuries or chronic pain.
   * Displayed in results but not used in algorithmic adjustments
   * (structured adjustments come from IssueEntry in WizardState).
   */
  injuryNotes?: string;
}
