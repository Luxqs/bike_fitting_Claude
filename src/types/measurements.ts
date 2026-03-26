// ─── Measurement domain types ─────────────────────────────────────────────────

/**
 * How a particular value was obtained.
 * Determines display formatting and how much weight an adjustment gives it.
 */
export type MeasurementSource =
  | 'camera'       // derived from MediaPipe pose landmarks
  | 'manual'       // typed in directly by the rider
  | 'estimated'    // calculated from a regression / anthropometric formula
  | 'user-reported'; // self-reported (e.g. height entered on profile page)

/**
 * Qualitative bucket for a confidence score so UI components can colour-code
 * without re-implementing threshold logic everywhere.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

// ─── Single measured dimension ────────────────────────────────────────────────

export interface MeasuredValue {
  /** The dimension value in centimetres */
  valueCm: number;

  /** Where this value came from */
  source: MeasurementSource;

  /**
   * Numeric confidence in [0, 1].
   * Camera measurements start near the raw landmark visibility product;
   * estimates are capped lower (typically 0.4–0.5).
   */
  confidence: number;

  /** Qualitative bucket derived from `confidence` */
  confidenceLevel: ConfidenceLevel;

  /**
   * Number of video frames that were averaged to produce this value.
   * Only present for camera-sourced measurements.
   */
  frameCount?: number;

  /** Optional human-readable explanation of caveats or assumptions */
  notes?: string;
}

// ─── Full set of body measurements (all optional — populated progressively) ──

export interface BodyMeasurements {
  /** Floor-to-crotch inseam */
  inseam?: MeasuredValue;

  /** Greater trochanter to lateral femoral condyle */
  femurLength?: MeasuredValue;

  /** Lateral femoral condyle to lateral malleolus */
  tibiaLength?: MeasuredValue;

  /** C7 vertebra (base of neck) to greater trochanter */
  torsoLength?: MeasuredValue;

  /** Acromion to lateral epicondyle of humerus */
  upperArmLength?: MeasuredValue;

  /** Lateral epicondyle to radial styloid */
  forearmLength?: MeasuredValue;

  /** Biacromial width (acromion to acromion) */
  shoulderWidth?: MeasuredValue;

  /**
   * Hip width at greater trochanters.
   * Used for saddle-width inference (not yet a primary output dimension).
   */
  hipWidth?: MeasuredValue;

  /** Fingertip-to-fingertip arm span */
  armSpan?: MeasuredValue;

  /** Foot length (heel to longest toe) */
  footLength?: MeasuredValue;

  /**
   * Standing postural angle of the thoracic spine from vertical (degrees).
   * Detected from side-view neutral pose.
   */
  postureAngle?: MeasuredValue;

  /**
   * Proxy flexibility score derived from forward-bend pose (hip hinge depth).
   * Stored in "cm" for interface conformity; interpret as unitless 0–100 score.
   */
  flexibilityProxy?: MeasuredValue;

  /** Full standing height as derived from camera or self-reported */
  totalHeight?: MeasuredValue;
}

// ─── Camera calibration ───────────────────────────────────────────────────────

export interface CalibrationData {
  /** Which approach was used to establish the pixel-per-cm scale */
  method: 'height' | 'reference-object';

  /** Conversion factor: how many pixels equal one centimetre in this session */
  pixelsPerCm: number;

  /** Subjective quality of the calibration */
  calibrationQuality: 'good' | 'acceptable' | 'poor';

  /** Unix timestamp (ms) when calibration was completed */
  timestamp: number;

  /** Height of the full-body pose in pixels — set when method is 'height' */
  detectedHeightPx?: number;

  /** Rider's self-reported height used to compute pixelsPerCm */
  selfReportedHeightCm?: number;

  /** Which physical reference object was placed in frame */
  referenceObjectType?: 'a4' | 'card' | 'custom';
}

// ─── Pose identifiers ─────────────────────────────────────────────────────────

export type PoseId =
  | 'neutral-front'      // standing relaxed, facing camera
  | 't-pose-front'       // arms out to sides at shoulder height, facing camera
  | 'arms-overhead-front' // arms stretched above head, facing camera
  | 'neutral-side'       // standing relaxed, side-on to camera
  | 'knee-lift-side'     // one knee raised to 90°, side-on
  | 'squat-side'         // quarter-squat, side-on (hip flexibility proxy)
  | 'forward-bend-side'  // standing forward bend, side-on
  | 'seated-side'        // seated on bike / stool at approximate saddle height, side-on
  | 'pedaling-side';     // simulating pedal stroke at BDC, side-on

// ─── MediaPipe landmark ───────────────────────────────────────────────────────

export interface NormalizedLandmark {
  /** Horizontal position in [0, 1] relative to image width */
  x: number;
  /** Vertical position in [0, 1] relative to image height */
  y: number;
  /**
   * Depth relative to the hip midpoint.
   * Positive = in front of the plane, negative = behind.
   * Scale is roughly the same as x/y.
   */
  z: number;
  /** MediaPipe visibility score in [0, 1]; omitted for world landmarks */
  visibility?: number;
}

// ─── Single captured pose ─────────────────────────────────────────────────────

export interface PoseCapture {
  /** Which pose this capture represents */
  poseId: PoseId;

  /** Camera orientation when this pose was recorded */
  viewAngle: 'front' | 'side';

  /**
   * Smoothed, normalised landmarks (image-space, 33 points per MediaPipe Pose).
   * Indices follow the standard MediaPipe Pose keypoint order.
   */
  landmarks: NormalizedLandmark[];

  /**
   * Smoothed world-space landmarks (metric, hip-centred coordinate system).
   * Preferred for angle and length calculations.
   */
  worldLandmarks: NormalizedLandmark[];

  /** How many video frames were averaged to produce this capture */
  frameCount: number;

  /** Unix timestamp (ms) at the moment the capture was finalised */
  capturedAt: number;

  /**
   * Mean landmark visibility across all required keypoints.
   * Range [0, 1]; below 0.5 should trigger a quality warning.
   */
  confidence: number;
}
