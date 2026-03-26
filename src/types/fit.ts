// ─── Fit domain types ─────────────────────────────────────────────────────────

import { MeasurementSource } from './measurements';
import { RiderProfile } from './rider';
import { BodyMeasurements } from './measurements';

// ─── Bike category ────────────────────────────────────────────────────────────

export type BikeCategory =
  // Road
  | 'road-race'
  | 'road-endurance'
  | 'road-aero'
  | 'road-climbing'
  | 'tt-triathlon'
  // Gravel
  | 'gravel-race'
  | 'gravel-adventure'
  // Cyclocross
  | 'cyclocross'
  // Mountain bike
  | 'mtb-xc'
  | 'mtb-trail'
  | 'mtb-all-mountain'
  | 'mtb-enduro'
  | 'mtb-dh'
  | 'mtb-hardtail'
  | 'mtb-full-suspension'
  // Urban / practical
  | 'hybrid-fitness'
  | 'commuter-city'
  | 'touring'
  | 'bikepacking'
  // Specialty
  | 'bmx-dirt';

// ─── Pain / discomfort locations ──────────────────────────────────────────────

export type PainLocation =
  | 'front-knee'
  | 'back-knee'
  | 'low-back'
  | 'neck'
  | 'hand-wrist'
  | 'shoulder'
  | 'saddle'
  | 'hip'
  | 'foot-numb'
  | 'too-stretched'
  | 'too-cramped'
  | 'instability'
  | 'no-issues';

// ─── Structured issue entry (from wizard issues step) ────────────────────────

export interface IssueEntry {
  /** Where on the body / what riding problem */
  location: PainLocation;
  /**
   * How bad is this?
   * 1 = mild / occasional, 2 = moderate / regular, 3 = severe / ride-limiting
   */
  severity: 1 | 2 | 3;
  /** Rider's own description of the issue */
  notes?: string;
}

// ─── A single recommended fit dimension with metadata ────────────────────────

export interface FitDimension {
  /**
   * Machine-readable key matching a field on FitResult
   * (e.g. 'saddleHeightMm', 'stemLengthMm').
   */
  key: string;

  /** Human-readable name displayed in the results UI */
  label: string;

  /** Recommended value in the unit specified by `unit` */
  valueMm: number;

  /**
   * Acceptable range [min, max] in the same unit as `valueMm`.
   * Allows the rider to fine-tune within this window.
   */
  rangeMm: [number, number];

  /**
   * Composite confidence score in [0, 1] reflecting input quality
   * (measurement confidence × calibration quality × formula reliability).
   */
  confidenceScore: number;

  /** How the underlying measurement feeding this dimension was obtained */
  source: MeasurementSource;

  /** Short warning strings shown as caution badges in the UI */
  warnings: string[];

  /** Plain-English explanation of how this value was determined */
  explanation: string;

  /** Display unit (values are always stored in mm internally) */
  unit: 'mm' | 'cm' | 'deg';
}

// ─── Full fit result ──────────────────────────────────────────────────────────

export interface FitResult {
  // ── Bike context ────────────────────────────────────────────────────────────

  /** The bike category these recommendations target */
  bikeCategory: BikeCategory;

  /** The rider's primary fit goal for this session */
  ridingGoal: RiderProfile['ridingGoal'];

  // ── Frame sizing ─────────────────────────────────────────────────────────────

  /**
   * Recommended frame size label (e.g. "54cm", "M/L").
   * Derived from the frame-size table in the category config.
   */
  frameSize: string;

  /**
   * Inclusive size range the rider fits into, e.g. ["52cm", "54cm"].
   * Lets the rider know when they sit between sizes.
   */
  frameSizeRange: [string, string];

  // ── Key frame geometry targets ───────────────────────────────────────────────

  /** Effective Top Tube length in mm */
  ettMm: number;

  /** Stack (BB centre to head-tube top) in mm */
  stackMm: number;

  /** Reach (BB centre horizontal to head-tube top) in mm */
  reachMm: number;

  // ── Contact-point dimensions (all in mm) ─────────────────────────────────────

  /** Saddle height: BB centre to top of saddle */
  saddleHeightMm: number;

  /** Horizontal distance the saddle nose sits behind BB centre */
  saddleSetbackMm: number;

  /**
   * Bar drop: saddle top to bar top (positive = bars lower than saddle).
   * Negative values indicate bars higher than saddle (e.g. city bikes).
   */
  barDropMm: number;

  /** Handlebar width centre-to-centre in mm */
  barWidthMm: number;

  /** Stem length (centre-to-centre) in mm */
  stemLengthMm: number;

  /** Recommended crank arm length in mm */
  crankLengthMm: number;

  // ── Derived angles ────────────────────────────────────────────────────────────

  /**
   * Estimated knee angle at bottom dead centre of pedal stroke (degrees).
   * Target 145–155° for most riders; outside this triggers a warning.
   */
  kneeAngleAtBDC: number;

  // ── Full breakdown ────────────────────────────────────────────────────────────

  /**
   * All dimensions with per-dimension metadata, warnings, and explanations.
   * Parallel to the individual numeric fields above but richer in content.
   */
  dimensions: FitDimension[];

  // ── Quality and caveats ───────────────────────────────────────────────────────

  /**
   * Aggregate confidence for the entire result in [0, 1].
   * Reflects measurement quality, completeness, and calibration accuracy.
   */
  overallConfidence: number;

  /** Top-level warnings about the fit or input data quality */
  warnings: string[];

  /**
   * List of assumptions made when measurements were missing or uncertain.
   * Displayed so the rider understands where estimates were used.
   */
  assumptions: string[];

  /** Unix timestamp (ms) when this result was generated */
  generatedAt: number;

  // ── Snapshots (so the result is self-contained) ───────────────────────────────

  /** Copy of the rider profile that produced this result */
  riderSnapshot: RiderProfile;

  /** Copy of the body measurements that produced this result */
  measurementsSnapshot: BodyMeasurements;
}
