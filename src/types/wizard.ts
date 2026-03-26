// ─── Wizard state machine types ───────────────────────────────────────────────

import { CalibrationData, PoseCapture, PoseId, BodyMeasurements } from './measurements';
import { RiderProfile } from './rider';
import { BikeCategory, IssueEntry, FitResult } from './fit';

// ─── Step identifiers ─────────────────────────────────────────────────────────

export type WizardStep =
  | 'welcome'         // landing / splash screen
  | 'rider-profile'   // rider enters their physical stats and goals
  | 'camera-setup'    // camera permissions and device selection
  | 'calibration'     // establish pixels-per-cm scale
  | 'guided-capture'  // step-by-step pose capture sequence
  | 'manual-input'    // fallback: rider types measurements manually
  | 'bike-type'       // rider selects their bike category
  | 'issues'          // rider reports pain / discomfort
  | 'calculating'     // spinner while fit engine runs
  | 'results';        // final fit output

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface WizardState {
  /** The step currently rendered */
  currentStep: WizardStep;

  /** Set of steps the user has already completed (used for progress UI) */
  completedSteps: Set<WizardStep>;

  /** Rider profile collected in the rider-profile step */
  riderProfile?: RiderProfile;

  /** Camera calibration data collected in the calibration step */
  calibration?: CalibrationData;

  /**
   * Map of captured poses keyed by pose ID.
   * Partial because the rider may skip optional poses.
   */
  poses: Partial<Record<PoseId, PoseCapture>>;

  /** Body measurements derived from poses + calibration */
  measurements?: BodyMeasurements;

  /**
   * Per-dimension manual overrides entered in the manual-input step.
   * Keys match field names on BodyMeasurements; values are in centimetres.
   */
  manualOverrides: Partial<Record<keyof BodyMeasurements, number>>;

  /** The bike category chosen in the bike-type step */
  selectedBikeCategory?: BikeCategory;

  /** Pain / discomfort entries collected in the issues step */
  issues: IssueEntry[];

  /** The computed fit result populated after the calculating step */
  fitResult?: FitResult;

  /** UUID that identifies this fitting session (created on RESET / first load) */
  sessionId: string;
}

// ─── Action discriminated union ───────────────────────────────────────────────

/** Navigate to a specific wizard step */
export interface ActionSetStep {
  type: 'SET_STEP';
  payload: WizardStep;
}

/** Store the completed rider profile */
export interface ActionSetProfile {
  type: 'SET_PROFILE';
  payload: RiderProfile;
}

/** Store calibration data after the calibration step completes */
export interface ActionSetCalibration {
  type: 'SET_CALIBRATION';
  payload: CalibrationData;
}

/** Add or replace a single captured pose */
export interface ActionAddPose {
  type: 'ADD_POSE';
  payload: PoseCapture;
}

/** Store the full set of computed body measurements */
export interface ActionSetMeasurements {
  type: 'SET_MEASUREMENTS';
  payload: BodyMeasurements;
}

/** Set or update a single manual measurement override */
export interface ActionSetManualOverride {
  type: 'SET_MANUAL_OVERRIDE';
  payload: {
    /** Field name on BodyMeasurements */
    key: keyof BodyMeasurements;
    /** Override value in centimetres */
    valueCm: number;
  };
}

/** Store the chosen bike category */
export interface ActionSetBikeCategory {
  type: 'SET_BIKE_CATEGORY';
  payload: BikeCategory;
}

/** Replace the full issues list */
export interface ActionSetIssues {
  type: 'SET_ISSUES';
  payload: IssueEntry[];
}

/** Store the computed fit result */
export interface ActionSetFitResult {
  type: 'SET_FIT_RESULT';
  payload: FitResult;
}

/**
 * Reset the entire wizard to its initial state and generate a new session ID.
 * Optionally keeps the rider profile so the rider doesn't have to re-enter it.
 */
export interface ActionReset {
  type: 'RESET';
  payload?: {
    keepProfile: boolean;
  };
}

/**
 * Rider chose to skip the camera steps and proceed directly to manual input.
 * Marks camera-setup, calibration, and guided-capture as skipped.
 */
export interface ActionSkipCamera {
  type: 'SKIP_CAMERA';
}

/** All possible wizard actions */
export type WizardAction =
  | ActionSetStep
  | ActionSetProfile
  | ActionSetCalibration
  | ActionAddPose
  | ActionSetMeasurements
  | ActionSetManualOverride
  | ActionSetBikeCategory
  | ActionSetIssues
  | ActionSetFitResult
  | ActionReset
  | ActionSkipCamera;
