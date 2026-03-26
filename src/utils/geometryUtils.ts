import type { NormalizedLandmark } from '@/types/measurements';

/**
 * Distance between two 2D points in normalized [0,1] coordinate space.
 * Returns a value in normalized units (not pixels or cm).
 */
export function distance2D(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distance between two 3D world landmarks (metric, hip-centred).
 * Returns distance in metres (same unit as world landmarks).
 */
export function distance3D(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Midpoint of two landmarks (works for both normalised and world landmarks).
 */
export function midpoint(a: NormalizedLandmark, b: NormalizedLandmark): NormalizedLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility:
      a.visibility !== undefined && b.visibility !== undefined
        ? (a.visibility + b.visibility) / 2
        : undefined,
  };
}

/**
 * Angle in degrees at vertex B in the triangle A-B-C.
 * Uses the dot-product formula on vectors BA and BC.
 */
export function angleDeg(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const baz = a.z - b.z;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const bcz = c.z - b.z;

  const dot = bax * bcx + bay * bcy + baz * bcz;
  const magBA = Math.sqrt(bax * bax + bay * bay + baz * baz);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = clamp(dot / (magBA * magBC), -1, 1);
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Angle of the vector from→to relative to the vertical (Y axis), in degrees.
 * 0° = pointing straight up, 90° = horizontal.
 * Uses only the X and Y components (ignores Z depth).
 */
export function angleFromVertical(from: NormalizedLandmark, to: NormalizedLandmark): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // atan2(x, -y): negate y because screen Y increases downward
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (radians * 180) / Math.PI;
}

/**
 * Convert a normalised landmark distance to centimetres.
 *
 * For 'x' axis:  normalizedDist × frameWidth  = pixels → / pixelsPerCm = cm
 * For 'y' axis:  normalizedDist × frameHeight = pixels → / pixelsPerCm = cm
 * For 'diagonal': normalizedDist × √(frameWidth²+frameHeight²) = pixels → / pixelsPerCm = cm
 *
 * @param normalizedDist  Distance in [0,1] normalised space
 * @param frameWidth      Video frame width in pixels
 * @param frameHeight     Video frame height in pixels
 * @param pixelsPerCm     Calibration factor (px / cm)
 * @param axis            Which axis the measurement is along
 */
export function normalizedToCm(
  normalizedDist: number,
  frameWidth: number,
  frameHeight: number,
  pixelsPerCm: number,
  axis: 'x' | 'y' | 'diagonal',
): number {
  let pixels: number;
  if (axis === 'x') {
    pixels = normalizedDist * frameWidth;
  } else if (axis === 'y') {
    pixels = normalizedDist * frameHeight;
  } else {
    const diagonal = Math.sqrt(frameWidth * frameWidth + frameHeight * frameHeight);
    pixels = normalizedDist * diagonal;
  }
  return pxToCm(pixels, pixelsPerCm);
}

/**
 * Convert a raw pixel distance to centimetres using the calibration factor.
 */
export function pxToCm(pixels: number, pixelsPerCm: number): number {
  if (pixelsPerCm <= 0) return 0;
  return pixels / pixelsPerCm;
}

/**
 * Compute the angle at the vertex opposite side `sideOpposite` using the
 * law of cosines: cos(C) = (a² + b² − c²) / (2ab)
 *
 * @param sideA        Length of side adjacent to the angle (side a)
 * @param sideB        Length of other adjacent side (side b)
 * @param sideOpposite Length of the side opposite the angle we want (side c)
 * @returns Angle in degrees, or 0 if any side is zero-length
 */
export function lawOfCosinesAngle(
  sideA: number,
  sideB: number,
  sideOpposite: number,
): number {
  if (sideA <= 0 || sideB <= 0) return 0;
  const cosC = (sideA * sideA + sideB * sideB - sideOpposite * sideOpposite) / (2 * sideA * sideB);
  return (Math.acos(clamp(cosC, -1, 1)) * 180) / Math.PI;
}

/**
 * Clamp a number to [min, max] (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round `value` to the nearest `multiple`.
 * e.g. roundToNearest(173, 5) → 175
 */
export function roundToNearest(value: number, multiple: number): number {
  if (multiple === 0) return value;
  return Math.round(value / multiple) * multiple;
}

/**
 * Weighted average of an array of numbers.
 * `values` and `weights` must be the same length.
 * If total weight is 0, returns 0.
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  let sum = 0;
  let totalWeight = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    totalWeight += weights[i];
  }
  if (totalWeight === 0) return 0;
  return sum / totalWeight;
}

/**
 * Returns true if `value` is within [min, max] inclusive.
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
