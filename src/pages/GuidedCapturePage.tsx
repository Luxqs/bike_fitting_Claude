// ─── GuidedCapturePage ────────────────────────────────────────────────────────
//
// Step-by-step guided pose capture with auto-detection and countdown.
// State machine: IDLE → INSTRUCTIONS → DETECTING → COUNTDOWN → CAPTURED → NEXT | DONE

import { useState, useCallback, useRef, useEffect } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { CameraPreview } from '@/features/camera/CameraPreview';
import { usePoseLandmarker } from '@/features/camera/usePoseLandmarker';
import { useFrameSmoothing } from '@/features/camera/useFrameSmoothing';
import { useMeasurements } from '@/features/measurements/useMeasurements';
import { useWizard } from '@/context/AppContext';
import type { NormalizedLandmark, PoseId, PoseCapture } from '@/types/measurements';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

// ─── Pose sequence ────────────────────────────────────────────────────────────

interface PoseInstruction {
  id: PoseId;
  label: string;
  icon: string;
  viewAngle: 'front' | 'side';
  instruction: string;
  hint: string;
  isOptional: boolean;
}

const POSE_SEQUENCE: PoseInstruction[] = [
  {
    id: 'neutral-front',
    label: 'Neutral Stand — Front',
    icon: '🧍',
    viewAngle: 'front',
    instruction: 'Face the camera directly. Stand naturally with feet hip-width apart, arms relaxed at your sides.',
    hint: 'Keep your weight even on both feet. Look straight ahead.',
    isOptional: false,
  },
  {
    id: 't-pose-front',
    label: 'T-Pose — Front',
    icon: '✈️',
    viewAngle: 'front',
    instruction: 'Extend both arms straight out to the sides at shoulder height — like a T or an aeroplane.',
    hint: 'Keep arms level with shoulders. Fingers extended.',
    isOptional: false,
  },
  {
    id: 'arms-overhead-front',
    label: 'Arms Overhead — Front',
    icon: '🙋',
    viewAngle: 'front',
    instruction: 'Raise both arms straight overhead, palms facing inward.',
    hint: 'Reach as high as comfortably possible.',
    isOptional: false,
  },
  {
    id: 'neutral-side',
    label: 'Neutral Stand — Side',
    icon: '🧍',
    viewAngle: 'side',
    instruction: 'Turn 90° so your LEFT side faces the camera. Stand naturally, arms relaxed.',
    hint: 'Your left ear, shoulder, hip, knee, and ankle should form a rough vertical line.',
    isOptional: false,
  },
  {
    id: 'knee-lift-side',
    label: 'Knee Lift — Side',
    icon: '🦵',
    viewAngle: 'side',
    instruction: 'Lift your LEFT knee as high as comfortably possible, then hold still.',
    hint: 'This tests hip flexion range. Hold the raised position for the capture.',
    isOptional: false,
  },
  {
    id: 'squat-side',
    label: 'Shallow Squat — Side',
    icon: '🏋️',
    viewAngle: 'side',
    instruction: 'Perform a slow, shallow squat to about 90° knee bend, then hold still.',
    hint: 'Keep heels on the floor if possible. This tests flexibility and knee angle.',
    isOptional: false,
  },
  {
    id: 'forward-bend-side',
    label: 'Forward Bend — Side',
    icon: '🤸',
    viewAngle: 'side',
    instruction: 'Bend forward from the hips as far as comfortable, keeping your legs straight. Hold still.',
    hint: 'This is our flexibility test. Reach toward your ankles as far as you can go comfortably.',
    isOptional: false,
  },
];

type CaptureState = 'instructions' | 'detecting' | 'countdown' | 'captured' | 'done' | 'error';

export function GuidedCapturePage() {
  const { state, dispatch } = useWizard();
  const { computeFromPoses } = useMeasurements();

  const [poseIdx,       setPoseIdx]       = useState(0);
  const [captureState,  setCaptureState]  = useState<CaptureState>('instructions');
  const [countdown,     setCountdown]     = useState(3);
  const [capturedPoses, setCapturedPoses] = useState<Partial<Record<PoseId, PoseCapture>>>({});
  const [landmarks,     setLandmarks]     = useState<NormalizedLandmark[] | null>(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [videoSize,     setVideoSize]     = useState({ width: 640, height: 480 });

  const smoother          = useFrameSmoothing();
  const stableTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedRef       = useRef(capturedPoses);
  capturedRef.current     = capturedPoses;

  const currentPose = POSE_SEQUENCE[poseIdx];

  // ── MediaPipe result handler ───────────────────────────────────────────────
  const handleResult = useCallback((result: PoseLandmarkerResult) => {
    if (!result.landmarks?.length) return;
    const lm  = result.landmarks[0] as NormalizedLandmark[];
    const wl  = (result.worldLandmarks?.[0] ?? []) as NormalizedLandmark[];
    const vis = lm.reduce((s, l) => s + (l.visibility ?? 0.5), 0) / lm.length;
    smoother.addFrame(lm, wl, vis);
    const smoothed = smoother.getSmoothed();
    if (smoothed) setLandmarks(smoothed.landmarks);
  }, [smoother]);

  const { isLoading, error: poseError, startDetection } = usePoseLandmarker({ onResult: handleResult });

  // ── Auto-capture trigger ───────────────────────────────────────────────────
  useEffect(() => {
    if (captureState !== 'detecting') return;
    if (!smoother.isStable || smoother.currentConfidence < 0.5) {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
      return;
    }
    // Start stable timer
    if (!stableTimerRef.current) {
      stableTimerRef.current = setTimeout(() => {
        startCountdown();
      }, 1500);
    }
  }, [smoother.isStable, smoother.currentConfidence, captureState]);

  const startCountdown = () => {
    setCaptureState('countdown');
    setCountdown(3);
    let c = 3;
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current!);
        captureCurrentPose();
      }
    }, 1000);
  };

  const captureCurrentPose = useCallback(() => {
    const smoothed = smoother.getSmoothed();
    if (!smoothed || !currentPose) return;

    const capture: PoseCapture = {
      poseId:         currentPose.id,
      viewAngle:      currentPose.viewAngle,
      landmarks:      smoothed.landmarks,
      worldLandmarks: smoothed.worldLandmarks,
      frameCount:     smoothed.framesUsed,
      capturedAt:     Date.now(),
      confidence:     smoothed.meanConfidence,
    };

    setCapturedPoses(prev => ({ ...prev, [currentPose.id]: capture }));
    dispatch({ type: 'ADD_POSE', payload: capture });
    smoother.reset();
    setCaptureState('captured');

    if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
  }, [smoother, currentPose, dispatch]);

  const nextPose = () => {
    if (poseIdx + 1 >= POSE_SEQUENCE.length) {
      finishCapture();
    } else {
      setPoseIdx(i => i + 1);
      setCaptureState('instructions');
      smoother.reset();
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
    }
  };

  const finishCapture = () => {
    // Compute measurements from all captured poses
    if (state.calibration) {
      const { measurements } = computeFromPoses(
        capturedRef.current,
        state.calibration,
        state.riderProfile!,
        videoSize.width,
        videoSize.height,
      );
      dispatch({ type: 'SET_MEASUREMENTS', payload: measurements });
    }
    dispatch({ type: 'SET_STEP', payload: 'manual-input' });
  };

  const handleStreamReady = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    setVideoSize({ width: settings.width ?? 640, height: settings.height ?? 480 });
  };

  const progressPct = Math.round((poseIdx / POSE_SEQUENCE.length) * 100);

  if (!currentPose) return null;

  return (
    <WizardLayout
      title="Guided Poses"
      showProgress={false}
      onBack={poseIdx > 0 ? () => { setPoseIdx(i => i - 1); setCaptureState('instructions'); smoother.reset(); } : () => dispatch({ type: 'SET_STEP', payload: 'calibration' })}
      hideNext={true}
    >
      {/* Pose progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Pose {poseIdx + 1} of {POSE_SEQUENCE.length}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex gap-1 mt-2">
          {POSE_SEQUENCE.map((p, i) => (
            <div key={p.id} className={`flex-1 h-1 rounded-full ${
              i < poseIdx ? 'bg-green-400' : i === poseIdx ? 'bg-brand-500' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Current pose header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{currentPose.icon}</span>
          <div>
            <p className="font-semibold text-gray-900">{currentPose.label}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${currentPose.viewAngle === 'front' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
              {currentPose.viewAngle === 'front' ? '📷 Front view' : '📷 Side view (left)'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{currentPose.instruction}</p>
        <p className="text-xs text-gray-400 mt-1 italic">💡 {currentPose.hint}</p>
      </div>

      {poseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 text-sm text-red-700">
          Camera error: {poseError}
          <button className="ml-2 underline" onClick={finishCapture}>Skip to manual input</button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-brand-600 mb-3">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading pose model…
        </div>
      )}

      {/* Camera */}
      {captureState !== 'captured' && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 mb-3">
          <CameraPreview
            onStreamReady={handleStreamReady}
            onError={setErrorMsg}
            showLandmarks={captureState === 'detecting' || captureState === 'countdown'}
            landmarks={landmarks}
            viewLabel={currentPose.viewAngle === 'front' ? 'Front view' : 'Side view — left side toward camera'}
            isCapturing={captureState === 'countdown'}
            countdownSeconds={countdown}
          />
        </div>
      )}

      {/* State-specific UI */}
      {captureState === 'instructions' && (
        <button
          onClick={() => { setCaptureState('detecting'); smoother.reset(); }}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
        >
          I'm in position — Start Detection
        </button>
      )}

      {captureState === 'detecting' && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
          {smoother.isStable && smoother.currentConfidence >= 0.5 ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Stable! Starting countdown…</span>
            </div>
          ) : (
            <div>
              <p className="text-sm text-brand-700">
                {!smoother.isStable ? 'Hold still…' : 'Adjust position for better landmark visibility…'}
              </p>
              <p className="text-xs text-brand-500 mt-1">
                Confidence: {Math.round(smoother.currentConfidence * 100)}%
              </p>
            </div>
          )}
          <button
            onClick={() => setCaptureState('instructions')}
            className="mt-3 text-xs text-gray-400 underline"
          >
            Cancel
          </button>
        </div>
      )}

      {captureState === 'countdown' && (
        <div className="bg-brand-600 text-white rounded-xl p-6 text-center">
          <div className="text-7xl font-bold tabular-nums">{countdown}</div>
          <p className="text-brand-200 text-sm mt-2">Hold your position!</p>
        </div>
      )}

      {captureState === 'captured' && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-green-800">Pose captured!</p>
            <p className="text-sm text-green-600 mt-1">
              Confidence: {Math.round((capturedPoses[currentPose.id]?.confidence ?? 0) * 100)}%
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setCaptureState('detecting'); smoother.reset(); }}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              Retry
            </button>
            <button
              onClick={nextPose}
              className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700"
            >
              {poseIdx + 1 >= POSE_SEQUENCE.length ? 'Finish & Calculate' : 'Next Pose →'}
            </button>
          </div>
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-400 mt-2">{errorMsg}</p>}

      {/* Skip option */}
      <button
        onClick={finishCapture}
        className="w-full mt-4 py-2 text-xs text-gray-400 hover:text-gray-600 underline"
      >
        Skip remaining poses and continue with captured data
      </button>
    </WizardLayout>
  );
}
