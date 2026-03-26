import { useCallback, useState } from 'react';
import type { CalibrationData, NormalizedLandmark } from '@/types/measurements';
import {
  computePixelsPerCmFromHeight,
  isCalibrationSane,
  validateCalibration,
} from './calibrationUtils';

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseCalibrationReturn {
  calibrationData: CalibrationData | null;
  isCalibrated: boolean;
  calibrateFromHeight: (
    landmarks: NormalizedLandmark[],
    frameHeight: number,
    selfReportedHeightCm: number,
  ) => CalibrationData | null;
  calibrateManually: (pixelsPerCm: number) => CalibrationData;
  convertPxToCm: (pixels: number) => number;
  convertNormalizedDistToCm: (
    normalizedDist: number,
    axis: 'x' | 'y',
    frameWidth: number,
    frameHeight: number,
  ) => number;
  reset: () => void;
  quality: CalibrationData['calibrationQuality'] | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCalibration(
  initialCalibration?: CalibrationData,
): UseCalibrationReturn {
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(
    initialCalibration ?? null,
  );

  // ── calibrateFromHeight ───────────────────────────────────────────────────

  const calibrateFromHeight = useCallback(
    (
      landmarks: NormalizedLandmark[],
      frameHeight: number,
      selfReportedHeightCm: number,
    ): CalibrationData | null => {
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

      const data: CalibrationData = {
        method: 'height',
        pixelsPerCm,
        calibrationQuality: quality,
        timestamp: Date.now(),
        detectedHeightPx: bodyHeightPx,
        selfReportedHeightCm,
      };

      setCalibrationData(data);
      return data;
    },
    [],
  );

  // ── calibrateManually ─────────────────────────────────────────────────────

  const calibrateManually = useCallback((pixelsPerCm: number): CalibrationData => {
    // Clamp to sane range
    const clamped = Math.max(5, Math.min(200, pixelsPerCm));
    const quality = validateCalibration(
      clamped * 170, // assume ~170 cm height for the validation (arbitrary stand-in)
      clamped,
      170,
    );

    const data: CalibrationData = {
      method: 'reference-object',
      pixelsPerCm: clamped,
      calibrationQuality: isCalibrationSane(clamped) ? quality : 'poor',
      timestamp: Date.now(),
    };

    setCalibrationData(data);
    return data;
  }, []);

  // ── convertPxToCm ─────────────────────────────────────────────────────────

  const convertPxToCm = useCallback(
    (pixels: number): number => {
      if (!calibrationData || calibrationData.pixelsPerCm <= 0) return 0;
      return pixels / calibrationData.pixelsPerCm;
    },
    [calibrationData],
  );

  // ── convertNormalizedDistToCm ─────────────────────────────────────────────

  const convertNormalizedDistToCm = useCallback(
    (
      normalizedDist: number,
      axis: 'x' | 'y',
      frameWidth: number,
      frameHeight: number,
    ): number => {
      if (!calibrationData || calibrationData.pixelsPerCm <= 0) return 0;
      const pixels =
        axis === 'x'
          ? normalizedDist * frameWidth
          : normalizedDist * frameHeight;
      return pixels / calibrationData.pixelsPerCm;
    },
    [calibrationData],
  );

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setCalibrationData(null);
  }, []);

  return {
    calibrationData,
    isCalibrated: calibrationData !== null && calibrationData.pixelsPerCm > 0,
    calibrateFromHeight,
    calibrateManually,
    convertPxToCm,
    convertNormalizedDistToCm,
    reset,
    quality: calibrationData?.calibrationQuality ?? null,
  };
}
