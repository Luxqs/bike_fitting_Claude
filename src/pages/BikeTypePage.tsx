// ─── BikeTypePage ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { useWizard } from '@/context/AppContext';
import { BIKE_CATEGORIES, BIKE_CATEGORY_GROUPS } from '@/config/bikeCategories';
import type { BikeCategory } from '@/types/fit';

export function BikeTypePage() {
  const { state, dispatch } = useWizard();
  const [selected, setSelected] = useState<BikeCategory | null>(state.selectedBikeCategory ?? null);

  const handleNext = () => {
    if (!selected) return;
    dispatch({ type: 'SET_BIKE_CATEGORY', payload: selected });
    dispatch({ type: 'SET_STEP', payload: 'issues' });
  };

  return (
    <WizardLayout
      title="Select Bike Category"
      onBack={() => dispatch({ type: 'SET_STEP', payload: state.measurements ? 'manual-input' : 'guided-capture' })}
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={!selected}
    >
      <p className="text-gray-500 text-sm mb-2 leading-relaxed">
        Choose the type of bike you're sizing. This determines the geometry defaults and position style.
      </p>

      {state.riderProfile && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5 mb-5 text-sm text-brand-700">
          Your riding goal: <strong className="capitalize">{state.riderProfile.ridingGoal}</strong> — this will be applied within the category you select.
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(BIKE_CATEGORY_GROUPS).map(([groupName, categoryIds]) => (
          <div key={groupName}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{groupName}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categoryIds.map(id => {
                const cat = BIKE_CATEGORIES[id];
                const isSelected = selected === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelected(id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-brand-700' : 'text-gray-800'}`}>
                          {cat.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="ml-auto flex-shrink-0 text-brand-500">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800">
            {BIKE_CATEGORIES[selected].emoji} Selected: {BIKE_CATEGORIES[selected].label}
          </p>
          <p className="text-xs text-green-600 mt-1">{BIKE_CATEGORIES[selected].fitNotes}</p>
        </div>
      )}
    </WizardLayout>
  );
}
