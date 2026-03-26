import React from 'react';
import type { WizardStep } from '@/types/wizard';

// ─── Step metadata ────────────────────────────────────────────────────────────

interface StepMeta {
  id: WizardStep;
  label: string;
  shortLabel: string;
}

const STEPS: StepMeta[] = [
  { id: 'welcome',        label: 'Welcome',         shortLabel: 'Welcome' },
  { id: 'rider-profile',  label: 'Your Profile',    shortLabel: 'Profile' },
  { id: 'camera-setup',   label: 'Camera Setup',    shortLabel: 'Camera' },
  { id: 'calibration',    label: 'Calibration',     shortLabel: 'Calibrate' },
  { id: 'guided-capture', label: 'Pose Capture',    shortLabel: 'Poses' },
  { id: 'manual-input',   label: 'Measurements',    shortLabel: 'Measure' },
  { id: 'bike-type',      label: 'Bike Type',       shortLabel: 'Bike' },
  { id: 'issues',         label: 'Pain & Issues',   shortLabel: 'Issues' },
  { id: 'calculating',    label: 'Calculating',     shortLabel: 'Calc.' },
  { id: 'results',        label: 'Your Fit',        shortLabel: 'Results' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressBar({ currentStep, completedSteps }: ProgressBarProps): React.JSX.Element {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const totalSteps = STEPS.length;

  return (
    <>
      {/* Mobile: compact single-line display */}
      <div className="sm:hidden px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {STEPS[currentIndex]?.label ?? currentStep}
          </span>
          <span className="text-xs text-gray-400">
            Step {currentIndex + 1} of {totalSteps}
          </span>
        </div>
        {/* Progress track */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${currentIndex + 1} of ${totalSteps}: ${STEPS[currentIndex]?.label}`}
          />
        </div>
      </div>

      {/* Desktop: all steps as dots */}
      <nav
        className="hidden sm:block px-6 py-4 bg-white border-b border-gray-100"
        aria-label="Wizard progress"
      >
        <ol className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;
            const isUpcoming = !isCompleted && !isCurrent;

            return (
              <li
                key={step.id}
                className="flex flex-1 items-center last:flex-none"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Connector line (not before first item) */}
                {index > 0 && (
                  <div
                    className={[
                      'flex-1 h-0.5 mx-1 transition-colors duration-300',
                      isCompleted ? 'bg-brand-500' : 'bg-gray-200',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                )}

                {/* Dot + label */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span
                    title={step.label}
                    aria-label={`${step.label}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ',
                      'transition-all duration-200',
                      isCurrent
                        ? 'bg-brand-600 text-white ring-2 ring-brand-200 ring-offset-1 scale-110'
                        : isCompleted
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? (
                      /* Checkmark icon */
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    ) : (
                      String(index + 1)
                    )}
                  </span>

                  {/* Step label — only show for completed, current, and ±1 steps */}
                  <span
                    className={[
                      'text-xs whitespace-nowrap transition-colors duration-200',
                      'hidden lg:block',
                      isCurrent
                        ? 'text-brand-700 font-medium'
                        : isCompleted
                        ? 'text-brand-500'
                        : isUpcoming
                        ? 'text-gray-400'
                        : 'text-gray-500',
                    ].join(' ')}
                  >
                    {step.shortLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export default ProgressBar;
