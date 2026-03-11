import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useAuth } from '../hooks/useAuth';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { queryClient } from '../lib/queryClient';
import { ExerciseCard } from '../components/ExerciseCard';
import { WorkoutSwapSheet } from '../components/WorkoutSwapSheet';
import { ExercisePickerModal } from '../components/ExercisePickerModal';
import { NavigationModal } from '../components/NavigationModal';
import {
  replaceExercise,
  setExercisePreference,
  neverRecommendAndRemove,
  removeExerciseFromWorkout,
  addExerciseToWorkout,
  autoReplaceExercise,
  fetchTemplateSlots,
  reorderExercises,
} from '../services/exercise-actions';
import type { Exercise, UserWorkoutExercise } from '../types';

type ExerciseSummary = Pick<
  Exercise,
  'id' | 'name' | 'slug' | 'movement_pattern' | 'exercise_type' | 'difficulty_tier' | 'default_sets' | 'default_rep_range_low' | 'default_rep_range_high' | 'default_rest_seconds'
>;

interface RemovalPending {
  exercise: UserWorkoutExercise;
  type: 'remove' | 'never_recommend';
}

export function HomeScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [overrideWorkoutId, setOverrideWorkoutId] = useState<string | undefined>();
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<UserWorkoutExercise | null>(null);
  const [addPickerVisible, setAddPickerVisible] = useState(false);
  const [removalPending, setRemovalPending] = useState<RemovalPending | null>(null);
  const [templateSlots, setTemplateSlots] = useState<{ slot_role: string; movement_pattern: string }[]>([]);
  const [menuExercise, setMenuExercise] = useState<UserWorkoutExercise | null>(null);

  // Local copy for optimistic reorder
  const [localExercises, setLocalExercises] = useState<UserWorkoutExercise[]>([]);

  const { data, isLoading, error } = useActiveWorkout(userId, overrideWorkoutId);

  useEffect(() => {
    if (data?.workout?.user_workout_exercises) {
      setLocalExercises(data.workout.user_workout_exercises);
    }
  }, [data?.workout?.user_workout_exercises]);

  useEffect(() => {
    if (!data?.workout?.program_workouts?.id) {
      setTemplateSlots([]);
      return;
    }
    fetchTemplateSlots(data.workout.program_workouts.id)
      .then(setTemplateSlots)
      .catch(() => setTemplateSlots([]));
  }, [data?.workout?.program_workouts?.id]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activeWorkout'] });
  }, []);

  // ── Drag reorder ────────────────────────────────────────────
  const handleDragEnd = useCallback(async ({ data: reordered }: { data: UserWorkoutExercise[] }) => {
    setLocalExercises(reordered);
    const updates = reordered.map((ex, i) => ({ id: ex.id, sortOrder: i }));
    try {
      await reorderExercises(updates);
    } catch (e) {
      console.error('Reorder failed:', e);
      invalidate();
    }
  }, [invalidate]);

  // ── Replace flow ──────────────────────────────────────────
  const handleReplace = useCallback(async (target: UserWorkoutExercise, newExercise: ExerciseSummary) => {
    await replaceExercise(target.id, newExercise.id, target.exercise_id);
    invalidate();
  }, [invalidate]);

  const handlePreference = useCallback(async (exerciseId: string, pref: 'recommend_more' | 'recommend_less') => {
    if (!userId) return;
    await setExercisePreference(userId, exerciseId, pref);
  }, [userId]);

  // ── Removal flow ────────────────────────────────────────────
  const handleRequestRemove = useCallback((exercise: UserWorkoutExercise) => {
    setRemovalPending({ exercise, type: 'remove' });
  }, []);

  const handleRequestNeverRecommend = useCallback((exercise: UserWorkoutExercise) => {
    setRemovalPending({ exercise, type: 'never_recommend' });
  }, []);

  const executeRemoval = useCallback(async () => {
    if (!removalPending || !userId) return;
    const { exercise, type } = removalPending;
    if (type === 'never_recommend') {
      await neverRecommendAndRemove(userId, exercise.exercise_id, exercise.id);
    } else {
      await removeExerciseFromWorkout(exercise.id);
    }
    invalidate();
  }, [removalPending, userId, invalidate]);

  const handleAutoReplace = useCallback(async () => {
    if (!removalPending || !userId || !data?.workout) return;
    const { exercise, type } = removalPending;
    const currentExIds = localExercises.map(e => e.exercise_id);

    if (type === 'never_recommend') {
      await neverRecommendAndRemove(userId, exercise.exercise_id, exercise.id);
    } else {
      await removeExerciseFromWorkout(exercise.id);
    }

    const replacement = await autoReplaceExercise(
      exercise.id,
      exercise.exercises.movement_pattern,
      currentExIds,
      userId,
    );
    if (replacement) {
      await addExerciseToWorkout(
        data.workout.id,
        replacement.id,
        replacement.default_sets,
        replacement.default_rep_range_low,
        replacement.default_rep_range_high,
        replacement.default_rest_seconds,
        exercise.sort_order,
      );
    }
    setRemovalPending(null);
    invalidate();
  }, [removalPending, userId, data?.workout, localExercises, invalidate]);

  const handleManualReplace = useCallback(async () => {
    if (!removalPending || !userId) return;
    const { exercise, type } = removalPending;

    if (type === 'never_recommend') {
      await neverRecommendAndRemove(userId, exercise.exercise_id, exercise.id);
    } else {
      await removeExerciseFromWorkout(exercise.id);
    }

    setReplaceTarget(exercise);
    setRemovalPending(null);
    invalidate();
  }, [removalPending, userId, invalidate]);

  const handleNoReplace = useCallback(async () => {
    await executeRemoval();
    setRemovalPending(null);
  }, [executeRemoval]);

  // ── Add exercise ──────────────────────────────────────────
  const handleAddExercise = useCallback(async (exercise: ExerciseSummary) => {
    if (!data?.workout) return;
    const maxSort = Math.max(0, ...localExercises.map(e => e.sort_order));
    await addExerciseToWorkout(
      data.workout.id,
      exercise.id,
      exercise.default_sets,
      exercise.default_rep_range_low,
      exercise.default_rep_range_high,
      exercise.default_rest_seconds,
      maxSort + 1,
    );
    invalidate();
  }, [data?.workout, localExercises, invalidate]);

  const handleReplacementFromRemoval = useCallback(async (newExercise: ExerciseSummary) => {
    if (!replaceTarget || !data?.workout) return;
    await addExerciseToWorkout(
      data.workout.id,
      newExercise.id,
      newExercise.default_sets,
      newExercise.default_rep_range_low,
      newExercise.default_rep_range_high,
      newExercise.default_rest_seconds,
      replaceTarget.sort_order,
    );
    setReplaceTarget(null);
    invalidate();
  }, [replaceTarget, data?.workout, invalidate]);

  const isReplacingAfterRemoval = useMemo(() => {
    if (!replaceTarget || !data?.workout) return false;
    return !data.workout.user_workout_exercises.some(e => e.id === replaceTarget.id && !e.is_skipped);
  }, [replaceTarget, data?.workout]);

  // ── Missing template slots ────────────────────────────────
  const missingSlots = useMemo(() => {
    if (localExercises.length === 0 || templateSlots.length === 0) return [];

    const remaining: Record<string, number> = {};
    for (const e of localExercises) {
      const p = e.exercises.movement_pattern;
      remaining[p] = (remaining[p] ?? 0) + 1;
    }

    const result: { slot_role: string; movement_pattern: string }[] = [];
    for (const slot of templateSlots) {
      const count = remaining[slot.movement_pattern] ?? 0;
      if (count > 0) {
        remaining[slot.movement_pattern] = count - 1;
      } else {
        result.push(slot);
      }
    }
    return result;
  }, [localExercises, templateSlots]);

  const workout = data?.workout;
  const weights = data?.weights ?? new Map<string, number>();
  const siblingWorkouts = data?.siblingWorkouts ?? [];
  const dayInfo = workout?.program_workouts;
  const currentExerciseIds = localExercises.map(e => e.exercise_id);

  // ── Render item ─────────────────────────────────────────────
  const renderItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<UserWorkoutExercise>) => {
    const idx = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        <ExerciseCard
          exercise={item}
          index={idx}
          weight={weights.get(item.exercise_id)}
          onMenuOpen={() => setMenuExercise(item)}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  }, [weights]);

  const keyExtractor = useCallback((item: UserWorkoutExercise) => item.id, []);

  // ── Loading / Error / Empty states ────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-500 mt-4 text-base">Setting up your program...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-600 font-semibold text-lg">Something went wrong</Text>
          <Text className="text-red-500 mt-2 text-center">{(error as Error).message}</Text>
          <Pressable className="mt-4 bg-blue-600 rounded-xl py-3 px-6 active:bg-blue-700" onPress={invalidate}>
            <Text className="text-white font-semibold">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout || !dayInfo) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-2xl font-bold text-gray-900">All Done!</Text>
          <Text className="text-gray-500 mt-2 text-center text-base">
            You've completed all workouts in your program.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <DraggableFlatList
          data={localExercises}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm text-blue-600 font-medium">Day {dayInfo.day_number}</Text>
                  <Text className="text-2xl font-bold text-gray-900">{dayInfo.name}</Text>
                </View>
                {siblingWorkouts.length > 0 && (
                  <Pressable
                    className="bg-white rounded-xl px-4 py-2 shadow-sm active:bg-gray-50"
                    onPress={() => setSwapSheetVisible(true)}
                  >
                    <Text className="text-sm font-medium text-blue-600">Swap</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {localExercises.length} Exercises
              </Text>
            </View>
          }
          ListFooterComponent={
            <Pressable
              className="bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-gray-300 items-center active:bg-gray-50 mt-1"
              onPress={() => setAddPickerVisible(true)}
            >
              <Text className="text-base font-medium text-gray-500">+ Add Exercise</Text>
              {missingSlots.length > 0 && (
                <Text className="text-xs text-blue-600 mt-1">
                  {missingSlots.length} suggested slot{missingSlots.length !== 1 ? 's' : ''} available
                </Text>
              )}
            </Pressable>
          }
        />
      </SafeAreaView>

      {/* ── Overlays ─────────────────────────────────────────────
           All modals are rendered here, outside SafeAreaView but
           inside the root View, so they position correctly as
           full-screen overlays via NavigationModal (View-based). */}

      {/* Exercise action menu (lifted from ExerciseCard) */}
      <NavigationModal
        visible={!!menuExercise}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuExercise(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setMenuExercise(null)}
        >
          <Pressable className="bg-white rounded-t-3xl p-4 pb-8" onPress={() => {}}>
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              {menuExercise?.exercises.name}
            </Text>

            <MenuButton
              label="Replace Exercise"
              subtitle="Swap with a similar exercise"
              onPress={() => {
                const ex = menuExercise;
                setMenuExercise(null);
                if (ex) setReplaceTarget(ex);
              }}
            />
            <MenuButton
              label="Recommend More"
              subtitle="See this exercise more often"
              onPress={() => {
                const ex = menuExercise;
                setMenuExercise(null);
                if (ex) handlePreference(ex.exercise_id, 'recommend_more');
              }}
            />
            <MenuButton
              label="Recommend Less"
              subtitle="See this exercise less often"
              onPress={() => {
                const ex = menuExercise;
                setMenuExercise(null);
                if (ex) handlePreference(ex.exercise_id, 'recommend_less');
              }}
            />
            <MenuButton
              label="Don't Recommend Again"
              subtitle="Remove and never suggest this exercise"
              destructive
              onPress={() => {
                const ex = menuExercise;
                setMenuExercise(null);
                if (ex) handleRequestNeverRecommend(ex);
              }}
            />
            <MenuButton
              label="Remove from Workout"
              subtitle="Remove just for this workout"
              destructive
              onPress={() => {
                const ex = menuExercise;
                setMenuExercise(null);
                if (ex) handleRequestRemove(ex);
              }}
            />

            <Pressable
              className="mt-2 py-3 items-center"
              onPress={() => setMenuExercise(null)}
            >
              <Text className="text-base font-medium text-gray-500">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </NavigationModal>

      {/* Removal prompt (inlined so the NavigationModal overlay renders
           as a direct child of the root View, same as the action menu) */}
      <NavigationModal
        visible={!!removalPending}
        transparent
        animationType="fade"
        onRequestClose={() => setRemovalPending(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setRemovalPending(null)}
        >
          <Pressable className="bg-white rounded-t-3xl p-4 pb-8" onPress={() => {}}>
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {removalPending?.type === 'never_recommend' ? 'Exercise Hidden' : 'Exercise Removed'}
            </Text>
            <Text className="text-sm text-gray-500 mb-1">
              <Text className="font-medium text-gray-700">
                {removalPending?.exercise.exercises.name ?? ''}
              </Text>
              {removalPending?.type === 'never_recommend'
                ? " has been removed and won't be recommended again."
                : ' has been removed from this workout.'}
            </Text>

            {removalPending?.type === 'never_recommend' && (
              <Text className="text-xs text-gray-400 mb-4">
                You can undo this in Settings → Don't Recommend Again.
              </Text>
            )}
            {removalPending?.type !== 'never_recommend' && <View className="mb-4" />}

            <Text className="text-sm font-medium text-gray-700 mb-3">
              Would you like to replace it?
            </Text>

            <Pressable
              className="bg-blue-600 rounded-xl py-3 px-4 mb-2 active:bg-blue-700"
              onPress={handleAutoReplace}
            >
              <Text className="text-white font-semibold text-center text-base">Auto Replace</Text>
              <Text className="text-blue-200 text-center text-xs mt-0.5">
                Pick a similar exercise automatically
              </Text>
            </Pressable>

            <Pressable
              className="bg-white border border-gray-200 rounded-xl py-3 px-4 mb-2 active:bg-gray-50"
              onPress={handleManualReplace}
            >
              <Text className="text-gray-900 font-semibold text-center text-base">Choose Replacement</Text>
              <Text className="text-gray-500 text-center text-xs mt-0.5">
                Browse and pick an exercise yourself
              </Text>
            </Pressable>

            <Pressable
              className="bg-white border border-gray-200 rounded-xl py-3 px-4 mb-2 active:bg-gray-50"
              onPress={handleNoReplace}
            >
              <Text className="text-gray-900 font-semibold text-center text-base">No Replacement</Text>
              <Text className="text-gray-500 text-center text-xs mt-0.5">
                Just remove the exercise
              </Text>
            </Pressable>

            <Pressable
              className="mt-2 py-3 items-center"
              onPress={() => setRemovalPending(null)}
            >
              <Text className="text-base font-medium text-gray-500">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </NavigationModal>

      <WorkoutSwapSheet
        visible={swapSheetVisible}
        onClose={() => setSwapSheetVisible(false)}
        currentWorkoutId={workout.id}
        currentWorkout={{
          id: workout.id,
          program_workouts: dayInfo,
          exerciseCount: localExercises.length,
        }}
        siblingWorkouts={siblingWorkouts}
        onSelect={(workoutId) => setOverrideWorkoutId(workoutId)}
      />

      <ExercisePickerModal
        visible={!!replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onSelect={
          replaceTarget
            ? isReplacingAfterRemoval
              ? handleReplacementFromRemoval
              : (ex) => handleReplace(replaceTarget, ex)
            : () => {}
        }
        userId={userId ?? ''}
        movementPattern={replaceTarget?.exercises.movement_pattern}
        excludeIds={currentExerciseIds}
      />

      <ExercisePickerModal
        visible={addPickerVisible}
        onClose={() => setAddPickerVisible(false)}
        onSelect={handleAddExercise}
        userId={userId ?? ''}
        excludeIds={currentExerciseIds}
        missingSlots={missingSlots}
      />
    </View>
  );
}

// ── Menu button (used by the exercise action sheet) ────────────
function MenuButton({
  label,
  subtitle,
  destructive,
  onPress,
}: {
  label: string;
  subtitle: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="py-3 border-b border-gray-100 active:bg-gray-50"
      onPress={onPress}
    >
      <Text className={`text-base font-medium ${destructive ? 'text-red-600' : 'text-gray-900'}`}>
        {label}
      </Text>
      <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>
    </Pressable>
  );
}
