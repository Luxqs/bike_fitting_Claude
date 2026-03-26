// ─── Bike Category Configuration ──────────────────────────────────────────────
//
// Each entry drives the fit engine: saddle position factors, cockpit geometry
// defaults, frame size lookup tables, and category-specific notes.
//
// Frame size tables list TYPICAL manufacturer geometry; actual bikes vary.
// Heights/inseams are in cm; ETT, stack, reach in mm.
//
// saddleHeightFactor: multiplier applied to inseam to get saddle height (mm).
//   LeMond = 0.883. MTB upright positions use slightly lower values.
//
// saddleSetbackFactor: how far behind BB (in mm per cm of femur) the saddle sits.
//   Higher = more setback (TTB/TT riders move forward; comfort riders move back).
//
// aggressivenessDefault: 0 = maximum comfort/upright, 1 = maximum aero/aggressive.
//   Used to interpolate bar drop and cockpit reach within a category's range.
//
// barDropMin/Max/Default: saddle-to-bar drop in mm (positive = bars below saddle).
//   Negative values indicate bars above saddle (city bikes).
//
// barWidthOffsetMm: added to shoulder width to derive handlebar width.
//   Road: 0 (matches shoulders). MTB: +40–80 (wider for control).
//
// cockpitReachFactor: multiplier on (torso + arm) length to get total reach.
//   Lower = more upright (city, comfort). Higher = more stretched (race, TT).
//
// frameSizeMethod: 'cm' for numeric (54cm), 'alpha' for XS/S/M/L/XL.
//
// targetStackReachRatio: desired stack/reach ratio for the category.
//   Higher = taller/more upright stack (comfort). Lower = flatter (aero/race).

import type { BikeCategory } from '@/types/fit';

export interface FrameSizeEntry {
  label: string;        // e.g. "54" or "M"
  heightMin: number;    // minimum rider height (cm, inclusive)
  heightMax: number;    // maximum rider height (cm, exclusive)
  inseamMin: number;    // minimum inseam (cm, inclusive)
  inseamMax: number;    // maximum inseam (cm, exclusive)
  typicalETTmm: number; // typical effective top tube length
  typicalStackMm: number;
  typicalReachMm: number;
}

export interface BikeCategoryConfig {
  id: BikeCategory;
  label: string;
  description: string;
  emoji: string;
  group: string;

  // ── Saddle position ──────────────────────────────────────────────────────────
  saddleHeightFactor: number;
  saddleSetbackFactor: number;

  // ── Cockpit ──────────────────────────────────────────────────────────────────
  aggressivenessDefault: number;
  barDropMin: number;
  barDropMax: number;
  barDropDefault: number;
  barWidthOffsetMm: number;
  cockpitReachFactor: number;

  // ── Frame sizing ─────────────────────────────────────────────────────────────
  frameSizeMethod: 'cm' | 'alpha';
  frameSizeTable: FrameSizeEntry[];
  dropperPost: boolean;

  // ── Geometry targets ─────────────────────────────────────────────────────────
  targetStackReachRatio: number;

  // ── Narrative ────────────────────────────────────────────────────────────────
  fitNotes: string;
}

// ─── Road Race ────────────────────────────────────────────────────────────────

const roadRace: BikeCategoryConfig = {
  id: 'road-race',
  label: 'Road Race',
  description: 'Performance road bike optimised for speed and power',
  emoji: '🏁',
  group: 'Road',
  saddleHeightFactor: 0.883,  // LeMond formula
  saddleSetbackFactor: 0.48,  // mm of setback per cm of femur; KOPS-derived
  aggressivenessDefault: 0.7,
  barDropMin: 40,
  barDropMax: 120,
  barDropDefault: 70,
  barWidthOffsetMm: 0,  // bars match shoulder width on road
  cockpitReachFactor: 0.48,
  frameSizeMethod: 'cm',
  frameSizeTable: [
    { label: '47', heightMin: 152, heightMax: 158, inseamMin: 70, inseamMax: 76, typicalETTmm: 505, typicalStackMm: 510, typicalReachMm: 365 },
    { label: '49', heightMin: 158, heightMax: 163, inseamMin: 73, inseamMax: 78, typicalETTmm: 523, typicalStackMm: 523, typicalReachMm: 373 },
    { label: '51', heightMin: 162, heightMax: 167, inseamMin: 75, inseamMax: 80, typicalETTmm: 535, typicalStackMm: 535, typicalReachMm: 380 },
    { label: '52', heightMin: 165, heightMax: 170, inseamMin: 77, inseamMax: 82, typicalETTmm: 543, typicalStackMm: 545, typicalReachMm: 386 },
    { label: '54', heightMin: 169, heightMax: 174, inseamMin: 79, inseamMax: 84, typicalETTmm: 558, typicalStackMm: 557, typicalReachMm: 393 },
    { label: '56', heightMin: 173, heightMax: 179, inseamMin: 82, inseamMax: 87, typicalETTmm: 572, typicalStackMm: 570, typicalReachMm: 400 },
    { label: '58', heightMin: 178, heightMax: 184, inseamMin: 85, inseamMax: 90, typicalETTmm: 587, typicalStackMm: 583, typicalReachMm: 408 },
    { label: '60', heightMin: 183, heightMax: 192, inseamMin: 88, inseamMax: 96, typicalETTmm: 601, typicalStackMm: 596, typicalReachMm: 416 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.42,
  fitNotes: 'Prioritise aerodynamics and power transfer. Aggressive bar drop typical.',
};

// ─── Road Endurance ───────────────────────────────────────────────────────────

const roadEndurance: BikeCategoryConfig = {
  id: 'road-endurance',
  label: 'Road Endurance',
  description: 'All-day road comfort with moderate performance',
  emoji: '🚴',
  group: 'Road',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.50,
  aggressivenessDefault: 0.45,
  barDropMin: 20,
  barDropMax: 80,
  barDropDefault: 40,
  barWidthOffsetMm: 0,
  cockpitReachFactor: 0.46,
  frameSizeMethod: 'cm',
  frameSizeTable: [
    { label: '47', heightMin: 152, heightMax: 158, inseamMin: 70, inseamMax: 76, typicalETTmm: 500, typicalStackMm: 525, typicalReachMm: 360 },
    { label: '49', heightMin: 158, heightMax: 163, inseamMin: 73, inseamMax: 78, typicalETTmm: 518, typicalStackMm: 538, typicalReachMm: 368 },
    { label: '51', heightMin: 162, heightMax: 167, inseamMin: 75, inseamMax: 80, typicalETTmm: 530, typicalStackMm: 551, typicalReachMm: 375 },
    { label: '52', heightMin: 165, heightMax: 170, inseamMin: 77, inseamMax: 82, typicalETTmm: 538, typicalStackMm: 561, typicalReachMm: 381 },
    { label: '54', heightMin: 169, heightMax: 174, inseamMin: 79, inseamMax: 84, typicalETTmm: 553, typicalStackMm: 574, typicalReachMm: 388 },
    { label: '56', heightMin: 173, heightMax: 179, inseamMin: 82, inseamMax: 87, typicalETTmm: 567, typicalStackMm: 587, typicalReachMm: 395 },
    { label: '58', heightMin: 178, heightMax: 184, inseamMin: 85, inseamMax: 90, typicalETTmm: 582, typicalStackMm: 600, typicalReachMm: 403 },
    { label: '60', heightMin: 183, heightMax: 192, inseamMin: 88, inseamMax: 96, typicalETTmm: 596, typicalStackMm: 613, typicalReachMm: 411 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.49,
  fitNotes: 'Higher stack and shorter reach than race geometry. Good for long days.',
};

// ─── Road Aero ────────────────────────────────────────────────────────────────

const roadAero: BikeCategoryConfig = {
  id: 'road-aero',
  label: 'Road Aero',
  description: 'Aerodynamic road bike for flat terrain and speed',
  emoji: '⚡',
  group: 'Road',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.46,
  aggressivenessDefault: 0.8,
  barDropMin: 60,
  barDropMax: 140,
  barDropDefault: 90,
  barWidthOffsetMm: -10,  // slightly narrower bars for aero
  cockpitReachFactor: 0.49,
  frameSizeMethod: 'cm',
  frameSizeTable: [
    { label: '47', heightMin: 152, heightMax: 158, inseamMin: 70, inseamMax: 76, typicalETTmm: 510, typicalStackMm: 505, typicalReachMm: 370 },
    { label: '49', heightMin: 158, heightMax: 163, inseamMin: 73, inseamMax: 78, typicalETTmm: 528, typicalStackMm: 518, typicalReachMm: 378 },
    { label: '51', heightMin: 162, heightMax: 167, inseamMin: 75, inseamMax: 80, typicalETTmm: 540, typicalStackMm: 530, typicalReachMm: 385 },
    { label: '54', heightMin: 168, heightMax: 174, inseamMin: 79, inseamMax: 84, typicalETTmm: 563, typicalStackMm: 552, typicalReachMm: 398 },
    { label: '56', heightMin: 173, heightMax: 179, inseamMin: 82, inseamMax: 87, typicalETTmm: 577, typicalStackMm: 564, typicalReachMm: 405 },
    { label: '58', heightMin: 178, heightMax: 184, inseamMin: 85, inseamMax: 90, typicalETTmm: 592, typicalStackMm: 577, typicalReachMm: 413 },
    { label: '61', heightMin: 183, heightMax: 192, inseamMin: 88, inseamMax: 96, typicalETTmm: 606, typicalStackMm: 590, typicalReachMm: 421 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.38,
  fitNotes: 'Low stack, long reach. Requires good flexibility and core strength.',
};

// ─── Road Climbing ────────────────────────────────────────────────────────────

const roadClimbing: BikeCategoryConfig = {
  id: 'road-climbing',
  label: 'Road Climbing',
  description: 'Lightweight road bike for mountain stages',
  emoji: '⛰️',
  group: 'Road',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.49,
  aggressivenessDefault: 0.6,
  barDropMin: 30,
  barDropMax: 100,
  barDropDefault: 55,
  barWidthOffsetMm: 0,
  cockpitReachFactor: 0.47,
  frameSizeMethod: 'cm',
  frameSizeTable: roadRace.frameSizeTable,  // climbing bikes share road race sizing
  dropperPost: false,
  targetStackReachRatio: 1.44,
  fitNotes: 'Balanced geometry for power on climbs. Slightly more upright than race.',
};

// ─── TT / Triathlon ───────────────────────────────────────────────────────────

const ttTriathlon: BikeCategoryConfig = {
  id: 'tt-triathlon',
  label: 'TT / Triathlon',
  description: 'Time-trial or triathlon bike with aero bars',
  emoji: '⏱️',
  group: 'Road',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.35,  // riders rotate pelvis forward on TT bikes
  aggressivenessDefault: 0.95,
  barDropMin: 80,
  barDropMax: 180,
  barDropDefault: 120,
  barWidthOffsetMm: -20,
  cockpitReachFactor: 0.52,
  frameSizeMethod: 'cm',
  frameSizeTable: [
    { label: '47', heightMin: 152, heightMax: 158, inseamMin: 70, inseamMax: 76, typicalETTmm: 515, typicalStackMm: 490, typicalReachMm: 375 },
    { label: '51', heightMin: 158, heightMax: 167, inseamMin: 73, inseamMax: 80, typicalETTmm: 540, typicalStackMm: 510, typicalReachMm: 390 },
    { label: '54', heightMin: 166, heightMax: 174, inseamMin: 78, inseamMax: 84, typicalETTmm: 563, typicalStackMm: 530, typicalReachMm: 403 },
    { label: '57', heightMin: 173, heightMax: 180, inseamMin: 82, inseamMax: 88, typicalETTmm: 585, typicalStackMm: 548, typicalReachMm: 415 },
    { label: '60', heightMin: 179, heightMax: 192, inseamMin: 86, inseamMax: 96, typicalETTmm: 606, typicalStackMm: 565, typicalReachMm: 428 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.30,
  fitNotes: 'Very aggressive position. Requires professional fitting for safe use.',
};

// ─── Gravel Race ──────────────────────────────────────────────────────────────

const gravelRace: BikeCategoryConfig = {
  id: 'gravel-race',
  label: 'Gravel Race',
  description: 'Fast gravel riding — long-distance events',
  emoji: '🏅',
  group: 'Gravel',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.50,
  aggressivenessDefault: 0.55,
  barDropMin: 25,
  barDropMax: 90,
  barDropDefault: 50,
  barWidthOffsetMm: 5,   // slightly wider for control on loose surface
  cockpitReachFactor: 0.46,
  frameSizeMethod: 'cm',
  frameSizeTable: [
    { label: '47', heightMin: 152, heightMax: 158, inseamMin: 70, inseamMax: 76, typicalETTmm: 498, typicalStackMm: 545, typicalReachMm: 362 },
    { label: '49', heightMin: 157, heightMax: 163, inseamMin: 72, inseamMax: 78, typicalETTmm: 516, typicalStackMm: 558, typicalReachMm: 370 },
    { label: '51', heightMin: 161, heightMax: 167, inseamMin: 74, inseamMax: 80, typicalETTmm: 528, typicalStackMm: 571, typicalReachMm: 377 },
    { label: '53', heightMin: 165, heightMax: 171, inseamMin: 77, inseamMax: 82, typicalETTmm: 541, typicalStackMm: 584, typicalReachMm: 383 },
    { label: '55', heightMin: 170, heightMax: 176, inseamMin: 80, inseamMax: 85, typicalETTmm: 555, typicalStackMm: 598, typicalReachMm: 390 },
    { label: '57', heightMin: 175, heightMax: 181, inseamMin: 83, inseamMax: 88, typicalETTmm: 568, typicalStackMm: 611, typicalReachMm: 397 },
    { label: '59', heightMin: 180, heightMax: 192, inseamMin: 86, inseamMax: 96, typicalETTmm: 582, typicalStackMm: 625, typicalReachMm: 405 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.53,
  fitNotes: 'More relaxed than road race. Taller stack absorbs rough terrain fatigue.',
};

// ─── Gravel Adventure ─────────────────────────────────────────────────────────

const gravelAdventure: BikeCategoryConfig = {
  id: 'gravel-adventure',
  label: 'Gravel Adventure',
  description: 'All-road adventure — loaded touring on gravel',
  emoji: '🗺️',
  group: 'Gravel',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.52,
  aggressivenessDefault: 0.3,
  barDropMin: 0,
  barDropMax: 60,
  barDropDefault: 20,
  barWidthOffsetMm: 10,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'cm',
  frameSizeTable: gravelRace.frameSizeTable,
  dropperPost: false,
  targetStackReachRatio: 1.60,
  fitNotes: 'Upright, comfortable geometry for long unpaved days. Bags/rack-friendly.',
};

// ─── Cyclocross ───────────────────────────────────────────────────────────────

const cyclocross: BikeCategoryConfig = {
  id: 'cyclocross',
  label: 'Cyclocross',
  description: 'Technical off-road racing with dismounts',
  emoji: '🏆',
  group: 'Gravel',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.48,
  aggressivenessDefault: 0.65,
  barDropMin: 35,
  barDropMax: 100,
  barDropDefault: 60,
  barWidthOffsetMm: 5,
  cockpitReachFactor: 0.47,
  frameSizeMethod: 'cm',
  frameSizeTable: roadRace.frameSizeTable,
  dropperPost: false,
  targetStackReachRatio: 1.45,
  fitNotes: 'Higher bottom bracket than road. Slightly shorter reach for bike handling.',
};

// ─── MTB XC ───────────────────────────────────────────────────────────────────

const mtbXC: BikeCategoryConfig = {
  id: 'mtb-xc',
  label: 'MTB Cross-Country',
  description: 'Lightweight XC racing — maximum efficiency on trail',
  emoji: '🌲',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.50,
  aggressivenessDefault: 0.6,
  barDropMin: -20,
  barDropMax: 40,
  barDropDefault: 10,
  barWidthOffsetMm: 30,  // MTB bars wider for control
  cockpitReachFactor: 0.45,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'XS', heightMin: 152, heightMax: 162, inseamMin: 68, inseamMax: 77, typicalETTmm: 555, typicalStackMm: 595, typicalReachMm: 400 },
    { label: 'S',  heightMin: 161, heightMax: 170, inseamMin: 75, inseamMax: 82, typicalETTmm: 575, typicalStackMm: 615, typicalReachMm: 415 },
    { label: 'M',  heightMin: 169, heightMax: 178, inseamMin: 80, inseamMax: 87, typicalETTmm: 597, typicalStackMm: 635, typicalReachMm: 430 },
    { label: 'L',  heightMin: 177, heightMax: 186, inseamMin: 85, inseamMax: 92, typicalETTmm: 617, typicalStackMm: 655, typicalReachMm: 445 },
    { label: 'XL', heightMin: 185, heightMax: 200, inseamMin: 90, inseamMax: 100, typicalETTmm: 638, typicalStackMm: 675, typicalReachMm: 460 },
  ],
  dropperPost: true,
  targetStackReachRatio: 1.46,
  fitNotes: 'Road-influenced saddle height. Wider bars and more upright than road.',
};

// ─── MTB Trail ────────────────────────────────────────────────────────────────

const mtbTrail: BikeCategoryConfig = {
  id: 'mtb-trail',
  label: 'MTB Trail',
  description: 'All-round trail riding — versatile and playful',
  emoji: '🌄',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.880,  // slightly lower for dynamic trail riding
  saddleSetbackFactor: 0.52,
  aggressivenessDefault: 0.45,
  barDropMin: -30,
  barDropMax: 30,
  barDropDefault: 0,
  barWidthOffsetMm: 50,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'XS', heightMin: 152, heightMax: 162, inseamMin: 68, inseamMax: 77, typicalETTmm: 565, typicalStackMm: 605, typicalReachMm: 410 },
    { label: 'S',  heightMin: 161, heightMax: 170, inseamMin: 75, inseamMax: 82, typicalETTmm: 585, typicalStackMm: 625, typicalReachMm: 425 },
    { label: 'M',  heightMin: 169, heightMax: 178, inseamMin: 80, inseamMax: 87, typicalETTmm: 607, typicalStackMm: 645, typicalReachMm: 440 },
    { label: 'L',  heightMin: 177, heightMax: 186, inseamMin: 85, inseamMax: 92, typicalETTmm: 627, typicalStackMm: 665, typicalReachMm: 455 },
    { label: 'XL', heightMin: 185, heightMax: 200, inseamMin: 90, inseamMax: 100, typicalETTmm: 648, typicalStackMm: 685, typicalReachMm: 470 },
  ],
  dropperPost: true,
  targetStackReachRatio: 1.46,
  fitNotes: 'Dropper post essential. Cockpit adjusted for technical trail handling.',
};

// ─── MTB All-Mountain ─────────────────────────────────────────────────────────

const mtbAllMountain: BikeCategoryConfig = {
  id: 'mtb-all-mountain',
  label: 'MTB All-Mountain',
  description: 'Aggressive trail — climbs and descends',
  emoji: '🏔️',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.878,
  saddleSetbackFactor: 0.53,
  aggressivenessDefault: 0.35,
  barDropMin: -40,
  barDropMax: 20,
  barDropDefault: -10,
  barWidthOffsetMm: 60,
  cockpitReachFactor: 0.43,
  frameSizeMethod: 'alpha',
  frameSizeTable: mtbTrail.frameSizeTable,
  dropperPost: true,
  targetStackReachRatio: 1.48,
  fitNotes: 'Longer travel, slacker angles. Dropper post critical for descending.',
};

// ─── MTB Enduro ───────────────────────────────────────────────────────────────

const mtbEnduro: BikeCategoryConfig = {
  id: 'mtb-enduro',
  label: 'MTB Enduro',
  description: 'Timed descents with untimed climbs',
  emoji: '🎯',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.875,
  saddleSetbackFactor: 0.54,
  aggressivenessDefault: 0.25,
  barDropMin: -50,
  barDropMax: 10,
  barDropDefault: -20,
  barWidthOffsetMm: 70,
  cockpitReachFactor: 0.42,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'S',  heightMin: 158, heightMax: 170, inseamMin: 73, inseamMax: 82, typicalETTmm: 590, typicalStackMm: 630, typicalReachMm: 430 },
    { label: 'M',  heightMin: 168, heightMax: 178, inseamMin: 79, inseamMax: 87, typicalETTmm: 615, typicalStackMm: 650, typicalReachMm: 450 },
    { label: 'L',  heightMin: 176, heightMax: 186, inseamMin: 84, inseamMax: 92, typicalETTmm: 638, typicalStackMm: 670, typicalReachMm: 468 },
    { label: 'XL', heightMin: 184, heightMax: 200, inseamMin: 89, inseamMax: 100, typicalETTmm: 660, typicalStackMm: 690, typicalReachMm: 485 },
  ],
  dropperPost: true,
  targetStackReachRatio: 1.47,
  fitNotes: 'Geometry biased toward descending confidence. Long reach for stability.',
};

// ─── MTB DH ───────────────────────────────────────────────────────────────────

const mtbDH: BikeCategoryConfig = {
  id: 'mtb-dh',
  label: 'MTB Downhill',
  description: 'Gravity bike — shuttle/lift access descents',
  emoji: '💀',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.870,  // DH riders rarely pedal seated
  saddleSetbackFactor: 0.55,
  aggressivenessDefault: 0.15,
  barDropMin: -60,
  barDropMax: 0,
  barDropDefault: -30,
  barWidthOffsetMm: 80,
  cockpitReachFactor: 0.41,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'S',  heightMin: 158, heightMax: 170, inseamMin: 73, inseamMax: 82, typicalETTmm: 595, typicalStackMm: 620, typicalReachMm: 430 },
    { label: 'M',  heightMin: 168, heightMax: 180, inseamMin: 79, inseamMax: 88, typicalETTmm: 622, typicalStackMm: 645, typicalReachMm: 450 },
    { label: 'L',  heightMin: 178, heightMax: 188, inseamMin: 85, inseamMax: 94, typicalETTmm: 648, typicalStackMm: 668, typicalReachMm: 468 },
    { label: 'XL', heightMin: 186, heightMax: 200, inseamMin: 91, inseamMax: 100, typicalETTmm: 672, typicalStackMm: 690, typicalReachMm: 485 },
  ],
  dropperPost: true,
  targetStackReachRatio: 1.45,
  fitNotes: 'Saddle height matters less than on pedalling bikes. Focus on cockpit control.',
};

// ─── MTB Hardtail ─────────────────────────────────────────────────────────────

const mtbHardtail: BikeCategoryConfig = {
  id: 'mtb-hardtail',
  label: 'MTB Hardtail',
  description: 'Front-suspension trail bike — efficient climber',
  emoji: '🌿',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.50,
  aggressivenessDefault: 0.50,
  barDropMin: -20,
  barDropMax: 35,
  barDropDefault: 5,
  barWidthOffsetMm: 45,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'alpha',
  frameSizeTable: mtbTrail.frameSizeTable,
  dropperPost: true,
  targetStackReachRatio: 1.46,
  fitNotes: 'Efficient pedalling position with mtb-width bars for trail control.',
};

// ─── MTB Full Suspension ──────────────────────────────────────────────────────

const mtbFullSuspension: BikeCategoryConfig = {
  id: 'mtb-full-suspension',
  label: 'MTB Full Suspension',
  description: 'Dual-suspension trail / all-mountain',
  emoji: '🔄',
  group: 'Mountain Bike',
  saddleHeightFactor: 0.880,
  saddleSetbackFactor: 0.52,
  aggressivenessDefault: 0.40,
  barDropMin: -35,
  barDropMax: 25,
  barDropDefault: -5,
  barWidthOffsetMm: 55,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'alpha',
  frameSizeTable: mtbTrail.frameSizeTable,
  dropperPost: true,
  targetStackReachRatio: 1.47,
  fitNotes: 'Sag setting affects effective saddle height; check with suspension set.',
};

// ─── Hybrid / Fitness ─────────────────────────────────────────────────────────

const hybridFitness: BikeCategoryConfig = {
  id: 'hybrid-fitness',
  label: 'Hybrid / Fitness',
  description: 'Upright fitness bike for paths and light trails',
  emoji: '🏃',
  group: 'Urban & Practical',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.53,
  aggressivenessDefault: 0.20,
  barDropMin: -50,
  barDropMax: 10,
  barDropDefault: -20,
  barWidthOffsetMm: 20,
  cockpitReachFactor: 0.43,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'XS', heightMin: 147, heightMax: 160, inseamMin: 65, inseamMax: 75, typicalETTmm: 530, typicalStackMm: 600, typicalReachMm: 385 },
    { label: 'S',  heightMin: 158, heightMax: 168, inseamMin: 72, inseamMax: 80, typicalETTmm: 549, typicalStackMm: 620, typicalReachMm: 398 },
    { label: 'M',  heightMin: 166, heightMax: 176, inseamMin: 78, inseamMax: 86, typicalETTmm: 568, typicalStackMm: 640, typicalReachMm: 411 },
    { label: 'L',  heightMin: 174, heightMax: 184, inseamMin: 83, inseamMax: 91, typicalETTmm: 587, typicalStackMm: 660, typicalReachMm: 424 },
    { label: 'XL', heightMin: 182, heightMax: 200, inseamMin: 88, inseamMax: 100, typicalETTmm: 607, typicalStackMm: 680, typicalReachMm: 437 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.60,
  fitNotes: 'Very upright, comfortable. Bars often above saddle for casual riding.',
};

// ─── Commuter / City ──────────────────────────────────────────────────────────

const commuterCity: BikeCategoryConfig = {
  id: 'commuter-city',
  label: 'Commuter / City',
  description: 'Urban commuting — upright visibility',
  emoji: '🏙️',
  group: 'Urban & Practical',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.55,
  aggressivenessDefault: 0.10,
  barDropMin: -80,
  barDropMax: 0,
  barDropDefault: -50,
  barWidthOffsetMm: 15,
  cockpitReachFactor: 0.41,
  frameSizeMethod: 'alpha',
  frameSizeTable: hybridFitness.frameSizeTable,
  dropperPost: false,
  targetStackReachRatio: 1.70,
  fitNotes: 'Upright position for traffic awareness. Comfort over performance.',
};

// ─── Touring ──────────────────────────────────────────────────────────────────

const touring: BikeCategoryConfig = {
  id: 'touring',
  label: 'Touring',
  description: 'Long-distance loaded touring',
  emoji: '🏕️',
  group: 'Urban & Practical',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.52,
  aggressivenessDefault: 0.30,
  barDropMin: -10,
  barDropMax: 60,
  barDropDefault: 15,
  barWidthOffsetMm: 5,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'cm',
  frameSizeTable: roadEndurance.frameSizeTable,
  dropperPost: false,
  targetStackReachRatio: 1.58,
  fitNotes: 'Loaded geometry; longer wheelbase absorbs road irregularities. Comfort focused.',
};

// ─── Bikepacking ──────────────────────────────────────────────────────────────

const bikepacking: BikeCategoryConfig = {
  id: 'bikepacking',
  label: 'Bikepacking',
  description: 'Off-road adventure touring with bags',
  emoji: '🎒',
  group: 'Urban & Practical',
  saddleHeightFactor: 0.883,
  saddleSetbackFactor: 0.51,
  aggressivenessDefault: 0.35,
  barDropMin: -5,
  barDropMax: 55,
  barDropDefault: 20,
  barWidthOffsetMm: 15,
  cockpitReachFactor: 0.44,
  frameSizeMethod: 'cm',
  frameSizeTable: gravelRace.frameSizeTable,
  dropperPost: false,
  targetStackReachRatio: 1.57,
  fitNotes: 'Blend of gravel and touring geometry. Bag placement affects handling.',
};

// ─── BMX / Dirt ───────────────────────────────────────────────────────────────

const bmxDirt: BikeCategoryConfig = {
  id: 'bmx-dirt',
  label: 'BMX / Dirt Jump',
  description: 'Freestyle, jump, or pump track riding',
  emoji: '🎪',
  group: 'Specialty',
  saddleHeightFactor: 0.800,  // BMX saddle height is not performance-critical
  saddleSetbackFactor: 0.50,
  aggressivenessDefault: 0.50,
  barDropMin: -80,
  barDropMax: -20,
  barDropDefault: -50,
  barWidthOffsetMm: 30,
  cockpitReachFactor: 0.38,
  frameSizeMethod: 'alpha',
  frameSizeTable: [
    { label: 'Micro',  heightMin: 107, heightMax: 127, inseamMin: 48, inseamMax: 60, typicalETTmm: 460, typicalStackMm: 530, typicalReachMm: 320 },
    { label: 'Mini',   heightMin: 122, heightMax: 140, inseamMin: 56, inseamMax: 66, typicalETTmm: 480, typicalStackMm: 550, typicalReachMm: 335 },
    { label: 'Junior', heightMin: 138, heightMax: 158, inseamMin: 63, inseamMax: 73, typicalETTmm: 510, typicalStackMm: 575, typicalReachMm: 355 },
    { label: 'Expert', heightMin: 155, heightMax: 178, inseamMin: 70, inseamMax: 85, typicalETTmm: 535, typicalStackMm: 600, typicalReachMm: 375 },
    { label: 'Pro',    heightMin: 173, heightMax: 200, inseamMin: 80, inseamMax: 100, typicalETTmm: 560, typicalStackMm: 625, typicalReachMm: 392 },
  ],
  dropperPost: false,
  targetStackReachRatio: 1.60,
  fitNotes: 'Saddle often slammed low or removed. Bar height is the key contact point.',
};

// ─── Master lookup map ────────────────────────────────────────────────────────

export const BIKE_CATEGORIES: Record<BikeCategory, BikeCategoryConfig> = {
  'road-race':          roadRace,
  'road-endurance':     roadEndurance,
  'road-aero':          roadAero,
  'road-climbing':      roadClimbing,
  'tt-triathlon':       ttTriathlon,
  'gravel-race':        gravelRace,
  'gravel-adventure':   gravelAdventure,
  'cyclocross':         cyclocross,
  'mtb-xc':             mtbXC,
  'mtb-trail':          mtbTrail,
  'mtb-all-mountain':   mtbAllMountain,
  'mtb-enduro':         mtbEnduro,
  'mtb-dh':             mtbDH,
  'mtb-hardtail':       mtbHardtail,
  'mtb-full-suspension':mtbFullSuspension,
  'hybrid-fitness':     hybridFitness,
  'commuter-city':      commuterCity,
  'touring':            touring,
  'bikepacking':        bikepacking,
  'bmx-dirt':           bmxDirt,
};

// ─── Categories grouped by discipline ─────────────────────────────────────────

export const BIKE_CATEGORY_GROUPS: Record<string, BikeCategory[]> = Object.entries(BIKE_CATEGORIES).reduce(
  (acc, [id, cfg]) => {
    const group = cfg.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(id as BikeCategory);
    return acc;
  },
  {} as Record<string, BikeCategory[]>,
);
