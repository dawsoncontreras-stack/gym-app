// ============================================================
// WORKOUT GENERATION CONFIG
// ============================================================

export type SlotRole =
  | 'primary_compound'
  | 'secondary_compound'
  | 'accessory'
  | 'isolation'
  | 'finisher'
  | 'warmup'
  | 'cooldown';

export type MovementPattern =
  | 'horizontal_push' | 'horizontal_pull'
  | 'vertical_push'   | 'vertical_pull'
  | 'squat' | 'hinge' | 'lunge' | 'carry'
  | 'isolation' | 'core' | 'cardio' | 'plyometric';

export type SplitType = 'push' | 'pull' | 'legs' | 'upper_a' | 'upper_b' | 'lower_a' | 'lower_b' | 'full_body' | 'rest';
export type Focus = 'balanced' | 'upper_focused' | 'lower_focused';
export type TrainingGoal = 'strength' | 'muscle_size' | 'lose_weight' | 'stay_fit';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Duration = 15 | 30 | 45 | 60;

export interface SlotBlueprint {
  slot_role: SlotRole;
  movement_pattern: MovementPattern;
  target_muscles?: string[];
}

export interface TrainingSlotParams {
  sets: number;
  rep_range_low: number;
  rep_range_high: number;
  rest_seconds: number;
}

// ============================================================
// 1. SPLIT PATTERNS
// ============================================================

export const SPLIT_PATTERNS: Record<number, Record<Focus, SplitType[]>> = {
  2: {
    balanced:       ['upper_a', 'lower_a'],
    upper_focused:  ['upper_a', 'lower_a'],
    lower_focused:  ['upper_a', 'lower_a'],
  },
  3: {
    balanced:       ['push', 'pull', 'legs'],
    upper_focused:  ['push', 'pull', 'legs'],
    lower_focused:  ['push', 'pull', 'legs'],
  },
  4: {
    balanced:       ['upper_a', 'lower_a', 'upper_b', 'lower_b'],
    upper_focused:  ['push', 'pull', 'lower_a', 'upper_a'],
    lower_focused:  ['upper_a', 'lower_a', 'legs', 'lower_b'],
  },
  5: {
    balanced:       ['push', 'pull', 'legs', 'upper_a', 'lower_a'],
    upper_focused:  ['push', 'pull', 'legs', 'push', 'pull'],
    lower_focused:  ['push', 'pull', 'legs', 'lower_a', 'legs'],
  },
  6: {
    balanced:       ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
    upper_focused:  ['push', 'pull', 'legs', 'push', 'pull', 'upper_a'],
    lower_focused:  ['push', 'pull', 'legs', 'push', 'legs', 'lower_a'],
  },
  7: {
    balanced:       ['push', 'pull', 'legs', 'rest', 'push', 'pull', 'legs'],
    upper_focused:  ['push', 'pull', 'legs', 'rest', 'push', 'pull', 'upper_a'],
    lower_focused:  ['push', 'pull', 'legs', 'rest', 'push', 'legs', 'lower_a'],
  },
};

// ============================================================
// 2. SESSION BLUEPRINTS
// ============================================================

export const SESSION_BLUEPRINTS: Record<SplitType, Record<Duration, SlotBlueprint[]>> = {
  push: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['side_delts'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['side_delts'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['chest'] },
    ],
  },

  pull: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['rear_delts'] },
    ],
    60: [
      // FIXED: was forearms finisher — no seeded exercises have forearms as primary.
      // Now a second biceps isolation finisher.
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['rear_delts'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['biceps'] },
    ],
  },

  legs: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['hamstrings', 'calves'] },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['quads', 'hamstrings'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'accessory',          movement_pattern: 'squat' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['quads'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['hamstrings', 'glutes'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['calves'] },
    ],
  },

  upper_a: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_pull' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'horizontal_push' },
      { slot_role: 'secondary_compound', movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['side_delts', 'rear_delts'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
  },

  lower_a: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['quads', 'hamstrings'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'accessory',          movement_pattern: 'squat' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['quads'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['hamstrings', 'glutes'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['calves'] },
    ],
  },

  full_body: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps', 'triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'squat' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_pull' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps', 'triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
      { slot_role: 'finisher',           movement_pattern: 'carry' },
    ],
  },

  upper_b: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'vertical_pull' },
      { slot_role: 'secondary_compound', movement_pattern: 'horizontal_push' },
      { slot_role: 'accessory',          movement_pattern: 'vertical_push' },
      { slot_role: 'accessory',          movement_pattern: 'horizontal_pull' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['triceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['biceps'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['rear_delts', 'side_delts'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
  },

  lower_b: {
    15: [
      { slot_role: 'primary_compound',   movement_pattern: 'hinge' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
    ],
    30: [
      { slot_role: 'primary_compound',   movement_pattern: 'hinge' },
      { slot_role: 'secondary_compound', movement_pattern: 'squat' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    45: [
      { slot_role: 'primary_compound',   movement_pattern: 'hinge' },
      { slot_role: 'secondary_compound', movement_pattern: 'squat' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['hamstrings', 'glutes'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['abs', 'obliques'] },
    ],
    60: [
      { slot_role: 'primary_compound',   movement_pattern: 'hinge' },
      { slot_role: 'secondary_compound', movement_pattern: 'squat' },
      { slot_role: 'accessory',          movement_pattern: 'lunge' },
      { slot_role: 'accessory',          movement_pattern: 'hinge' },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['hamstrings', 'glutes'] },
      { slot_role: 'isolation',          movement_pattern: 'isolation', target_muscles: ['quads'] },
      { slot_role: 'finisher',           movement_pattern: 'isolation', target_muscles: ['calves'] },
    ],
  },

  rest: { 15: [], 30: [], 45: [], 60: [] },
};

// ============================================================
// 3. TRAINING PARAMETERS
// ============================================================

export const TRAINING_PARAMS: Record<
  TrainingGoal,
  Record<ExperienceLevel, Record<SlotRole, TrainingSlotParams>>
> = {
  strength: {
    beginner: {
      primary_compound:   { sets: 3, rep_range_low: 4, rep_range_high: 6,  rest_seconds: 180 },
      secondary_compound: { sets: 3, rep_range_low: 5, rep_range_high: 8,  rest_seconds: 150 },
      accessory:          { sets: 2, rep_range_low: 6, rep_range_high: 10, rest_seconds: 90 },
      isolation:          { sets: 2, rep_range_low: 10, rep_range_high: 12, rest_seconds: 60 },
      finisher:           { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
    intermediate: {
      primary_compound:   { sets: 4, rep_range_low: 4, rep_range_high: 6,  rest_seconds: 180 },
      secondary_compound: { sets: 3, rep_range_low: 5, rep_range_high: 8,  rest_seconds: 150 },
      accessory:          { sets: 3, rep_range_low: 6, rep_range_high: 10, rest_seconds: 90 },
      isolation:          { sets: 3, rep_range_low: 10, rep_range_high: 15, rest_seconds: 60 },
      finisher:           { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
    advanced: {
      primary_compound:   { sets: 5, rep_range_low: 3, rep_range_high: 5,  rest_seconds: 210 },
      secondary_compound: { sets: 4, rep_range_low: 4, rep_range_high: 6,  rest_seconds: 180 },
      accessory:          { sets: 3, rep_range_low: 6, rep_range_high: 8,  rest_seconds: 105 },
      isolation:          { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 60 },
      finisher:           { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
  },
  muscle_size: {
    beginner: {
      primary_compound:   { sets: 3, rep_range_low: 8, rep_range_high: 10, rest_seconds: 120 },
      secondary_compound: { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 90 },
      accessory:          { sets: 2, rep_range_low: 10, rep_range_high: 12, rest_seconds: 75 },
      isolation:          { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 60 },
      finisher:           { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
    intermediate: {
      primary_compound:   { sets: 4, rep_range_low: 6, rep_range_high: 10, rest_seconds: 120 },
      secondary_compound: { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 90 },
      accessory:          { sets: 3, rep_range_low: 10, rep_range_high: 12, rest_seconds: 75 },
      isolation:          { sets: 3, rep_range_low: 12, rep_range_high: 15, rest_seconds: 60 },
      finisher:           { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
    advanced: {
      primary_compound:   { sets: 4, rep_range_low: 6, rep_range_high: 10, rest_seconds: 120 },
      secondary_compound: { sets: 4, rep_range_low: 8, rep_range_high: 12, rest_seconds: 90 },
      accessory:          { sets: 3, rep_range_low: 10, rep_range_high: 15, rest_seconds: 75 },
      isolation:          { sets: 3, rep_range_low: 12, rep_range_high: 15, rest_seconds: 60 },
      finisher:           { sets: 3, rep_range_low: 15, rep_range_high: 20, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
  },
  lose_weight: {
    beginner: {
      primary_compound:   { sets: 3, rep_range_low: 10, rep_range_high: 12, rest_seconds: 75 },
      secondary_compound: { sets: 3, rep_range_low: 10, rep_range_high: 15, rest_seconds: 60 },
      accessory:          { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      isolation:          { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 30 },
      finisher:           { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 30 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
    intermediate: {
      primary_compound:   { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 75 },
      secondary_compound: { sets: 3, rep_range_low: 10, rep_range_high: 15, rest_seconds: 60 },
      accessory:          { sets: 3, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      isolation:          { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 30 },
      finisher:           { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 30 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
    advanced: {
      primary_compound:   { sets: 4, rep_range_low: 8, rep_range_high: 12, rest_seconds: 60 },
      secondary_compound: { sets: 3, rep_range_low: 10, rep_range_high: 15, rest_seconds: 45 },
      accessory:          { sets: 3, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      isolation:          { sets: 2, rep_range_low: 15, rep_range_high: 20, rest_seconds: 30 },
      finisher:           { sets: 2, rep_range_low: 15, rep_range_high: 25, rest_seconds: 30 },
      warmup:             { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 12, rep_range_high: 15, rest_seconds: 0 },
    },
  },
  stay_fit: {
    beginner: {
      primary_compound:   { sets: 3, rep_range_low: 8, rep_range_high: 10, rest_seconds: 90 },
      secondary_compound: { sets: 2, rep_range_low: 8, rep_range_high: 12, rest_seconds: 75 },
      accessory:          { sets: 2, rep_range_low: 10, rep_range_high: 12, rest_seconds: 60 },
      isolation:          { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      finisher:           { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
    intermediate: {
      primary_compound:   { sets: 3, rep_range_low: 8, rep_range_high: 10, rest_seconds: 90 },
      secondary_compound: { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 75 },
      accessory:          { sets: 2, rep_range_low: 10, rep_range_high: 12, rest_seconds: 60 },
      isolation:          { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      finisher:           { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
    advanced: {
      primary_compound:   { sets: 3, rep_range_low: 6, rep_range_high: 10, rest_seconds: 90 },
      secondary_compound: { sets: 3, rep_range_low: 8, rep_range_high: 12, rest_seconds: 75 },
      accessory:          { sets: 3, rep_range_low: 10, rep_range_high: 12, rest_seconds: 60 },
      isolation:          { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      finisher:           { sets: 2, rep_range_low: 12, rep_range_high: 15, rest_seconds: 45 },
      warmup:             { sets: 2, rep_range_low: 10, rep_range_high: 15, rest_seconds: 30 },
      cooldown:           { sets: 1, rep_range_low: 10, rep_range_high: 15, rest_seconds: 0 },
    },
  },
};

// ============================================================
// 4. FOCUS SET ADJUSTMENTS
// ============================================================

export const MIN_SETS_PER_SLOT = 1;

export const FOCUS_SET_ADJUSTMENTS: Record<Focus, Partial<Record<SplitType, number>>> = {
  balanced: {},
  upper_focused: { push: +1, pull: +1, legs: -1, upper_a: +1, upper_b: +1, lower_a: -1, lower_b: -1 },
  lower_focused: { push: -1, pull: -1, legs: +1, upper_a: -1, upper_b: -1, lower_a: +1, lower_b: +1 },
};

// ============================================================
// 5. EXPERIENCE SLOT LIMITS
// ============================================================

export const EXPERIENCE_SLOT_LIMITS: Record<ExperienceLevel, Record<Duration, number>> = {
  beginner:     { 15: 2, 30: 3, 45: 4, 60: 5 },
  intermediate: { 15: 2, 30: 4, 45: 6, 60: 7 },
  advanced:     { 15: 2, 30: 4, 45: 6, 60: 8 },
};

export const SLOT_TRIM_PRIORITY: Record<SlotRole, number> = {
  finisher: 7,
  cooldown: 6,
  isolation: 5,
  warmup: 4,
  accessory: 3,
  secondary_compound: 2,
  primary_compound: 1,
};

// ============================================================
// 6. ESTIMATED TIME PER SLOT
// ============================================================

export const ESTIMATED_MINUTES_PER_SET: Record<SlotRole, number> = {
  primary_compound: 3.5,
  secondary_compound: 3.0,
  accessory: 2.5,
  isolation: 2.0,
  finisher: 1.5,
  warmup: 1.5,
  cooldown: 2.0,
};

// ============================================================
// 7. SPLIT TYPE DISPLAY NAMES
// ============================================================

export const SPLIT_TYPE_NAMES: Record<SplitType, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Leg Day',
  upper_a: 'Upper Body A',
  upper_b: 'Upper Body B',
  lower_a: 'Lower Body A',
  lower_b: 'Lower Body B',
  full_body: 'Full Body',
  rest: 'Rest Day',
};
