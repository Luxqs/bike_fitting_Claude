// ─── Camera and pose-capture types ───────────────────────────────────────────

import { NormalizedLandmark, PoseId } from './measurements';

// ─── Camera configuration ─────────────────────────────────────────────────────

export interface CameraConfig {
  /**
   * Browser device ID string (from MediaDevices.enumerateDevices).
   * When omitted the browser picks based on facingMode.
   */
  deviceId?: string;

  /**
   * 'user' = front-facing (selfie) camera.
   * 'environment' = rear camera (better for a phone propped on a surface).
   */
  facingMode: 'user' | 'environment';

  /** Preferred capture width in pixels (browser may choose a different value) */
  idealWidth: number;

  /** Preferred capture height in pixels (browser may choose a different value) */
  idealHeight: number;
}

// ─── Temporally smoothed pose result ─────────────────────────────────────────

export interface SmoothedPose {
  /**
   * Averaged normalised landmarks across the smoothing window.
   * Ready to render as an overlay on the video element.
   */
  landmarks: NormalizedLandmark[];

  /**
   * Averaged world-space landmarks across the smoothing window.
   * Preferred input for metric calculations.
   */
  worldLandmarks: NormalizedLandmark[];

  /**
   * Mean visibility-weighted confidence across all landmarks
   * in the smoothing window. Range [0, 1].
   */
  meanConfidence: number;

  /** How many frames were included in this smoothed average */
  framesUsed: number;
}

// ─── Per-frame capture quality assessment ────────────────────────────────────

export interface CaptureQuality {
  /**
   * Composite score in [0, 100] combining all sub-scores below.
   * ≥ 80 = green, 50–79 = yellow, < 50 = red.
   */
  overallScore: number;

  /** True if MediaPipe returned at least one pose result this frame */
  poseDetected: boolean;

  /**
   * True if all landmarks required for the current pose step have
   * visibility ≥ 0.6.
   */
  allLandmarksVisible: boolean;

  /**
   * Raw mean landmark visibility for required keypoints. Range [0, 1].
   */
  confidence: number;

  /**
   * True when the rider appears to be at an appropriate distance from the
   * camera (full body visible with reasonable margin).
   */
  distanceOk: boolean;

  /**
   * True when luminance variance of the frame is above a minimum threshold
   * (i.e., not too dark).
   */
  lightingOk: boolean;

  /**
   * Motion score in [0, 1] where 0 = perfectly still, 1 = maximum movement.
   * Computed from average Euclidean displacement of landmarks between frames.
   * Values > 0.3 prevent auto-capture.
   */
  motionScore: number;

  /** Short human-readable status message shown in the camera overlay */
  message: string;

  /**
   * Traffic-light colour for the quality indicator badge.
   * - 'green'  → ready to capture
   * - 'yellow' → marginal; rider should adjust
   * - 'red'    → not ready
   */
  color: 'green' | 'yellow' | 'red';
}

// ─── Pose instruction (one step in the guided capture sequence) ───────────────

export interface PoseInstruction {
  /** Unique identifier matching a PoseCapture.poseId */
  id: PoseId;

  /** Short title displayed in the step list (e.g. "T-Pose (Front)") */
  label: string;

  /** One-paragraph description of why this pose is captured */
  description: string;

  /**
   * Step-by-step instruction shown to the rider while they get into position.
   * May contain line-breaks (\n) for multi-line display.
   */
  instruction: string;

  /** Camera orientation required for this pose */
  viewAngle: 'front' | 'side';

  /**
   * MediaPipe landmark indices that must be visible for a valid capture.
   * Follows the standard 33-point MediaPipe Pose keypoint numbering.
   */
  requiredLandmarkIndices: number[];

  /**
   * Minimum number of stable frames that must be averaged before
   * auto-capture is triggered.
   */
  minFrames: number;

  /**
   * When true the rider may skip this pose without invalidating the session.
   * Optional poses improve accuracy but are not required for a basic fit.
   */
  isOptional: boolean;
}
