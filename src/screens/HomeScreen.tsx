import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackParamList } from '../navigation/HomeStack';
import type { TabParamList } from '../navigation/TabNavigator';
import { useFeaturedWorkouts } from '../hooks/useFeaturedWorkouts';
import { useCategories } from '../hooks/useCategories';
import { useUserStack } from '../hooks/useUserStack';
import { usePromotions } from '../hooks/usePromotions';
import { useDismissedPromotionIds, useDismissPromotion } from '../hooks/usePromotionDismissals';
import { useWelcomeDiscount } from '../hooks/useWelcomeDiscount';
import { useAuthStore } from '../stores/authStore';
import { useStackLifecycle } from '../hooks/useStackLifecycle';
import { useMonthlyRecap } from '../hooks/useMonthlyRecap';
import { useProducts } from '../hooks/useProducts';
import { useEducationTips } from '../hooks/useEducationTips';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { formatEstimatedMinutes } from '../utils/formatters';
import StackCheckIn from '../components/supplement/StackCheckIn';
import StackStatusRow from '../components/supplement/StackStatusRow';
import PromotionBanner from '../components/supplement/PromotionBanner';
import WelcomeDiscountBanner from '../components/supplement/WelcomeDiscountBanner';
import MonthlyRecapCard from '../components/supplement/MonthlyRecapCard';
import EducationTipCard from '../components/supplement/EducationTipCard';
import type { Workout, Category } from '../lib/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'Home'>,
  BottomTabNavigationProp<TabParamList>
>;

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  strength: '🏋️',
  cardio: '🏃',
  flexibility: '🧘',
  hiit: '🔥',
  yoga: '🧘',
  pilates: '💪',
  stretching: '🤸',
  core: '🎯',
  upper: '💪',
  lower: '🦵',
  full: '⚡',
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🏋️';
}

// ── Featured Workout Item (row inside featured section) ──
function FeaturedWorkoutItem({
  workout,
  onPress,
  isNew,
  isSaved,
  onToggleSave,
}: {
  workout: Workout;
  onPress: () => void;
  isNew?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
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

// ── Featured Section ──
function FeaturedSection() {
  const { data: workouts, isLoading, error } = useFeaturedWorkouts();
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: savedWorkouts, saveWorkout, unsaveWorkout } = useSavedWorkouts(userId);

  if (isLoading) {
    return (
      <View className="h-48 items-center justify-center">
        <ActivityIndicator color="#2f7fff" />
      </View>
    );
  }

  if (error || !workouts?.length) return null;

  const featured = workouts[0];
  const isSaved = savedWorkouts?.some((sw) => sw.workout_id === featured.id) ?? false;

  return (
    <View className="mb-6 px-4">
      <Text className="mb-2 text-xl font-bold text-ink">Featured</Text>
      <FeaturedWorkoutItem
        workout={featured}
        isNew
        isSaved={isSaved}
        onToggleSave={() => {
          if (!userId) return;
          isSaved ? unsaveWorkout(featured.id) : saveWorkout(featured.id);
        }}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: featured.id })}
      />
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
        <View className="h-full w-full items-center justify-center bg-surface-tertiary">
          <Text className="text-5xl">{getCategoryEmoji(category.name)}</Text>
        </View>
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
            navigation.navigate('CategoryWorkouts', {
              categoryId: category.id,
              categoryName: category.name,
            });
          }}
        />
      ))}
    </View>
  );
}

// ── Your Workouts Section ──
function YourWorkoutsSection() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: savedWorkouts } = useSavedWorkouts(userId);
  const savedCount = savedWorkouts?.length ?? 0;

  return (
    <View className="mb-6 px-4">
      <Text className="mb-4 text-xl font-bold text-ink">Your Workouts</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {/* Saved card */}
          <Pressable
            onPress={() => navigation.navigate('SavedWorkouts')}
            className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary"
          >
            <Text className="text-3xl">☆</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Saved</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">{savedCount} {savedCount === 1 ? 'Workout' : 'Workouts'}</Text>
          </Pressable>

          {/* Scheduled card */}
          <Pressable
            onPress={() => navigation.navigate('CalendarTab' as never)}
            className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary"
          >
            <Text className="text-3xl">🕐</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Scheduled</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">0 Workouts</Text>
          </Pressable>

          {/* Completed card */}
          <Pressable
            onPress={() => navigation.navigate('CalendarTab' as never)}
            className="h-36 w-40 items-center justify-center rounded-xl bg-surface-secondary"
          >
            <Text className="text-3xl">✓</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">Completed</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">0 Workouts</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Set Up Stack CTA (shown when user has no stack) ──
function SetUpStackCard() {
  const navigation = useNavigation<Nav>();

  return (
    <Pressable
      onPress={() => navigation.navigate('ProductCatalog')}
      className="mx-4 mb-4 rounded-xl bg-brand-50 border border-brand-200 p-4"
    >
      <View className="flex-row items-center">
        <Text className="text-2xl mr-3">💊</Text>
        <View className="flex-1">
          <Text className="text-sm font-bold text-ink">Set up your supplement stack</Text>
          <Text className="mt-0.5 text-xs text-ink-secondary">
            Track your supplements and get reorder reminders
          </Text>
        </View>
        <Text className="text-sm text-accent font-semibold">→</Text>
      </View>
    </Pressable>
  );
}


// ── Main HomeScreen ──
export default function HomeScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<Nav>();
  const { data: stackItems } = useUserStack(userId);

  // Run lifecycle transitions on mount (active→running_low→reorder→archived)
  useStackLifecycle(userId, stackItems);

  const hasStack = stackItems && stackItems.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <Pressable
            onPress={() => navigation.navigate('Profile' as never)}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-tertiary"
          >
            <Text className="text-sm font-bold text-ink-muted">DC</Text>
          </Pressable>
          <Text className="text-lg font-bold text-ink">Workouts</Text>
          <Pressable
            onPress={() => navigation.navigate('SavedWorkouts')}
            className="p-1"
          >
            <Text className="text-lg text-ink">☆</Text>
          </Pressable>
        </View>

        {/* 1. Promotion Banner (self-contained to manage dismissals) */}
        <PromotionSection />

        {/* 2. Welcome Discount Banner */}
        <WelcomeDiscountSection />

        {/* 3. Stack Check-In */}
        {hasStack && <StackCheckIn items={stackItems} source="home" />}

        {/* 4. Stack Status Row (if user has stack items) */}
        {hasStack && <StackStatusRow items={stackItems} />}

        {/* No stack → Setup CTA */}
        {!hasStack && <SetUpStackCard />}

        {/* 5. Monthly Recap */}
        <MonthlyRecapSection />

        {/* Featured */}
        <FeaturedSection />

        {/* Divider */}
        <View className="mx-4 mb-6 h-px bg-surface-tertiary" />

        {/* Browse by Category */}
        <BrowseByCategorySection />

        {/* Your Workouts */}
        <YourWorkoutsSection />

        {/* Education Tips (at the very bottom) */}
        {hasStack && <EducationTipsSection stackItems={stackItems} />}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Education Tips Section ──
function EducationTipsSection({ stackItems }: { stackItems: import('../lib/types').StackStatusView[] }) {
  const { data: products } = useProducts();
  const tips = useEducationTips(stackItems, products);
  const navigation = useNavigation<Nav>();

  if (tips.length === 0) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-sm font-bold text-ink">Did you know?</Text>
        <Pressable onPress={() => navigation.navigate('EducationList')}>
          <Text className="text-xs font-semibold text-accent">See all →</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {tips.map((tip) => (
          <EducationTipCard
            key={tip.productId}
            tip={tip}
            onPress={() => navigation.navigate('ProductDetail', { productId: tip.productId })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Monthly Recap Section (self-contained) ──
function MonthlyRecapSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: recap } = useMonthlyRecap(userId);

  if (!recap) return null;

  return <MonthlyRecapCard recap={recap} />;
}

// ── Promotion Section (self-contained to manage persisted dismissals) ──
function PromotionSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: promotions } = usePromotions();
  const { data: dismissedIds } = useDismissedPromotionIds(userId);
  const { dismiss } = useDismissPromotion();

  if (!promotions || !dismissedIds) return null;

  // Show the first non-dismissed promotion
  const activePromo = promotions.find((p) => !dismissedIds.has(p.id)) ?? null;
  if (!activePromo || !userId) return null;

  return (
    <PromotionBanner
      promotion={activePromo}
      onDismiss={() => dismiss(userId, activePromo.id)}
    />
  );
}

// ── Welcome Discount Section (self-contained to avoid conditional hook) ──
function WelcomeDiscountSection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: discount, dismiss } = useWelcomeDiscount(userId);

  if (!discount || discount.dismissed_at) return null;

  return <WelcomeDiscountBanner code={discount.discount_code} onDismiss={dismiss} />;
}
