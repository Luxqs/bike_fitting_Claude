import { useCallback, useRef, useState } from 'react';
import type { NormalizedLandmark } from '@/types/measurements';
import type { SmoothedPose } from '@/types/camera';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_SIZE = 15;
const MOTION_STABILITY_THRESHOLD = 0.008;
const STABLE_FRAMES_REQUIRED = 10;
// Key landmark indices used for motion scoring
const MOTION_KEY_INDICES = [11, 12, 23, 24, 25, 26]; // shoulders, hips, knees

// ─── Internal frame record ────────────────────────────────────────────────────

interface FrameRecord {
  landmarks: NormalizedLandmark[];
  worldLandmarks: NormalizedLandmark[];
  confidence: number;
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseFrameSmoothingReturn {
  addFrame: (
    landmarks: NormalizedLandmark[],
    worldLandmarks: NormalizedLandmark[],
    confidence: number,
  ) => void;
  getSmoothed: () => SmoothedPose | null;
  reset: () => void;
  frameCount: number;
  isStable: boolean;
  motionScore: number;
  currentConfidence: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFrameSmoothing(): UseFrameSmoothingReturn {
  // Ring buffer stored in a ref so it doesn't trigger re-renders on every frame
  const bufferRef = useRef<FrameRecord[]>([]);
  const headRef = useRef(0); // next write position (ring buffer head)
  const countRef = useRef(0); // number of frames currently stored (≤ BUFFER_SIZE)

  // Stable-frame counter
  const stableStreakRef = useRef(0);

  // Expose a small amount of state for consumers that need reactive updates
  const [frameCount, setFrameCount] = useState(0);
  const [isStable, setIsStable] = useState(false);
  const [motionScore, setMotionScore] = useState(0);
  const [currentConfidence, setCurrentConfidence] = useState(0);

  // ── Motion score helper ───────────────────────────────────────────────────

  const computeMotionScore = useCallback(
    (prev: NormalizedLandmark[], curr: NormalizedLandmark[]): number => {
      let total = 0;
      let counted = 0;
      for (const idx of MOTION_KEY_INDICES) {
        const p = prev[idx];
        const c = curr[idx];
        if (!p || !c) continue;
        const dx = c.x - p.x;
        const dy = c.y - p.y;
        total += Math.sqrt(dx * dx + dy * dy);
        counted++;
      }
      return counted > 0 ? total / counted : 0;
    },
    [],
  );

  // ── addFrame ──────────────────────────────────────────────────────────────

  const addFrame = useCallback(
    (
      landmarks: NormalizedLandmark[],
      worldLandmarks: NormalizedLandmark[],
      confidence: number,
    ) => {
      const buffer = bufferRef.current;
      const head = headRef.current;
      const prevCount = countRef.current;

      // Compute motion score vs previous frame (if any)
      let score = 0;
      if (prevCount > 0) {
        const prevIdx = (head - 1 + BUFFER_SIZE) % BUFFER_SIZE;
        const prevFrame = buffer[prevIdx];
        if (prevFrame) {
          score = computeMotionScore(prevFrame.landmarks, landmarks);
        }
      }

      // Write into ring buffer
      buffer[head] = { landmarks, worldLandmarks, confidence };
      headRef.current = (head + 1) % BUFFER_SIZE;
      countRef.current = Math.min(prevCount + 1, BUFFER_SIZE);

      // Update stability streak
      if (score < MOTION_STABILITY_THRESHOLD && prevCount > 0) {
        stableStreakRef.current = Math.min(
          stableStreakRef.current + 1,
          STABLE_FRAMES_REQUIRED + 5,
        );
      } else {
        stableStreakRef.current = 0;
      }

      const newCount = countRef.current;
      const stable = stableStreakRef.current >= STABLE_FRAMES_REQUIRED;

      setFrameCount(newCount);
      setMotionScore(score);
      setIsStable(stable);
      setCurrentConfidence(confidence);
    },
    [computeMotionScore],
  );

  // ── getSmoothed ───────────────────────────────────────────────────────────

  const getSmoothed = useCallback((): SmoothedPose | null => {
    const count = countRef.current;
    if (count === 0) return null;

    const buffer = bufferRef.current;
    const head = headRef.current;

    // Gather frames in chronological order (oldest first)
    const frames: FrameRecord[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (head - count + i + BUFFER_SIZE * 2) % BUFFER_SIZE;
      const frame = buffer[idx];
      if (frame) frames.push(frame);
    }

    if (frames.length === 0) return null;

    // Determine landmark count from first frame
    const landmarkCount = frames[0].landmarks.length;
    const worldLandmarkCount = frames[0].worldLandmarks.length;

    // Build weighted-average landmarks
    // weight = visibility × (1 + frameRecency), where recency = frame index / total
    const smoothedLandmarks: NormalizedLandmark[] = [];
    const smoothedWorldLandmarks: NormalizedLandmark[] = [];

    for (let lmIdx = 0; lmIdx < landmarkCount; lmIdx++) {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      let sumVis = 0;
      let totalWeight = 0;

      for (let fIdx = 0; fIdx < frames.length; fIdx++) {
        const frame = frames[fIdx];
        const lm = frame.landmarks[lmIdx];
        if (!lm) continue;

        const recency = fIdx / frames.length; // 0 = oldest, approaches 1 for newest
        const visibility = lm.visibility ?? 1;
        const weight = visibility * (1 + recency);

        sumX += lm.x * weight;
        sumY += lm.y * weight;
        sumZ += lm.z * weight;
        sumVis += visibility * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        smoothedLandmarks.push({
          x: sumX / totalWeight,
          y: sumY / totalWeight,
          z: sumZ / totalWeight,
          visibility: sumVis / totalWeight,
        });
      } else {
        // Fallback: use latest frame
        smoothedLandmarks.push(frames[frames.length - 1].landmarks[lmIdx]);
      }
    }

    // World landmarks (no visibility property)
    for (let lmIdx = 0; lmIdx < worldLandmarkCount; lmIdx++) {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      let totalWeight = 0;

      for (let fIdx = 0; fIdx < frames.length; fIdx++) {
        const frame = frames[fIdx];
        const lm = frame.worldLandmarks[lmIdx];
        if (!lm) continue;

        // For world landmarks use uniform recency weighting (no visibility)
        const recency = fIdx / frames.length;
        const weight = 1 + recency;

        sumX += lm.x * weight;
        sumY += lm.y * weight;
        sumZ += lm.z * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        smoothedWorldLandmarks.push({
          x: sumX / totalWeight,
          y: sumY / totalWeight,
          z: sumZ / totalWeight,
        });
      } else {
        smoothedWorldLandmarks.push(frames[frames.length - 1].worldLandmarks[lmIdx]);
      }
    }

    // Mean confidence across all frames in buffer
    const meanConfidence =
      frames.reduce((acc, f) => acc + f.confidence, 0) / frames.length;

    return {
      landmarks: smoothedLandmarks,
      worldLandmarks: smoothedWorldLandmarks,
      meanConfidence,
      framesUsed: frames.length,
    };
  }, []);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    bufferRef.current = [];
    headRef.current = 0;
    countRef.current = 0;
    stableStreakRef.current = 0;
    setFrameCount(0);
    setIsStable(false);
    setMotionScore(0);
    setCurrentConfidence(0);
  }, []);

  return {
    addFrame,
    getSmoothed,
    reset,
    frameCount,
    isStable,
    motionScore,
    currentConfidence,
  };
}
