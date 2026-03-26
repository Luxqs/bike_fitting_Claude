import type { CalibrationData, NormalizedLandmark } from '@/types/measurements';

// ─── Physical plausibility bounds ────────────────────────────────────────────
// A person standing ~1–2 m from a phone camera in portrait mode typically
// shows 3–8 pixels per millimetre, which is 30–80 pixels per centimetre.
const MIN_PX_PER_CM = 5;
const MAX_PX_PER_CM = 200;

// ─── Height-based calibration ────────────────────────────────────────────────

/**
 * Derive pixels-per-cm from the detected body height (head to ankle) and
 * the rider's self-reported height.
 *
 * @param headY               Normalized Y coordinate of the nose/head landmark (0–1)
 * @param ankleY              Normalized Y coordinate of the ankle midpoint (0–1, > headY)
 * @param frameHeight         Video / canvas height in pixels
 * @param selfReportedHeightCm  Rider's stated height in centimetres
 */
export function computePixelsPerCmFromHeight(
  headY: number,
  ankleY: number,
  frameHeight: number,
  selfReportedHeightCm: number,
): {
  pixelsPerCm: number;
  bodyHeightPx: number;
  quality: CalibrationData['calibrationQuality'];
} {
  // Y increases downward, so ankle should be larger than head
  const bodyHeightPx = Math.abs(ankleY - headY) * frameHeight;

  if (bodyHeightPx < 50 || selfReportedHeightCm <= 0) {
    // Detection failed or implausible input — return a safe default
    return {
      pixelsPerCm: 0,
      bodyHeightPx,
      quality: 'poor',
    };
  }

  const pixelsPerCm = bodyHeightPx / selfReportedHeightCm;
  const quality = validateCalibration(bodyHeightPx, pixelsPerCm, selfReportedHeightCm);

  return { pixelsPerCm, bodyHeightPx, quality };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Assess calibration quality by comparing the detected pixel height against
 * what it should be given the reported height and the derived pixelsPerCm.
 *
 * "Good"       → detected height is within 5 % of reported height
 * "Acceptable" → within 10 %
 * "Poor"       → > 10 % discrepancy or detection failed
 */
export function validateCalibration(
  detectedHeightPx: number,
  pixelsPerCm: number,
  selfReportedHeightCm: number,
): CalibrationData['calibrationQuality'] {
  if (detectedHeightPx <= 0 || pixelsPerCm <= 0 || selfReportedHeightCm <= 0) {
    return 'poor';
  }

  const expectedHeightPx = selfReportedHeightCm * pixelsPerCm;
  const discrepancyRatio = Math.abs(detectedHeightPx - expectedHeightPx) / expectedHeightPx;

  if (discrepancyRatio <= 0.05) return 'good';
  if (discrepancyRatio <= 0.10) return 'acceptable';
  return 'poor';
}

// ─── Reference-object calibration ────────────────────────────────────────────

/**
 * Compute pixels-per-cm from a known physical reference object placed in frame.
 *
 * Common objects and their widths:
 *   A4 paper  → 21.0 cm
 *   Credit card → 8.56 cm
 *
 * @param objectWidthPx  Measured width of the object in pixels (user-drawn box)
 * @param objectWidthCm  Known real-world width of the object in centimetres
 */
export function computePixelsPerCmFromReference(
  objectWidthPx: number,
  objectWidthCm: number,
): {
  pixelsPerCm: number;
  quality: CalibrationData['calibrationQuality'];
} {
  if (objectWidthPx <= 0 || objectWidthCm <= 0) {
    return { pixelsPerCm: 0, quality: 'poor' };
  }

  const pixelsPerCm = objectWidthPx / objectWidthCm;
  const quality = isCalibrationSane(pixelsPerCm) ? 'good' : 'poor';

  return { pixelsPerCm, quality };
}

// ─── Sanity check ─────────────────────────────────────────────────────────────

/**
 * Return true when the derived pixels-per-cm value falls within the physically
 * plausible range for a person standing 0.5–3 m from a typical smartphone camera.
 *
 * Typical range: 30–80 px/cm (3–8 px/mm).
 * A very wide margin (5–200) is used here to avoid false failures.
 */
export function isCalibrationSane(pixelsPerCm: number): boolean {
  return pixelsPerCm >= MIN_PX_PER_CM && pixelsPerCm <= MAX_PX_PER_CM;
}

// ─── Convenience: landmarks → calibration ────────────────────────────────────

/**
 * Given a full set of pose landmarks, extract the head (nose) and ankle
 * midpoint Y coordinates and compute calibration data.
 */
export function calibrateFromLandmarks(
  landmarks: NormalizedLandmark[],
  frameHeight: number,
  selfReportedHeightCm: number,
): CalibrationData | null {
  // Nose = index 0, left ankle = 27, right ankle = 28
  const nose = landmarks[0];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (!nose || !leftAnkle || !rightAnkle) return null;

  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
  const headY = nose.y;

  const { pixelsPerCm, bodyHeightPx, quality } = computePixelsPerCmFromHeight(
    headY,
    ankleY,
    frameHeight,
    selfReportedHeightCm,
  );

  if (pixelsPerCm <= 0 || !isCalibrationSane(pixelsPerCm)) return null;

  const result: CalibrationData = {
    method: 'height',
    pixelsPerCm,
    calibrationQuality: quality,
    timestamp: Date.now(),
    detectedHeightPx: bodyHeightPx,
    selfReportedHeightCm,
  };

  return result;
}
