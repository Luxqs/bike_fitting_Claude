// ─── CalculatingPage ──────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useWizard } from '@/context/AppContext';
import { calculateFit, createEmptyMeasurements } from '@/features/fit-engine/fitCalculator';

const STEPS = [
  'Analyzing body measurements…',
  'Loading bike category geometry…',
  'Running saddle height formulas…',
  'Computing cockpit reach…',
  'Applying comfort & issue adjustments…',
  'Validating knee and hip angles…',
  'Generating recommendations…',
];

export function CalculatingPage() {
  const { state, dispatch } = useWizard();
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Animate through steps
    const stepInterval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 300);

    const run = async () => {
      // Minimum display time
      await new Promise(r => setTimeout(r, 500));

      try {
        if (!state.riderProfile || !state.selectedBikeCategory) {
          throw new Error('Missing required data. Please complete all steps.');
        }

        const result = calculateFit(
          state.measurements ?? createEmptyMeasurements(),
          state.riderProfile,
          state.selectedBikeCategory,
          state.issues,
          1280,
          720,
        );

        await new Promise(r => setTimeout(r, 1800)); // ensure animation plays

        if (!cancelled) {
          clearInterval(stepInterval);
          dispatch({ type: 'SET_FIT_RESULT', payload: result });
          dispatch({ type: 'SET_STEP', payload: 'results' });
        }
      } catch (err) {
        if (!cancelled) {
          clearInterval(stepInterval);
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      clearInterval(stepInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Calculation failed</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'issues' })}
          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Animated bicycle */}
      <div className="text-7xl mb-6 animate-pulse-ring">🚴</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Calculating your fit…</h2>
      <p className="text-gray-400 text-sm mb-8">This takes just a moment</p>

      {/* Progress steps */}
      <div className="w-full max-w-sm space-y-2 text-left">
        {STEPS.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${
            i <= stepIdx ? 'opacity-100' : 'opacity-20'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              i < stepIdx ? 'bg-green-500 text-white' :
              i === stepIdx ? 'border-2 border-brand-500 bg-white' :
              'border-2 border-gray-200 bg-white'
            }`}>
              {i < stepIdx ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i === stepIdx ? (
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              ) : null}
            </div>
            <p className={`text-sm ${i === stepIdx ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
