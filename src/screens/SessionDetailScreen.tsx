import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSessionDetail } from '../hooks/useSessionDetail';
import { formatDuration, formatVolume } from '../utils/formatters';

type SessionDetailRoute = RouteProp<{ SessionDetail: { sessionId: string } }, 'SessionDetail'>;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function SessionDetailScreen() {
  const route = useRoute<SessionDetailRoute>();
  const navigation = useNavigation();
  const { sessionId } = route.params;

  const { data, isLoading, error } = useSessionDetail(sessionId);

  // Group exercises by name for a per-exercise breakdown
  const exerciseGroups = useMemo(() => {
    if (!data?.exercises) return [];
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        thumbnail: string | null;
        sets: typeof data.exercises;
      }
    >();
    for (const ex of data.exercises) {
      const key = ex.exercise_id;
      if (!map.has(key)) {
        map.set(key, {
          id: ex.exercise_id,
          name: ex.exercise_name,
          thumbnail: ex.exercise_thumbnail_url,
          sets: [],
        });
      }
      map.get(key)!.sets.push(ex);
    }
    return Array.from(map.values());
  }, [data?.exercises]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#2f7fff" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-sm text-error">Failed to load session</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-sm text-accent">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { session } = data;
  const completedDate = session.completed_at
    ? new Date(session.completed_at)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="rounded-lg bg-surface-tertiary px-3 py-1.5">
          <Text className="text-sm font-medium text-accent">← Back</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Workout info */}
        <View className="px-4 pb-4">
          {session.thumbnail_url && (
            <Image
              source={{ uri: session.thumbnail_url }}
              className="mb-3 h-40 w-full rounded-xl"
              resizeMode="cover"
            />
          )}
          <Text className="text-2xl font-bold text-ink">{session.workout_title}</Text>
          <Text className="mt-1 text-sm capitalize text-ink-secondary">
            {session.difficulty}
          </Text>
          {completedDate && (
            <Text className="mt-1 text-sm text-ink-muted">
              {completedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at{' '}
              {completedDate.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          )}

          {data.workoutDescription && (
            <Text className="mt-2 text-sm leading-5 text-ink-secondary">
              {data.workoutDescription}
            </Text>
          )}
        </View>

        {/* Stats summary */}
        <View className="mx-4 mb-4 flex-row rounded-xl border border-surface-tertiary bg-surface p-4 shadow-card">
          <StatBlock label="Duration" value={session.duration_sec != null ? formatDuration(session.duration_sec) : '–'} />
          <StatBlock label="Sets" value={session.total_sets?.toString() ?? '–'} />
          <StatBlock label="Reps" value={session.total_reps?.toString() ?? '–'} />
          <StatBlock
            label="Volume"
            value={
              session.total_volume_lbs != null && session.total_volume_lbs > 0
                ? formatVolume(Number(session.total_volume_lbs))
                : '–'
            }
          />
        </View>

        {/* Rating */}
        {session.rating != null && (
          <View className="mx-4 mb-4 flex-row items-center rounded-xl bg-surface-secondary px-4 py-3">
            <Text className="text-sm text-ink-secondary">Rating</Text>
            <View className="ml-auto flex-row">
              {Array.from({ length: 5 }, (_, i) => (
                <Text
                  key={i}
                  className={`text-lg ${i < session.rating! ? 'text-warning' : 'text-surface-tertiary'}`}
                >
                  ★
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {session.session_notes && (
          <View className="mx-4 mb-4 rounded-xl bg-surface-secondary px-4 py-3">
            <Text className="mb-1 text-xs font-medium text-ink-muted">Notes</Text>
            <Text className="text-sm text-ink">{session.session_notes}</Text>
          </View>
        )}

        {/* Exercise breakdown */}
        <View className="px-4 pb-8">
          <Text className="mb-3 text-lg font-bold text-ink">Exercise Breakdown</Text>

          {exerciseGroups.length === 0 && (
            <Text className="py-4 text-sm text-ink-muted">
              No exercise data recorded for this session
            </Text>
          )}

          {exerciseGroups.map((group) => (
            <View
              key={group.id}
              className="mb-4 rounded-xl border border-surface-tertiary bg-surface p-4 shadow-card"
            >
              <View className="mb-3 flex-row items-center">
                {group.thumbnail && (
                  <Image
                    source={{ uri: group.thumbnail }}
                    className="mr-3 h-10 w-10 rounded-lg"
                    resizeMode="cover"
                  />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink">{group.name}</Text>
                  <Text className="text-xs text-ink-muted">
                    {group.sets.filter((s) => !s.skipped).length} set
                    {group.sets.filter((s) => !s.skipped).length !== 1 ? 's' : ''} completed
                  </Text>
                </View>
              </View>

              {/* Set-by-set table */}
              <View className="rounded-lg bg-surface-tertiary px-3 py-2">
                {/* Header row */}
                <View className="mb-2 flex-row border-b border-surface pb-2">
                  <Text className="w-12 text-2xs font-medium text-ink-muted">Set</Text>
                  <Text className="flex-1 text-2xs font-medium text-ink-muted">Target</Text>
                  <Text className="flex-1 text-2xs font-medium text-ink-muted">Actual</Text>
                  <Text className="w-16 text-right text-2xs font-medium text-ink-muted">
                    Status
                  </Text>
                </View>

                {group.sets.map((set) => {
                  const target = formatSetTarget(set);
                  const actual = formatSetActual(set);
                  return (
                    <View
                      key={set.id}
                      className={`flex-row border-t border-surface py-2 ${
                        set.skipped ? 'opacity-40' : ''
                      }`}
                    >
                      <Text className="w-12 text-xs text-ink-secondary">
                        {set.is_warmup ? 'W' : set.set_number}
                      </Text>
                      <Text className="flex-1 text-xs text-ink-muted">{target}</Text>
                      <Text className="flex-1 text-xs font-medium text-ink">{actual}</Text>
                      <Text
                        className={`w-16 text-right text-xs ${
                          set.skipped
                            ? 'text-ink-muted'
                            : 'text-success'
                        }`}
                      >
                        {set.skipped ? 'Skipped' : '✓'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-bold text-ink">{value}</Text>
      <Text className="mt-1 text-2xs text-ink-muted">{label}</Text>
    </View>
  );
}

function formatSetTarget(set: {
  prescribed_reps: number | null;
  prescribed_weight_lbs: number | null;
  prescribed_duration_sec: number | null;
}): string {
  if (set.prescribed_duration_sec != null) {
    return `${set.prescribed_duration_sec}s`;
  }
  const parts: string[] = [];
  if (set.prescribed_reps != null) parts.push(`${set.prescribed_reps} reps`);
  if (set.prescribed_weight_lbs != null) parts.push(`${set.prescribed_weight_lbs} lbs`);
  return parts.length > 0 ? parts.join(' × ') : '–';
}

function formatSetActual(set: {
  actual_reps: number | null;
  actual_weight_lbs: number | null;
  actual_duration_sec: number | null;
  skipped: boolean;
}): string {
  if (set.skipped) return '–';
  if (set.actual_duration_sec != null) {
    return `${set.actual_duration_sec}s`;
  }
  const parts: string[] = [];
  if (set.actual_reps != null) parts.push(`${set.actual_reps} reps`);
  if (set.actual_weight_lbs != null) parts.push(`${set.actual_weight_lbs} lbs`);
  return parts.length > 0 ? parts.join(' × ') : '–';
}
