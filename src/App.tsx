// ─── App.tsx ──────────────────────────────────────────────────────────────────
//
// Root component. Reads currentStep from WizardContext and renders the
// appropriate page component. No routing library needed — state-driven.

import { AppProvider, useWizard } from '@/context/AppContext';
import { WelcomePage }       from '@/pages/WelcomePage';
import { RiderProfilePage }  from '@/pages/RiderProfilePage';
import { CameraSetupPage }   from '@/pages/CameraSetupPage';
import { CalibrationPage }   from '@/pages/CalibrationPage';
import { GuidedCapturePage } from '@/pages/GuidedCapturePage';
import { ManualInputPage }   from '@/pages/ManualInputPage';
import { BikeTypePage }      from '@/pages/BikeTypePage';
import { IssuesPage }        from '@/pages/IssuesPage';
import { CalculatingPage }   from '@/pages/CalculatingPage';
import { ResultsPage }       from '@/pages/ResultsPage';

function AppRouter() {
  const { state } = useWizard();

  switch (state.currentStep) {
    case 'welcome':         return <WelcomePage />;
    case 'rider-profile':   return <RiderProfilePage />;
    case 'camera-setup':    return <CameraSetupPage />;
    case 'calibration':     return <CalibrationPage />;
    case 'guided-capture':  return <GuidedCapturePage />;
    case 'manual-input':    return <ManualInputPage />;
    case 'bike-type':       return <BikeTypePage />;
    case 'issues':          return <IssuesPage />;
    case 'calculating':     return <CalculatingPage />;
    case 'results':         return <ResultsPage />;
    default:                return <WelcomePage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        <AppRouter />
      </div>
    </AppProvider>
  );
}
