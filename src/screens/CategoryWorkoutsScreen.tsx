import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useWorkouts } from '../hooks/useWorkouts';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { useAuthStore } from '../stores/authStore';
import { formatEstimatedMinutes } from '../utils/formatters';
import type { Workout } from '../lib/types';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CategoryWorkouts'>;
type Route = RouteProp<HomeStackParamList, 'CategoryWorkouts'>;

function WorkoutRow({
  workout,
  onPress,
  isSaved,
  onToggleSave,
}: {
  workout: Workout;
  onPress: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3">
      <View className="h-24 w-28 overflow-hidden rounded-lg">
        {workout.thumbnail_url ? (
          <Image
            source={{ uri: workout.thumbnail_url }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface-tertiary">
            <Text className="text-2xl">💪</Text>
          </View>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-ink" numberOfLines={2}>
          {workout.title}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
          {DIFFICULTY_LABELS[workout.difficulty] ?? workout.difficulty}
          {' · '}
          {workout.equipment_needed.length > 0
            ? workout.equipment_needed.join(', ')
            : 'No Equipment'}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-muted">
          {formatEstimatedMinutes(workout.estimated_minutes)}
        </Text>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave?.();
        }}
        className="ml-2 p-2"
        hitSlop={8}
      >
        <Text className={`text-lg ${isSaved ? 'text-warning' : 'text-ink-muted'}`}>
          {isSaved ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function CategoryWorkoutsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { categoryId, categoryName } = route.params;
  const userId = useAuthStore((s) => s.user?.id);

  const { data: workouts, isLoading, error } = useWorkouts({ categoryIds: [categoryId] });
  const { data: savedWorkouts, saveWorkout, unsaveWorkout } = useSavedWorkouts(userId);
  const savedIds = new Set(savedWorkouts?.map((sw) => sw.workout_id) ?? []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 pb-3 pt-4">
        <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-lg text-accent">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-ink">{categoryName}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2f7fff" />
        </View>
      ) : error || !workouts?.length ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-3">🏋️</Text>
          <Text className="text-base font-semibold text-ink mb-1">No workouts yet</Text>
          <Text className="text-sm text-ink-muted text-center">
            No workouts found for this category
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {workouts.map((workout) => (
            <WorkoutRow
              key={workout.id}
              workout={workout}
              isSaved={savedIds.has(workout.id)}
              onToggleSave={() => {
                if (!userId) return;
                savedIds.has(workout.id) ? unsaveWorkout(workout.id) : saveWorkout(workout.id);
              }}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
            />
          ))}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
