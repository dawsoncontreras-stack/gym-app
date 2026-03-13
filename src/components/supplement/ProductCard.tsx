import { View, Text, Image, Pressable } from 'react-native';
import type { Product } from '../../lib/types';

type ProductCardProps = {
  product: Product;
  isSelected?: boolean;
  onPress?: () => void;
  onAddToStack?: () => void;
  variant?: 'catalog' | 'onboarding';
};

function formatPrice(cents: number | null): string {
  if (cents == null) return '';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductCard({
  product,
  isSelected = false,
  onPress,
  onAddToStack,
  variant = 'catalog',
}: ProductCardProps) {
  if (variant === 'onboarding') {
    return (
      <Pressable
        onPress={onPress}
        className={`rounded-xl border-2 p-3 ${
          isSelected ? 'border-accent bg-brand-50' : 'border-surface-tertiary bg-surface'
        }`}
      >
        <View className="flex-row items-center">
          {/* Thumbnail */}
          {product.thumbnail_url ? (
            <Image
              source={{ uri: product.thumbnail_url }}
              className="h-12 w-12 rounded-lg"
              resizeMode="cover"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-surface-tertiary">
              <Text className="text-lg">💊</Text>
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-ink">{product.name}</Text>
            {product.short_description && (
              <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                {product.short_description}
              </Text>
            )}
          </View>

          {/* Selection indicator */}
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${
              isSelected ? 'bg-accent' : 'border-2 border-muted/40'
            }`}
          >
            {isSelected && <Text className="text-xs font-bold text-white">✓</Text>}
          </View>
        </View>
      </Pressable>
    );
  }

  // Catalog variant
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-xl bg-surface shadow-card"
    >
      {/* Image */}
      {product.image_url || product.thumbnail_url ? (
        <Image
          source={{ uri: product.image_url ?? product.thumbnail_url ?? '' }}
          className="h-36 w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-36 w-full items-center justify-center bg-surface-tertiary">
          <Text className="text-3xl">💊</Text>
        </View>
      )}

      <View className="p-3">
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {product.name}
        </Text>
        {product.short_description && (
          <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={2}>
            {product.short_description}
          </Text>
        )}

        <View className="mt-2 flex-row items-center justify-between">
          {product.price_cents != null && (
            <Text className="text-sm font-bold text-ink">
              {formatPrice(product.price_cents)}
            </Text>
          )}

          {onAddToStack && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAddToStack();
              }}
              className="rounded-lg bg-accent px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-white">Add to Stack</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
