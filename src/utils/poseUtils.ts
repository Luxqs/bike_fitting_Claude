import type { NormalizedLandmark } from '@/types/measurements';

// ─── MediaPipe Pose landmark indices ─────────────────────────────────────────

export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// ─── Skeleton connections for drawing ────────────────────────────────────────

/**
 * Each pair is [from, to] using LM index constants.
 * Follows the standard MediaPipe Pose skeleton topology.
 */
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [LM.LEFT_EYE_INNER, LM.LEFT_EYE],
  [LM.LEFT_EYE, LM.LEFT_EYE_OUTER],
  [LM.LEFT_EYE_OUTER, LM.LEFT_EAR],
  [LM.RIGHT_EYE_INNER, LM.RIGHT_EYE],
  [LM.RIGHT_EYE, LM.RIGHT_EYE_OUTER],
  [LM.RIGHT_EYE_OUTER, LM.RIGHT_EAR],
  [LM.MOUTH_LEFT, LM.MOUTH_RIGHT],
  [LM.NOSE, LM.LEFT_EYE_INNER],
  [LM.NOSE, LM.RIGHT_EYE_INNER],
  // Torso
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  // Left arm
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.LEFT_WRIST, LM.LEFT_PINKY],
  [LM.LEFT_WRIST, LM.LEFT_INDEX],
  [LM.LEFT_WRIST, LM.LEFT_THUMB],
  [LM.LEFT_PINKY, LM.LEFT_INDEX],
  // Right arm
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.RIGHT_WRIST, LM.RIGHT_PINKY],
  [LM.RIGHT_WRIST, LM.RIGHT_INDEX],
  [LM.RIGHT_WRIST, LM.RIGHT_THUMB],
  [LM.RIGHT_PINKY, LM.RIGHT_INDEX],
  // Left leg
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_HEEL],
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX],
  [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX],
  // Right leg
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.RIGHT_ANKLE, LM.RIGHT_HEEL],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX],
  [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
];

// ─── Landmark quality helpers ─────────────────────────────────────────────────

/**
 * Returns true if a landmark's visibility score meets or exceeds the threshold.
 * Defaults to 0.5 — landmarks below this are too occluded to use reliably.
 */
export function isVisible(landmark: NormalizedLandmark, threshold = 0.5): boolean {
  return (landmark.visibility ?? 1) >= threshold;
}

/**
 * Mean visibility score for a subset of landmarks specified by index.
 * If a landmark has no visibility property it is treated as fully visible (1.0).
 */
export function meanVisibility(landmarks: NormalizedLandmark[], indices: number[]): number {
  if (indices.length === 0) return 0;
  const sum = indices.reduce((acc, i) => {
    const lm = landmarks[i];
    return acc + (lm ? (lm.visibility ?? 1) : 0);
  }, 0);
  return sum / indices.length;
}

/**
 * Overall pose confidence derived from the mean visibility of the 17 most
 * important anatomical landmarks (full-body, excluding face minutiae and finger tips).
 */
export function poseConfidence(landmarks: NormalizedLandmark[]): number {
  const keyIndices = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_HEEL, LM.RIGHT_HEEL,
    LM.LEFT_FOOT_INDEX, LM.RIGHT_FOOT_INDEX,
    LM.NOSE,
  ];
  return meanVisibility(landmarks, keyIndices);
}

// ─── View-angle detection ─────────────────────────────────────────────────────

/**
 * Detect if the person is facing the camera (front view).
 * Heuristic: both shoulders are visible and have similar Y positions,
 * and the shoulder midpoint is near the centre of the frame horizontally.
 */
export function isFrontView(landmarks: NormalizedLandmark[]): boolean {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  if (!ls || !rs) return false;
  if (!isVisible(ls) || !isVisible(rs)) return false;

  const yDiff = Math.abs(ls.y - rs.y);
  const xSpan = Math.abs(ls.x - rs.x);
  // In front view the shoulders span a significant width and are at similar height
  return yDiff < 0.08 && xSpan > 0.15;
}

/**
 * Detect if the person is in a side-on view.
 * Heuristic: one shoulder has a substantially larger Z depth than the other,
 * meaning one is clearly in front of the other relative to the camera.
 */
export function isSideView(landmarks: NormalizedLandmark[]): boolean {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  if (!ls || !rs) return false;
  if (!isVisible(ls, 0.4) && !isVisible(rs, 0.4)) return false;

  const zDiff = Math.abs(ls.z - rs.z);
  const xSpan = Math.abs(ls.x - rs.x);
  // In side view the shoulder X-span is small and there's significant Z separation
  return zDiff > 0.1 || xSpan < 0.12;
}

// ─── Asymmetry utilities ──────────────────────────────────────────────────────

/**
 * Returns the percentage difference between left and right values.
 * Uses the larger value as the denominator so the result is always [0, 100].
 */
export function asymmetryPercent(leftVal: number, rightVal: number): number {
  const larger = Math.max(Math.abs(leftVal), Math.abs(rightVal));
  if (larger === 0) return 0;
  return (Math.abs(leftVal - rightVal) / larger) * 100;
}

/**
 * Returns a human-readable warning string if asymmetry exceeds the threshold,
 * or null if the asymmetry is within acceptable bounds.
 *
 * @param leftVal   Left-side measurement
 * @param rightVal  Right-side measurement
 * @param label     Name of the measurement for the warning text
 * @param threshold Percentage threshold (default 5%)
 */
export function checkAsymmetry(
  leftVal: number,
  rightVal: number,
  label: string,
  threshold = 5,
): string | null {
  const pct = asymmetryPercent(leftVal, rightVal);
  if (pct > threshold) {
    return `${label} asymmetry detected (${pct.toFixed(1)}%). Consider consulting a bike fitter.`;
  }
  return null;
}

// ─── Distance estimation ──────────────────────────────────────────────────────

/**
 * Estimate whether the person is too close, too far, or at an appropriate
 * distance from the camera.
 *
 * Uses the apparent height of the torso (shoulder-to-hip Y span) as a proxy:
 * - too-close:  torso spans > 55% of frame height
 * - ok:         torso spans 25–55% of frame height
 * - too-far:    torso spans < 25% of frame height
 * - unknown:    landmarks not sufficiently visible
 */
export function estimateDistance(
  landmarks: NormalizedLandmark[],
): 'too-close' | 'ok' | 'too-far' | 'unknown' {
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) return 'unknown';
  if (!isVisible(ls) || !isVisible(rs) || !isVisible(lh) || !isVisible(rh)) return 'unknown';

  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = (lh.y + rh.y) / 2;
  const torsoSpan = Math.abs(hipY - shoulderY);

  if (torsoSpan > 0.55) return 'too-close';
  if (torsoSpan < 0.25) return 'too-far';
  return 'ok';
}

// ─── Motion detection ─────────────────────────────────────────────────────────

/**
 * Compute a motion score between two consecutive landmark frames.
 * Returns the mean displacement of the key body landmarks (shoulders, hips,
 * knees, ankles) in normalised coordinate units.
 *
 * A score below ~0.01 indicates the person is sufficiently still for capture.
 */
export function motionScore(
  prev: NormalizedLandmark[],
  curr: NormalizedLandmark[],
): number {
  const keyIndices = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ];

  let totalMovement = 0;
  let count = 0;

  for (const idx of keyIndices) {
    const p = prev[idx];
    const c = curr[idx];
    if (!p || !c) continue;
    if (!isVisible(p, 0.4) || !isVisible(c, 0.4)) continue;

    const dx = c.x - p.x;
    const dy = c.y - p.y;
    totalMovement += Math.sqrt(dx * dx + dy * dy);
    count++;
  }

  if (count === 0) return 0;
  return totalMovement / count;
}
