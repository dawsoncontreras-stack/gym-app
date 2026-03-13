import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../lib/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'EducationList'>;

function extractFirstHeading(markdown: string): string {
  const match = markdown.match(/^## (.+)$/m);
  return match?.[1] ?? 'Learn More';
}

function extractPreview(markdown: string): string {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('##')) continue;
    const clean = trimmed
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^- /, '');
    if (clean.length > 100) return clean.slice(0, 97) + '...';
    return clean;
  }
  return '';
}

function ArticleRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const heading = extractFirstHeading(product.education_markdown!);
  const preview = extractPreview(product.education_markdown!);

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 py-4 border-b border-surface-tertiary"
    >
      <Text className="text-2xs font-semibold text-accent uppercase mb-0.5">
        {product.name}
      </Text>
      <Text className="text-sm font-bold text-ink">{heading}</Text>
      {preview ? (
        <Text className="mt-0.5 text-xs text-ink-secondary" numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function EducationListScreen() {
  const navigation = useNavigation<Nav>();
  const { data: products, isLoading } = useProducts();

  // Only show products that have education content
  const educationProducts = products?.filter((p) => p.education_markdown) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 pt-4">
        <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-lg text-accent">‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-ink">Supplement Guide</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2f7fff" />
        </View>
      ) : educationProducts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-ink-muted">No articles available yet.</Text>
        </View>
      ) : (
        <FlatList
          data={educationProducts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ArticleRow
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetail', { productId: item.id })
              }
            />
          )}
          ListFooterComponent={<View className="h-8" />}
        />
      )}
    </SafeAreaView>
  );
}
