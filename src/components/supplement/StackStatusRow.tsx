import { View, Text, ScrollView, Pressable, Image, Linking, Alert } from 'react-native';
import { useStackMutations } from '../../hooks/useStackMutations';
import { useReorderDiscounts, getDiscountForCycle } from '../../hooks/useReorderDiscount';
import type { StackStatusView, ReorderDiscountCode } from '../../lib/types';

type StackStatusRowProps = {
  items: StackStatusView[];
};

function StatusBadge({ status, daysRemaining }: { status: string; daysRemaining: number | null }) {
  switch (status) {
    case 'arriving':
      return (
        <View className="rounded-full bg-brand-100 px-2 py-0.5">
          <Text className="text-2xs font-semibold text-accent">Arriving soon</Text>
        </View>
      );
    case 'active':
      return (
        <View className="rounded-full bg-success/10 px-2 py-0.5">
          <Text className="text-2xs font-semibold text-success">
            {daysRemaining != null ? `${daysRemaining} days left` : 'Active'}
          </Text>
        </View>
      );
    case 'running_low':
      return (
        <View className="rounded-full bg-warning/10 px-2 py-0.5">
          <Text className="text-2xs font-semibold text-warning">
            Running low{daysRemaining != null ? ` · ${daysRemaining}d` : ''}
          </Text>
        </View>
      );
    case 'reorder':
      return (
        <View className="rounded-full bg-error/10 px-2 py-0.5">
          <Text className="text-2xs font-semibold text-error">Out of stock</Text>
        </View>
      );
    default:
      return null;
  }
}

/** Circular progress ring for active items */
function ProgressRing({
  daysElapsed,
  daysSupply,
}: {
  daysElapsed: number | null;
  daysSupply: number;
}) {
  if (daysElapsed == null) return null;
  const progress = Math.min(1, Math.max(0, daysElapsed / daysSupply));
  const pct = Math.round(progress * 100);

  return (
    <View className="h-10 w-10 items-center justify-center rounded-full border-[3px] border-surface-tertiary">
      {/* Simple percentage display instead of SVG ring */}
      <Text className="text-2xs font-bold text-ink">{pct}%</Text>
    </View>
  );
}

function StackStatusCard({
  item,
  discount,
}: {
  item: StackStatusView;
  discount: ReorderDiscountCode | null;
}) {
  const { activateItem } = useStackMutations();

  const handleActivate = () => {
    activateItem.mutate(
      { stackItemId: item.stack_item_id },
      {
        onError: (err) => {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to activate');
        },
      }
    );
  };

  const handleReorder = () => {
    if (item.product_shopify_url) {
      Linking.openURL(item.product_shopify_url);
    } else {
      Alert.alert('Coming Soon', 'Online ordering will be available soon.');
    }
  };

  return (
    <View className="w-40 rounded-xl bg-surface-secondary p-3 mr-3">
      {/* Product image + name */}
      <View className="flex-row items-center mb-2">
        {item.product_thumbnail_url ? (
          <Image
            source={{ uri: item.product_thumbnail_url }}
            className="h-8 w-8 rounded-md mr-2"
            resizeMode="cover"
          />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-md bg-surface-tertiary mr-2">
            <Text className="text-sm">💊</Text>
          </View>
        )}
        <Text className="text-xs font-semibold text-ink flex-1" numberOfLines={2}>
          {item.product_name}
        </Text>
      </View>

      {/* Status badge */}
      <StatusBadge status={item.status} daysRemaining={item.days_remaining} />

      {/* Progress ring for active items */}
      {(item.status === 'active' || item.status === 'running_low') && (
        <View className="mt-2 items-center">
          <ProgressRing daysElapsed={item.days_elapsed} daysSupply={item.days_supply} />
        </View>
      )}

      {/* Action buttons */}
      {item.status === 'arriving' && (
        <Pressable
          onPress={handleActivate}
          disabled={activateItem.isPending}
          className="mt-2 rounded-lg bg-accent py-1.5 items-center"
        >
          <Text className="text-2xs font-semibold text-white">
            {activateItem.isPending ? 'Activating...' : 'Arrived? Start tracking'}
          </Text>
        </Pressable>
      )}

      {(item.status === 'running_low' || item.status === 'reorder') && (
        <View className="mt-2">
          <Pressable
            onPress={handleReorder}
            className="rounded-lg bg-warning/10 py-1.5 items-center"
          >
            <Text className="text-2xs font-semibold text-warning">Reorder</Text>
          </Pressable>

          {/* Tapering discount badge */}
          {item.status === 'reorder' && discount && (
            <View className="mt-1.5 rounded-md bg-success/10 px-2 py-1 items-center">
              <Text className="text-2xs font-bold text-success">{discount.discount_label}</Text>
              <Text className="text-2xs text-success/80">Code: {discount.discount_code}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function StackStatusRow({ items }: StackStatusRowProps) {
  const { data: discounts } = useReorderDiscounts();

  if (items.length === 0) return null;

  return (
    <View className="py-3">
      <Text className="text-sm font-bold text-ink mb-2 px-4">Your Stack</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {items.map((item) => (
          <StackStatusCard
            key={item.stack_item_id}
            item={item}
            discount={getDiscountForCycle(discounts, item.reorder_cycle_count)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
