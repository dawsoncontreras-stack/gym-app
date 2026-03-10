import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

export interface AnchorLiftEntry {
  exerciseSlug: string;
  name: string;
  weightLbs: string;
  repCount: string;
}

export interface LimitationEntry {
  bodyArea: string;
  severity: 'avoid' | 'caution';
}

export const DEFAULT_ANCHOR_LIFTS: AnchorLiftEntry[] = [
  { exerciseSlug: 'barbell_bench_press', name: 'Bench Press', weightLbs: '', repCount: '10' },
  { exerciseSlug: 'barbell_back_squat', name: 'Squat', weightLbs: '', repCount: '10' },
  { exerciseSlug: 'conventional_deadlift', name: 'Deadlift', weightLbs: '', repCount: '10' },
  { exerciseSlug: 'overhead_press', name: 'Overhead Press', weightLbs: '', repCount: '10' },
];

export const BODY_AREAS = [
  'shoulders',
  'lower_back',
  'knees',
  'wrists',
  'neck',
  'elbows',
  'hips',
  'ankles',
] as const;

interface OnboardingState {
  // Step 1: Basic Info
  age: string;
  gender: 'male' | 'female' | null;
  heightFt: string;
  heightIn: string;
  weightLbs: string;

  // Step 2: Experience
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  trainingGoal: 'muscle_size' | 'strength' | 'lose_weight' | 'stay_fit' | null;

  // Step 3: Equipment
  equipmentTier: 'large_gym' | 'apartment_gym' | 'home_gym' | 'bodyweight' | null;
  selectedEquipmentIds: string[];

  // Step 4: Schedule
  sessionsPerWeek: number | null;
  sessionDurationMinutes: number | null;
  splitPreference: 'balanced' | 'upper_focused' | 'lower_focused' | null;

  // Step 5: Limitations
  limitations: LimitationEntry[];

  // Step 6: Anchor Lifts
  anchorLifts: AnchorLiftEntry[];

  // Actions
  setGender: (g: 'male' | 'female') => void;
  setExperienceLevel: (l: 'beginner' | 'intermediate' | 'advanced') => void;
  setTrainingGoal: (g: 'muscle_size' | 'strength' | 'lose_weight' | 'stay_fit') => void;
  setEquipmentTier: (t: 'large_gym' | 'apartment_gym' | 'home_gym' | 'bodyweight') => void;
  toggleEquipment: (id: string) => void;
  setSessionsPerWeek: (n: number) => void;
  setSessionDuration: (n: number) => void;
  setSplitPreference: (p: 'balanced' | 'upper_focused' | 'lower_focused') => void;
  toggleLimitation: (bodyArea: string) => void;
  setLimitationSeverity: (bodyArea: string, severity: 'avoid' | 'caution') => void;
  updateAnchorLift: (slug: string, field: 'weightLbs' | 'repCount', value: string) => void;
  completeOnboarding: (userId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  age: '',
  gender: null as 'male' | 'female' | null,
  heightFt: '',
  heightIn: '',
  weightLbs: '',
  experienceLevel: null as 'beginner' | 'intermediate' | 'advanced' | null,
  trainingGoal: null as 'muscle_size' | 'strength' | 'lose_weight' | 'stay_fit' | null,
  equipmentTier: null as 'large_gym' | 'apartment_gym' | 'home_gym' | 'bodyweight' | null,
  selectedEquipmentIds: [] as string[],
  sessionsPerWeek: null as number | null,
  sessionDurationMinutes: null as number | null,
  splitPreference: null as 'balanced' | 'upper_focused' | 'lower_focused' | null,
  limitations: [] as LimitationEntry[],
  anchorLifts: [...DEFAULT_ANCHOR_LIFTS],
};

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  ...initialState,

  setGender: (g) => set({ gender: g }),
  setExperienceLevel: (l) => set({ experienceLevel: l }),
  setTrainingGoal: (g) => set({ trainingGoal: g }),
  setEquipmentTier: (t) => set({ equipmentTier: t, selectedEquipmentIds: [] }),
  toggleEquipment: (id) =>
    set((s) => ({
      selectedEquipmentIds: s.selectedEquipmentIds.includes(id)
        ? s.selectedEquipmentIds.filter((x) => x !== id)
        : [...s.selectedEquipmentIds, id],
    })),
  setSessionsPerWeek: (n) => set({ sessionsPerWeek: n }),
  setSessionDuration: (n) => set({ sessionDurationMinutes: n }),
  setSplitPreference: (p) => set({ splitPreference: p }),

  toggleLimitation: (bodyArea) =>
    set((s) => {
      const exists = s.limitations.find((l) => l.bodyArea === bodyArea);
      if (exists) {
        return { limitations: s.limitations.filter((l) => l.bodyArea !== bodyArea) };
      }
      return { limitations: [...s.limitations, { bodyArea, severity: 'avoid' }] };
    }),

  setLimitationSeverity: (bodyArea, severity) =>
    set((s) => ({
      limitations: s.limitations.map((l) => (l.bodyArea === bodyArea ? { ...l, severity } : l)),
    })),

  updateAnchorLift: (slug, field, value) =>
    set((s) => ({
      anchorLifts: s.anchorLifts.map((l) =>
        l.exerciseSlug === slug ? { ...l, [field]: value } : l,
      ),
    })),

  completeOnboarding: async (userId: string) => {
    const s = get();

    // Convert ft/in to total inches for storage
    const ft = s.heightFt ? parseInt(s.heightFt, 10) : 0;
    const inches = s.heightIn ? parseInt(s.heightIn, 10) : 0;
    const totalInches = ft || inches ? ft * 12 + inches : null;

    // 1. Upsert profile (works whether trigger created the row or not)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      age: s.age ? parseInt(s.age, 10) : null,
      gender: s.gender,
      height_inches: totalInches,
      weight_lbs: s.weightLbs ? parseFloat(s.weightLbs) : null,
      experience_level: s.experienceLevel,
      training_goal: s.trainingGoal,
      equipment_tier: s.equipmentTier,
      sessions_per_week: s.sessionsPerWeek,
      session_duration_minutes: s.sessionDurationMinutes,
      split_preference: s.splitPreference,
      onboarding_completed: true,
    });

    if (profileError) {
      console.error('Profile upsert failed:', profileError);
      throw profileError;
    }

    // 2. Ensure user_settings row exists (in case trigger didn't run)
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });

    if (settingsError) {
      console.error('Settings upsert failed:', settingsError);
    }

    // 3. Clear + re-insert limitations (safe for retries)
    const { error: delLimErr } = await supabase
      .from('user_limitations')
      .delete()
      .eq('user_id', userId);
    if (delLimErr) console.error('Delete limitations failed:', delLimErr);

    if (s.limitations.length > 0) {
      const { error } = await supabase.from('user_limitations').insert(
        s.limitations.map((l) => ({
          user_id: userId,
          body_area: l.bodyArea,
          severity: l.severity,
        })),
      );
      if (error) {
        console.error('Insert limitations failed:', error);
        throw error;
      }
    }

    // 4. Clear + re-insert equipment
    const { error: delEqErr } = await supabase
      .from('user_equipment')
      .delete()
      .eq('user_id', userId);
    if (delEqErr) console.error('Delete equipment failed:', delEqErr);

    if (s.selectedEquipmentIds.length > 0) {
      const { error } = await supabase.from('user_equipment').insert(
        s.selectedEquipmentIds.map((eqId) => ({
          user_id: userId,
          equipment_id: eqId,
        })),
      );
      if (error) {
        console.error('Insert equipment failed:', error);
        throw error;
      }
    }

    // 5. Clear + re-insert anchor lifts (look up exercise IDs by slug)
    const { error: delLiftErr } = await supabase
      .from('user_anchor_lifts')
      .delete()
      .eq('user_id', userId);
    if (delLiftErr) console.error('Delete anchor lifts failed:', delLiftErr);

    const validLifts = s.anchorLifts.filter(
      (l) => l.weightLbs && parseFloat(l.weightLbs) > 0,
    );
    if (validLifts.length > 0) {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, slug')
        .in(
          'slug',
          validLifts.map((l) => l.exerciseSlug),
        );

      if (exercises && exercises.length > 0) {
        const slugToId = new Map(exercises.map((e) => [e.slug, e.id]));
        const toInsert = validLifts
          .filter((l) => slugToId.has(l.exerciseSlug))
          .map((l) => ({
            user_id: userId,
            exercise_id: slugToId.get(l.exerciseSlug)!,
            weight_lbs: parseFloat(l.weightLbs),
            rep_count: parseInt(l.repCount, 10) || 10,
          }));

        if (toInsert.length > 0) {
          const { error } = await supabase.from('user_anchor_lifts').insert(toInsert);
          if (error) console.error('Insert anchor lifts failed:', error);
        }
      }
    }

    // 6. Invalidate profile query so RootNavigator re-routes
    queryClient.invalidateQueries({ queryKey: ['profile'] });

    // 7. Reset store
    get().reset();
  },

  reset: () => set({ ...initialState, anchorLifts: [...DEFAULT_ANCHOR_LIFTS] }),
}));
