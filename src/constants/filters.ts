import { DifficultyLevel } from '../lib/types';

export const DIFFICULTY_OPTIONS: { label: string; value: DifficultyLevel }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export const EQUIPMENT_OPTIONS = [
  'bodyweight',
  'dumbbells',
  'barbell',
  'kettlebell',
  'resistance bands',
  'pull-up bar',
  'bench',
  'cable machine',
  'medicine ball',
] as const;

export type EquipmentOption = (typeof EQUIPMENT_OPTIONS)[number];

export const CATEGORY_SLUGS = [
  'push',
  'pull',
  'legs',
  'full-body',
  'cardio',
  'mobility',
  'core',
  'hiit',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
