import { View, Text, Pressable, Linking } from 'react-native';
import type { Promotion } from '../../lib/types';

type PromotionBannerProps = {
  promotion: Promotion;
  onDismiss: () => void;
};

export default function PromotionBanner({ promotion, onDismiss }: PromotionBannerProps) {
  const handlePress = () => {
    if (promotion.shopify_url) {
      Linking.openURL(promotion.shopify_url);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!promotion.shopify_url}
      className="mx-4 mb-3 rounded-xl bg-brand-50 border border-brand-200 p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          {promotion.discount_label && (
            <View className="self-start rounded-full bg-accent px-2 py-0.5 mb-1.5">
              <Text className="text-2xs font-bold text-white">{promotion.discount_label}</Text>
            </View>
          )}
          <Text className="text-sm font-bold text-ink">{promotion.title}</Text>
          {promotion.description && (
            <Text className="mt-0.5 text-xs text-ink-secondary">{promotion.description}</Text>
          )}
          <View className="mt-1.5 flex-row items-center">
            <Text className="text-xs text-ink-muted">Code: </Text>
            <Text className="text-xs font-bold text-accent">{promotion.discount_code}</Text>
          </View>
          {promotion.shopify_url && (
            <Text className="mt-1 text-xs font-semibold text-accent">Shop now →</Text>
          )}
        </View>

        {/* Dismiss button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1"
          hitSlop={8}
        >
          <Text className="text-sm text-ink-muted">✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
