import type { WizardState, WizardAction, WizardStep } from '@/types/wizard';

// ─── Initial state factory ────────────────────────────────────────────────────

/**
 * Create a fresh WizardState with a new session ID.
 * Call this when the app first loads or on RESET.
 */
export function createInitialState(): WizardState {
  return {
    currentStep: 'welcome',
    completedSteps: new Set<WizardStep>(),
    poses: {},
    manualOverrides: {},
    issues: [],
    sessionId: crypto.randomUUID(),
  };
}

// ─── Pure reducer ─────────────────────────────────────────────────────────────

export function appReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': {
      // Mark the current step as completed before moving to the new one
      const updatedCompleted = new Set(state.completedSteps);
      if (state.currentStep !== action.payload) {
        updatedCompleted.add(state.currentStep);
      }
      return {
        ...state,
        currentStep: action.payload,
        completedSteps: updatedCompleted,
      };
    }

    case 'SET_PROFILE': {
      return {
        ...state,
        riderProfile: action.payload,
      };
    }

    case 'SET_CALIBRATION': {
      return {
        ...state,
        calibration: action.payload,
      };
    }

    case 'ADD_POSE': {
      return {
        ...state,
        poses: {
          ...state.poses,
          [action.payload.poseId]: action.payload,
        },
      };
    }

    case 'SET_MEASUREMENTS': {
      return {
        ...state,
        measurements: action.payload,
      };
    }

    case 'SET_MANUAL_OVERRIDE': {
      return {
        ...state,
        manualOverrides: {
          ...state.manualOverrides,
          [action.payload.key]: action.payload.valueCm,
        },
      };
    }

    case 'SET_BIKE_CATEGORY': {
      return {
        ...state,
        selectedBikeCategory: action.payload,
      };
    }

    case 'SET_ISSUES': {
      return {
        ...state,
        issues: action.payload,
      };
    }

    case 'SET_FIT_RESULT': {
      return {
        ...state,
        fitResult: action.payload,
      };
    }

    case 'SKIP_CAMERA': {
      // Mark camera-related steps as completed (skipped) and jump to manual-input
      const updatedCompleted = new Set(state.completedSteps);
      updatedCompleted.add(state.currentStep);
      updatedCompleted.add('camera-setup');
      updatedCompleted.add('calibration');
      updatedCompleted.add('guided-capture');
      return {
        ...state,
        currentStep: 'manual-input',
        completedSteps: updatedCompleted,
      };
    }

    case 'RESET': {
      const freshState = createInitialState();
      // If the action payload requests keeping the profile, preserve it
      if (action.payload?.keepProfile && state.riderProfile) {
        return {
          ...freshState,
          riderProfile: state.riderProfile,
        };
      }
      return freshState;
    }

    default: {
      // Exhaustiveness check
      const _exhaustive: never = action;
      console.warn('[appReducer] Unhandled action:', _exhaustive);
      return state;
    }
  }
}
