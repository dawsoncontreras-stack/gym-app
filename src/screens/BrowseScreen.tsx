import { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { BrowseStackParamList } from '../navigation/BrowseStack';
import { useWorkouts } from '../hooks/useWorkouts';
import { useCategories } from '../hooks/useCategories';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { useAuthStore } from '../stores/authStore';
import WorkoutCard from '../components/workout/WorkoutCard';
import FilterBar, { type ActiveFilters } from '../components/workout/FilterBar';

type Nav = NativeStackNavigationProp<BrowseStackParamList, 'Browse'>;
type Route = RouteProp<BrowseStackParamList, 'Browse'>;

const EMPTY_FILTERS: ActiveFilters = {
  difficulties: [],
  equipment: [],
  categoryIds: [],
  search: '',
};

export default function BrowseScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const incomingCategoryId = route.params?.categoryId;

  // Build initial filters from navigation params
  const initialFilters = useMemo<ActiveFilters>(() => {
    if (incomingCategoryId) {
      return { ...EMPTY_FILTERS, categoryIds: [incomingCategoryId] };
    }
    return EMPTY_FILTERS;
  }, [incomingCategoryId]);

  const [filters, setFilters] = useState<ActiveFilters>(initialFilters);
  const { data: categories } = useCategories();

  // If navigated to with a new categoryId, update filters
  const lastCategoryId = useRef(incomingCategoryId);
  useEffect(() => {
    if (incomingCategoryId && incomingCategoryId !== lastCategoryId.current) {
      lastCategoryId.current = incomingCategoryId;
      setFilters((prev) => ({ ...prev, categoryIds: [incomingCategoryId] }));
    }
  }, [incomingCategoryId]);

  const queryFilters = useMemo(
    () => ({
      difficulties: filters.difficulties.length > 0 ? filters.difficulties : undefined,
      equipment: filters.equipment.length > 0 ? filters.equipment : undefined,
      categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      search: filters.search || undefined,
    }),
    [filters],
  );

  const { data: workouts, isLoading, error } = useWorkouts(queryFilters);
  const userId = useAuthStore((s) => s.user?.id);
  const { data: savedWorkouts, saveWorkout, unsaveWorkout } = useSavedWorkouts(userId);
  const savedIds = useMemo(() => new Set(savedWorkouts?.map((sw) => sw.workout_id) ?? []), [savedWorkouts]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pb-2 pt-6">
        <Text className="text-2xl font-bold text-ink">Browse</Text>
      </View>

      <FilterBar
        filters={filters}
        categories={categories ?? []}
        onFiltersChange={setFilters}
      />

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2f7fff" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-sm text-error">Failed to load workouts</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={workouts ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 16 }}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              variant="grid"
              isSaved={savedIds.has(item.id)}
              onToggleSave={() => {
                if (!userId) return;
                savedIds.has(item.id) ? unsaveWorkout(item.id) : saveWorkout(item.id);
              }}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-sm text-ink-muted">No workouts found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
