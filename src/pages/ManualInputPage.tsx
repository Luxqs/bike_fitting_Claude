// ─── ManualInputPage ──────────────────────────────────────────────────────────
//
// Allows the rider to enter body measurements manually, either as a camera
// fallback or as the primary input method (camera-skipped flow).

import { useState } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { FormField } from '@/components/FormField';
import { useWizard } from '@/context/AppContext';
import type { BodyMeasurements, MeasuredValue } from '@/types/measurements';

function manualValue(valueCm: number): MeasuredValue {
  return { valueCm, source: 'manual', confidence: 0.85, confidenceLevel: 'high' };
}

interface MeasurementField {
  key: keyof BodyMeasurements;
  label: string;
  unit: string;
  hint: string;
  placeholder: string;
  min: number;
  max: number;
  priority: 'required' | 'recommended' | 'optional';
}

const FIELDS: MeasurementField[] = [
  {
    key: 'inseam',
    label: 'Inseam (inside leg)',
    unit: 'cm',
    hint: 'Floor to crotch. Stand barefoot, measure with a book held firm against the crotch.',
    placeholder: 'e.g. 82',
    min: 60, max: 100,
    priority: 'required',
  },
  {
    key: 'torsoLength',
    label: 'Torso length',
    unit: 'cm',
    hint: 'C7 vertebra (base of neck) to greater trochanter (hip bone protrusion). Easier to measure with help.',
    placeholder: 'e.g. 62',
    min: 40, max: 80,
    priority: 'recommended',
  },
  {
    key: 'shoulderWidth',
    label: 'Shoulder width',
    unit: 'cm',
    hint: 'Biacromial width: acromion to acromion (bony tip of each shoulder). Best measured from behind.',
    placeholder: 'e.g. 40',
    min: 28, max: 60,
    priority: 'recommended',
  },
  {
    key: 'armSpan',
    label: 'Arm span',
    unit: 'cm',
    hint: 'Fingertip to fingertip with arms extended sideways at shoulder height.',
    placeholder: 'e.g. 178',
    min: 140, max: 220,
    priority: 'optional',
  },
  {
    key: 'upperArmLength',
    label: 'Upper arm length',
    unit: 'cm',
    hint: 'Shoulder (acromion) to elbow. Arm relaxed at side.',
    placeholder: 'e.g. 34',
    min: 20, max: 50,
    priority: 'optional',
  },
  {
    key: 'forearmLength',
    label: 'Forearm length',
    unit: 'cm',
    hint: 'Elbow to wrist (radial styloid). Arm bent 90°.',
    placeholder: 'e.g. 28',
    min: 18, max: 42,
    priority: 'optional',
  },
  {
    key: 'femurLength',
    label: 'Thigh length',
    unit: 'cm',
    hint: 'Greater trochanter to lateral knee joint. Measure seated.',
    placeholder: 'e.g. 45',
    min: 30, max: 65,
    priority: 'optional',
  },
  {
    key: 'tibiaLength',
    label: 'Shin length',
    unit: 'cm',
    hint: 'Lateral knee joint to lateral ankle (malleolus). Measure seated.',
    placeholder: 'e.g. 38',
    min: 25, max: 55,
    priority: 'optional',
  },
];

export function ManualInputPage() {
  const { state, dispatch } = useWizard();
  const [values, setValues] = useState<Partial<Record<keyof BodyMeasurements, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof BodyMeasurements, string>>>({});
  const [showOptional, setShowOptional] = useState(false);

  // Pre-populate from existing measurements or wizard state
  const cameraSkipped = !state.calibration;

  const handleChange = (key: keyof BodyMeasurements, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (val && (isNaN(Number(val)) || Number(val) <= 0)) {
      setErrors(prev => ({ ...prev, [key]: 'Enter a valid number' }));
    } else {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handleNext = () => {
    // Validate required fields
    const newErrors: Partial<Record<keyof BodyMeasurements, string>> = {};
    let ok = true;

    const requiredFields = FIELDS.filter(f => f.priority === 'required');
    requiredFields.forEach(field => {
      const val = values[field.key];
      if (!val || isNaN(Number(val)) || Number(val) <= 0) {
        newErrors[field.key] = `${field.label} is required`;
        ok = false;
      }
    });

    setErrors(newErrors);
    if (!ok) return;

    // Build measurements object
    const measurements: BodyMeasurements = {};
    FIELDS.forEach(field => {
      const raw = values[field.key];
      if (raw && !isNaN(Number(raw)) && Number(raw) > 0) {
        const valueCm = Number(raw);
        measurements[field.key] = manualValue(valueCm) as BodyMeasurements[typeof field.key];
      }
    });

    dispatch({ type: 'SET_MEASUREMENTS', payload: measurements });
    dispatch({ type: 'SET_STEP', payload: 'bike-type' });
  };

  const visibleFields = FIELDS.filter(f =>
    f.priority === 'required' || f.priority === 'recommended' || showOptional
  );

  return (
    <WizardLayout
      title={cameraSkipped ? 'Enter Your Measurements' : 'Confirm Measurements'}
      onBack={() => dispatch({ type: 'SET_STEP', payload: cameraSkipped ? 'camera-setup' : 'guided-capture' })}
      onNext={handleNext}
      nextLabel="Continue to Bike Selection"
    >
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        {cameraSkipped
          ? 'Enter your body measurements below. Inseam is the most important for saddle height. The others improve cockpit recommendations.'
          : 'Review and correct any measurements the camera captured. More accurate inputs give better results.'
        }
      </p>

      <div className="space-y-4 mb-4">
        {FIELDS.filter(f => f.priority === 'required').map(field => (
          <div key={String(field.key)} className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-brand-800 mb-1">
              {field.label} <span className="text-brand-500">({field.unit})</span>
              <span className="ml-1 text-xs text-brand-600 font-normal">Required</span>
            </label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step="0.5"
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={e => handleChange(field.key, e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                errors[field.key] ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            <p className="text-xs text-brand-600 mt-1">{field.hint}</p>
            {errors[field.key] && <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>}
          </div>
        ))}
      </div>

      {/* Recommended */}
      <div className="space-y-3 mb-4">
        {FIELDS.filter(f => f.priority === 'recommended').map(field => (
          <div key={String(field.key)} className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {field.label} <span className="text-gray-400">({field.unit})</span>
              <span className="ml-1 text-xs text-gray-400 font-normal">Recommended</span>
            </label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step="0.5"
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={e => handleChange(field.key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
          </div>
        ))}
      </div>

      {/* Optional toggle */}
      <button
        onClick={() => setShowOptional(s => !s)}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-xl transition-colors"
      >
        {showOptional ? '▲ Hide optional measurements' : '▼ Show optional measurements (more precision)'}
      </button>

      {showOptional && (
        <div className="space-y-3 mt-3">
          {FIELDS.filter(f => f.priority === 'optional').map(field => (
            <div key={String(field.key)} className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {field.label} <span className="text-gray-400">({field.unit})</span>
              </label>
              <input
                type="number"
                min={field.min}
                max={field.max}
                step="0.5"
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Leave optional fields blank — they'll be estimated from your height
      </p>
    </WizardLayout>
  );
}
