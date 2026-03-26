// ─── CalibrationPage ──────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { useWizard } from '@/context/AppContext';
import { CameraPreview } from '@/features/camera/CameraPreview';
import { usePoseLandmarker } from '@/features/camera/usePoseLandmarker';
import { useFrameSmoothing } from '@/features/camera/useFrameSmoothing';
import { useCalibration } from '@/features/calibration/useCalibration';
import type { NormalizedLandmark } from '@/types/measurements';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export function CalibrationPage() {
  const { state, dispatch } = useWizard();
  const profile = state.riderProfile!;

  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [status, setStatus] = useState<'waiting' | 'detecting' | 'calibrated' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });

  const smoother = useFrameSmoothing();
  const { calibrateFromHeight, calibrationData, isCalibrated } = useCalibration();

  const handleResult = useCallback((result: PoseLandmarkerResult) => {
    if (!result.landmarks || result.landmarks.length === 0) return;
    const lm = result.landmarks[0] as NormalizedLandmark[];
    const wl = (result.worldLandmarks?.[0] ?? []) as NormalizedLandmark[];
    const conf = lm.reduce((s, l) => s + (l.visibility ?? 0), 0) / lm.length;
    smoother.addFrame(lm, wl, conf);
    const smoothed = smoother.getSmoothed();
    if (smoothed) {
      setLandmarks(smoothed.landmarks);
      setStatus('detecting');
    }
  }, [smoother]);

  const { isLoading, isReady, error: poseError, startDetection, stopDetection } = usePoseLandmarker({ onResult: handleResult });

  const handleStreamReady = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    setVideoSize({ width: settings.width ?? 640, height: settings.height ?? 480 });
  }, []);

  // Auto-calibrate when landmarks are stable
  useEffect(() => {
    if (!smoother.isStable || isCalibrated || !landmarks) return;
    const result = calibrateFromHeight(landmarks, videoSize.height, profile.heightCm);
    if (result) setStatus('calibrated');
  }, [smoother.isStable, isCalibrated, landmarks, calibrateFromHeight, videoSize.height, profile.heightCm]);

  const handleNext = () => {
    if (calibrationData) {
      dispatch({ type: 'SET_CALIBRATION', payload: calibrationData });
      dispatch({ type: 'SET_STEP', payload: 'guided-capture' });
    }
  };

  return (
    <WizardLayout
      title="Camera Calibration"
      onBack={() => dispatch({ type: 'SET_STEP', payload: 'camera-setup' })}
      onNext={isCalibrated ? handleNext : undefined}
      nextLabel="Calibrated — Start Poses"
      nextDisabled={!isCalibrated}
    >
      <p className="text-gray-500 text-sm mb-4 leading-relaxed">
        Stand in a neutral position facing the camera. Your full body must be visible.
        We'll use your height ({profile.heightCm} cm) to calibrate the scale.
      </p>

      {poseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700">Camera error: {poseError}</p>
          <button
            className="text-xs text-red-600 underline mt-1"
            onClick={() => {
              dispatch({ type: 'SKIP_CAMERA' });
              dispatch({ type: 'SET_STEP', payload: 'manual-input' });
            }}
          >
            Skip to manual input instead
          </button>
        </div>
      )}

      {isLoading && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-brand-700">Loading pose detection model…</p>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4">
        <CameraPreview
          onStreamReady={handleStreamReady}
          onError={setErrorMsg}
          showLandmarks={true}
          landmarks={landmarks}
          viewLabel="Stand facing camera — full body visible"
        />
      </div>

      {/* Status */}
      <div className={`rounded-xl p-4 border ${
        status === 'calibrated' ? 'bg-green-50 border-green-200' :
        status === 'detecting'  ? 'bg-brand-50 border-brand-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        {status === 'waiting' && (
          <p className="text-sm text-gray-600">Waiting for pose detection to start…</p>
        )}
        {status === 'detecting' && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-brand-700">
              {smoother.isStable ? 'Stable — calibrating…' : 'Stand still and face the camera…'}
            </p>
          </div>
        )}
        {status === 'calibrated' && (
          <div>
            <p className="text-sm font-semibold text-green-700">✓ Calibration complete!</p>
            <p className="text-xs text-green-600 mt-1">
              Scale: {calibrationData?.pixelsPerCm.toFixed(1)} px/cm ·
              Quality: {calibrationData?.calibrationQuality}
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-red-500 mt-2">{errorMsg}</p>
      )}

      <button
        onClick={() => {
          dispatch({ type: 'SKIP_CAMERA' });
          dispatch({ type: 'SET_STEP', payload: 'manual-input' });
        }}
        className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600 underline"
      >
        Skip camera → enter measurements manually
      </button>
    </WizardLayout>
  );
}
