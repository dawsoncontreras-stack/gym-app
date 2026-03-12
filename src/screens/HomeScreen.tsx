import { View, Text, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useFeaturedWorkouts } from '../hooks/useFeaturedWorkouts';
import { useCategories } from '../hooks/useCategories';
import WorkoutCard from '../components/workout/WorkoutCard';
import CategoryRow from '../components/workout/CategoryRow';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

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
    <View className="mb-6">
      <Text className="mb-3 px-4 text-lg font-bold text-ink">Featured</Text>
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
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
          />
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { data: categories, isLoading, error } = useCategories();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-2 pt-6">
          <Text className="text-2xl font-bold text-ink">Workouts</Text>
        </View>

        <FeaturedSection />

        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator color="#2f7fff" />
          </View>
        )}

        {error && (
          <View className="items-center px-4 py-8">
            <Text className="text-sm text-error">Failed to load categories</Text>
          </View>
        )}

        {categories?.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
