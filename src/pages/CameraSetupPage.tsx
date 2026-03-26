// ─── CameraSetupPage ──────────────────────────────────────────────────────────

import { WizardLayout } from '@/components/WizardLayout';
import { useWizard } from '@/context/AppContext';

const TIPS = [
  { icon: '📱', title: 'Camera position', desc: 'Place your phone or laptop 2–3 metres away at about hip height on a stable surface.' },
  { icon: '👕', title: 'Wear fitted clothing', desc: 'Shorts and a tight-fitting shirt work best. Loose clothing hides body landmarks.' },
  { icon: '💡', title: 'Good lighting', desc: 'Stand in a well-lit area. Natural light is ideal. Avoid strong backlight.' },
  { icon: '🦵', title: 'Full body in frame', desc: 'Your full body must be visible from the top of your head to your feet.' },
  { icon: '📐', title: 'Side view', desc: 'For side-view poses, your LEFT side should face the camera.' },
  { icon: '⏱️', title: 'Auto-capture', desc: 'Hold each pose still — the app captures automatically when you are stable for 1.5 seconds.' },
];

export function CameraSetupPage() {
  const { state, dispatch } = useWizard();
  const cameraSkipped = state.completedSteps.has('camera-setup') && !state.calibration;

  return (
    <WizardLayout
      title="Camera Setup"
      onBack={() => dispatch({ type: 'SET_STEP', payload: 'rider-profile' })}
      onNext={() => dispatch({ type: 'SET_STEP', payload: 'calibration' })}
      nextLabel="Ready — Start Camera"
    >
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Follow these tips to get the most accurate pose detection results. Good setup makes a big difference.
      </p>

      <div className="space-y-3 mb-8">
        {TIPS.map(tip => (
          <div key={tip.title} className="flex gap-4 items-start bg-white rounded-xl p-4 border border-gray-100">
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{tip.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View diagrams */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Front View</p>
          <pre className="text-2xl leading-tight text-gray-600 select-none">
{`  😐
  T
 /|\\
  |
 / \\`}
          </pre>
          <p className="text-xs text-gray-400 mt-2">Face camera directly</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Side View</p>
          <pre className="text-2xl leading-tight text-gray-600 select-none">
{`😐
|
|
|
|`}
          </pre>
          <p className="text-xs text-gray-400 mt-2">Left side toward camera</p>
        </div>
      </div>

      {/* Calibration note */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-brand-800">
          <strong>Calibration:</strong> We use your self-reported height to calibrate the camera scale.
          This is essential — without it, we cannot convert pixel distances to centimetres.
        </p>
      </div>

      {/* Skip option */}
      <button
        onClick={() => {
          dispatch({ type: 'SKIP_CAMERA' });
          dispatch({ type: 'SET_STEP', payload: 'manual-input' });
        }}
        className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
      >
        Skip camera — I'll enter measurements manually instead
      </button>
    </WizardLayout>
  );
}
