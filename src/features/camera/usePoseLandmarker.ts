import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

// ─── Singleton state (module-level, survives React StrictMode double-mount) ───

let landmarkerInstance: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

async function getPoseLandmarker(
  minDetectionConfidence: number,
  minPresenceConfidence: number,
  minTrackingConfidence: number,
): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  if (!initPromise) {
    initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: minDetectionConfidence,
        minPosePresenceConfidence: minPresenceConfidence,
        minTrackingConfidence: minTrackingConfidence,
        outputSegmentationMasks: false,
      });
      landmarkerInstance = landmarker;
      return landmarker;
    })().catch((err) => {
      // Reset so a retry is possible
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UsePoseLandmarkerOptions {
  onResult?: (result: PoseLandmarkerResult) => void;
  /** default 0.5 */
  minDetectionConfidence?: number;
  /** default 0.5 */
  minPresenceConfidence?: number;
  /** default 0.5 */
  minTrackingConfidence?: number;
}

export interface UsePoseLandmarkerReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
  detectSingleFrame: (videoElement: HTMLVideoElement) => PoseLandmarkerResult | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePoseLandmarker(
  options: UsePoseLandmarkerOptions = {},
): UsePoseLandmarkerReturn {
  const {
    onResult,
    minDetectionConfidence = 0.5,
    minPresenceConfidence = 0.5,
    minTrackingConfidence = 0.5,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const onResultRef = useRef(onResult);
  // Keep callback ref up to date without restarting detection
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Initialize the landmarker on mount
  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getPoseLandmarker(
      minDetectionConfidence,
      minPresenceConfidence,
      minTrackingConfidence,
    )
      .then(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsReady(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load pose landmarker';
          setError(message);
          setIsLoading(false);
          setIsReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Confidence thresholds intentionally excluded — changing them would require
    // re-creating the singleton which is expensive. Accept initial values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Detection loop ──────────────────────────────────────────────────────────

  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const startDetection = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!landmarkerInstance) {
        setError('Pose landmarker is not ready yet');
        return;
      }

      if (isRunningRef.current) {
        stopDetection();
      }

      isRunningRef.current = true;

      const detect = () => {
        if (!isRunningRef.current) return;

        try {
          if (
            videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !videoElement.paused &&
            !videoElement.ended &&
            landmarkerInstance
          ) {
            const result = landmarkerInstance.detectForVideo(
              videoElement,
              performance.now(),
            );
            onResultRef.current?.(result);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Detection error';
          setError(message);
          isRunningRef.current = false;
          return;
        }

        rafIdRef.current = requestAnimationFrame(detect);
      };

      rafIdRef.current = requestAnimationFrame(detect);
    },
    [stopDetection],
  );

  const detectSingleFrame = useCallback(
    (videoElement: HTMLVideoElement): PoseLandmarkerResult | null => {
      if (!landmarkerInstance) return null;
      try {
        if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return null;
        }
        return landmarkerInstance.detectForVideo(videoElement, performance.now());
      } catch {
        return null;
      }
    },
    [],
  );

  // Cleanup on unmount — stop RAF loop but do NOT close singleton
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return { isLoading, isReady, error, startDetection, stopDetection, detectSingleFrame };
}
