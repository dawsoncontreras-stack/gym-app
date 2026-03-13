import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useProducts } from '../hooks/useProducts';
import { useUserStack } from '../hooks/useUserStack';
import { useStackMutations } from '../hooks/useStackMutations';
import { useAuthStore } from '../stores/authStore';
import ProductCard from '../components/supplement/ProductCard';
import type { Product } from '../lib/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ProductCatalog'>;

export default function ProductCatalogScreen() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: products, isLoading, error, refetch } = useProducts();
  const { data: stackItems } = useUserStack(userId);
  const { addToStack } = useStackMutations();

  const stackProductIds = new Set(stackItems?.map((item) => item.product_id) ?? []);

  const handleAddToStack = (product: Product) => {
    if (stackProductIds.has(product.id)) {
      Alert.alert('Already in Stack', `${product.name} is already in your stack.`);
      return;
    }

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

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 pt-4">
        <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-lg text-accent">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-ink">Supplements</Text>
      </View>

      {/* Loading */}
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2f7fff" />
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-error mb-3">Failed to load products.</Text>
          <Pressable onPress={() => refetch()} className="rounded-lg bg-accent px-4 py-2">
            <Text className="text-sm font-medium text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Product Grid */}
      {!isLoading && !error && products && (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-3 pb-8"
          columnWrapperClassName="gap-3 mb-3"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const inStack = stackProductIds.has(item.id);
            return (
              <View className="flex-1">
                <ProductCard
                  product={item}
                  onPress={() =>
                    navigation.navigate('ProductDetail', { productId: item.id })
                  }
                  onAddToStack={inStack ? undefined : () => handleAddToStack(item)}
                />
                {inStack && (
                  <View className="absolute top-2 right-2 rounded-full bg-success px-2 py-0.5">
                    <Text className="text-2xs font-bold text-white">In Stack</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
