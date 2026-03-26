import React, { useEffect } from 'react';
import type { NormalizedLandmark } from '@/types/measurements';
import { POSE_CONNECTIONS } from '@/utils/poseUtils';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MeasurementLine {
  from: number;
  to: number;
  label: string;
  color?: string;
}

export interface LandmarkOverlayProps {
  landmarks: NormalizedLandmark[] | null;
  videoWidth: number;
  videoHeight: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  showSkeleton?: boolean;
  highlightIndices?: number[];
  measurementLines?: MeasurementLine[];
}

// ─── Drawing constants ────────────────────────────────────────────────────────

const SKELETON_COLOR = 'rgba(0, 210, 255, 0.65)';
const SKELETON_LINE_WIDTH = 2;
const LANDMARK_RADIUS = 4;
const LANDMARK_COLOR = 'rgba(255, 255, 255, 0.85)';
const HIGHLIGHT_COLOR = '#facc15'; // yellow-400
const HIGHLIGHT_RADIUS = 6;
const MEASUREMENT_LINE_WIDTH = 2;
const MEASUREMENT_LABEL_FONT = '11px Inter, system-ui, sans-serif';
const MEASUREMENT_LABEL_BG = 'rgba(0,0,0,0.55)';
const DEFAULT_MEASUREMENT_COLOR = '#f472b6'; // pink-400

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPixel(lm: NormalizedLandmark, w: number, h: number): [number, number] {
  return [lm.x * w, lm.y * h];
}

function isLandmarkVisible(lm: NormalizedLandmark, threshold = 0.3): boolean {
  return (lm.visibility ?? 1) >= threshold;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LandmarkOverlay({
  landmarks,
  videoWidth,
  videoHeight,
  canvasRef,
  showSkeleton = true,
  highlightIndices = [],
  measurementLines = [],
}: LandmarkOverlayProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync canvas resolution with video dimensions
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    // Always clear
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (!landmarks || landmarks.length === 0) return;

    const highlightSet = new Set(highlightIndices);

    // ── 1. Skeleton connections ─────────────────────────────────────────────
    if (showSkeleton) {
      ctx.strokeStyle = SKELETON_COLOR;
      ctx.lineWidth = SKELETON_LINE_WIDTH;
      ctx.lineCap = 'round';

      for (const [fromIdx, toIdx] of POSE_CONNECTIONS) {
        const from = landmarks[fromIdx];
        const to = landmarks[toIdx];
        if (!from || !to) continue;
        if (!isLandmarkVisible(from) || !isLandmarkVisible(to)) continue;

        const [fx, fy] = toPixel(from, videoWidth, videoHeight);
        const [tx, ty] = toPixel(to, videoWidth, videoHeight);

        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }

    // ── 2. Measurement lines (drawn before dots so labels appear on top) ────
    for (const line of measurementLines) {
      const from = landmarks[line.from];
      const to = landmarks[line.to];
      if (!from || !to) continue;
      if (!isLandmarkVisible(from) || !isLandmarkVisible(to)) continue;

      const [fx, fy] = toPixel(from, videoWidth, videoHeight);
      const [tx, ty] = toPixel(to, videoWidth, videoHeight);
      const lineColor = line.color ?? DEFAULT_MEASUREMENT_COLOR;

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = MEASUREMENT_LINE_WIDTH;
      ctx.setLineDash([5, 4]);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label at midpoint
      const midX = (fx + tx) / 2;
      const midY = (fy + ty) / 2;
      ctx.font = MEASUREMENT_LABEL_FONT;
      const metrics = ctx.measureText(line.label);
      const pad = 3;
      const labelW = metrics.width + pad * 2;
      const labelH = 14;

      ctx.fillStyle = MEASUREMENT_LABEL_BG;
      ctx.beginPath();
      ctx.roundRect(midX - labelW / 2, midY - labelH / 2, labelW, labelH, 3);
      ctx.fill();

      ctx.fillStyle = lineColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(line.label, midX, midY);
    }

    // ── 3. Landmark dots ────────────────────────────────────────────────────
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!lm) continue;
      if (!isLandmarkVisible(lm)) continue;

      const [px, py] = toPixel(lm, videoWidth, videoHeight);
      const isHighlighted = highlightSet.has(i);

      if (isHighlighted) {
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, HIGHLIGHT_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.fill();

        // Filled dot
        ctx.beginPath();
        ctx.arc(px, py, HIGHLIGHT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = HIGHLIGHT_COLOR;
        ctx.fill();
      } else {
        // Standard dot
        ctx.beginPath();
        ctx.arc(px, py, LANDMARK_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = LANDMARK_COLOR;
        ctx.fill();

        // Thin border for contrast
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [
    landmarks,
    videoWidth,
    videoHeight,
    canvasRef,
    showSkeleton,
    highlightIndices,
    measurementLines,
  ]);

  // The canvas element is owned by CameraPreview; this component only draws on it
  return null;
}
