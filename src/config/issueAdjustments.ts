// ─── Issue / Pain Adjustments ─────────────────────────────────────────────────
//
// Maps each PainLocation to a set of conservative fit adjustments.
// Adjustments are presented as common bike-fitting remedies — NOT medical advice.
//
// Each adjustment specifies:
//   dimension   — which output dimension to modify
//   deltaMm     — amount to add (positive) or subtract (negative)
//   minSeverity — only apply if issue.severity >= this value
//   rationale   — plain-English explanation shown in the results
//   warningOnly — if true, show a note but don't alter dimensions

import type { PainLocation } from '@/types/fit';

export interface IssueAdjustment {
  dimension: string;   // key matching FitResult fields
  deltaMm: number;
  minSeverity: 1 | 2 | 3;
  rationale: string;
  warningOnly?: boolean;
}

export const ISSUE_ADJUSTMENTS: Record<PainLocation, IssueAdjustment[]> = {
  'front-knee': [
    {
      dimension: 'saddleHeightMm',
      deltaMm: +5,
      minSeverity: 1,
      rationale: 'Anterior knee pain is often related to a saddle that is too low or too far forward. A small saddle height increase reduces knee flexion at TDC.',
    },
    {
      dimension: 'saddleSetbackMm',
      deltaMm: +8,
      minSeverity: 2,
      rationale: 'Moving the saddle rearward improves the knee-over-pedal-spindle relationship and may reduce anterior knee stress.',
    },
  ],

  'back-knee': [
    {
      dimension: 'saddleHeightMm',
      deltaMm: -6,
      minSeverity: 1,
      rationale: 'Posterior knee pain (hamstring insertion) often indicates a saddle that is slightly too high, causing over-extension at BDC.',
    },
  ],

  'low-back': [
    {
      dimension: 'barDropMm',
      deltaMm: -25,
      minSeverity: 1,
      rationale: 'Raising the handlebars reduces lumbar flexion and posterior pelvic tilt, which are common contributors to low-back pain on the bike.',
    },
    {
      dimension: 'stemLengthMm',
      deltaMm: -10,
      minSeverity: 2,
      rationale: 'Shortening the reach reduces how much the lower back must extend to support the torso in a forward position.',
    },
    {
      dimension: 'saddleSetbackMm',
      deltaMm: +8,
      minSeverity: 2,
      rationale: 'Moving the saddle back slightly reduces the forward hip rotation demand that can increase lumbar loading.',
    },
  ],

  'neck': [
    {
      dimension: 'barDropMm',
      deltaMm: -25,
      minSeverity: 1,
      rationale: 'Neck extension on the bike increases with bar drop. Raising bars or reducing drop allows a more neutral cervical position.',
    },
    {
      dimension: 'stemLengthMm',
      deltaMm: -12,
      minSeverity: 2,
      rationale: 'A shorter reach allows the rider to sit more upright, reducing the neck extension needed to see ahead.',
    },
  ],

  'hand-wrist': [
    {
      dimension: 'stemLengthMm',
      deltaMm: -10,
      minSeverity: 1,
      rationale: 'Hand and wrist symptoms often result from bearing too much upper-body weight. Shortening the reach shifts more weight to the core.',
    },
    {
      dimension: 'barDropMm',
      deltaMm: -20,
      minSeverity: 2,
      rationale: 'Raising the bars reduces the percentage of body weight loaded onto the hands and wrists.',
    },
  ],

  'shoulder': [
    {
      dimension: 'stemLengthMm',
      deltaMm: -15,
      minSeverity: 1,
      rationale: 'Shoulder fatigue or pain often means the cockpit is too long. Reducing reach allows the shoulders to work in a less protracted position.',
    },
    {
      dimension: 'barWidthMm',
      deltaMm: +10,
      minSeverity: 2,
      rationale: 'Slightly wider bars can improve scapular positioning and reduce shoulder impingement risk for some riders.',
    },
  ],

  'saddle': [
    {
      dimension: 'saddleSetbackMm',
      deltaMm: +5,
      minSeverity: 1,
      rationale: 'Saddle fore-aft position affects pressure distribution. Small rearward adjustments may reduce anterior perineal pressure.',
    },
    {
      dimension: 'saddleHeightMm',
      deltaMm: 0,
      minSeverity: 1,
      warningOnly: true,
      rationale: 'Saddle tilt and saddle shape are primary factors in saddle comfort. A professional fitter can assess tilt and recommend appropriate saddle models.',
    },
  ],

  'hip': [
    {
      dimension: 'saddleHeightMm',
      deltaMm: -5,
      minSeverity: 1,
      rationale: 'Hip tightness during pedalling can indicate a saddle that is too high, increasing hip flexion demand at TDC. A small reduction may help.',
    },
    {
      dimension: 'crankLengthMm',
      deltaMm: -5,
      minSeverity: 2,
      rationale: 'Shorter cranks reduce the peak hip-flexion angle at TDC, which can significantly relieve hip impingement symptoms.',
    },
  ],

  'foot-numb': [
    {
      dimension: 'crankLengthMm',
      deltaMm: -5,
      minSeverity: 2,
      rationale: 'Shorter cranks can reduce metatarsal pressure during the downstroke for some riders. Cleat position and shoe fit are primary factors — consult a fitter.',
    },
    {
      dimension: 'saddleHeightMm',
      deltaMm: 0,
      minSeverity: 1,
      warningOnly: true,
      rationale: 'Foot numbness is most commonly caused by cleat position or shoe fit, which cannot be assessed here. A professional fitter should check cleat alignment.',
    },
  ],

  'too-stretched': [
    {
      dimension: 'stemLengthMm',
      deltaMm: -20,
      minSeverity: 1,
      rationale: 'Feeling stretched out is the primary indicator for shortening the stem to bring the bars closer.',
    },
    {
      dimension: 'barDropMm',
      deltaMm: -15,
      minSeverity: 1,
      rationale: 'Raising the bars reduces the effective reach and allows a more comfortable arm and shoulder position.',
    },
  ],

  'too-cramped': [
    {
      dimension: 'stemLengthMm',
      deltaMm: +15,
      minSeverity: 1,
      rationale: 'Feeling cramped suggests the cockpit is too short. A longer stem increases reach and opens up the riding position.',
    },
    {
      dimension: 'barDropMm',
      deltaMm: +10,
      minSeverity: 1,
      rationale: 'A slightly lower bar position can help riders who feel cramped by encouraging a more forward-leaning posture.',
    },
  ],

  'instability': [
    {
      dimension: 'saddleHeightMm',
      deltaMm: -5,
      minSeverity: 1,
      rationale: 'A slightly lower saddle can improve stability and confidence at the cost of minor efficiency reduction.',
    },
    {
      dimension: 'saddleHeightMm',
      deltaMm: 0,
      minSeverity: 1,
      warningOnly: true,
      rationale: 'Instability can also result from handlebar height, tyre pressure, and riding technique. Consider a professional bike-fit assessment.',
    },
  ],

  'no-issues': [],
};

// ─── Pain location labels (for display) ───────────────────────────────────────

export const PAIN_LOCATION_LABELS: Record<PainLocation, string> = {
  'front-knee':    'Front Knee Pain',
  'back-knee':     'Back of Knee Pain',
  'low-back':      'Low Back Pain',
  'neck':          'Neck Pain',
  'hand-wrist':    'Hand / Wrist Numbness',
  'shoulder':      'Shoulder Pain',
  'saddle':        'Saddle Discomfort',
  'hip':           'Hip Tightness / Pain',
  'foot-numb':     'Foot Numbness',
  'too-stretched': 'Feeling Too Stretched',
  'too-cramped':   'Feeling Too Cramped',
  'instability':   'Instability / Poor Control',
  'no-issues':     'No Issues — Sizing a New Bike',
};

export const PAIN_LOCATION_OPTIONS = Object.entries(PAIN_LOCATION_LABELS).map(
  ([value, label]) => ({ value: value as PainLocation, label }),
);

// ─── Goal fit notes ────────────────────────────────────────────────────────────

import type { RidingGoal } from '@/types/rider';

export const GOAL_FIT_NOTES: Record<RidingGoal, string> = {
  comfort:
    'Comfort goal: higher front end, reduced reach, and saddle positioned for easy foot placement. Prioritises reduced joint stress over aerodynamics.',
  endurance:
    'Endurance goal: balanced position that can be sustained for several hours. Moderate bar drop and reach provide efficiency without excessive strain.',
  sport:
    'Sport goal: performance-oriented fit with moderate aggressiveness. Good aerodynamics without sacrificing too much comfort on longer efforts.',
  aggressive:
    'Aggressive goal: race-ready position with meaningful bar drop and extended reach. Requires good flexibility and core strength to sustain comfortably.',
  race:
    'Race goal: maximum aerodynamic efficiency. Significant bar drop, extended reach, and high saddle height. Suitable only for experienced, flexible riders.',
};
