import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { useAuthStore } from '../stores/authStore';
import { formatEstimatedMinutes } from '../utils/formatters';
import type { Workout } from '../lib/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'SavedWorkouts'>;

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function WorkoutRow({ workout, onPress, onUnsave }: { workout: Workout; onPress: () => void; onUnsave: () => void }) {
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
          onUnsave();
        }}
        className="ml-2 p-2"
        hitSlop={8}
      >
        <Text className="text-lg text-warning">★</Text>
      </Pressable>
    </Pressable>
  );
}

export default function SavedWorkoutsScreen() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: savedWorkouts, isLoading, unsaveWorkout } = useSavedWorkouts(userId);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 pb-3 pt-4">
        <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-lg text-accent">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-ink">Saved Workouts</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2f7fff" />
        </View>
      ) : !savedWorkouts || savedWorkouts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-3">☆</Text>
          <Text className="text-base font-semibold text-ink mb-1">No saved workouts yet</Text>
          <Text className="text-sm text-ink-muted text-center">
            Tap the star icon on any workout to save it here for quick access
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {savedWorkouts.map((saved) => (
            <WorkoutRow
              key={saved.workout_id}
              workout={saved.workout}
              onUnsave={() => unsaveWorkout(saved.workout_id)}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: saved.workout_id })}
            />
          ))}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
