import { View, Text, ScrollView, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useFeaturedWorkouts } from '../hooks/useFeaturedWorkouts';
import { useCategories } from '../hooks/useCategories';
import { formatEstimatedMinutes } from '../utils/formatters';
import type { Workout, Category } from '../lib/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// ── Featured Workout Item (row inside featured section) ──
function FeaturedWorkoutItem({
  workout,
  onPress,
  isNew,
}: {
  workout: Workout;
  onPress: () => void;
  isNew?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3">
      {/* Thumbnail */}
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
        {isNew && (
          <View className="absolute bottom-2 left-2 rounded bg-error px-1.5 py-0.5">
            <Text className="text-2xs font-bold text-white">New</Text>
          </View>
        )}
      </View>

      {/* Info */}
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

      {/* Bookmark icon */}
      <View className="ml-2 p-2">
        <Text className="text-lg text-ink-muted">☆</Text>
      </View>
    </Pressable>
  );
}

// ── Featured Section ──
function FeaturedSection() {
  const { data: workouts, isLoading, error } = useFeaturedWorkouts();
  const navigation = useNavigation<Nav>();

  if (isLoading) {
    return (
      <View className="h-48 items-center justify-center">
        <ActivityIndicator color="#2f7fff" />
      </View>
    );
  }

  if (error || !workouts?.length) return null;

  return (
    <View className="mb-6 px-4">
      <Text className="text-xl font-bold text-ink">Become Boundless</Text>
      <Text className="mt-1 text-sm leading-5 text-ink-secondary">
        This week takes what you've built and pushes it further with a line-up of
        full-body, lower-body, and hybrid workouts
      </Text>

      <View className="mt-3">
        {workouts.slice(0, 3).map((workout, idx) => (
          <FeaturedWorkoutItem
            key={workout.id}
            workout={workout}
            isNew={idx < 3}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
          />
        ))}
      </View>
    </View>
  );
}

// ── Category Card (large image card) ──
function CategoryCard({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 h-44 w-full overflow-hidden rounded-xl"
    >
      {category.icon_url ? (
        <Image
          source={{ uri: category.icon_url }}
          className="h-full w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-surface-tertiary" />
      )}
      {/* Dark overlay gradient */}
      <View className="absolute bottom-0 left-0 right-0 top-0 bg-black/30" />
      {/* Label */}
      <View className="absolute bottom-4 left-4">
        <Text className="text-xl font-bold text-white">{category.name}</Text>
      </View>
    </Pressable>
  );
}

// ── Browse by Category Section ──
function BrowseByCategorySection() {
  const { data: categories, isLoading, error } = useCategories();
  const navigation = useNavigation<Nav>();

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color="#2f7fff" />
      </View>
    );
  }

  if (error || !categories?.length) return null;

  return (
    <View className="mb-6 px-4">
      <Text className="mb-4 text-xl font-bold text-ink">Browse by Category</Text>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onPress={() => {
            // TODO: Navigate to category browse screen
          }}
        />
      ))}
    </View>
  );
}

// ── Your Workouts Section ──
function YourWorkoutsSection() {
  return (
    <View className="mb-6 px-4">
      <Text className="mb-4 text-xl font-bold text-ink">Your Workouts</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {/* Saved card */}
          <Pressable className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary">
            <Text className="text-3xl">☆</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Saved</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">0 Workouts</Text>
          </Pressable>

          {/* Scheduled card */}
          <Pressable className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary">
            <Text className="text-3xl">🕐</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Scheduled</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">0 Workouts</Text>
          </Pressable>

          {/* Completed card */}
          <Pressable className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary">
            <Text className="text-3xl">✓</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Completed</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">0 Workouts</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Main HomeScreen ──
export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-tertiary">
            <Text className="text-sm font-bold text-ink-muted">DC</Text>
          </View>
          <Text className="text-lg font-bold text-ink">Workouts</Text>
          <Pressable className="p-1">
            <Text className="text-lg text-ink">☆</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="mb-5 px-4">
          <View className="flex-row items-center rounded-lg bg-surface-secondary px-3 py-2.5">
            <Text className="mr-2 text-sm text-ink-muted">🔍</Text>
            <Text className="text-sm text-ink-muted">Search</Text>
          </View>
        </View>

        {/* Featured */}
        <FeaturedSection />

        {/* Divider */}
        <View className="mx-4 mb-6 h-px bg-surface-tertiary" />

        {/* Browse by Category */}
        <BrowseByCategorySection />

        {/* Your Workouts */}
        <YourWorkoutsSection />

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
