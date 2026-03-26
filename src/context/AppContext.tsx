import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { WizardState, WizardAction, WizardStep } from '@/types/wizard';
import type { RiderProfile } from '@/types/rider';
import { appReducer, createInitialState } from './appReducer';

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'bikefit-wizard-state';

/**
 * Shape of the lean object we write to sessionStorage.
 * We omit large landmark arrays from poses and convert the Set to an array.
 */
interface PersistedState {
  currentStep: WizardState['currentStep'];
  completedSteps: WizardStep[];          // Set serialised as array
  completedPoseIds: string[];             // only pose IDs, not landmark data
  riderProfile?: WizardState['riderProfile'];
  calibration?: WizardState['calibration'];
  measurements?: WizardState['measurements'];
  manualOverrides: WizardState['manualOverrides'];
  selectedBikeCategory?: WizardState['selectedBikeCategory'];
  issues: WizardState['issues'];
  fitResult?: WizardState['fitResult'];
  sessionId: string;
}

function serializeState(state: WizardState): PersistedState {
  return {
    currentStep: state.currentStep,
    completedSteps: Array.from(state.completedSteps),
    completedPoseIds: Object.keys(state.poses),
    riderProfile: state.riderProfile,
    calibration: state.calibration,
    measurements: state.measurements,
    manualOverrides: state.manualOverrides,
    selectedBikeCategory: state.selectedBikeCategory,
    issues: state.issues,
    fitResult: state.fitResult,
    sessionId: state.sessionId,
  };
}

function deserializeState(raw: PersistedState): WizardState {
  return {
    currentStep: raw.currentStep,
    completedSteps: new Set<WizardStep>(raw.completedSteps),
    // Poses are NOT restored from storage — camera will need to recapture.
    // completedPoseIds is informational only (used to show progress).
    poses: {},
    riderProfile: raw.riderProfile,
    calibration: raw.calibration,
    measurements: raw.measurements,
    manualOverrides: raw.manualOverrides ?? {},
    selectedBikeCategory: raw.selectedBikeCategory,
    issues: raw.issues ?? [],
    fitResult: raw.fitResult,
    sessionId: raw.sessionId,
  };
}

function loadFromStorage(): WizardState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as PersistedState;
    return deserializeState(parsed);
  } catch {
    // Corrupted data — start fresh
    return createInitialState();
  }
}

function saveToStorage(state: WizardState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
  } catch {
    // sessionStorage quota exceeded or unavailable — silently ignore
  }
}

// ─── Context definition ───────────────────────────────────────────────────────

interface WizardContextValue {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);
WizardContext.displayName = 'WizardContext';

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, undefined, loadFromStorage);

  // Persist to sessionStorage on every state change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Access the wizard state and dispatch function.
 * Must be used inside an <AppProvider>.
 */
export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (ctx === null) {
    throw new Error('useWizard must be used within an <AppProvider>.');
  }
  return ctx;
}

/**
 * Returns the wizard's current step identifier.
 */
export function useCurrentStep(): WizardStep {
  return useWizard().state.currentStep;
}

/**
 * Returns the rider profile, throwing if it has not yet been set.
 * Use this in steps that require a completed profile.
 */
export function useRiderProfile(): RiderProfile {
  const { state } = useWizard();
  if (!state.riderProfile) {
    throw new Error(
      'useRiderProfile: riderProfile is not set. Complete the rider-profile step first.',
    );
  }
  return state.riderProfile;
}

/**
 * Returns true if the given step appears in completedSteps.
 */
export function useIsStepComplete(step: WizardStep): boolean {
  const { state } = useWizard();
  return state.completedSteps.has(step);
}
