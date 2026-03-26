import type { MeasurementSource } from '@/types/measurements';

/**
 * Format a millimetre value with its unit.
 * If preferCm is true, converts to cm and appends "cm".
 * Otherwise appends "mm".
 */
export function formatMm(mm: number, preferCm = false): string {
  if (preferCm) {
    return `${(mm / 10).toFixed(1)} cm`;
  }
  return `${Math.round(mm)} mm`;
}

/**
 * Format a measurement range.
 * e.g. formatRange(165, 175) → "165–175 mm"
 *      formatRange(16.5, 17.5, 'cm') → "16.5–17.5 cm"
 */
export function formatRange(min: number, max: number, unit = 'mm'): string {
  const fmt = (v: number) => (unit === 'cm' ? v.toFixed(1) : String(Math.round(v)));
  return `${fmt(min)}–${fmt(max)} ${unit}`;
}

/**
 * Format a confidence score [0,1] as a percentage string.
 * e.g. 0.82 → "82%"
 */
export function formatConfidence(confidence: number): string {
  const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  return `${pct}%`;
}

/**
 * Return a Tailwind text-color class appropriate for the given confidence score.
 * ≥ 0.70 → green, ≥ 0.40 → amber, < 0.40 → red
 */
export function confidenceColor(score: number): string {
  if (score >= 0.7) return 'text-green-500';
  if (score >= 0.4) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Return a qualitative label for a confidence score.
 */
export function confidenceLabel(score: number): 'High' | 'Medium' | 'Low' | 'None' {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  if (score > 0) return 'Low';
  return 'None';
}

/**
 * Format a degree value with the degree symbol.
 * e.g. formatDeg(147.3) → "147°"
 */
export function formatDeg(degrees: number): string {
  return `${Math.round(degrees)}°`;
}

/**
 * Format a centimetre value.
 * e.g. formatCm(73.5) → "73.5 cm"
 */
export function formatCm(cm: number): string {
  return `${cm.toFixed(1)} cm`;
}

// ─── Source badge info ────────────────────────────────────────────────────────

interface SourceInfo {
  label: string;
  /** Tailwind background + text class pair */
  color: string;
}

/**
 * Returns a display label and Tailwind color classes for a measurement source.
 */
export function sourceInfo(source: MeasurementSource): SourceInfo {
  switch (source) {
    case 'camera':
      return { label: 'Camera', color: 'bg-brand-100 text-brand-700' };
    case 'manual':
      return { label: 'Manual', color: 'bg-purple-100 text-purple-700' };
    case 'estimated':
      return { label: 'Estimated', color: 'bg-amber-100 text-amber-700' };
    case 'user-reported':
      return { label: 'Self-reported', color: 'bg-gray-100 text-gray-600' };
    default: {
      // Exhaustiveness check — TypeScript will error if a new source is added
      const _exhaustive: never = source;
      return { label: String(_exhaustive), color: 'bg-gray-100 text-gray-500' };
    }
  }
}

// ─── Bike category labels ─────────────────────────────────────────────────────

const BIKE_CATEGORY_LABELS: Record<string, string> = {
  'road-race': 'Road — Race',
  'road-endurance': 'Road — Endurance',
  'road-aero': 'Road — Aero',
  'road-climbing': 'Road — Climbing',
  'tt-triathlon': 'TT / Triathlon',
  'gravel-race': 'Gravel — Race',
  'gravel-adventure': 'Gravel — Adventure',
  cyclocross: 'Cyclocross',
  'mtb-xc': 'MTB — XC',
  'mtb-trail': 'MTB — Trail',
  'mtb-all-mountain': 'MTB — All Mountain',
  'mtb-enduro': 'MTB — Enduro',
  'mtb-dh': 'MTB — Downhill',
  'mtb-hardtail': 'MTB — Hardtail',
  'mtb-full-suspension': 'MTB — Full Suspension',
  'hybrid-fitness': 'Hybrid / Fitness',
  'commuter-city': 'Commuter / City',
  touring: 'Touring',
  bikepacking: 'Bikepacking',
  'bmx-dirt': 'BMX / Dirt',
};

/**
 * Convert a bike category ID to a human-readable display label.
 * Falls back to title-casing the ID if not found.
 */
export function formatBikeCategory(category: string): string {
  if (category in BIKE_CATEGORY_LABELS) {
    return BIKE_CATEGORY_LABELS[category];
  }
  // Fallback: replace hyphens with spaces and title-case
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Pluralization ────────────────────────────────────────────────────────────

/**
 * Return a pluralized string based on count.
 * e.g. pluralize(1, 'issue') → "1 issue"
 *      pluralize(3, 'issue') → "3 issues"
 *      pluralize(1, 'ox', 'oxen') → "1 ox"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural ?? `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
