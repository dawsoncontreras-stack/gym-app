import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useProducts } from '../hooks/useProducts';
import { useUserStack } from '../hooks/useUserStack';
import { useStackMutations } from '../hooks/useStackMutations';
import { usePromotions } from '../hooks/usePromotions';
import { useAuthStore } from '../stores/authStore';
import SimpleMarkdown from '../components/supplement/SimpleMarkdown';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ProductDetail'>;
type Route = RouteProp<HomeStackParamList, 'ProductDetail'>;

function formatPrice(cents: number | null): string {
  if (cents == null) return '';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { productId } = route.params;

  const userId = useAuthStore((s) => s.user?.id);
  const { data: products, isLoading } = useProducts();
  const { data: stackItems } = useUserStack(userId);
  const { data: promotions } = usePromotions();
  const { addToStack } = useStackMutations();

  const product = products?.find((p) => p.id === productId);
  const stackItem = stackItems?.find((item) => item.product_id === productId);
  const inStack = !!stackItem;

  // Find an active promotion that applies to this product
  const activePromo = promotions?.find(
    (p) => !p.product_ids || p.product_ids.includes(productId)
  );

  const handleAddToStack = () => {
    if (!product) return;

    addToStack.mutate(
      { productId: product.id, daysSupply: product.default_days_supply },
      {
        onSuccess: () => {
          Alert.alert('Added!', `${product.name} has been added to your stack.`);
        },
        onError: (err) => {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add product');
        },
      }
    );
  };

  const handleOrder = () => {
    if (product?.shopify_url) {
      Linking.openURL(product.shopify_url);
    } else {
      Alert.alert('Coming Soon', 'Online ordering will be available soon.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2f7fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-error">Product not found.</Text>
          <Pressable onPress={() => navigation.goBack()} className="mt-3 rounded-lg bg-accent px-4 py-2">
            <Text className="text-sm font-medium text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-4 pb-2 pt-4">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Text className="text-lg text-accent">‹ Back</Text>
          </Pressable>
        </View>

        {/* Product Image */}
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            className="h-64 w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-48 w-full items-center justify-center bg-surface-tertiary">
            <Text className="text-5xl">💊</Text>
          </View>
        )}

        {/* Product Info */}
        <View className="px-4 pt-4">
          {/* Tags */}
          {product.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-2">
              {product.tags.map((tag) => (
                <View key={tag} className="rounded-full bg-brand-50 px-2.5 py-0.5">
                  <Text className="text-2xs font-medium text-accent">{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Text className="text-2xl font-bold text-ink">{product.name}</Text>

          {product.description && (
            <Text className="mt-2 text-sm text-ink-secondary leading-5">
              {product.description}
            </Text>
          )}

          {/* Price */}
          {product.price_cents != null && (
            <Text className="mt-3 text-xl font-bold text-ink">
              {formatPrice(product.price_cents)}
            </Text>
          )}

          {/* Stack status badge */}
          {inStack && stackItem && (
            <View className="mt-3 flex-row items-center rounded-lg bg-success/10 px-3 py-2">
              <Text className="text-xs font-medium text-success">
                ✓ In your stack
                {stackItem.status === 'arriving' && ' · Arriving soon'}
                {stackItem.status === 'active' &&
                  stackItem.days_remaining != null &&
                  ` · ${stackItem.days_remaining} days left`}
                {stackItem.status === 'running_low' && ' · Running low'}
                {stackItem.status === 'reorder' && ' · Time to reorder'}
              </Text>
            </View>
          )}
        </View>

        {/* Education Content */}
        {product.education_markdown && (
          <View className="px-4 mt-6 mb-4">
            <Text className="text-lg font-bold text-ink mb-1">Learn More</Text>
            <SimpleMarkdown content={product.education_markdown} />
          </View>
        )}

        {/* Active promo banner */}
        {activePromo && (
          <View className="mx-4 mt-4 rounded-xl bg-warning/10 px-4 py-3">
            <Text className="text-xs font-bold text-warning">{activePromo.discount_label}</Text>
            <Text className="text-sm font-medium text-ink mt-0.5">{activePromo.title}</Text>
            <View className="mt-1 flex-row items-center">
              <Text className="text-xs text-ink-secondary">Code: </Text>
              <Text className="text-xs font-bold text-ink">{activePromo.discount_code}</Text>
            </View>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-surface-tertiary bg-surface px-4 pb-8 pt-3">
        <View className="flex-row gap-3">
          {/* Add to Stack / Status */}
          {inStack ? (
            <View className="flex-1 items-center justify-center rounded-xl bg-success/10 py-3.5">
              <Text className="text-sm font-semibold text-success">In Your Stack</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleAddToStack}
              disabled={addToStack.isPending}
              className="flex-1 items-center rounded-xl bg-accent py-3.5"
            >
              {addToStack.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Add to Stack</Text>
              )}
            </Pressable>
          )}

          {/* Order Button */}
          <Pressable
            onPress={handleOrder}
            className="flex-1 items-center rounded-xl border-2 border-accent py-3.5"
          >
            <Text className="text-sm font-semibold text-accent">Order</Text>
          </Pressable>
        </View>

        {/* Show discount code if available */}
        {activePromo && (
          <Text className="mt-2 text-center text-xs text-ink-muted">
            Use code <Text className="font-bold text-accent">{activePromo.discount_code}</Text>{' '}
            for {activePromo.discount_label}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
