// ─── WelcomePage ─────────────────────────────────────────────────────────────

import { Disclaimer } from '@/components/Disclaimer';
import { useWizard } from '@/context/AppContext';

export function WelcomePage() {
  const { dispatch } = useWizard();

  const features = [
    { icon: '📷', title: 'Camera Pose Detection', desc: 'MediaPipe AI estimates your body proportions from live video' },
    { icon: '🧮', title: 'Smart Fit Calculation', desc: 'Transparent rule engine with confidence scores for every recommendation' },
    { icon: '🚲', title: '20 Bike Categories', desc: 'Road, gravel, MTB, urban, and specialty — all covered' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="text-7xl mb-4">🚴</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">BikeFit Camera</h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Get your perfect bike fit — using just your camera
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Takes about 5–10 minutes with camera · 2–3 minutes without
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 mb-8">
          {features.map(f => (
            <div key={f.title} className="flex gap-4 items-start bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{f.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex gap-3 items-start mb-6">
          <span className="text-green-500 text-lg mt-0.5">🔒</span>
          <p className="text-sm text-green-800">
            <strong>Your privacy is protected.</strong> All video processing happens locally in your browser.
            No camera frames are ever uploaded to a server.
          </p>
        </div>

        {/* Disclaimer */}
        <Disclaimer variant="full" className="mb-8" />

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'rider-profile' })}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold rounded-2xl transition-colors shadow-sm"
          >
            Start Fitting →
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'SKIP_CAMERA' });
              dispatch({ type: 'SET_STEP', payload: 'rider-profile' });
            }}
            className="w-full py-3 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-2xl border border-gray-200 transition-colors"
          >
            Skip Camera — Enter Measurements Manually
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          BikeFit Camera v0.1 MVP · Not a medical device
        </p>
      </div>
    </div>
  );
}
