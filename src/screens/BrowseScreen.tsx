import { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BrowseStackParamList } from '../navigation/BrowseStack';
import { useWorkouts } from '../hooks/useWorkouts';
import { useCategories } from '../hooks/useCategories';
import WorkoutCard from '../components/workout/WorkoutCard';
import FilterBar, { type ActiveFilters } from '../components/workout/FilterBar';

type Nav = NativeStackNavigationProp<BrowseStackParamList, 'Browse'>;

const EMPTY_FILTERS: ActiveFilters = {
  difficulties: [],
  equipment: [],
  categoryIds: [],
  search: '',
};

export default function BrowseScreen() {
  const navigation = useNavigation<Nav>();
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const { data: categories } = useCategories();

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
