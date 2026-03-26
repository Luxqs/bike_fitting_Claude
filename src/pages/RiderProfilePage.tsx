// ─── RiderProfilePage ─────────────────────────────────────────────────────────

import { useState } from 'react';
import { WizardLayout } from '@/components/WizardLayout';
import { useWizard } from '@/context/AppContext';
import type { RiderProfile, AgeRange, BiologicalSex, RidingGoal, Experience, FlexibilityLevel } from '@/types/rider';

type FormData = Partial<RiderProfile>;

interface GoalOption { value: RidingGoal; icon: string; label: string; desc: string; }
interface SelectOption { value: string; label: string; desc?: string; }

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'comfort',    icon: '🛋️',  label: 'Comfort',    desc: 'Upright position, maximum comfort, minimal strain' },
  { value: 'endurance',  icon: '🚴',  label: 'Endurance',  desc: 'Balanced position for long rides' },
  { value: 'sport',      icon: '⚡',  label: 'Sport',      desc: 'Performance-oriented, efficient and moderately aero' },
  { value: 'aggressive', icon: '🏆',  label: 'Aggressive', desc: 'Race-ready, aerodynamic, maximum performance' },
  { value: 'race',       icon: '🔥',  label: 'Race',       desc: 'Full aero, no compromises — experienced riders only' },
];

const EXPERIENCE_OPTIONS: SelectOption[] = [
  { value: 'beginner',     label: 'Beginner',     desc: 'Just starting out (0–2 years)' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Regular rider (2–5 years, some events)' },
  { value: 'advanced',     label: 'Advanced',     desc: 'Experienced rider (5+ years, regular training)' },
  { value: 'racer',        label: 'Racer',        desc: 'Competitive racer (regular racing)' },
];

const FITNESS_OPTIONS: SelectOption[] = [
  { value: 'poor',      label: 'Limited',   desc: 'Hip/hamstring tightness common' },
  { value: 'average',   label: 'Average',   desc: 'Some flexibility limitations' },
  { value: 'good',      label: 'Good',      desc: 'Comfortable in moderate forward positions' },
  { value: 'excellent', label: 'Excellent', desc: 'Very flexible, regular stretching routine' },
];

export function RiderProfilePage() {
  const { state, dispatch } = useWizard();
  const [form, setForm] = useState<FormData>(state.riderProfile ?? {});
  const [errors, setErrors] = useState<Partial<Record<keyof RiderProfile | 'general', string>>>({});
  const [showCurrentBike, setShowCurrentBike] = useState(!!state.riderProfile?.currentBikeInfo);
  const [showManualMeasurements, setShowManualMeasurements] = useState(!!state.riderProfile?.manualMeasurements);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name?.trim()) e.name = 'Name is required';
    if (!form.heightCm || form.heightCm < 130 || form.heightCm > 220) e.heightCm = 'Height must be 130–220 cm';
    if (!form.weightKg || form.weightKg < 30 || form.weightKg > 200) e.weightKg = 'Weight must be 30–200 kg';
    if (!form.experienceLevel) e.experienceLevel = 'Select your experience level';
    if (!form.fitnessLevel) e.fitnessLevel = 'Select your flexibility level';
    if (!form.ridingGoal) e.ridingGoal = 'Select a riding goal';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const profile: RiderProfile = {
      name:            form.name!.trim(),
      heightCm:        Number(form.heightCm),
      weightKg:        Number(form.weightKg),
      experienceLevel: form.experienceLevel as Experience,
      fitnessLevel:    form.fitnessLevel as FlexibilityLevel,
      ridingGoal:      form.ridingGoal as RidingGoal,
      preferredTerrain: form.preferredTerrain ?? 'road',
      ageRange:        form.ageRange,
      biologicalSex:   form.biologicalSex,
      shoeSize:        form.shoeSize,
      currentBikeInfo: showCurrentBike ? form.currentBikeInfo : undefined,
      manualMeasurements: showManualMeasurements ? form.manualMeasurements : undefined,
      injuryNotes:     form.injuryNotes,
    };
    dispatch({ type: 'SET_PROFILE', payload: profile });
    const nextStep = state.completedSteps.has('camera-setup') ? 'manual-input' : 'camera-setup';
    dispatch({ type: 'SET_STEP', payload: nextStep });
  };

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const err = 'border-red-400';

  return (
    <WizardLayout
      title="Rider Profile"
      onBack={() => dispatch({ type: 'SET_STEP', payload: 'welcome' })}
      onNext={handleNext}
      nextLabel="Continue"
    >
      <p className="text-gray-400 text-sm mb-6">Tell us about yourself. This information drives the fit calculation.</p>

      {/* Basic info */}
      <section className="space-y-4 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Info</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name / Rider ID <span className="text-red-500">*</span></label>
          <input type="text" className={`${inp} ${errors.name ? err : ''}`} placeholder="Your name or alias"
            value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age range <span className="text-gray-400">(optional)</span></label>
            <select className={inp} value={form.ageRange ?? ''} onChange={e => set('ageRange', e.target.value as AgeRange || undefined)}>
              <option value="">Prefer not to say</option>
              {['under-25','25-34','35-44','45-54','55-64','65-plus'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biological sex <span className="text-gray-400">(optional)</span></label>
            <select className={inp} value={form.biologicalSex ?? ''} onChange={e => set('biologicalSex', e.target.value as BiologicalSex || undefined)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Physical */}
      <section className="space-y-4 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Physical</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm) <span className="text-red-500">*</span></label>
            <input type="number" min={130} max={220} className={`${inp} ${errors.heightCm ? err : ''}`}
              placeholder="e.g. 175" value={form.heightCm ?? ''} onChange={e => set('heightCm', Number(e.target.value))} />
            {errors.heightCm && <p className="text-xs text-red-500 mt-1">{errors.heightCm}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
            <input type="number" min={30} max={200} className={`${inp} ${errors.weightKg ? err : ''}`}
              placeholder="e.g. 72" value={form.weightKg ?? ''} onChange={e => set('weightKg', Number(e.target.value))} />
            {errors.weightKg && <p className="text-xs text-red-500 mt-1">{errors.weightKg}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shoe size (EU, optional)</label>
          <input type="number" min={30} max={54} step={0.5} className={inp}
            placeholder="e.g. 42" value={form.shoeSize ?? ''} onChange={e => set('shoeSize', Number(e.target.value) || undefined)} />
        </div>
      </section>

      {/* Experience */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Experience Level <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => set('experienceLevel', opt.value as Experience)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${form.experienceLevel === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
              <p className={`text-sm font-semibold ${form.experienceLevel === opt.value ? 'text-brand-700' : 'text-gray-700'}`}>{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        {errors.experienceLevel && <p className="text-xs text-red-500 mt-1">{errors.experienceLevel}</p>}
      </section>

      {/* Flexibility */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Flexibility / Mobility <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-2 gap-2">
          {FITNESS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => set('fitnessLevel', opt.value as FlexibilityLevel)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${form.fitnessLevel === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
              <p className={`text-sm font-semibold ${form.fitnessLevel === opt.value ? 'text-brand-700' : 'text-gray-700'}`}>{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        {errors.fitnessLevel && <p className="text-xs text-red-500 mt-1">{errors.fitnessLevel}</p>}
      </section>

      {/* Riding goal */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Riding Goal <span className="text-red-500">*</span></h3>
        <div className="space-y-2">
          {GOAL_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => set('ridingGoal', opt.value)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${form.ridingGoal === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
              <span className="text-xl flex-shrink-0">{opt.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${form.ridingGoal === opt.value ? 'text-brand-700' : 'text-gray-700'}`}>{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
              {form.ridingGoal === opt.value && <span className="ml-auto text-brand-500 flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
        {errors.ridingGoal && <p className="text-xs text-red-500 mt-1">{errors.ridingGoal}</p>}
      </section>

      {/* Preferred terrain */}
      <section className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred terrain</label>
        <input type="text" className={inp} placeholder="e.g. road, gravel, MTB singletrack"
          value={form.preferredTerrain ?? ''} onChange={e => set('preferredTerrain', e.target.value)} />
      </section>

      {/* Current bike (collapsible) */}
      <section className="mb-4">
        <button onClick={() => setShowCurrentBike(s => !s)}
          className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
          <span>📋 Current bike info (optional)</span>
          <span>{showCurrentBike ? '▲' : '▼'}</span>
        </button>
        {showCurrentBike && (
          <div className="mt-2 p-4 border border-gray-200 rounded-xl space-y-3">
            {[
              { key: 'bikeType', label: 'Bike type', placeholder: 'e.g. Road, MTB', type: 'text' },
              { key: 'frameSize', label: 'Frame size', placeholder: 'e.g. 54cm, M', type: 'text' },
              { key: 'stemLengthMm', label: 'Stem length (mm)', placeholder: 'e.g. 90', type: 'number' },
              { key: 'handlebarWidthMm', label: 'Handlebar width (mm)', placeholder: 'e.g. 420', type: 'number' },
              { key: 'crankLengthMm', label: 'Crank length (mm)', placeholder: 'e.g. 172.5', type: 'number' },
              { key: 'saddleHeightMm', label: 'Saddle height (mm)', placeholder: 'e.g. 720', type: 'number' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                <input type={field.type} className={inp} placeholder={field.placeholder}
                  value={(form.currentBikeInfo as Record<string,string|number|undefined>)?.[field.key] ?? ''}
                  onChange={e => set('currentBikeInfo', { ...form.currentBikeInfo, [field.key]: field.type === 'number' ? (Number(e.target.value) || undefined) : e.target.value })} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manual measurements (collapsible) */}
      <section className="mb-6">
        <button onClick={() => setShowManualMeasurements(s => !s)}
          className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
          <span>📏 Known body measurements (optional)</span>
          <span>{showManualMeasurements ? '▲' : '▼'}</span>
        </button>
        {showManualMeasurements && (
          <div className="mt-2 p-4 border border-gray-200 rounded-xl space-y-3">
            <p className="text-xs text-gray-400">If you already know these, enter them here to skip camera measurement.</p>
            {[
              { key: 'inseamCm',       label: 'Inseam (cm)',         placeholder: 'e.g. 82' },
              { key: 'armSpanCm',      label: 'Arm span (cm)',        placeholder: 'e.g. 178' },
              { key: 'shoulderWidthCm',label: 'Shoulder width (cm)', placeholder: 'e.g. 40' },
              { key: 'torsoLengthCm',  label: 'Torso length (cm)',   placeholder: 'e.g. 60' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                <input type="number" step="0.5" className={inp} placeholder={field.placeholder}
                  value={(form.manualMeasurements as Record<string,number|undefined>)?.[field.key] ?? ''}
                  onChange={e => set('manualMeasurements', { ...form.manualMeasurements, [field.key]: Number(e.target.value) || undefined })} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Injury notes */}
      <section className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Injury / limitation notes (optional)</label>
        <textarea rows={3} className={`${inp} resize-none`}
          placeholder="e.g. Previous knee surgery, chronic low back pain, L leg longer than R…"
          value={form.injuryNotes ?? ''} onChange={e => set('injuryNotes', e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Displayed in results for reference but not used in calculations (use the Issues step for that).</p>
      </section>
    </WizardLayout>
  );
}
