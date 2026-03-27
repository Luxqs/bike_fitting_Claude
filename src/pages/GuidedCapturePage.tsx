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
import { LM } from '@/utils/poseUtils';
import type { NormalizedLandmark, PoseId, PoseCapture } from '@/types/measurements';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';

// ─── Pose sequence ────────────────────────────────────────────────────────────

interface PoseStep {
  id: PoseId;
  label: string;
  icon: string;
  viewAngle: 'front' | 'side';
  instruction: string;
  hint: string;
  isOptional: boolean;
  /** Landmark indices to highlight (yellow dots) for this pose */
  highlightIndices: number[];
  /** Which body parts are being tracked — shown as tags below camera */
  trackingLabel: string;
}

const POSE_SEQUENCE: PoseStep[] = [
  {
    id: 'neutral-front',
    label: 'Neutral Stand — Front',
    icon: '🧍',
    viewAngle: 'front',
    instruction: 'Face the camera directly. Stand naturally with feet hip-width apart, arms relaxed at your sides.',
    hint: 'Keep your weight even on both feet. Look straight ahead.',
    isOptional: false,
    highlightIndices: [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    trackingLabel: 'Shoulders · Hips · Ankles — full body alignment',
  },
  {
    id: 't-pose-front',
    label: 'T-Pose — Front',
    icon: '✈️',
    viewAngle: 'front',
    instruction: 'Extend both arms straight out to the sides at shoulder height — like a T or an aeroplane.',
    hint: 'Keep arms level with shoulders. Fingers extended.',
    isOptional: false,
    highlightIndices: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST],
    trackingLabel: 'Arms · Shoulders · Wrists — arm span & shoulder width',
  },
  {
    id: 'arms-overhead-front',
    label: 'Arms Overhead — Front',
    icon: '🙋',
    viewAngle: 'front',
    instruction: 'Raise both arms straight overhead, palms facing inward.',
    hint: 'Reach as high as comfortably possible.',
    isOptional: false,
    highlightIndices: [LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
    trackingLabel: 'Arms · Wrists — overhead reach',
  },
  {
    id: 'neutral-side',
    label: 'Neutral Stand — Side',
    icon: '🧍',
    viewAngle: 'side',
    instruction: 'Turn 90° so your LEFT side faces the camera. Stand naturally, arms relaxed.',
    hint: 'Your left ear, shoulder, hip, knee, and ankle should form a rough vertical line.',
    isOptional: false,
    highlightIndices: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_HEEL],
    trackingLabel: 'Shoulder · Hip · Knee · Ankle — inseam & torso length',
  },
  {
    id: 'knee-lift-side',
    label: 'Knee Lift — Side',
    icon: '🦵',
    viewAngle: 'side',
    instruction: 'Lift your LEFT knee as high as comfortably possible, then hold still.',
    hint: 'This tests hip flexion range. Hold the raised position for the capture.',
    isOptional: false,
    highlightIndices: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    trackingLabel: 'Hip · Knee · Ankle — hip flexion range',
  },
  {
    id: 'squat-side',
    label: 'Shallow Squat — Side',
    icon: '🏋️',
    viewAngle: 'side',
    instruction: 'Perform a slow, shallow squat to about 90° knee bend, then hold still.',
    hint: 'Keep heels on the floor if possible. This tests flexibility and knee angle.',
    isOptional: false,
    highlightIndices: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_HEEL],
    trackingLabel: 'Hip · Knee · Ankle — knee angle & flexibility',
  },
  {
    id: 'forward-bend-side',
    label: 'Forward Bend — Side',
    icon: '🤸',
    viewAngle: 'side',
    instruction: 'Bend forward from the hips as far as comfortable, keeping your legs straight. Hold still.',
    hint: 'This is our flexibility test. Reach toward your ankles as far as you can go comfortably.',
    isOptional: false,
    highlightIndices: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
    trackingLabel: 'Shoulder · Hip · Spine — flexibility assessment',
  },
];

// ─── Live coaching ────────────────────────────────────────────────────────────

interface Coaching {
  text: string;
  subtext?: string;
  level: 'green' | 'yellow' | 'red';
}

function getCoaching(
  lm: NormalizedLandmark[] | null,
  viewAngle: 'front' | 'side',
  poseId: PoseId,
  isStable: boolean,
  confidence: number,
): Coaching {
  if (!lm || lm.length < 33) {
    return { text: 'No person detected', subtext: 'Step in front of the camera so your full body is visible', level: 'red' };
  }

  const vis = (idx: number) => lm[idx]?.visibility ?? 0;
  const seen = (idx: number) => vis(idx) > 0.45;

  // Head / feet in frame
  const headVisible = seen(LM.NOSE);
  const leftAnkleVisible  = seen(LM.LEFT_ANKLE);
  const rightAnkleVisible = seen(LM.RIGHT_ANKLE);
  const feetVisible = leftAnkleVisible || rightAnkleVisible;

  if (!headVisible) {
    return { text: 'Head not visible', subtext: 'Step back from the camera — we need to see your full body', level: 'red' };
  }

  const nose = lm[LM.NOSE];

  if (!feetVisible) {
    return { text: 'Feet not in frame', subtext: 'Step further back so your feet are visible', level: 'yellow' };
  }

  // Too close — nose near top of frame
  if (nose.y < 0.08) {
    return { text: 'Too close to camera', subtext: 'Take 2–3 steps back so your whole body fits in frame', level: 'yellow' };
  }

  // Too far — body occupies less than half the frame height
  const ankle = lm[LM.LEFT_ANKLE] ?? lm[LM.RIGHT_ANKLE];
  if (ankle && (ankle.y - nose.y) < 0.4) {
    return { text: 'Too far from camera', subtext: 'Move closer — your body should fill most of the frame', level: 'yellow' };
  }

  // Off-center check using hip midpoint
  const lHip = lm[LM.LEFT_HIP];
  const rHip = lm[LM.RIGHT_HIP];
  if (seen(LM.LEFT_HIP) && seen(LM.RIGHT_HIP)) {
    const hipMidX = (lHip.x + rHip.x) / 2;
    if (hipMidX < 0.3) {
      return { text: 'Move right', subtext: 'Centre yourself in the frame', level: 'yellow' };
    }
    if (hipMidX > 0.7) {
      return { text: 'Move left', subtext: 'Centre yourself in the frame', level: 'yellow' };
    }
  }

  // Side-view: check person is actually side-on (not facing camera)
  if (viewAngle === 'side') {
    const lShoulder = lm[LM.LEFT_SHOULDER];
    const rShoulder = lm[LM.RIGHT_SHOULDER];
    if (seen(LM.LEFT_SHOULDER) && seen(LM.RIGHT_SHOULDER)) {
      const shoulderSpreadX = Math.abs(lShoulder.x - rShoulder.x);
      if (shoulderSpreadX > 0.18) {
        return { text: 'Turn sideways', subtext: 'Rotate 90° so your LEFT side faces the camera', level: 'yellow' };
      }
    }
  }

  // T-pose: check arms are actually spread
  if (poseId === 't-pose-front') {
    const lWrist = lm[LM.LEFT_WRIST];
    const rWrist = lm[LM.RIGHT_WRIST];
    if (seen(LM.LEFT_WRIST) && seen(LM.RIGHT_WRIST)) {
      const spreadX = Math.abs(lWrist.x - rWrist.x);
      if (spreadX < 0.5) {
        return { text: 'Spread arms wider', subtext: 'Extend both arms fully out to the sides at shoulder height', level: 'yellow' };
      }
    }
  }

  // Arms-overhead: check wrists are above head
  if (poseId === 'arms-overhead-front') {
    const lWrist = lm[LM.LEFT_WRIST];
    if (seen(LM.LEFT_WRIST) && seen(LM.NOSE)) {
      if (lWrist.y > nose.y + 0.05) {
        return { text: 'Raise arms higher', subtext: 'Lift both arms fully overhead, reaching as high as possible', level: 'yellow' };
      }
    }
  }

  // Neutral standing: arms pressing against body blocks hip/knee visibility
  if ((poseId === 'neutral-front' || poseId === 'neutral-side') &&
      seen(LM.LEFT_WRIST) && seen(LM.LEFT_HIP)) {
    const wristHipDist = Math.abs(lm[LM.LEFT_WRIST].x - lm[LM.LEFT_HIP].x);
    if (wristHipDist < 0.04) {
      return { text: 'Move arms slightly away from body', subtext: 'A small gap between your hands and hips helps detection', level: 'yellow' };
    }
  }

  // Lighting / occlusion — general low confidence
  if (confidence < 0.4) {
    return { text: 'Poor visibility', subtext: 'Move to a brighter area, remove background clutter, or wear contrasting clothes', level: 'red' };
  }

  // All good
  if (isStable) {
    return { text: 'Great position — hold still!', subtext: 'Auto-capturing in a moment…', level: 'green' };
  }
  return { text: 'Hold still…', subtext: `Confidence ${Math.round(confidence * 100)}% — stay steady until the countdown starts`, level: 'yellow' };
}

// ─── Coaching banner ──────────────────────────────────────────────────────────

function CoachingBanner({ coaching }: { coaching: Coaching }) {
  const colours = {
    green:  'bg-green-500/90  text-white border-green-400',
    yellow: 'bg-amber-400/90  text-gray-900 border-amber-300',
    red:    'bg-red-500/90    text-white border-red-400',
  };
  const icons = { green: '✅', yellow: '⚠️', red: '❌' };

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm text-sm ${colours[coaching.level]}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{icons[coaching.level]}</span>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{coaching.text}</p>
        {coaching.subtext && <p className="text-xs opacity-80 mt-0.5 leading-snug">{coaching.subtext}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type CaptureState = 'instructions' | 'detecting' | 'countdown' | 'captured' | 'done' | 'error';

export function GuidedCapturePage() {
  const { state, dispatch } = useWizard();
  const { computeFromPoses } = useMeasurements();

  const [poseIdx,       setPoseIdx]       = useState(0);
  const [captureState,  setCaptureState]  = useState<CaptureState>('instructions');
  const [countdown,     setCountdown]     = useState(3);
  const [capturedPoses, setCapturedPoses] = useState<Partial<Record<PoseId, PoseCapture>>>({});
  const [landmarks,     setLandmarks]     = useState<NormalizedLandmark[] | null>(null);
  const [videoSize,     setVideoSize]     = useState({ width: 640, height: 480 });

  // Refs
  const videoElemRef      = useRef<HTMLVideoElement | null>(null);
  const smoother          = useFrameSmoothing();
  const stableTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedRef       = useRef(capturedPoses);
  capturedRef.current     = capturedPoses;
  const captureStateRef   = useRef(captureState);
  captureStateRef.current = captureState;

  const currentPose = POSE_SEQUENCE[poseIdx];

  // ── MediaPipe result handler ───────────────────────────────────────────────

  const handleResult = useCallback((result: PoseLandmarkerResult) => {
    if (!result.landmarks?.length) {
      setLandmarks(null);
      return;
    }
    const lm  = result.landmarks[0] as NormalizedLandmark[];
    const wl  = (result.worldLandmarks?.[0] ?? []) as NormalizedLandmark[];
    const vis = lm.reduce((s, l) => s + (l.visibility ?? 0.5), 0) / lm.length;
    smoother.addFrame(lm, wl, vis);
    const smoothed = smoother.getSmoothed();
    if (smoothed) setLandmarks(smoothed.landmarks);
  }, [smoother]);

  const { isLoading, isReady, error: poseError, startDetection, stopDetection } = usePoseLandmarker({ onResult: handleResult });

  // ── Start / stop detection when state changes ─────────────────────────────

  useEffect(() => {
    const video = videoElemRef.current;
    if (!isReady || !video) return;

    if (captureState === 'detecting' || captureState === 'countdown') {
      startDetection(video);
    } else {
      stopDetection();
    }

    return () => {
      stopDetection();
    };
  }, [captureState, isReady, startDetection, stopDetection]);

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
    if (!stableTimerRef.current) {
      stableTimerRef.current = setTimeout(() => {
        startCountdown();
      }, 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    stopDetection();

    if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
  }, [smoother, currentPose, dispatch, stopDetection]);

  const nextPose = () => {
    if (poseIdx + 1 >= POSE_SEQUENCE.length) {
      finishCapture();
    } else {
      setPoseIdx(i => i + 1);
      setCaptureState('instructions');
      setLandmarks(null);
      smoother.reset();
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
    }
  };

  const finishCapture = () => {
    stopDetection();
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

  // ── Camera / video callbacks ───────────────────────────────────────────────

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoElemRef.current = video;
    // If already in detecting state (e.g. user clicked Start before video loaded), start now
    if (captureStateRef.current === 'detecting' && isReady) {
      startDetection(video);
    }
  }, [isReady, startDetection]);

  const handleStreamReady = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    setVideoSize({ width: settings.width ?? 640, height: settings.height ?? 480 });
  };

  // ── Coaching ──────────────────────────────────────────────────────────────

  const coaching = (captureState === 'detecting' || captureState === 'countdown')
    ? getCoaching(landmarks, currentPose.viewAngle, currentPose.id, smoother.isStable, smoother.currentConfidence)
    : null;

  const progressPct = Math.round((poseIdx / POSE_SEQUENCE.length) * 100);

  if (!currentPose) return null;

  return (
    <WizardLayout
      title="Guided Poses"
      showProgress={false}
      onBack={
        poseIdx > 0
          ? () => { stopDetection(); setPoseIdx(i => i - 1); setCaptureState('instructions'); setLandmarks(null); smoother.reset(); }
          : () => dispatch({ type: 'SET_STEP', payload: 'calibration' })
      }
      hideNext={true}
    >
      {/* Overall pose progress */}
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
            <div key={p.id} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < poseIdx ? 'bg-green-400' : i === poseIdx ? 'bg-brand-500' : 'bg-gray-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Current pose info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{currentPose.icon}</span>
          <div>
            <p className="font-semibold text-gray-900">{currentPose.label}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              currentPose.viewAngle === 'front'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-purple-100 text-purple-600'
            }`}>
              {currentPose.viewAngle === 'front' ? '📷 Front view' : '📷 Side view — left side toward camera'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{currentPose.instruction}</p>
        <p className="text-xs text-gray-400 mt-1 italic">💡 {currentPose.hint}</p>
      </div>

      {/* Errors & loading */}
      {poseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 text-sm text-red-700">
          Camera error: {poseError}
          <button className="ml-2 underline" onClick={finishCapture}>Skip to manual input</button>
        </div>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-brand-600 mb-3">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading pose detection model… (first load may take 10–20s)
        </div>
      )}

      {/* Camera + skeleton overlay */}
      {captureState !== 'captured' && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 mb-2">
          <CameraPreview
            onStreamReady={handleStreamReady}
            onVideoReady={handleVideoReady}
            showLandmarks={captureState === 'detecting' || captureState === 'countdown'}
            landmarks={landmarks}
            highlightIndices={currentPose.highlightIndices}
            viewLabel={currentPose.viewAngle === 'front' ? 'Front view' : 'Side view — left side toward camera'}
            isCapturing={captureState === 'countdown'}
            countdownSeconds={countdown}
          />
        </div>
      )}

      {/* What's being tracked */}
      {(captureState === 'detecting' || captureState === 'countdown') && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl mb-3 text-xs text-gray-500">
          <span className="text-brand-400">⬤</span>
          <span><strong className="text-gray-700">Tracking:</strong> {currentPose.trackingLabel}</span>
        </div>
      )}

      {/* Live coaching banner */}
      {coaching && captureState !== 'countdown' && (
        <div className="mb-3">
          <CoachingBanner coaching={coaching} />
        </div>
      )}

      {/* State-specific action UI */}
      {captureState === 'instructions' && (
        <button
          onClick={() => { setCaptureState('detecting'); smoother.reset(); }}
          disabled={isLoading}
          className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Waiting for pose model…' : "I'm in position — Start Detection"}
        </button>
      )}

      {captureState === 'detecting' && (
        <div className="flex gap-3">
          <button
            onClick={() => { stopDetection(); setCaptureState('instructions'); setLandmarks(null); smoother.reset(); }}
            className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={startCountdown}
            disabled={!smoother.isStable || smoother.currentConfidence < 0.5}
            className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {smoother.isStable && smoother.currentConfidence >= 0.5
              ? '📸 Capture Now'
              : `Hold still… ${Math.round(smoother.currentConfidence * 100)}%`}
          </button>
        </div>
      )}

      {captureState === 'countdown' && (
        <div className="bg-brand-600 text-white rounded-xl p-6 text-center">
          <div className="text-7xl font-bold tabular-nums">{countdown}</div>
          <p className="text-brand-200 text-sm mt-2">Don't move!</p>
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

      {/* Skip */}
      <button
        onClick={finishCapture}
        className="w-full mt-4 py-2 text-xs text-gray-400 hover:text-gray-600 underline"
      >
        Skip remaining poses and continue with captured data
      </button>
    </WizardLayout>
  );
}
