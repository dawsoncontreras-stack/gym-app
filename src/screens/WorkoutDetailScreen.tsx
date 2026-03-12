import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useWorkoutDetail } from '../hooks/useWorkoutDetail';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { useScheduleWorkout } from '../hooks/useScheduleWorkout';
import { useAuthStore } from '../stores/authStore';
import { formatEstimatedMinutes } from '../utils/formatters';
import SectionHeader from '../components/workout/SectionHeader';
import ExerciseStep from '../components/workout/ExerciseStep';

type DetailRoute = RouteProp<HomeStackParamList, 'WorkoutDetail'>;
type DetailNav = NativeStackNavigationProp<HomeStackParamList, 'WorkoutDetail'>;

const DIFFICULTY_COLORS = {
  beginner: 'bg-success',
  intermediate: 'bg-warning',
  advanced: 'bg-error',
} as const;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime12(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${pad(minute)} ${period}`;
}

export default function WorkoutDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNav>();
  const { workoutId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);

  const { data: workout, isLoading, error } = useWorkoutDetail(workoutId);
  const {
    data: savedWorkouts,
    saveWorkout,
    unsaveWorkout,
    isSaving,
    isUnsaving,
  } = useSavedWorkouts(userId);
  const scheduleMutation = useScheduleWorkout();

  const isSaved = savedWorkouts?.some((sw) => sw.workout_id === workoutId) ?? false;

  const handleToggleSave = () => {
    if (!userId) return;
    if (isSaved) {
      unsaveWorkout(workoutId);
    } else {
      saveWorkout(workoutId);
    }
  };

  // ── Schedule modal state ──
  const [showModal, setShowModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const scheduleDays = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().split('T')[0];
        const dayName =
          i === 0
            ? 'Today'
            : i === 1
              ? 'Tomorrow'
              : d.toLocaleDateString(undefined, { weekday: 'short' });
        const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return { key, dayName, dateLabel };
      }),
    []
  );

  const handleOpenSchedule = () => {
    const now = new Date();
    setSelectedDayIndex(0);
    // Round up to the next 15-minute mark
    const m = now.getMinutes();
    const roundedMinute = Math.ceil(m / 15) * 15;
    if (roundedMinute >= 60) {
      setSelectedHour(now.getHours() + 1);
      setSelectedMinute(0);
    } else {
      setSelectedHour(now.getHours());
      setSelectedMinute(roundedMinute);
    }
    setShowModal(true);
  };

  const handleConfirmSchedule = () => {
    if (!userId) return;
    const day = scheduleDays[selectedDayIndex];
    const timeStr = `${pad(selectedHour)}:${pad(selectedMinute)}`;
    scheduleMutation.mutate(
      { userId, workoutId, scheduledDate: day.key, timeOfDay: timeStr },
      { onSuccess: () => setShowModal(false) }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#2f7fff" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-sm text-error">Failed to load workout</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-sm text-accent">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="aspect-[16/9] w-full">
          {workout.thumbnail_url ? (
            <Image
              source={{ uri: workout.thumbnail_url }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-surface-tertiary">
              <Text className="text-5xl">💪</Text>
            </View>
          )}
          {/* Back button overlay */}
          <Pressable
            onPress={() => navigation.goBack()}
            className="absolute left-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/50"
          >
            <Text className="text-base text-white">←</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4">
          {/* Title + meta */}
          <Text className="text-2xl font-bold text-ink">{workout.title}</Text>

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <View className={`rounded px-2 py-0.5 ${DIFFICULTY_COLORS[workout.difficulty]}`}>
              <Text className="text-xs font-semibold capitalize text-white">
                {workout.difficulty}
              </Text>
            </View>
            <Text className="text-sm text-ink-secondary">
              {formatEstimatedMinutes(workout.estimated_minutes)}
            </Text>
            {workout.equipment_needed.length > 0 && (
              <Text className="text-sm text-ink-muted">
                {workout.equipment_needed.join(', ')}
              </Text>
            )}
          </View>

          {workout.description && (
            <Text className="mt-4 text-sm leading-6 text-ink-secondary">
              {workout.description}
            </Text>
          )}

          {/* Action buttons */}
          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={handleToggleSave}
              disabled={isSaving || isUnsaving}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-3 ${
                isSaved ? 'bg-error/10' : 'border border-surface-tertiary bg-surface-tertiary'
              }`}
            >
              <Text className={`text-sm font-medium ${isSaved ? 'text-error' : 'text-ink'}`}>
                {isSaved ? 'Unsave' : 'Save'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleOpenSchedule}
              className="flex-1 flex-row items-center justify-center rounded-lg border border-surface-tertiary bg-surface-tertiary py-3"
            >
              <Text className="text-sm font-medium text-ink">Schedule</Text>
            </Pressable>
          </View>

          {/* Sections + Exercises */}
          <View className="mt-4 pb-28">
            {workout.sections.map((section) => (
              <View key={section.id}>
                <SectionHeader section={section} />
                <View className="gap-2">
                  {section.exercises.map((item, idx) => (
                    <ExerciseStep key={item.id} item={item} index={idx} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Start button */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-surface-tertiary bg-surface px-4 pb-10 pt-3 shadow-sticky">
        <Pressable
          onPress={() => navigation.navigate('WorkoutPlayer', { workoutId })}
          className="items-center rounded-xl bg-accent py-4"
        >
          <Text className="text-base font-bold text-white">Start Workout</Text>
        </Pressable>
      </View>

      {/* ── Schedule Modal ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowModal(false)}
        >
          <Pressable
            onPress={() => {}}
            className="rounded-t-2xl bg-surface px-4 pb-10 pt-5"
          >
            {/* Handle bar */}
            <View className="mb-4 items-center">
              <View className="h-1 w-12 rounded-full bg-ink-muted/20" />
            </View>

            <Text className="mb-4 text-lg font-bold text-ink">Schedule Workout</Text>

            {/* Day picker */}
            <Text className="mb-2 text-xs font-medium text-ink-muted">Day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-5"
            >
              <View className="flex-row gap-2">
                {scheduleDays.map((day, i) => {
                  const isSelected = i === selectedDayIndex;
                  return (
                    <Pressable
                      key={day.key}
                      onPress={() => setSelectedDayIndex(i)}
                      className={`items-center rounded-xl px-4 py-2.5 ${
                        isSelected ? 'bg-accent' : 'bg-surface-tertiary'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {day.dayName}
                      </Text>
                      <Text
                        className={`text-2xs ${
                          isSelected ? 'text-white/70' : 'text-ink-muted'
                        }`}
                      >
                        {day.dateLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Time picker */}
            <Text className="mb-2 text-xs font-medium text-ink-muted">Time</Text>
            <View className="mb-5 flex-row items-center gap-3">
              {/* Hour */}
              <View className="flex-row items-center rounded-xl bg-surface-tertiary">
                <Pressable
                  onPress={() => setSelectedHour((h) => (h > 0 ? h - 1 : 23))}
                  className="px-3 py-3"
                >
                  <Text className="text-base text-accent">−</Text>
                </Pressable>
                <Text className="min-w-[48px] text-center text-lg font-bold text-ink">
                  {pad(selectedHour)}
                </Text>
                <Pressable
                  onPress={() => setSelectedHour((h) => (h < 23 ? h + 1 : 0))}
                  className="px-3 py-3"
                >
                  <Text className="text-base text-accent">+</Text>
                </Pressable>
              </View>

              <Text className="text-lg font-bold text-ink">:</Text>

              {/* Minute */}
              <View className="flex-row items-center rounded-xl bg-surface-tertiary">
                <Pressable
                  onPress={() => setSelectedMinute((m) => (m > 0 ? m - 1 : 59))}
                  className="px-3 py-3"
                >
                  <Text className="text-base text-accent">−</Text>
                </Pressable>
                <Text className="min-w-[48px] text-center text-lg font-bold text-ink">
                  {pad(selectedMinute)}
                </Text>
                <Pressable
                  onPress={() => setSelectedMinute((m) => (m < 59 ? m + 1 : 0))}
                  className="px-3 py-3"
                >
                  <Text className="text-base text-accent">+</Text>
                </Pressable>
              </View>

              {/* 12hr display */}
              <Text className="text-sm text-ink-secondary">
                {formatTime12(selectedHour, selectedMinute)}
              </Text>
            </View>

            {/* Quick time presets */}
            <View className="mb-5 flex-row flex-wrap gap-2">
              {[
                { label: '6:00 AM', h: 6, m: 0 },
                { label: '7:00 AM', h: 7, m: 0 },
                { label: '8:00 AM', h: 8, m: 0 },
                { label: '12:00 PM', h: 12, m: 0 },
                { label: '5:00 PM', h: 17, m: 0 },
                { label: '6:00 PM', h: 18, m: 0 },
                { label: '7:00 PM', h: 19, m: 0 },
                { label: '8:00 PM', h: 20, m: 0 },
              ].map((preset) => (
                <Pressable
                  key={preset.label}
                  onPress={() => {
                    setSelectedHour(preset.h);
                    setSelectedMinute(preset.m);
                  }}
                  className={`rounded-lg px-3 py-1.5 ${
                    selectedHour === preset.h && selectedMinute === preset.m
                      ? 'border border-accent/30 bg-accent/20'
                      : 'bg-surface-tertiary'
                  }`}
                >
                  <Text className="text-xs text-ink">{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Confirm */}
            <Pressable
              onPress={handleConfirmSchedule}
              disabled={scheduleMutation.isPending}
              className="items-center rounded-xl bg-accent py-4"
            >
              <Text className="text-base font-bold text-white">
                {scheduleMutation.isPending
                  ? 'Scheduling…'
                  : `Schedule for ${scheduleDays[selectedDayIndex].dayName} at ${formatTime12(selectedHour, selectedMinute)}`}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
