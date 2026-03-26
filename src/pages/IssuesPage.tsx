// ─── IssuesPage ───────────────────────────────────────────────────────────────

import { useState } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { useWizard } from '@/context/AppContext';
import { PAIN_LOCATION_LABELS } from '@/config/issueAdjustments';
import type { IssueEntry, PainLocation } from '@/types/fit';

interface IssueOption {
  location: PainLocation;
  icon: string;
  description: string;
}

const ISSUE_OPTIONS: IssueOption[] = [
  { location: 'front-knee',    icon: '🦵', description: 'Pain at the front of the knee during or after riding' },
  { location: 'back-knee',     icon: '🦵', description: 'Tightness or pain at the back of the knee' },
  { location: 'low-back',      icon: '💪', description: 'Lower back ache or pain during rides' },
  { location: 'neck',          icon: '🦒', description: 'Neck stiffness or pain from riding position' },
  { location: 'hand-wrist',    icon: '✋', description: 'Numbness, tingling, or pain in hands or wrists' },
  { location: 'shoulder',      icon: '🤷', description: 'Shoulder discomfort or fatigue' },
  { location: 'saddle',        icon: '🪑', description: 'Pressure, chafing, or pain from the saddle' },
  { location: 'hip',           icon: '🏃', description: 'Hip flexor tightness or hip pain' },
  { location: 'foot-numb',     icon: '🦶', description: 'Numb or tingling feet during rides' },
  { location: 'too-stretched', icon: '↔️', description: 'Reaching too far to the bars; feels too long' },
  { location: 'too-cramped',   icon: '🗜️', description: 'Bars feel too close; hunched position' },
  { location: 'instability',   icon: '⚖️', description: 'Difficulty handling the bike or feeling unstable' },
  { location: 'no-issues',     icon: '✅', description: "No issues — just sizing a new bike" },
];

export function IssuesPage() {
  const { state, dispatch } = useWizard();
  const [selected, setSelected] = useState<Map<PainLocation, IssueEntry>>(
    new Map(state.issues.map(i => [i.location, i]))
  );

  const toggle = (location: PainLocation) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (location === 'no-issues') {
        // Selecting "no issues" clears everything else
        next.clear();
        next.set('no-issues', { location: 'no-issues', severity: 1 });
      } else {
        next.delete('no-issues');
        if (next.has(location)) {
          next.delete(location);
        } else {
          next.set(location, { location, severity: 1 });
        }
      }
      return next;
    });
  };

  const setSeverity = (location: PainLocation, severity: 1 | 2 | 3) => {
    setSelected(prev => {
      const next = new Map(prev);
      const existing = next.get(location);
      if (existing) next.set(location, { ...existing, severity });
      return next;
    });
  };

  const handleNext = () => {
    const issues = Array.from(selected.values());
    dispatch({ type: 'SET_ISSUES', payload: issues });
    dispatch({ type: 'SET_STEP', payload: 'calculating' });
  };

  return (
    <WizardLayout
      title="Pain & Issues"
      onBack={() => dispatch({ type: 'SET_STEP', payload: 'bike-type' })}
      onNext={handleNext}
      nextLabel="Calculate My Fit"
      nextDisabled={selected.size === 0}
    >
      <p className="text-gray-500 text-sm mb-2 leading-relaxed">
        Select any discomfort or issues from your current or previous bike. These help us bias
        recommendations toward solutions.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-xs text-amber-700">
        These are general fit-oriented adjustments, <strong>not medical diagnoses</strong>. Always see a
        healthcare professional for persistent pain.
      </div>

      <div className="space-y-2 mb-6">
        {ISSUE_OPTIONS.map(opt => {
          const isSelected = selected.has(opt.location);
          const entry = selected.get(opt.location);
          return (
            <div key={opt.location} className={`rounded-xl border-2 overflow-hidden transition-all ${
              isSelected ? 'border-brand-400' : 'border-gray-100'
            }`}>
              <button
                onClick={() => toggle(opt.location)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-brand-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-gray-800'}`}>
                    {PAIN_LOCATION_LABELS[opt.location]}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>
              </button>

              {/* Severity selector */}
              {isSelected && opt.location !== 'no-issues' && (
                <div className="px-4 py-3 bg-brand-50 border-t border-brand-100">
                  <p className="text-xs text-brand-600 font-medium mb-2">Severity:</p>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map(sev => (
                      <button
                        key={sev}
                        onClick={() => setSeverity(opt.location, sev)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          entry?.severity === sev
                            ? 'bg-brand-600 text-white'
                            : 'bg-white border border-brand-200 text-brand-600 hover:bg-brand-100'
                        }`}
                      >
                        {sev === 1 ? 'Mild' : sev === 2 ? 'Moderate' : 'Severe'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Select at least one option to continue (including "No issues")
      </p>
    </WizardLayout>
  );
}
