// ─── ResultsPage ──────────────────────────────────────────────────────────────

import { useWizard } from '@/context/AppContext';
import { WizardLayout } from '@/components/WizardLayout';
import { ResultsDashboard } from '@/features/results/ResultsDashboard';
import { exportToPDF } from '@/features/results/exportUtils';

export function ResultsPage() {
  const { state, dispatch } = useWizard();

  if (!state.fitResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🤔</div>
        <p className="text-gray-500 mb-4">No results yet. Please complete all steps first.</p>
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'welcome' })}
          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold"
        >
          Start Over
        </button>
      </div>
    );
  }

  const handleExport = async () => {
    try {
      await exportToPDF(state.fitResult!);
    } catch (e) {
      alert('PDF export failed. Try printing the page instead (Ctrl/Cmd+P).');
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEP', payload: 'welcome' });
  };

  return (
    <WizardLayout
      title="Your Fit Results"
      showProgress={true}
      hideNext={true}
    >
      <ResultsDashboard
        result={state.fitResult}
        onExport={handleExport}
        onReset={handleReset}
      />
    </WizardLayout>
  );
}
