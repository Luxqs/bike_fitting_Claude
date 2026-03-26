// ─── WizardLayout ─────────────────────────────────────────────────────────────
//
// Master layout wrapping every wizard step.
// Reads currentStep / completedSteps from WizardContext directly so each page
// doesn't have to thread those props manually.

import React from 'react';
import { useWizard } from '@/context/AppContext';
import type { WizardStep } from '@/types/wizard';

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStep, string> = {
  'welcome':        'Welcome',
  'rider-profile':  'Profile',
  'camera-setup':   'Camera',
  'calibration':    'Calibrate',
  'guided-capture': 'Capture',
  'manual-input':   'Measurements',
  'bike-type':      'Bike Type',
  'issues':         'Issues',
  'calculating':    'Calculating',
  'results':        'Results',
};

const VISIBLE_STEPS: WizardStep[] = [
  'rider-profile', 'manual-input', 'bike-type', 'issues', 'results',
];

// ─── Internal progress bar ────────────────────────────────────────────────────

function ProgressBar({ current, completed }: { current: WizardStep; completed: Set<WizardStep> }) {
  const idx = VISIBLE_STEPS.indexOf(current);
  const pct = VISIBLE_STEPS.length > 1
    ? Math.min(100, Math.round((Math.max(0, idx) / (VISIBLE_STEPS.length - 1)) * 100))
    : 0;

  return (
    <div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="hidden sm:flex justify-between">
        {VISIBLE_STEPS.map((step, i) => {
          const done    = completed.has(step);
          const active  = step === current;
          return (
            <div key={step} className="flex flex-col items-center gap-0.5 flex-1">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                done   ? 'bg-brand-600 border-brand-600 text-white' :
                active ? 'bg-white border-brand-600 text-brand-600' :
                         'bg-white border-gray-200 text-gray-300'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium text-center leading-none ${
                active ? 'text-brand-700' : done ? 'text-brand-500' : 'text-gray-300'
              }`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="sm:hidden flex justify-between mt-1">
        <span className="text-xs text-gray-400">Step {Math.max(1, VISIBLE_STEPS.indexOf(current) + 1)} of {VISIBLE_STEPS.length}</span>
        <span className="text-xs font-medium text-brand-700">{STEP_LABELS[current] ?? current}</span>
      </div>
    </div>
  );
}

// ─── Layout props ─────────────────────────────────────────────────────────────

export interface WizardLayoutProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  // Navigation
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
  // Progress
  showProgress?: boolean;
  // Layout
  constrained?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardLayout({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  hideNext = false,
  showProgress = true,
  constrained = true,
}: WizardLayoutProps): React.JSX.Element {
  const { state } = useWizard();
  const showProgressBar = showProgress && state.currentStep !== 'welcome' && state.currentStep !== 'calculating';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="text-xl leading-none select-none">🚴</span>
          <span className="font-bold text-gray-900 text-sm tracking-tight">BikeFit Camera</span>
        </div>
      </header>

      {/* Progress */}
      {showProgressBar && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
            <ProgressBar current={state.currentStep} completed={state.completedSteps} />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col pb-24">
        <div className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 ${constrained ? 'max-w-2xl' : ''}`}>
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-gray-500 leading-relaxed">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Sticky bottom nav */}
      {(onBack || (onNext && !hideNext)) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
            )}
            {onNext && !hideNext && (
              <button
                onClick={onNext}
                disabled={nextDisabled}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  nextDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`bg-white border-t border-gray-100 py-2 ${(onBack || (onNext && !hideNext)) ? 'hidden' : ''}`}>
        <div className="max-w-2xl mx-auto px-4 flex justify-between">
          <span className="text-xs text-gray-300">BikeFit Camera</span>
          <span className="text-xs text-gray-300">All processing is local</span>
        </div>
      </div>
    </div>
  );
}

export default WizardLayout;
