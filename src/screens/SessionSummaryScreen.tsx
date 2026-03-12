import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useAuthStore } from '../stores/authStore';
import { formatDuration, formatVolume } from '../utils/formatters';
import type { SessionExerciseLog } from '../lib/types';

type SummaryRoute = RouteProp<HomeStackParamList, 'SessionSummary'>;

type SessionData = {
  workoutId: string;
  workoutTitle: string;
  durationSec: number;
  sessionExercises: SessionExerciseLog[];
};

export default function SessionSummaryScreen() {
  const route = useRoute<SummaryRoute>();
  const navigation = useNavigation();
  const sessionData = route.params.sessionData as SessionData;
  const userId = useAuthStore((s) => s.user?.id);

  const { createSessionAsync, completeSessionAsync, isCreating, isCompleting } =
    useWorkoutSession(userId);

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const createdRef = useRef(false);

  // Compute summary stats
  const stats = useMemo(() => {
    const logs = sessionData.sessionExercises.filter((l) => !l.skipped);
    const totalSets = logs.length;
    const totalReps = logs.reduce((sum, l) => sum + (l.actual_reps ?? 0), 0);
    const totalVolume = logs.reduce(
      (sum, l) => sum + (l.actual_reps ?? 0) * (l.actual_weight_lbs ?? 0),
      0,
    );
    return { totalSets, totalReps, totalVolume };
  }, [sessionData.sessionExercises]);

  // Create session record on mount (but don't complete yet — wait for user input)
  useEffect(() => {
    if (!userId || createdRef.current) return;
    createdRef.current = true;

    createSessionAsync({
      userId,
      workoutId: sessionData.workoutId,
    })
      .then((session) => setSessionId(session.id))
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Complete session with rating + notes when user taps Done
  const handleDone = async () => {
    if (sessionId && !saved) {
      try {
        await completeSessionAsync({
          sessionId,
          durationSec: sessionData.durationSec,
          totalVolumeLbs: stats.totalVolume,
          totalSets: stats.totalSets,
          totalReps: stats.totalReps,
          rating: rating > 0 ? rating : undefined,
          notes: notes.trim() || undefined,
          exerciseLogs: sessionData.sessionExercises,
        });
        setSaved(true);
      } catch {
        // Still navigate away if save fails
      }
    }
    navigation.goBack();
    navigation.goBack();
  };

  const isBusy = isCreating || isCompleting;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View className="mb-2 h-16 w-16 items-center justify-center self-center rounded-full bg-success/10">
          <Text className="text-2xl text-success">✓</Text>
        </View>
        <Text className="text-center text-3xl font-bold text-ink">Workout Complete!</Text>
        <Text className="mt-1 text-center text-sm text-ink-secondary">
          {sessionData.workoutTitle}
        </Text>

        {isCreating && (
          <View className="mt-4 items-center">
            <ActivityIndicator color="#2f7fff" size="small" />
            <Text className="mt-1 text-xs text-ink-muted">Creating session...</Text>
          </View>
        )}

        {/* Stats grid */}
        <View className="mt-8 flex-row flex-wrap gap-3">
          <StatCard label="Duration" value={formatDuration(sessionData.durationSec)} />
          <StatCard label="Sets" value={String(stats.totalSets)} />
          <StatCard label="Reps" value={String(stats.totalReps)} />
          {stats.totalVolume > 0 && (
            <StatCard label="Volume" value={formatVolume(stats.totalVolume)} />
          )}
        </View>

        {/* Rating */}
        <View className="mt-8">
          <Text className="mb-2 text-sm font-medium text-ink-secondary">How was it?</Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                className={`h-12 w-12 items-center justify-center rounded-full ${
                  star <= rating ? 'bg-warning' : 'bg-surface-tertiary'
                }`}
              >
                <Text className={`text-lg ${star <= rating ? 'text-white' : 'text-ink-muted'}`}>
                  {star}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View className="mt-6">
          <Text className="mb-2 text-sm font-medium text-ink-secondary">Notes (optional)</Text>
          <TextInput
            className="min-h-[100px] rounded-xl bg-surface-tertiary px-3 py-3 text-sm text-ink"
            placeholder="How did you feel? Anything to remember?"
            placeholderTextColor="#8888a0"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
          />
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Bottom button */}
      <View className="border-t border-surface-tertiary px-4 pb-8 pt-3 shadow-sticky">
        <Pressable
          onPress={handleDone}
          disabled={isBusy}
          className={`items-center rounded-xl py-4 ${isBusy ? 'bg-accent/50' : 'bg-accent'}`}
        >
          <Text className="text-base font-bold text-white">
            {isCompleting ? 'Saving...' : 'Done'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 items-center rounded-lg border border-surface-tertiary bg-surface px-3 py-5 shadow-card">
      <Text className="text-2xl font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
