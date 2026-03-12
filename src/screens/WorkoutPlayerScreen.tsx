import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useWorkoutDetail } from '../hooks/useWorkoutDetail';
import { usePlayerStore } from '../stores/playerStore';
import { formatTimer } from '../utils/formatters';
import RestTimer from '../components/workout/RestTimer';
import type { PlayerStep, WorkoutSectionExercise, Exercise } from '../lib/types';

type PlayerRoute = RouteProp<HomeStackParamList, 'WorkoutPlayer'>;
type PlayerNav = NativeStackNavigationProp<HomeStackParamList, 'WorkoutPlayer'>;

export default function WorkoutPlayerScreen() {
  const route = useRoute<PlayerRoute>();
  const navigation = useNavigation<PlayerNav>();
  const { workoutId } = route.params;
  const { data: workout, isLoading } = useWorkoutDetail(workoutId);

  const steps = usePlayerStore((s) => s.steps);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const status = usePlayerStore((s) => s.status);
  const isResting = usePlayerStore((s) => s.isResting);
  const restTimeRemaining = usePlayerStore((s) => s.restTimeRemaining);
  const exerciseTimerSeconds = usePlayerStore((s) => s.exerciseTimerSeconds);
  const startedAt = usePlayerStore((s) => s.startedAt);
  const sessionExercises = usePlayerStore((s) => s.sessionExercises);
  const initSession = usePlayerStore((s) => s.initSession);
  const completeSet = usePlayerStore((s) => s.completeSet);
  const skipExercise = usePlayerStore((s) => s.skipExercise);
  const tickRest = usePlayerStore((s) => s.tickRest);
  const tickExerciseTimer = usePlayerStore((s) => s.tickExerciseTimer);
  const finishWorkout = usePlayerStore((s) => s.finishWorkout);
  const reset = usePlayerStore((s) => s.reset);

  const [editWeight, setEditWeight] = useState('');

  // Initialize session when workout data loads
  useEffect(() => {
    if (workout && status === 'idle') {
      initSession(workout);
    }
  }, [workout, status, initSession]);

  // Navigate to summary when completed
  useEffect(() => {
    if (status === 'completed' && workout) {
      const durationSec = startedAt > 0 ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      navigation.replace('SessionSummary', {
        sessionData: {
          workoutId: workout.id,
          workoutTitle: workout.title,
          durationSec,
          sessionExercises,
        },
      });
      reset();
    }
  }, [status, workout, startedAt, sessionExercises, navigation, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (usePlayerStore.getState().status !== 'completed') {
        reset();
      }
    };
  }, [reset]);

  // Timed exercise tick interval
  useEffect(() => {
    if (exerciseTimerSeconds <= 0) return;
    const interval = setInterval(tickExerciseTimer, 1000);
    return () => clearInterval(interval);
  }, [exerciseTimerSeconds, tickExerciseTimer]);

  const currentStep = steps[currentStepIndex];

  // Sync editable weight when step changes
  const weightForStep = useMemo(() => {
    if (currentStep?.type === 'exercise' && currentStep.exercise) {
      const tt =
        currentStep.exercise.tracking_type ??
        currentStep.exercise.exercise.default_tracking_type;
      if (tt === 'weighted' && currentStep.exercise.weight_lbs) {
        return String(currentStep.exercise.weight_lbs);
      }
    }
    return '';
  }, [currentStep]);

  // Reset editWeight when the derived default changes
  useEffect(() => {
    setEditWeight(weightForStep);
  }, [weightForStep]);

  const handleRestTick = useCallback(() => {
    tickRest();
  }, [tickRest]);

  const skipRest = usePlayerStore((s) => s.skipRest);

  const handleSkipRest = useCallback(() => {
    skipRest();
  }, [skipRest]);

  const handleCompleteSet = useCallback(() => {
    if (!currentStep?.exercise) return;
    const tt =
      currentStep.exercise.tracking_type ??
      currentStep.exercise.exercise.default_tracking_type;

    if (tt === 'weighted') {
      completeSet({
        reps: currentStep.exercise.reps ?? undefined,
        weight: editWeight ? parseFloat(editWeight) : undefined,
      });
    } else if (tt === 'reps') {
      completeSet({ reps: currentStep.exercise.reps ?? undefined });
    } else {
      completeSet({ duration: currentStep.exercise.duration_sec ?? undefined });
    }
  }, [currentStep, editWeight, completeSet]);

  const handleSkip = useCallback(() => {
    skipExercise();
  }, [skipExercise]);

  const handleFinish = useCallback(() => {
    Alert.alert('Finish Workout', 'End this workout early?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish', style: 'destructive', onPress: finishWorkout },
    ]);
  }, [finishWorkout]);

  // Loading state
  if (isLoading || !workout || !currentStep) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#2f7fff" size="large" />
      </SafeAreaView>
    );
  }

  const totalExerciseSteps = steps.filter((s) => s.type === 'exercise').length;
  const completedExerciseSteps = steps
    .slice(0, currentStepIndex)
    .filter((s) => s.type === 'exercise').length;
  const progress = totalExerciseSteps > 0 ? completedExerciseSteps / totalExerciseSteps : 0;

  // ── Rest screen ────────────────────────────────────────────────────────────
  if (isResting && restTimeRemaining > 0) {
    const restLabel =
      currentStep.type === 'round_rest'
        ? `Round Rest${currentStep.section?.title ? ` \u00B7 ${currentStep.section.title}` : ''}`
        : 'Rest';

    return (
      <SafeAreaView className="flex-1 bg-surface">
        <PlayerHeader
          progress={progress}
          completedSteps={completedExerciseSteps}
          totalSteps={totalExerciseSteps}
          onFinish={handleFinish}
        />
        <RestTimer
          seconds={restTimeRemaining}
          label={restLabel}
          onTick={handleRestTick}
          onSkip={handleSkipRest}
        />
      </SafeAreaView>
    );
  }

  // Rest steps are now handled entirely by the store (completeSet/skipExercise auto-start rest,
  // tickRest/skipRest auto-advance past rest steps). If we somehow land here on a rest step
  // without isResting being true, just show a brief loading state — it shouldn't happen.
  if (currentStep.type === 'rest' || currentStep.type === 'round_rest') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#2f7fff" />
      </SafeAreaView>
    );
  }

  // ── Exercise step ──────────────────────────────────────────────────────────
  const exercise = currentStep.exercise!;
  const trackingType = exercise.tracking_type ?? exercise.exercise.default_tracking_type;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <PlayerHeader
        progress={progress}
        completedSteps={completedExerciseSteps}
        totalSteps={totalExerciseSteps}
        onFinish={handleFinish}
      />

      <ExerciseContent
        currentStep={currentStep}
        exercise={exercise}
        trackingType={trackingType}
        exerciseTimerSeconds={exerciseTimerSeconds}
        editWeight={editWeight}
        setEditWeight={setEditWeight}
      />

      {/* Bottom actions */}
      <View className="border-t border-surface-tertiary px-4 pb-8 pt-3">
        {trackingType !== 'timed' && (
          <Pressable
            onPress={handleCompleteSet}
            className="mb-3 items-center rounded-xl bg-accent py-4"
          >
            <Text className="text-base font-bold text-white">Complete Set</Text>
          </Pressable>
        )}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleSkip}
            className="flex-1 items-center rounded-xl bg-surface-tertiary py-3"
          >
            <Text className="text-sm font-semibold text-ink-secondary">Skip</Text>
          </Pressable>
          <Pressable
            onPress={handleFinish}
            className="flex-1 items-center rounded-xl border border-error/20 bg-error/10 py-3"
          >
            <Text className="text-sm font-semibold text-error">Finish Early</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Header with progress bar ────────────────────────────────────────────────

function PlayerHeader({
  progress,
  completedSteps,
  totalSteps,
  onFinish,
}: {
  progress: number;
  completedSteps: number;
  totalSteps: number;
  onFinish: () => void;
}) {
  return (
    <View className="px-4 pb-2 pt-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink-secondary">
          Exercise {completedSteps + 1} of {totalSteps}
        </Text>
        <Pressable onPress={onFinish} className="rounded-lg bg-error/10 px-3 py-1">
          <Text className="text-sm font-medium text-error">End</Text>
        </Pressable>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-surface-tertiary">
        <View
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
    </View>
  );
}

function ExerciseContent({
  currentStep,
  exercise,
  trackingType,
  exerciseTimerSeconds,
  editWeight,
  setEditWeight,
}: {
  currentStep: PlayerStep;
  exercise: WorkoutSectionExercise & { exercise: Exercise };
  trackingType: string;
  exerciseTimerSeconds: number;
  editWeight: string;
  setEditWeight: (v: string) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onStartShouldSetResponder={() => {
        Keyboard.dismiss();
        return false;
      }}
    >
      {/* TOP: name + image */}
      <View className="px-4">
        <View className="mt-3">
          <Text className="text-2xl font-bold text-ink">{exercise.exercise.name}</Text>

          {currentStep.section?.title && (
            <Text className="mt-1 text-sm text-ink-muted">{currentStep.section.title}</Text>
          )}

          <View className="mt-1 flex-row items-center gap-3">
            {currentStep.roundNumber != null && currentStep.totalRounds != null && (
              <Text className="text-sm font-medium text-accent">
                Round {currentStep.roundNumber}/{currentStep.totalRounds}
              </Text>
            )}
            {currentStep.totalSets != null && currentStep.totalSets > 1 && (
              <Text className="text-sm font-medium text-ink-secondary">
                Set {currentStep.setNumber}/{currentStep.totalSets}
              </Text>
            )}
          </View>
        </View>

        <View className="mt-3 aspect-[16/9] w-full overflow-hidden rounded-xl">
          {exercise.exercise.thumbnail_url ? (
            <Image
              source={{ uri: exercise.exercise.thumbnail_url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-surface-tertiary">
              <Text className="text-4xl">💪</Text>
            </View>
          )}
        </View>
      </View>

      {/* MIDDLE: reps / weight / timer — this block sits between top and bottom due to space-between */}
      <View className="items-center px-4">
        {trackingType === 'timed' && currentStep.durationSec != null && (
          <View className="items-center">
            <Text className="text-6xl font-bold text-ink">
              {formatTimer(exerciseTimerSeconds)}
            </Text>
            <Text className="mt-2 text-sm text-ink-muted">Time remaining</Text>
          </View>
        )}

        {trackingType === 'reps' && (
          <View className="items-center">
            <Text className="text-5xl font-bold text-ink">
              {exercise.reps ?? '\u2014'} reps
            </Text>
          </View>
        )}

        {trackingType === 'weighted' && (
          <View className="items-center">
            <Text className="mb-3 text-5xl font-bold text-ink">
              {exercise.reps ?? '\u2014'} reps
            </Text>
            <View className="flex-row items-center">
              <TextInput
                className="h-11 w-24 rounded-lg bg-surface-tertiary text-center text-lg font-semibold text-ink"
                style={{ includeFontPadding: false }}
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                placeholder="0"
                placeholderTextColor="#8888a0"
              />
              <Text className="ml-2 text-base text-ink-secondary">lbs</Text>
            </View>
          </View>
        )}

        {exercise.notes && (
          <View className="mt-4 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            <Text className="text-sm text-brand-800">{exercise.notes}</Text>
          </View>
        )}
      </View>

      {/* BOTTOM: empty spacer — same height as nothing, just forces space-between to push middle to center */}
      <View />
    </View>
  );
}
