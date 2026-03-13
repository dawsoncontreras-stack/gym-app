import { View, Text, Image, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/HomeStack';
import {
  useSupplementSuggestion,
  useDismissSuggestion,
} from '../../hooks/useSupplementSuggestion';
import { useUserStack } from '../../hooks/useUserStack';
import { useStackMutations } from '../../hooks/useStackMutations';
import { useDoseLogMutation } from '../../hooks/useDoseLog';
import { useAuthStore } from '../../stores/authStore';

type SupplementSuggestionProps = {
  workoutId: string;
};

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function SupplementSuggestion({ workoutId }: SupplementSuggestionProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const navigation = useNavigation<Nav>();
  const { data: suggestion } = useSupplementSuggestion(userId, workoutId);
  const { data: stackItems } = useUserStack(userId);
  const dismissMutation = useDismissSuggestion();
  const logDose = useDoseLogMutation();
  const { addToStack } = useStackMutations();

  if (!suggestion || !userId) return null;

  // Check if user is tracking this product
  const stackItem = stackItems?.find((item) => item.product_id === suggestion.product_id);
  const isTracking = !!stackItem;

  const message = isTracking
    ? suggestion.message_if_tracking
    : suggestion.message_if_not_tracking;

  if (!message) return null;

  const handleDismiss = () => {
    dismissMutation.mutate({ userId, productId: suggestion.product_id });
  };

  const handleLogDose = () => {
    if (!stackItem) return;
    logDose.mutate({
      userId,
      stackItemId: stackItem.stack_item_id,
      source: 'post_workout',
    });
  };

  const handleAddToStack = () => {
    addToStack.mutate(
      { productId: suggestion.product_id, daysSupply: 30 },
      {
        onSuccess: () => {
          Alert.alert('Added!', `${suggestion.product_name} has been added to your stack.`);
        },
        onError: (err) => {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add');
        },
      }
    );
  };

  return (
    <View className="mt-6 rounded-xl bg-brand-50 border border-brand-200 p-4">
      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        className="absolute top-2 right-2 p-2 z-10"
        hitSlop={8}
      >
        <Text className="text-sm text-ink-muted">✕</Text>
      </Pressable>

      <View className="flex-row items-center mb-2">
        {suggestion.product_thumbnail_url ? (
          <Image
            source={{ uri: suggestion.product_thumbnail_url }}
            className="h-10 w-10 rounded-lg mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-tertiary mr-3">
            <Text className="text-lg">💊</Text>
          </View>
        )}
        <View className="flex-1 pr-6">
          <Text className="text-xs font-bold text-accent mb-0.5">
            {suggestion.product_name}
          </Text>
          <Text className="text-sm text-ink-secondary">{message}</Text>
        </View>
      </View>

      {/* Action */}
      {isTracking ? (
        <Pressable
          onPress={handleLogDose}
          disabled={stackItem.taken_today || logDose.isPending}
          className={`mt-1 items-center rounded-lg py-2 ${
            stackItem.taken_today ? 'bg-success/10' : 'bg-accent'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              stackItem.taken_today ? 'text-success' : 'text-white'
            }`}
          >
            {stackItem.taken_today ? '✓ Logged today' : 'Tap to log'}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleAddToStack}
          disabled={addToStack.isPending}
          className="mt-1 items-center rounded-lg bg-accent py-2"
        >
          <Text className="text-xs font-semibold text-white">
            {addToStack.isPending ? 'Adding...' : 'Add to Stack'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
