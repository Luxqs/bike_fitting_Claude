// ─── ResultsDashboard Component ───────────────────────────────────────────────

import { useState } from 'react';
import type { FitResult } from '@/types/fit';
import { FitDimensionCard } from './FitDimensionCard';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { Disclaimer } from '@/components/Disclaimer';
import { BIKE_CATEGORIES } from '@/config/bikeCategories';
import { formatMm } from '@/utils/formatUtils';
import { shareViaEmail, shareViaWhatsApp } from './exportUtils';

interface ResultsDashboardProps {
  result: FitResult;
  onExport: () => Promise<void>;
  onReset: () => void;
}

// Group dimensions for display
const DIMENSION_GROUPS = [
  {
    title: '🪑 Saddle',
    keys: ['saddleHeightMm', 'saddleSetbackMm'],
  },
  {
    title: '🎛️ Cockpit',
    keys: ['barDropMm', 'barWidthMm', 'stemLengthMm'],
  },
  {
    title: '⚙️ Drivetrain',
    keys: ['crankLengthMm'],
  },
  {
    title: '🖼️ Frame Geometry',
    keys: ['stemLengthMm-ETT', 'stackMm', 'reachMm'],
  },
];

export function ResultsDashboard({ result, onExport, onReset }: ResultsDashboardProps) {
  const category = BIKE_CATEGORIES[result.bikeCategory];
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(true);

  const handlePDF = async () => {
    setPdfBusy(true);
    try {
      await onExport();
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up" id="results-dashboard">
      {/* Hero summary */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-brand-200 text-sm font-medium mb-1">Recommended Frame Size</p>
            <p className="text-5xl font-bold tracking-tight">{result.frameSize}</p>
            <p className="text-brand-200 text-sm mt-1">
              Range: {result.frameSizeRange[0]} – {result.frameSizeRange[1]}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl">{category.emoji}</span>
            <p className="text-brand-200 text-xs mt-1">{category.label}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-brand-500 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-brand-200 text-xs">Saddle Height</p>
            <p className="text-xl font-bold tabular-nums">{result.saddleHeightMm} mm</p>
          </div>
          <div>
            <p className="text-brand-200 text-xs">Bar Width</p>
            <p className="text-xl font-bold tabular-nums">{result.barWidthMm} mm</p>
          </div>
          <div>
            <p className="text-brand-200 text-xs">Stem Length</p>
            <p className="text-xl font-bold tabular-nums">{result.stemLengthMm} mm</p>
          </div>
        </div>
      </div>

      {/* Overall confidence */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall result confidence</span>
          <ConfidenceIndicator score={result.overallConfidence} showBar />
        </div>
        {result.overallConfidence < 0.5 && (
          <p className="mt-2 text-xs text-amber-600">
            Confidence is below 50%. Entering manual measurements (inseam, shoulder width, torso)
            will significantly improve accuracy.
          </p>
        )}
      </div>

      {/* Rider summary */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rider Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Height', value: `${result.riderSnapshot.heightCm} cm` },
            { label: 'Weight', value: `${result.riderSnapshot.weightKg} kg` },
            { label: 'Goal', value: result.riderSnapshot.ridingGoal },
            { label: 'Knee @BDC', value: `${result.kneeAngleAtBDC}°` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg p-2 border border-gray-200">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension groups */}
      {DIMENSION_GROUPS.map(group => {
        const groupDims = group.keys
          .map(k => result.dimensions.find(d => d.key === k))
          .filter((d): d is NonNullable<typeof d> => d !== undefined);

        if (groupDims.length === 0) return null;

        return (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {group.title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupDims.map(dim => (
                <FitDimensionCard key={dim.key} dimension={dim} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠️ Warnings & Notes</h3>
          <ul className="space-y-1.5">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 flex gap-2">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {result.assumptions.length > 0 && (
        <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100">
            Assumptions &amp; methodology ({result.assumptions.length} notes)
          </summary>
          <div className="px-4 pb-4 pt-1">
            <ul className="space-y-1.5">
              {result.assumptions.map((a, i) => (
                <li key={i} className="text-xs text-gray-500 flex gap-2">
                  <span className="flex-shrink-0">→</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {/* Category notes */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-brand-800 mb-1">{category.emoji} {category.label} notes</h3>
        <p className="text-sm text-brand-700">{category.fitNotes}</p>
      </div>

      {/* Disclaimer */}
      <Disclaimer variant="full" />

      {/* Save & Share */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        {/* Header row — toggles the panel on mobile */}
        <button
          onClick={() => setShareOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <span className="font-semibold text-gray-800 text-sm">Save &amp; Share your results</span>
          <span className="text-gray-400 text-xs">{shareOpen ? '▲ hide' : '▼ show'}</span>
        </button>

        {shareOpen && (
          <div className="px-5 py-4 space-y-3 bg-white">
            {/* PDF */}
            <button
              onClick={handlePDF}
              disabled={pdfBusy}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-brand-100 bg-brand-50 hover:border-brand-400 hover:bg-brand-100 transition-all disabled:opacity-60"
            >
              <span className="text-2xl flex-shrink-0">📄</span>
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm text-brand-800">
                  {pdfBusy ? 'Generating PDF…' : 'Save as PDF'}
                </p>
                <p className="text-xs text-brand-600 mt-0.5">
                  Download a full report with all dimensions, confidence scores and notes
                </p>
              </div>
            </button>

            {/* Email */}
            <button
              onClick={() => shareViaEmail(result)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <span className="text-2xl flex-shrink-0">✉️</span>
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm text-gray-800">Send via Email</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Opens your email app with a pre-filled summary — send to yourself or your fitter
                </p>
              </div>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => shareViaWhatsApp(result)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-100 bg-green-50 hover:border-green-400 hover:bg-green-100 transition-all"
            >
              <span className="text-2xl flex-shrink-0">💬</span>
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm text-green-800">Share via WhatsApp</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Opens WhatsApp with your fit summary ready to send to a contact or group
                </p>
              </div>
            </button>

            <p className="text-xs text-gray-400 pt-1 text-center">
              No data is uploaded — your results stay on your device.
            </p>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="flex pt-1">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          <span>🔄</span> Start New Fitting
        </button>
      </div>
    </div>
  );
}
