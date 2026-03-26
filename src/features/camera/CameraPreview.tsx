import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CaptureQuality } from '@/types/camera';
import type { NormalizedLandmark } from '@/types/measurements';
import { CaptureQualityIndicator } from './CaptureQualityIndicator';
import { LandmarkOverlay } from './LandmarkOverlay';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CameraPreviewProps {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
  showLandmarks?: boolean;
  landmarks?: NormalizedLandmark[] | null;
  quality?: CaptureQuality | null;
  /** e.g. "Front View" or "Side View (Left)" */
  viewLabel?: string;
  /** Activates countdown overlay */
  isCapturing?: boolean;
  countdownSeconds?: number;
  onCaptureComplete?: () => void;
  facingMode?: 'user' | 'environment';
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PermissionDeniedUI() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-900 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <svg
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 9.75v9A2.25 2.25 0 004.5 18.75z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-white">Camera access denied</p>
        <p className="mt-1 text-sm text-gray-400">
          BikeFit Camera needs access to your camera to analyse your body measurements.
        </p>
      </div>
      <div className="rounded-lg bg-gray-800 p-4 text-left text-sm text-gray-300">
        <p className="font-medium text-white">To enable camera access:</p>
        <ol className="mt-2 list-decimal list-inside space-y-1">
          <li>Click the camera icon in your browser's address bar</li>
          <li>Select "Allow" for camera permissions</li>
          <li>Reload this page</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CameraPreview({
  onStreamReady,
  onError,
  showLandmarks = true,
  landmarks = null,
  quality = null,
  viewLabel,
  isCapturing = false,
  countdownSeconds = 3,
  onCaptureComplete,
  facingMode = 'environment',
  className = '',
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isInitializing, setIsInitializing] = useState(true);

  // ── Camera init ────────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setPermissionDenied(false);
    setInitError(null);

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      if (isDenied) {
        setPermissionDenied(true);
      } else {
        const msg =
          err instanceof Error ? err.message : 'Could not access camera';
        setInitError(msg);
        onError?.(msg);
      }
      setIsInitializing(false);
      return;
    }

    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      setIsInitializing(false);
      return;
    }

    video.srcObject = stream;
    video.onloadedmetadata = () => {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      setVideoDimensions({ width: w, height: h });

      // Sync canvas size immediately
      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }
    };

    try {
      await video.play();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not play video stream';
      setInitError(msg);
      onError?.(msg);
      setIsInitializing(false);
      return;
    }

    setIsInitializing(false);
    onStreamReady?.(stream);
  }, [facingMode, onError, onStreamReady]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
    // startCamera has stable identity; re-run when facingMode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Countdown logic ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isCapturing) {
      setCountdown(countdownSeconds);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    setCountdown(countdownSeconds);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          onCaptureComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isCapturing, countdownSeconds, onCaptureComplete]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (permissionDenied) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{ aspectRatio: '16/9' }}>
        <PermissionDeniedUI />
      </div>
    );
  }

  if (initError) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gray-900 ${className}`}
        style={{ aspectRatio: '16/9' }}
      >
        <p className="text-sm text-red-400 px-6 text-center">{initError}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Canvas overlay for landmarks — positioned identically to video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        width={videoDimensions.width}
        height={videoDimensions.height}
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Landmark drawing (renders into canvasRef) */}
      {showLandmarks && (
        <LandmarkOverlay
          landmarks={landmarks}
          videoWidth={videoDimensions.width}
          videoHeight={videoDimensions.height}
          canvasRef={canvasRef}
        />
      )}

      {/* View label — top left */}
      {viewLabel && (
        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-lg bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {viewLabel}
          </span>
        </div>
      )}

      {/* Quality indicator — top right */}
      {quality && (
        <div className="absolute right-3 top-3 z-10">
          <CaptureQualityIndicator quality={quality} />
        </div>
      )}

      {/* Initializing overlay */}
      {isInitializing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/80">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {isCapturing && !isInitializing && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <span
            className="text-8xl font-bold tabular-nums text-white drop-shadow-lg"
            style={{ textShadow: '0 0 40px rgba(0,210,255,0.8)' }}
          >
            {countdown > 0 ? countdown : ''}
          </span>
          <p className="mt-4 text-base font-medium text-white/80">Hold your pose…</p>
        </div>
      )}

      {/* Grid guide overlay (subtle thirds-grid to help user frame themselves) */}
      {!isCapturing && !isInitializing && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="h-full w-full" style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '33.33% 33.33%',
          }} />
        </div>
      )}
    </div>
  );
}
