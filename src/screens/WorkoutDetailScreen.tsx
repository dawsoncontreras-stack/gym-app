import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
  Share,
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

  // ── 3-dot menu state ──
  const [showMenu, setShowMenu] = useState(false);

  const handleShare = async () => {
    setShowMenu(false);
    if (!workout) return;
    try {
      await Share.share({
        message: `Check out this workout: ${workout.title}`,
      });
    } catch (_e) {
      // user cancelled
    }
  };

  // ── Schedule modal state ──
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const scheduleDays = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        const dateLabel = String(d.getDate());
        return { key, dayName, dateLabel };
      }),
    []
  );

  const handleOpenSchedule = () => {
    setShowMenu(false);
    const now = new Date();
    setSelectedDayIndex(0);
    const m = now.getMinutes();
    const roundedMinute = Math.ceil(m / 15) * 15;
    if (roundedMinute >= 60) {
      setSelectedHour(now.getHours() + 1);
      setSelectedMinute(0);
    } else {
      setSelectedHour(now.getHours());
      setSelectedMinute(roundedMinute);
    }
    setShowScheduleModal(true);
  };

  const handleConfirmSchedule = () => {
    if (!userId) return;
    const day = scheduleDays[selectedDayIndex];
    const timeStr = `${pad(selectedHour)}:${pad(selectedMinute)}`;
    scheduleMutation.mutate(
      { userId, workoutId, scheduledDate: day.key, timeOfDay: timeStr },
      { onSuccess: () => setShowScheduleModal(false) }
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

          {/* 3-dot menu button overlay */}
          <Pressable
            onPress={() => setShowMenu(true)}
            className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-black/50"
          >
            <Text className="text-base text-white">⋯</Text>
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

      {/* ── 3-dot Menu Modal ── */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowMenu(false)}
        >
          <Pressable onPress={() => {}} className="rounded-t-3xl bg-surface px-5 pb-10 pt-4">
            {/* Handle bar */}
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-ink-muted/30" />
            </View>

            {/* Save option */}
            <Pressable
              onPress={() => {
                handleToggleSave();
                setShowMenu(false);
              }}
              disabled={isSaving || isUnsaving}
              className="flex-row items-center py-4 border-b border-surface-tertiary"
            >
              <Text className="text-lg mr-3">{isSaved ? '★' : '☆'}</Text>
              <Text className="text-base text-ink">
                {isSaved ? 'Unsave Workout' : 'Save Workout'}
              </Text>
            </Pressable>

            {/* Schedule option */}
            <Pressable
              onPress={handleOpenSchedule}
              className="flex-row items-center py-4 border-b border-surface-tertiary"
            >
              <Text className="text-lg mr-3">📅</Text>
              <Text className="text-base text-ink">Schedule Workout</Text>
            </Pressable>

            {/* Share option */}
            <Pressable
              onPress={handleShare}
              className="flex-row items-center py-4"
            >
              <Text className="text-lg mr-3">🔗</Text>
              <Text className="text-base text-ink">Share Workout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Schedule Modal ── */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowScheduleModal(false)}
        >
          <Pressable
            onPress={() => {}}
            className="rounded-t-3xl bg-surface px-5 pb-10 pt-4"
          >
            {/* Handle bar */}
            <View className="mb-5 items-center">
              <View className="h-1 w-10 rounded-full bg-ink-muted/30" />
            </View>

            {/* Title & subtitle */}
            <Text className="text-xl font-bold text-ink">Select a Date & Time</Text>
            <Text className="mt-1 mb-5 text-sm text-ink-secondary">
              We'll send reminders before your workout so you can prepare.
            </Text>

            {/* Day picker – horizontal chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-6"
            >
              <View className="flex-row gap-2">
                {scheduleDays.map((day, i) => {
                  const isSelected = i === selectedDayIndex;
                  return (
                    <Pressable
                      key={day.key}
                      onPress={() => setSelectedDayIndex(i)}
                      className={`items-center rounded-xl border px-5 py-3 ${
                        isSelected
                          ? 'border-ink bg-ink'
                          : 'border-surface-tertiary bg-surface'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isSelected ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {day.dayName}
                      </Text>
                      <Text
                        className={`text-xs ${
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

            {/* Time picker – scroll-wheel style */}
            <View className="mb-6 items-center">
              <View className="flex-row items-center">
                {/* Hour column */}
                <View className="items-center">
                  <Pressable
                    onPress={() => setSelectedHour((h) => {
                      const h12 = h % 12 || 12;
                      const newH12 = h12 >= 12 ? 1 : h12 + 1;
                      return h >= 12 ? (newH12 === 12 ? 12 : newH12 + 12) : newH12 % 12;
                    })}
                    className="py-1"
                  >
                    <Text className="text-lg text-ink-muted/40">
                      {(() => {
                        const h12 = selectedHour % 12 || 12;
                        const prev = h12 <= 1 ? 12 : h12 - 1;
                        return prev;
                      })()}
                    </Text>
                  </Pressable>
                  <View className="rounded-lg bg-surface-tertiary px-6 py-2">
                    <Text className="text-2xl font-bold text-ink">
                      {selectedHour % 12 || 12}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedHour((h) => {
                      const h12 = h % 12 || 12;
                      const newH12 = h12 <= 1 ? 12 : h12 - 1;
                      return h >= 12 ? (newH12 === 12 ? 12 : newH12 + 12) : newH12 % 12;
                    })}
                    className="py-1"
                  >
                    <Text className="text-lg text-ink-muted/40">
                      {(() => {
                        const h12 = selectedHour % 12 || 12;
                        const next = h12 >= 12 ? 1 : h12 + 1;
                        return next;
                      })()}
                    </Text>
                  </Pressable>
                </View>

                {/* Minute column */}
                <View className="items-center ml-6">
                  <Pressable
                    onPress={() => setSelectedMinute((m) => (m > 0 ? m - 1 : 59))}
                    className="py-1"
                  >
                    <Text className="text-lg text-ink-muted/40">
                      {pad(selectedMinute > 0 ? selectedMinute - 1 : 59)}
                    </Text>
                  </Pressable>
                  <View className="rounded-lg bg-surface-tertiary px-6 py-2">
                    <Text className="text-2xl font-bold text-ink">
                      {pad(selectedMinute)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedMinute((m) => (m < 59 ? m + 1 : 0))}
                    className="py-1"
                  >
                    <Text className="text-lg text-ink-muted/40">
                      {pad(selectedMinute < 59 ? selectedMinute + 1 : 0)}
                    </Text>
                  </Pressable>
                </View>

                {/* AM/PM column */}
                <View className="items-center ml-6">
                  <Pressable
                    onPress={() => setSelectedHour((h) => (h >= 12 ? h - 12 : h))}
                    className="py-1"
                  >
                    <Text className={`text-lg ${selectedHour < 12 ? 'text-ink-muted/40' : 'text-ink-muted/40'}`}>
                      {selectedHour >= 12 ? 'AM' : ''}
                    </Text>
                  </Pressable>
                  <View className="rounded-lg bg-surface-tertiary px-4 py-2">
                    <Text className="text-2xl font-bold text-ink">
                      {selectedHour >= 12 ? 'PM' : 'AM'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedHour((h) => (h < 12 ? h + 12 : h))}
                    className="py-1"
                  >
                    <Text className="text-lg text-ink-muted/40">
                      {selectedHour >= 12 ? '' : 'PM'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowScheduleModal(false)}
                className="flex-1 items-center rounded-full border border-surface-tertiary py-4"
              >
                <Text className="text-base font-semibold text-ink">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmSchedule}
                disabled={scheduleMutation.isPending}
                className="flex-1 items-center rounded-full bg-ink py-4"
              >
                <Text className="text-base font-semibold text-white">
                  {scheduleMutation.isPending ? 'Scheduling…' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
