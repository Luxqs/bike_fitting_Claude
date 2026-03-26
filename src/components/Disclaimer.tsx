// ─── Disclaimer Component ─────────────────────────────────────────────────────

interface DisclaimerProps {
  variant?: 'banner' | 'compact' | 'full';
  className?: string;
}

export function Disclaimer({ variant = 'compact', className = '' }: DisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3 items-start ${className}`}>
        <span className="text-amber-500 text-lg mt-0.5 flex-shrink-0">⚠️</span>
        <p className="text-sm text-amber-800">
          <strong>Estimation tool only.</strong> Final bike selection should be validated by a professional
          fitter, especially if you have pain, injuries, or asymmetries.
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <p className={`text-xs text-gray-500 italic ${className}`}>
        This tool provides estimates only — not medical or professional bike-fit advice.
      </p>
    );
  }

  // full variant
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚠️</span>
        <h3 className="font-semibold text-amber-900">Important Disclaimer</h3>
      </div>
      <ul className="space-y-2 text-sm text-amber-800">
        <li className="flex gap-2">
          <span className="flex-shrink-0 mt-0.5">•</span>
          <span>
            <strong>Estimation tool only.</strong> BikeFit Camera provides approximate recommendations
            based on body proportions and common bike-fitting heuristics. It is not a medical device
            and not a substitute for a professional bike fit.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex-shrink-0 mt-0.5">•</span>
          <span>
            <strong>Camera measurements are approximate.</strong> Accuracy depends on calibration
            quality, lighting, clothing, camera angle, and pose execution. Low-confidence measurements
            will be flagged in the results.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex-shrink-0 mt-0.5">•</span>
          <span>
            <strong>Always validate with a professional fitter</strong> — especially if you experience
            pain, have injuries, known asymmetries, or are purchasing an expensive bicycle.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex-shrink-0 mt-0.5">•</span>
          <span>
            <strong>Privacy:</strong> All video and image processing happens locally in your browser.
            No camera frames are uploaded to any server.
          </span>
        </li>
      </ul>
    </div>
  );
}
