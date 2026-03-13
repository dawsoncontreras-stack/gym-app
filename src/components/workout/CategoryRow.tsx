import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/HomeStack';
import type { Category } from '../../lib/types';
import { useWorkoutsByCategory } from '../../hooks/useWorkoutsByCategory';
import { useSavedWorkouts } from '../../hooks/useSavedWorkouts';
import { useAuthStore } from '../../stores/authStore';
import WorkoutCard from './WorkoutCard';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

type CategoryRowProps = {
  category: Category;
};

export default function CategoryRow({ category }: CategoryRowProps) {
  const { data: workouts, isLoading } = useWorkoutsByCategory(category.id);
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: savedWorkouts, saveWorkout, unsaveWorkout } = useSavedWorkouts(userId);
  const savedIds = new Set(savedWorkouts?.map((sw) => sw.workout_id) ?? []);

  if (isLoading) {
    return (
      <View className="mb-4 h-20 items-center justify-center">
        <ActivityIndicator color="#2f7fff" size="small" />
      </View>
    );
  }

  if (!workouts?.length) return null;

  return (
    <View className="mb-6">
      <Text className="mb-2 px-4 text-base font-bold text-ink">{category.name}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            variant="horizontal"
            isSaved={savedIds.has(item.id)}
            onToggleSave={() => {
              if (!userId) return;
              savedIds.has(item.id) ? unsaveWorkout(item.id) : saveWorkout(item.id);
            }}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
          />
        )}
      />
    </View>
  );
}
