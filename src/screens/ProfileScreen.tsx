import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import type { UserSessionHistoryView } from '../lib/types';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { useAuthStore } from '../stores/authStore';
import { formatDuration, formatVolume } from '../utils/formatters';
import WorkoutCard from '../components/workout/WorkoutCard';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const signOut = useAuthStore((s) => s.signOut);

  const { data: savedWorkouts, isLoading: savedLoading } = useSavedWorkouts(userId);
  const { data: sessions, isLoading: sessionsLoading } = useSessionHistory(userId);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
              <Text className="text-lg text-accent">‹ Back</Text>
            </Pressable>
            <Text className="text-xl font-bold text-ink">Profile</Text>
          </View>
          <Pressable onPress={signOut} className="rounded-lg bg-error/10 px-3 py-1.5">
            <Text className="text-xs font-medium text-error">Sign Out</Text>
          </Pressable>
        </View>

        {/* My Stack */}
        <Pressable
          onPress={() => navigation.navigate('Stack')}
          className="mx-4 mt-4 mb-2 flex-row items-center justify-between rounded-xl bg-surface-secondary px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <Text className="text-lg">💊</Text>
            <View>
              <Text className="text-sm font-semibold text-ink">My Stack</Text>
              <Text className="text-xs text-ink-muted">Manage your supplements</Text>
            </View>
          </View>
          <Text className="text-sm text-ink-muted">›</Text>
        </Pressable>

        {/* Supplement Guide */}
        <Pressable
          onPress={() => navigation.navigate('EducationList')}
          className="mx-4 mb-2 flex-row items-center justify-between rounded-xl bg-surface-secondary px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <Text className="text-lg">📖</Text>
            <View>
              <Text className="text-sm font-semibold text-ink">Supplement Guide</Text>
              <Text className="text-xs text-ink-muted">Learn about your supplements</Text>
            </View>
          </View>
          <Text className="text-sm text-ink-muted">›</Text>
        </Pressable>

        {/* Saved Workouts */}
        <View className="mt-4">
          <Text className="mb-2 px-4 text-lg font-bold text-ink">Saved Workouts</Text>

          {savedLoading && (
            <View className="items-center py-6">
              <ActivityIndicator color="#2f7fff" />
            </View>
          )}

          {!savedLoading && (!savedWorkouts || savedWorkouts.length === 0) && (
            <Text className="px-4 py-4 text-sm text-ink-muted">No saved workouts yet</Text>
          )}

          {!savedLoading && savedWorkouts && savedWorkouts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {savedWorkouts.map((saved) => (
                <WorkoutCard
                  key={saved.workout_id}
                  workout={saved.workout}
                  variant="horizontal"
                  onPress={() =>
                    navigation.navigate('WorkoutDetail', { workoutId: saved.workout_id })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Session History */}
        <View className="mt-6">
          <Text className="mb-2 px-4 text-lg font-bold text-ink">Session History</Text>

          {sessionsLoading && (
            <View className="items-center py-6">
              <ActivityIndicator color="#2f7fff" />
            </View>
          )}

          {!sessionsLoading && (!sessions || sessions.length === 0) && (
            <Text className="px-4 py-4 text-sm text-ink-muted">No completed sessions yet</Text>
          )}

          {!sessionsLoading && sessions && sessions.length > 0 && (
            <View className="gap-2 px-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  onPress={() =>
                    navigation.navigate('SessionDetail', {
                      sessionId: session.session_id,
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Settings placeholder */}
        <View className="mt-6 px-4 pb-8">
          <Text className="mb-2 text-lg font-bold text-ink">Settings</Text>
          <View className="items-center rounded-lg border border-dashed border-surface-tertiary bg-surface-secondary px-4 py-4">
            <Text className="text-sm text-ink-muted">
              Notification preferences, supplement settings, and account options coming soon.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  onPress,
}: {
  session: UserSessionHistoryView;
  onPress: () => void;
}) {
  const completedDate = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Pressable onPress={onPress} className="flex-row items-center rounded-lg bg-surface px-3 py-3 shadow-card">
      <View className="flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {session.workout_title}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          <Text className="text-xs text-ink-secondary">{completedDate}</Text>
          {session.duration_sec != null && (
            <Text className="text-xs text-ink-muted">{formatDuration(session.duration_sec)}</Text>
          )}
          {session.total_volume_lbs != null && session.total_volume_lbs > 0 && (
            <Text className="text-xs text-ink-muted">
              {formatVolume(Number(session.total_volume_lbs))}
            </Text>
          )}
        </View>
      </View>
      {session.rating != null && (
        <Text className="text-xs font-medium text-warning">{session.rating}/5</Text>
      )}
    </Pressable>
  );
}
